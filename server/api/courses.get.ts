/**
 * GET /api/courses?q=<search>&intakes=<comma-separated>
 *
 * Supports two modes:
 *   1. ?q=<search>   — fuzzy search intakes by code (for modal search)
 *   2. ?intakes=X,Y,Z — exact lookup of specific intakes (for rehydration)
 *
 * Response shape (array of Intake objects):
 *   {
 *     id: "AFCF2507ICT",
 *     intake: "AFCF2507ICT",
 *     courses: [
 *       { id, code, name, classes: [{ type, day, startTime, endTime, venue }] }
 *     ]
 *   }
 */
export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const search = query.q?.toString().toLowerCase().trim();
	const intakesList = query.intakes?.toString().trim();

	try {
		const raw = await $fetch<any[]>(
			"https://s3-ap-southeast-1.amazonaws.com/open-ws/weektimetable",
		);

		// ── 1. Filter records ───────────────────────────────────────
		let filtered: any[];

		if (intakesList) {
			// Exact lookup by comma-separated intake codes
			const codes = new Set(
				intakesList.split(",").map((c) => c.trim().toUpperCase()),
			);
			filtered = raw.filter((item) => codes.has(item.INTAKE?.toUpperCase()));
		} else if (search) {
			// Fuzzy search by intake code
			filtered = raw.filter((item) => {
				const intake = item.INTAKE?.toLowerCase() ?? "";
				return intake.includes(search);
			});
		} else {
			return [];
		}

		// ── 2. Helpers ──────────────────────────────────────────────
		const DAY_MAP: Record<string, string> = {
			MON: "Monday",
			TUE: "Tuesday",
			WED: "Wednesday",
			THU: "Thursday",
			FRI: "Friday",
			SAT: "Saturday",
			SUN: "Sunday",
		};

		function classType(modid: string): string {
			const upper = modid.toUpperCase();
			if (upper.includes("-LAB-")) return "Lab";
			if (upper.includes("-T-")) return "Tutorial";
			if (upper.includes("-L-")) return "Lecture";
			return "Class";
		}

		function to24h(time12: string): string {
			const [timePart, meridiem] = time12.trim().split(" ");
			let [h, m] = timePart!.split(":").map(Number);
			if (meridiem?.toUpperCase() === "PM" && h !== 12) h! += 12;
			if (meridiem?.toUpperCase() === "AM" && h === 12) h = 0;
			return `${h!.toString().padStart(2, "0")}:${m!.toString().padStart(2, "0")}`;
		}

		// ── 3. Group by INTAKE → then by MODID ─────────────────────
		const intakeMap = new Map<
			string,
			Map<
				string,
				{
					id: string;
					code: string;
					name: string;
					classes: {
						type: string;
						day: string;
						startTime: string;
						endTime: string;
						venue: string;
					}[];
					_seen: Set<string>;
				}
			>
		>();

		for (const rec of filtered) {
			const intakeKey = (rec.INTAKE ?? "UNKNOWN").trim();
			const modKey = (rec.MODID ?? "UNKNOWN").trim();

			if (!intakeMap.has(intakeKey)) {
				intakeMap.set(intakeKey, new Map());
			}

			const courseMap = intakeMap.get(intakeKey)!;

			if (!courseMap.has(modKey)) {
				courseMap.set(modKey, {
					id: `${intakeKey}___${modKey}`,
					code: modKey,
					name: rec.MODULE_NAME ?? "",
					classes: [],
					_seen: new Set<string>(),
				});
			}

			const course = courseMap.get(modKey)!;
			const day = DAY_MAP[rec.DAY?.toUpperCase()] ?? rec.DAY ?? "";
			const startTime = to24h(rec.TIME_FROM ?? "12:00 AM");
			const endTime = to24h(rec.TIME_TO ?? "12:00 AM");
			const venue = rec.ROOM ?? rec.LOCATION ?? "";

			// Deduplicate: same day+time+venue = same weekly slot
			const slotKey = `${day}|${startTime}|${endTime}|${venue}`;
			if (!course._seen.has(slotKey)) {
				course._seen.add(slotKey);
				course.classes.push({
					type: classType(modKey),
					day,
					startTime,
					endTime,
					venue,
				});
			}
		}

		// ── 4. Build response ───────────────────────────────────────
		return Array.from(intakeMap.entries()).map(([intakeCode, courseMap]) => ({
			id: intakeCode,
			intake: intakeCode,
			courses: Array.from(courseMap.values()).map(({ _seen, ...rest }) => rest),
		}));
	} catch (error) {
		console.error("Failed to fetch timetable data:", error);
		return [];
	}
});
