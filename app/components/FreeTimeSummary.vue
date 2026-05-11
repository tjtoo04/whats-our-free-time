<script setup lang="ts">
interface CourseClass {
  type: string;
  day: string;
  startTime: string;
  endTime: string;
  venue: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  classes: CourseClass[];
  colorIndex?: number;
}

interface Intake {
  id: string;
  intake: string;
  courses: Course[];
}

const props = defineProps<{
  intakes: Intake[];
}>();

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const COURSE_COLORS = [
  { bg: "rgba(245, 158, 11, 0.18)", border: "rgba(245, 158, 11, 0.55)", text: "#F59E0B", label: "#FBBF24" },
  { bg: "rgba(20, 184, 166, 0.18)", border: "rgba(20, 184, 166, 0.55)", text: "#14B8A6", label: "#5EEAD4" },
  { bg: "rgba(244, 63, 94, 0.18)", border: "rgba(244, 63, 94, 0.55)", text: "#F43F5E", label: "#FDA4AF" },
  { bg: "rgba(139, 92, 246, 0.18)", border: "rgba(139, 92, 246, 0.55)", text: "#8B5CF6", label: "#C4B5FD" },
  { bg: "rgba(52, 211, 153, 0.18)", border: "rgba(52, 211, 153, 0.55)", text: "#34D399", label: "#6EE7B7" },
  { bg: "rgba(56, 189, 248, 0.18)", border: "rgba(56, 189, 248, 0.55)", text: "#38BDF8", label: "#7DD3FC" },
  { bg: "rgba(251, 146, 60, 0.18)", border: "rgba(251, 146, 60, 0.55)", text: "#FB923C", label: "#FDBA74" },
  { bg: "rgba(232, 121, 249, 0.18)", border: "rgba(232, 121, 249, 0.55)", text: "#E879F9", label: "#F0ABFC" },
];

function getColor(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length]!;
}

const MIN_HOUR = 8;
const MAX_HOUR = 22;

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h! + m! / 60;
}

