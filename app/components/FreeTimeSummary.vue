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

function getBusySlots(intake: Intake, day: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (const course of intake.courses) {
    for (const cls of course.classes) {
      if (cls.day === day) {
        slots.push({ start: parseTime(cls.startTime), end: parseTime(cls.endTime) });
      }
    }
  }
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

// ── Checklist state ─────────────────────────────────────────────
// Start with all intakes checked
const checkedIntakeIds = ref<Set<string>>(new Set());

// Initialize when intakes change
watch(
  () => props.intakes,
  (newIntakes) => {
    checkedIntakeIds.value = new Set(newIntakes.map((i) => i.id));
  },
  { immediate: true },
);

function toggleIntake(id: string) {
  const s = new Set(checkedIntakeIds.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  checkedIntakeIds.value = s;
}

const checkedIntakes = computed(() =>
  props.intakes.filter((i) => checkedIntakeIds.value.has(i.id)),
);

// ── Compute shared free times for checked intakes ───────────────
const sharedFreeByDay = computed(() => {
  const intakes = checkedIntakes.value;
  if (intakes.length < 2) return [];

  const result: { day: string; slots: TimeSlot[]; totalHours: number }[] = [];

  for (const day of DAYS) {
    // Start with the free slots of the first checked intake
    let sharedFree = getFreeSlots(getBusySlots(intakes[0]!, day));

    // Intersect with each subsequent intake's free slots
    for (let i = 1; i < intakes.length; i++) {
      const otherFree = getFreeSlots(getBusySlots(intakes[i]!, day));
      sharedFree = intersectFreeSlots(sharedFree, otherFree);
    }

    if (sharedFree.length > 0) {
      // Filter out full-day free slots (when no intake has classes that day)
      const anyHasClasses = intakes.some(
        (intake) => getBusySlots(intake, day).length > 0,
      );
      if (anyHasClasses) {
        const totalHours = sharedFree.reduce((s, sl) => s + slotDuration(sl), 0);
        result.push({ day, slots: sharedFree, totalHours });
      }
    }
  }

  return result;
});

const totalSharedFreeHours = computed(() =>
  sharedFreeByDay.value.reduce((s, d) => s + d.totalHours, 0),
);
</script>

<template>
  <div class="space-y-4 md:space-y-5">
    <h2
      class="font-display text-lg md:text-xl font-semibold tracking-tight flex items-center gap-2"
    >
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

    <!-- Intake checklist -->
    <div class="glass-card p-4">
      <p class="text-xs text-muted-foreground mb-3">
        Select intakes to find shared free times between them
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(intake, idx) in intakes"
          :key="intake.id"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 border"
          :class="
            checkedIntakeIds.has(intake.id)
              ? 'border-transparent'
              : 'border-surface-border bg-transparent text-muted-foreground hover:border-surface-border-hover'
          "
          :style="
            checkedIntakeIds.has(intake.id)
              ? {
                  backgroundColor: getColor(idx).bg,
                  color: getColor(idx).label,
                  borderColor: getColor(idx).border,
                }
              : {}
          "
          @click="toggleIntake(intake.id)"
        >
          <!-- Checkbox -->
          <div
            class="w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 transition-all duration-200"
            :class="
              checkedIntakeIds.has(intake.id)
                ? ''
                : 'border-surface-border-hover'
            "
            :style="
              checkedIntakeIds.has(intake.id)
                ? {
                    backgroundColor: getColor(idx).text,
                    borderColor: getColor(idx).text,
                  }
                : {}
            "
          >
            <svg
              v-if="checkedIntakeIds.has(intake.id)"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0A0A0F"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          {{ intake.intake }}
        </button>
      </div>
    </div>

    <!-- Results -->
    <div v-if="checkedIntakes.length < 2" class="glass-card px-5 py-8 text-center">
      <p class="text-sm text-muted-foreground">
        Select at least 2 intakes above to find shared free times
      </p>
    </div>

    <div v-else>
      <!-- Summary banner -->
      <div
        class="glass-card px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
      >
        <div class="text-sm">
          <span class="text-muted-foreground">Shared free time across </span>
          <span class="text-accent font-semibold">{{ checkedIntakes.length }} intakes</span>
        </div>
        <span class="text-sm font-mono text-accent font-semibold">
          {{ formatDuration(totalSharedFreeHours) }} / week
        </span>
      </div>

      <!-- No shared free time -->
      <div
        v-if="sharedFreeByDay.length === 0"
        class="glass-card px-5 py-8 text-center mt-3"
      >
        <p class="text-sm text-muted-foreground">
          No shared free time found between the selected intakes
        </p>
      </div>

      <!-- Day-by-day breakdown -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        <div
          v-for="dayInfo in sharedFreeByDay"
          :key="dayInfo.day"
          class="glass-card p-4"
        >
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-sm font-semibold text-foreground">
              {{ dayInfo.day }}
            </span>
            <span class="text-[11px] font-mono text-muted-foreground">
              {{ formatDuration(dayInfo.totalHours) }}
            </span>
          </div>

          <div class="space-y-1.5">
            <div
              v-for="(slot, sIdx) in dayInfo.slots"
              :key="sIdx"
              class="flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.06]"
            >
              <span class="text-xs font-mono text-foreground/90">
                {{ formatHour(slot.start) }} – {{ formatHour(slot.end) }}
              </span>
              <span class="text-[10px] text-accent font-mono">
                {{ formatDuration(slotDuration(slot)) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
