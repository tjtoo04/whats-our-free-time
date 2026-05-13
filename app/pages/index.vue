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

const STORAGE_KEY = "apu-timetable-intakes";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const activeDay = ref(
  DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1],
);
const showModal = ref(false);
const isRehydrating = ref(false);
const activeMobileTab = ref<'timetable' | 'summary'>('timetable');

// ── Selected intakes & flattened courses ────────────────────────
const selectedIntakes = ref<Intake[]>([]);

const selectedIntakeIds = computed(() =>
  selectedIntakes.value.map((i) => i.id),
);

// Flatten all courses from all selected intakes, with color per intake
const selectedCourses = computed(() => {
  const courses: (Course & { colorIndex: number })[] = [];
  for (let i = 0; i < selectedIntakes.value.length; i++) {
    const intake = selectedIntakes.value[i];
    if (!intake) continue;
    for (const course of intake.courses) {
      courses.push({ ...course, colorIndex: i });
    }
  }
  return courses;
});

// ── localStorage persistence ────────────────────────────────────
function saveToStorage() {
  if (import.meta.client) {
    const ids = selectedIntakeIds.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }
}

// Watch for changes and persist
watch(selectedIntakes, saveToStorage, { deep: true });

// Rehydrate on mount
onMounted(async () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  try {
    const ids: string[] = JSON.parse(stored);
    if (!ids.length) return;

    isRehydrating.value = true;
    const data = await $fetch<Intake[]>("/api/courses", {
      query: { intakes: ids.join(",") },
    });

    if (data && data.length) {
      selectedIntakes.value = data;
    }
  } catch (e) {
    console.error("Failed to rehydrate intakes:", e);
  } finally {
    isRehydrating.value = false;
  }
});

function onIntakeSelected(intake: Intake) {
  if (!selectedIntakeIds.value.includes(intake.id)) {
    selectedIntakes.value.push(intake);
  }
}

function removeIntake(id: string) {
  selectedIntakes.value = selectedIntakes.value.filter((i) => i.id !== id);
}

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
</script>

<template>
  <div class="min-h-screen bg-background font-body text-foreground relative">
    <!-- Ambient background orbs -->
    <div
      class="fixed inset-0 overflow-hidden pointer-events-none -z-10"
      aria-hidden="true"
    >
      <div
        class="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-accent/[0.03] rounded-full blur-[150px]"
      />
      <div
        class="absolute bottom-0 right-0 w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-accent/[0.02] rounded-full blur-[120px]"
      />
    </div>

    <!-- Main content -->
    <div class="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-16">
      <!-- Header -->
      <header
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-10"
      >
        <div>
          <h1
            class="font-display text-2xl md:text-4xl font-bold tracking-tight"
          >
            Class Timetable
          </h1>
          <p class="text-muted-foreground text-sm mt-1">
            Visualise and manage your weekly schedule
          </p>
        </div>
        <button class="btn-primary w-full sm:w-auto" @click="showModal = true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Intake
        </button>
      </header>

      <!-- Day tabs -->
      <nav
        class="mb-5 md:mb-6 flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0"
        aria-label="Day of week"
      >
        <button
          v-for="day in DAYS"
          :key="day"
          class="px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          :class="
            activeDay === day
              ? 'bg-accent text-accent-foreground shadow-glow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
          "
          @click="activeDay = day"
        >
          <span class="hidden sm:inline">{{ day }}</span>
          <span class="sm:hidden">{{ day.slice(0, 3) }}</span>
        </button>
      </nav>

      <!-- Selected intake pills -->
      <div v-if="selectedIntakes.length > 0" class="flex flex-wrap gap-2 mb-5 md:mb-6">
        <span
          v-for="(intake, idx) in selectedIntakes"
          :key="intake.id"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border transition-all duration-200 group"
          :style="{
            backgroundColor: getColor(idx).bg,
            color: getColor(idx).label,
            borderColor: getColor(idx).border,
          }"
        >
          {{ intake.intake }}
          <button
            class="transition-colors ml-0.5 opacity-70 hover:opacity-100"
            :style="{ color: getColor(idx).text }"
            :aria-label="'Remove intake ' + intake.intake"
            @click="removeIntake(intake.id)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      </div>

      <!-- Rehydrating state -->
      <div v-if="isRehydrating" class="glass-card px-6 py-16 text-center">
        <svg
          class="mx-auto mb-3 text-accent animate-spin"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
        <p class="text-sm text-muted-foreground">Loading your timetable…</p>
      </div>

      <!-- Main Content when loaded -->
      <template v-else-if="selectedIntakes.length > 0">
        <!-- Mobile View Tabs -->
        <div v-if="selectedIntakes.length >= 2" class="md:hidden flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-xl mb-5">
          <button
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            :class="activeMobileTab === 'timetable' ? 'bg-accent text-accent-foreground shadow-glow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'"
            @click="activeMobileTab = 'timetable'"
          >
            Timetable
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            :class="activeMobileTab === 'summary' ? 'bg-accent text-accent-foreground shadow-glow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'"
            @click="activeMobileTab = 'summary'"
          >
            Time Summary
          </button>
        </div>

        <!-- Timetable -->
        <div :class="[selectedIntakes.length >= 2 && activeMobileTab !== 'timetable' ? 'hidden md:block' : '']">
          <TimetableChart
            :courses="selectedCourses!"
            :active-day="activeDay!"
          />
        </div>

        <!-- Free time analysis (shown when 2+ intakes) -->
        <div v-if="selectedIntakes.length >= 2" :class="[activeMobileTab !== 'summary' ? 'hidden md:block' : '', 'mt-6 md:mt-8']">
          <FreeTimeSummary
            :intakes="selectedIntakes"
          />
        </div>
      </template>

      <!-- Empty state -->
      <div v-else class="mt-8 text-center py-12">
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-muted mb-4"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F59E0B"
            stroke-width="1.5"
            stroke-linecap="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        <h3 class="font-display text-lg font-semibold mb-1">
          No intakes added yet
        </h3>
        <p class="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
          Search and add an intake to see your timetable
        </p>
        <button class="btn-secondary" @click="showModal = true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Browse Intakes
        </button>
      </div>
    </div>

    <!-- Intake selection modal -->
    <CourseSelectModal
      v-if="showModal"
      :already-selected-intakes="selectedIntakeIds"
      @close="showModal = false"
      @select="onIntakeSelected"
    />
  </div>
</template>