function formatHour(decimal: number): string {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

interface TimeSlot {
  start: number;
  end: number;
}

// Get busy slots for an intake on a given day
function getBusySlots(intake: Intake, day: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (const course of intake.courses) {
    for (const cls of course.classes) {
      if (cls.day === day) {
        slots.push({
          start: parseTime(cls.startTime),
          end: parseTime(cls.endTime),
        });
      }
    }
  }
  // Sort and merge overlapping
  slots.sort((a, b) => a.start - b.start);
  const merged: TimeSlot[] = [];
  for (const slot of slots) {
    const last = merged[merged.length - 1];
    if (last && slot.start <= last.end) {
      last.end = Math.max(last.end, slot.end);
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
}

// Get free slots for an intake on a given day
function getFreeSlots(busySlots: TimeSlot[]): TimeSlot[] {
  const free: TimeSlot[] = [];
  let cursor = MIN_HOUR;
  for (const slot of busySlots) {
    if (slot.start > cursor) {
      free.push({ start: cursor, end: slot.start });
    }
    cursor = Math.max(cursor, slot.end);
  }
  if (cursor < MAX_HOUR) {
    free.push({ start: cursor, end: MAX_HOUR });
  }
  return free;
}

// Intersect two lists of free slots
function intersectFreeSlots(a: TimeSlot[], b: TimeSlot[]): TimeSlot[] {
  const result: TimeSlot[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i]!.start, b[j]!.start);
    const end = Math.min(a[i]!.end, b[j]!.end);
    if (start < end) {
      result.push({ start, end });
    }
    if (a[i]!.end < b[j]!.end) i++;
    else j++;
  }
  return result;
}

function slotDuration(slot: TimeSlot): number {
  return slot.end - slot.start;
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}hr`;
  return `${h}hr ${m}min`;
}

// Compute shared free times for every pair and all-combined
interface SharedFreeTime {
  intakeIndices: number[];
  intakeNames: string[];
  days: { day: string; slots: TimeSlot[] }[];
  totalFreeHours: number;
}

const sharedFreeTimes = computed(() => {
  const intakes = props.intakes;
  if (intakes.length < 2) return [];

  const results: SharedFreeTime[] = [];

  // Pairwise
  for (let i = 0; i < intakes.length; i++) {
    for (let j = i + 1; j < intakes.length; j++) {
      const days: { day: string; slots: TimeSlot[] }[] = [];
      let totalFree = 0;

      for (const day of DAYS) {
        const busyA = getBusySlots(intakes[i]!, day);
        const busyB = getBusySlots(intakes[j]!, day);
        const freeA = getFreeSlots(busyA);
        const freeB = getFreeSlots(busyB);
        const shared = intersectFreeSlots(freeA, freeB);
        if (shared.length > 0) {
          days.push({ day, slots: shared });
          totalFree += shared.reduce((s, sl) => s + slotDuration(sl), 0);
        }
      }

      if (days.length > 0) {
        results.push({
          intakeIndices: [i, j],
          intakeNames: [intakes[i]!.intake, intakes[j]!.intake],
          days,
          totalFreeHours: totalFree,
        });
      }
    }
  }

  // All combined (if 3+ intakes)
  if (intakes.length >= 3) {
    const days: { day: string; slots: TimeSlot[] }[] = [];
    let totalFree = 0;

    for (const day of DAYS) {
      let currentFree = getFreeSlots(getBusySlots(intakes[0]!, day));
      for (let i = 1; i < intakes.length; i++) {
        const otherFree = getFreeSlots(getBusySlots(intakes[i]!, day));
        currentFree = intersectFreeSlots(currentFree, otherFree);
      }
      if (currentFree.length > 0) {
        days.push({ day, slots: currentFree });
        totalFree += currentFree.reduce((s, sl) => s + slotDuration(sl), 0);
      }
    }

    if (days.length > 0) {
      results.unshift({
        intakeIndices: intakes.map((_, i) => i),
        intakeNames: intakes.map((i) => i.intake),
        days,
        totalFreeHours: totalFree,
      });
    }
  }

  return results;
});

// Per-intake free time summary
const perIntakeFree = computed(() => {
  return props.intakes.map((intake, idx) => {
    const days: { day: string; slots: TimeSlot[] }[] = [];
    let totalFree = 0;

    for (const day of DAYS) {
      const busy = getBusySlots(intake, day);
      const free = getFreeSlots(busy);
      // Filter out full-day free (no classes at all)
      const hasClasses = busy.length > 0;
      if (hasClasses && free.length > 0) {
        days.push({ day, slots: free });
        totalFree += free.reduce((s, sl) => s + slotDuration(sl), 0);
      }
    }

    return {
      intake: intake.intake,
      colorIndex: idx,
      days,
      totalFreeHours: totalFree,
    };
  });
});
</script>

<template>
  <div class="space-y-4 md:space-y-6">
    <h2 class="font-display text-lg md:text-xl font-semibold tracking-tight flex items-center gap-2">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F59E0B"
        stroke-width="1.5"
        stroke-linecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      Free Time Analysis
    </h2>

    <!-- Per-intake free time -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        v-for="item in perIntakeFree"
        :key="item.intake"
        class="glass-card p-4"
        :style="{
          borderLeftWidth: '3px',
          borderLeftColor: getColor(item.colorIndex).border,
        }"
      >
        <div class="flex items-center justify-between mb-3">
          <span
            class="text-sm font-mono font-semibold"
            :style="{ color: getColor(item.colorIndex).text }"
          >
            {{ item.intake }}
          </span>
          <span class="text-[11px] text-muted-foreground font-mono">
            {{ formatDuration(item.totalFreeHours) }} free
          </span>
        </div>

        <div v-if="item.days.length === 0" class="text-xs text-muted-foreground">
          No gaps between classes
        </div>

        <div v-else class="space-y-1.5">
          <div
            v-for="dayInfo in item.days"
            :key="dayInfo.day"
            class="flex items-start gap-2 text-xs"
          >
            <span class="text-muted-foreground font-medium w-8 flex-shrink-0">
              {{ dayInfo.day.slice(0, 3) }}
            </span>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(slot, sIdx) in dayInfo.slots"
                :key="sIdx"
                class="px-2 py-0.5 rounded text-[11px] font-mono"
                :style="{
                  backgroundColor: getColor(item.colorIndex).bg,
                  color: getColor(item.colorIndex).label,
                }"
              >
                {{ formatHour(slot.start) }} – {{ formatHour(slot.end) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Shared free times -->
    <div v-if="sharedFreeTimes.length > 0">
      <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Shared Free Times
      </h3>

      <div class="space-y-3">
        <div
          v-for="(shared, sIdx) in sharedFreeTimes"
          :key="sIdx"
          class="glass-card p-4"
        >
          <!-- Header: which intakes -->
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span
              v-for="(name, nIdx) in shared.intakeNames"
              :key="name"
              class="text-xs font-mono px-2 py-0.5 rounded-full"
              :style="{
                backgroundColor: getColor(shared.intakeIndices[nIdx]!).bg,
                color: getColor(shared.intakeIndices[nIdx]!).text,
                border: `1px solid ${getColor(shared.intakeIndices[nIdx]!).border}`,
              }"
            >
              {{ name }}
            </span>
            <span
              v-if="shared.intakeNames.length === intakes.length && intakes.length >= 3"
              class="text-[10px] text-accent font-semibold uppercase tracking-wider"
            >
              All intakes
            </span>
            <span class="ml-auto text-[11px] text-muted-foreground font-mono">
              {{ formatDuration(shared.totalFreeHours) }} shared
            </span>
          </div>

          <!-- Day slots -->
          <div class="space-y-1.5">
            <div
              v-for="dayInfo in shared.days"
              :key="dayInfo.day"
              class="flex items-start gap-2 text-xs"
            >
              <span class="text-muted-foreground font-medium w-8 flex-shrink-0">
                {{ dayInfo.day.slice(0, 3) }}
              </span>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="(slot, slIdx) in dayInfo.slots"
                  :key="slIdx"
                  class="px-2 py-0.5 rounded bg-white/[0.06] text-[11px] font-mono text-foreground/80"
                >
                  {{ formatHour(slot.start) }} – {{ formatHour(slot.end) }}
                  <span class="text-muted-foreground ml-1">
                    ({{ formatDuration(slotDuration(slot)) }})
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
