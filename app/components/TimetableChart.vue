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
  colorIndex: number;
}

const props = defineProps<{
  courses: Course[];
  activeDay: string;
}>();

const COURSE_COLORS = [
  {
    bg: "rgba(245, 158, 11, 0.18)",
    border: "rgba(245, 158, 11, 0.55)",
    text: "#F59E0B",
    label: "#FBBF24",
  },
  {
    bg: "rgba(20, 184, 166, 0.18)",
    border: "rgba(20, 184, 166, 0.55)",
    text: "#14B8A6",
    label: "#5EEAD4",
  },
  {
    bg: "rgba(244, 63, 94, 0.18)",
    border: "rgba(244, 63, 94, 0.55)",
    text: "#F43F5E",
    label: "#FDA4AF",
  },
  {
    bg: "rgba(139, 92, 246, 0.18)",
    border: "rgba(139, 92, 246, 0.55)",
    text: "#8B5CF6",
    label: "#C4B5FD",
  },
  {
    bg: "rgba(52, 211, 153, 0.18)",
    border: "rgba(52, 211, 153, 0.55)",
    text: "#34D399",
    label: "#6EE7B7",
  },
  {
    bg: "rgba(56, 189, 248, 0.18)",
    border: "rgba(56, 189, 248, 0.55)",
    text: "#38BDF8",
    label: "#7DD3FC",
  },
  {
    bg: "rgba(251, 146, 60, 0.18)",
    border: "rgba(251, 146, 60, 0.55)",
    text: "#FB923C",
    label: "#FDBA74",
  },
  {
    bg: "rgba(232, 121, 249, 0.18)",
    border: "rgba(232, 121, 249, 0.55)",
    text: "#E879F9",
    label: "#F0ABFC",
  },
];

const MIN_HOUR = 7;
const MAX_HOUR = 22;
const TOTAL_HOURS = MAX_HOUR - MIN_HOUR;

const timeMarkers = computed(() => {
  const markers = [];
  for (let h = MIN_HOUR; h <= MAX_HOUR; h++) {
    markers.push({
      hour: h,
      label:
        h <= 12 ? `${h === 0 ? 12 : h}${h < 12 ? "AM" : "PM"}` : `${h - 12}PM`,
      left: ((h - MIN_HOUR) / TOTAL_HOURS) * 100,
    });
  }
  return markers;
});

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h! + m! / 60;
}

function getBlockStyle(cls: CourseClass) {
  const start = parseTime(cls.startTime);
  const end = parseTime(cls.endTime);
  const left = ((start - MIN_HOUR) / TOTAL_HOURS) * 100;
  const width = ((end - start) / TOTAL_HOURS) * 100;
  return { left: `${left}%`, width: `${width}%` };
}

function getColor(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}

const filteredCourses = computed(() => {
  return props.courses
    .map((course) => ({
      ...course,
      filteredClasses: course.classes.filter((c) => c.day === props.activeDay),
    }))
    .filter((course) => course.filteredClasses.length > 0);
});

// For mobile: flatten all classes for the day, sorted by time
const sortedClassesForDay = computed(() => {
  const items: {
    course: Course;
    cls: CourseClass;
    color: (typeof COURSE_COLORS)[0];
  }[] = [];
  for (const course of props.courses) {
    const color = getColor(course.colorIndex)!;
    for (const cls of course.classes) {
      if (cls.day === props.activeDay) {
        items.push({ course, cls, color });
      }
    }
  }
  return items.sort(
    (a, b) => parseTime(a.cls.startTime) - parseTime(b.cls.startTime),
  );
});

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h! >= 12 ? "PM" : "AM";
  const hour12 = h! > 12 ? h! - 12 : h === 0 ? 12 : h;
  return `${hour12}:${m!.toString().padStart(2, "0")} ${suffix}`;
}

function getDuration(start: string, end: string): string {
  const diff = parseTime(end) - parseTime(start);
  const hrs = Math.floor(diff);
  const mins = Math.round((diff - hrs) * 60);
  if (hrs === 0) return `${mins}min`;
  if (mins === 0) return `${hrs}hr`;
  return `${hrs}hr ${mins}min`;
}
</script>

