import { computed, onMounted, reactive, ref } from "vue";
import { getBodyProfile } from "../backend/body";
import { askAssistant, getAssistantPlan, probeGeminiConnection } from "../backend/assistant";
import { getOverviewSummary } from "../backend/overview";
import { getDietSummary } from "../backend/diet";
import { getExerciseSummary } from "../backend/exercise";
import { getTrendSummary } from "../backend/trend";
import type {
  AskAssistantInput,
  AssistantPlan,
  BodyProfile,
  DietSummary,
  ExerciseSummary,
  GeminiProbeResult,
  LoadingState,
  ModuleKey,
  OverviewSummary,
  TrendSummary
} from "../types";

export function useDesktopApp() {
  const currentView = ref<ModuleKey>("overview");
  const planBusy = ref(false);
  const probeBusy = ref(false);

  const overview = ref<OverviewSummary | null>(null);
  const body = ref<BodyProfile | null>(null);
  const diet = ref<DietSummary | null>(null);
  const exercise = ref<ExerciseSummary | null>(null);
  const trend = ref<TrendSummary | null>(null);
  const assistantPlan = ref<AssistantPlan | null>(null);
  const geminiProbeResult = ref<GeminiProbeResult | null>(null);

  const moduleLoading = reactive<LoadingState>({
    overview: true,
    body: true,
    diet: true,
    exercise: true,
    trend: true,
    assistant: true
  });

  const totalModules = 6;

  const loading = computed(() => Object.values(moduleLoading).some(Boolean));
  const loadedModulesCount = computed(() => {
    return [overview, body, diet, exercise, trend, assistantPlan].filter((item) => item.value !== null).length;
  });

  async function loadRefData<T>(
    key: keyof LoadingState,
    loader: () => Promise<T>,
    target: { value: T | null }
  ) {
    moduleLoading[key] = true;

    try {
      target.value = await loader();
    } finally {
      moduleLoading[key] = false;
    }
  }

  function loadDesktopData() {
    void loadRefData("overview", getOverviewSummary, overview);
    void loadRefData("body", getBodyProfile, body);
    void loadRefData("diet", getDietSummary, diet);
    void loadRefData("exercise", getExerciseSummary, exercise);
    void loadRefData("trend", getTrendSummary, trend);
    void loadRefData("assistant", getAssistantPlan, assistantPlan);
  }

  async function refreshAssistantPlan(input?: AskAssistantInput) {
    planBusy.value = true;

    try {
      assistantPlan.value = input?.question ? await askAssistant(input) : await getAssistantPlan();
    } finally {
      planBusy.value = false;
    }
  }

  async function runGeminiProbe() {
    probeBusy.value = true;

    try {
      geminiProbeResult.value = await probeGeminiConnection();
    } finally {
      probeBusy.value = false;
    }
  }

  async function refreshOverview() {
    await loadRefData("overview", getOverviewSummary, overview);
  }

  async function refreshBody() {
    await loadRefData("body", getBodyProfile, body);
  }

  function handleNavigate(view: ModuleKey) {
    currentView.value = view;
  }

  onMounted(() => {
    loadDesktopData();
  });

  return {
    assistantPlan,
    body,
    currentView,
    overview,
    diet,
    exercise,
    handleNavigate,
    loadedModulesCount,
    loading,
    moduleLoading,
    geminiProbeResult,
    planBusy,
    probeBusy,
    refreshBody,
    refreshOverview,
    refreshAssistantPlan,
    runGeminiProbe,
    totalModules,
    trend
  };
}
