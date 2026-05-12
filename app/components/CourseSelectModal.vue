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
}

interface Intake {
  id: string;
  intake: string;
  courses: Course[];
}

const props = defineProps<{
  alreadySelectedIntakes: string[];
}>();

const emit = defineEmits<{
  close: [];
  select: [intake: Intake];
}>();

// ── Search & server-side filtering ──────────────────────────────
const search = ref("");
const debouncedSearch = ref("");
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(search, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = val;
  }, 300);
});

const { data: intakes, status } = useFetch<Intake[]>("/api/courses", {
  query: { q: debouncedSearch },
  watch: [debouncedSearch],
  default: () => [],
});

const isPending = computed(() => status.value === "pending");

// Filter out already-selected intakes from the list
const filtered = computed(() => {
  if (!intakes.value) return [];
  return intakes.value.filter(
    (i) => !props.alreadySelectedIntakes.includes(i.id),
  );
});

function selectIntake(intake: Intake) {
  emit("select", intake);
  emit("close");
}

function getDaysSummary(courses: Course[]): string {
  const days = [
    ...new Set(courses.flatMap((c) => c.classes.map((cl) => cl.day))),
  ];
  return days.map((d) => d.slice(0, 3)).join(", ");
}

// Close on escape key
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Transition name="modal" appear>
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <!-- Panel -->
      <div
        class="modal-panel relative w-full max-w-lg max-h-[80vh] flex flex-col glass-card overflow-hidden"
        style="border-color: rgba(255, 255, 255, 0.1)"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-6 py-5 border-b border-surface-border"
        >
          <div>
            <h2 class="font-display text-xl font-semibold tracking-tight">
              Add Intake
            </h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Search by intake code to add all its courses
            </p>
          </div>
          <button
            class="btn-ghost !p-2 rounded-md text-muted-foreground hover:text-foreground"
            @click="$emit('close')"
            aria-label="Close modal"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Search -->
        <div class="px-6 py-4 border-b border-surface-border">
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              v-model="search"
              type="text"
              class="input-field !pl-10"
              placeholder="Search by intake code (e.g. AFCF2507ICT)"
            />
            <!-- Loading spinner inside search field -->
            <svg
              v-if="isPending"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          </div>
        </div>

        <!-- Intake list -->
        <div class="flex-1 overflow-y-auto px-2 py-2">
          <!-- Loading state -->
          <div
            v-if="isPending && filtered.length === 0"
            class="px-4 py-12 text-center"
          >
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
            <p class="text-sm text-muted-foreground">Searching intakes…</p>
          </div>

          <!-- Empty state -->
          <div v-else-if="filtered.length === 0" class="px-4 py-12 text-center">
            <p class="text-sm text-muted-foreground">
              {{
                search
                  ? "No intakes match your search"
                  : "Type an intake code to search"
              }}
            </p>
          </div>

          <!-- Results -->
          <button
            v-for="(intake, index) in filtered"
            :key="`${intake.intake}_${index}`"
            class="w-full flex items-start gap-3 px-4 py-3.5 rounded-lg text-left transition-all duration-200 hover:bg-white/[0.04] group"
            @click="selectIntake(intake)"
          >
            <!-- Arrow icon -->
            <div
              class="w-5 h-5 mt-0.5 rounded-md flex-shrink-0 flex items-center justify-center text-muted-foreground group-hover:text-accent transition-colors duration-200"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <!-- Intake info -->
            <div class="min-w-0 flex-1">
              <span
                class="text-sm font-mono tracking-wide text-accent font-semibold block"
              >
                {{ intake.intake }}
              </span>
              <span class="text-[11px] text-muted-foreground mt-1 block">
                {{ intake.courses.length }}
                {{ intake.courses.length === 1 ? "course" : "courses" }} ·
                {{ getDaysSummary(intake.courses) }}
              </span>
              <!-- Course names preview -->
              <span
                class="text-[11px] text-muted-foreground/70 mt-0.5 block truncate"
              >
                {{ intake.courses.map((c) => c.name).join(", ") }}
              </span>
            </div>
          </button>
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-4 border-t border-surface-border flex items-center justify-end"
        >
          <button
            class="btn-secondary !py-2 !px-4 text-sm"
            @click="$emit('close')"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