<template>
  <!-- ═══ DESKTOP: Gantt-style chart (hidden on mobile) ═══ -->
  <div class="glass-card overflow-hidden hidden md:block">
    <!-- Time axis header -->
    <div class="relative border-b border-surface-border">
      <div class="flex">
        <!-- Course name column header -->
        <div
          class="w-48 md:w-56 flex-shrink-0 px-4 py-3 border-r border-surface-border"
        >
          <span
            class="text-xs font-mono tracking-wide text-muted-foreground uppercase"
          >
            Course
          </span>
        </div>
        <!-- Time axis -->
        <div class="flex-1 relative h-10 min-w-[600px]">
          <div
            v-for="marker in timeMarkers"
            :key="marker.hour"
            class="absolute top-0 bottom-0 flex items-center"
            :style="{ left: marker.left + '%' }"
          >
            <span
              class="text-[10px] font-mono text-muted-foreground -translate-x-1/2 select-none"
            >
              {{ marker.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Course rows -->
    <div class="overflow-x-auto">
      <div v-if="filteredCourses.length === 0" class="px-6 py-16 text-center">
        <div class="text-muted-foreground text-sm">
          No classes scheduled for this day
        </div>
      </div>

      <div
        v-for="course in filteredCourses"
        :key="course.id"
        class="flex border-b border-surface-border last:border-b-0 group hover:bg-white/[0.02] transition-colors duration-200"
      >
        <!-- Course name -->
        <div
          class="w-48 md:w-56 flex-shrink-0 px-4 py-4 border-r border-surface-border flex flex-col justify-center"
        >
          <span
            class="text-xs font-mono tracking-wide block mb-0.5"
            :style="{ color: getColor(course.colorIndex)!.text }"
          >
            {{ course.code }}
          </span>
          <span class="text-sm text-foreground font-medium truncate block">
            {{ course.name }}
          </span>
        </div>

        <!-- Timeline blocks -->
        <div class="flex-1 relative py-3 min-w-[600px] min-h-[60px]">
          <!-- Vertical grid lines -->
          <div
            v-for="marker in timeMarkers"
            :key="'grid-' + marker.hour"
            class="absolute top-0 bottom-0 w-px bg-white/[0.03]"
            :style="{ left: marker.left + '%' }"
          />

          <!-- Class blocks -->
          <div
            v-for="(cls, cIdx) in course.filteredClasses"
            :key="cIdx"
            class="absolute top-2 bottom-2 rounded-md flex items-center px-2.5 overflow-hidden cursor-default transition-all duration-200 hover:brightness-125 hover:scale-y-105"
            :style="{
              ...getBlockStyle(cls),
              backgroundColor: getColor(course.colorIndex)!.bg,
              borderLeft: `3px solid ${getColor(course.colorIndex)!.border}`,
            }"
            :title="`${cls.type} · ${formatTime(cls.startTime)} – ${formatTime(cls.endTime)} · ${cls.venue}`"
          >
            <div class="flex flex-col min-w-0 gap-0.5">
              <span
                class="text-xs font-semibold truncate"
                :style="{ color: getColor(course.colorIndex)!.label }"
              >
                {{ cls.type }}
              </span>
              <span
                class="text-[10px] text-muted-foreground truncate font-mono"
              >
                {{ formatTime(cls.startTime) }} – {{ formatTime(cls.endTime) }}
              </span>
              <span class="text-[10px] text-muted-foreground/70 truncate">
                {{ cls.venue }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ MOBILE: Card-based timeline (hidden on desktop) ═══ -->
  <div class="md:hidden space-y-3">
    <!-- Empty state -->
    <div
      v-if="sortedClassesForDay.length === 0"
      class="glass-card px-5 py-12 text-center"
    >
      <div class="text-muted-foreground text-sm">
        No classes scheduled for this day
      </div>
    </div>

    <!-- Class cards -->
    <div
      v-for="(item, idx) in sortedClassesForDay"
      :key="`${item.course.id}-${idx}`"
      class="glass-card overflow-hidden transition-all duration-200 active:scale-[0.98]"
      :style="{
        borderLeftWidth: '4px',
        borderLeftColor: item.color.border,
      }"
    >
      <div class="px-4 py-3.5">
        <!-- Time row -->
        <div class="flex items-center justify-between mb-2">
          <span
            class="text-sm font-mono font-semibold"
            :style="{ color: item.color.label }"
          >
            {{ formatTime(item.cls.startTime) }} –
            {{ formatTime(item.cls.endTime) }}
          </span>
          <span
            class="text-[10px] font-mono px-2 py-0.5 rounded-full"
            :style="{
              backgroundColor: item.color.bg,
              color: item.color.text,
            }"
          >
            {{ getDuration(item.cls.startTime, item.cls.endTime) }}
          </span>
        </div>

        <!-- Course name -->
        <div class="text-sm font-medium text-foreground mb-1">
          {{ item.course.name }}
        </div>

        <!-- Meta row -->
        <div
          class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
        >
          <span class="inline-flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <path
                d="M2 7l10 5 10-5M2 17l10 5 10-5M2 12l10 5 10-5"
              />
            </svg>
            {{ item.cls.type }}
          </span>
          <span class="inline-flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {{ item.cls.venue }}
          </span>
          <span
            class="font-mono tracking-wide"
            :style="{ color: item.color.text }"
          >
            {{ item.course.code }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
