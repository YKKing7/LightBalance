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

function createAssistantFallbackPlan(reason: unknown): AssistantPlan {
  const message = reason instanceof Error ? reason.message : "智能建议服务暂时不可用";

  return {
    generatedAt: new Date().toISOString(),
    title: "智能建议模块待连接",
    focus: "配置检查",
    summary: "当前智能建议页面已经可以打开，但后端桥接、数据库或 Gemini API 暂时没有返回可用结果。请先检查 .env 中的数据库和 Gemini 配置，再点击页面右上角的验证 Gemini。",
    agentName: "Astra",
    modelLabel: "Gemini",
    persona: "健康节律 Agent",
    capabilities: ["配置检查", "本地兜底提示", "后续智能建议"],
    modalityIdeas: [
      {
        title: "饮食记录截图",
        detail: "后续可用于让智能建议结合饮食结构给出调整建议。",
        prompt: "我可以给你一张饮食记录截图，你会重点看哪些信息？",
        inputType: "meal_photo",
        why: "补充真实饮食上下文后，建议会更具体。",
        captureTips: ["保留食物名称", "保留热量和营养字段", "尽量包含当天完整记录"]
      }
    ],
    readinessScore: 0,
    riskLabel: "待配置",
    nextCheckIn: "完成配置后重新进入模块",
    quickQuestions: ["为什么智能建议暂时不可用？", "我应该先检查哪些配置？"],
    metrics: [
      {
        label: "模块状态",
        value: "待连接",
        note: "页面兜底内容已显示，真实智能建议需要服务层正常返回。",
        tone: "warning"
      },
      {
        label: "Gemini 配置",
        value: "待验证",
        note: "请确认 LIGHTBALANCE_GEMINI_API_KEY、BASE_URL 和 MODEL。",
        tone: "neutral"
      },
      {
        label: "数据库配置",
        value: "待确认",
        note: "请确认 MySQL 主机、端口、用户、密码和数据库名可用。",
        tone: "neutral"
      }
    ],
    priorities: [
      {
        title: "先确认端口和桌面桥接",
        detail: "确保 npm run dev 已正常启动 Electron，并且页面不是在普通浏览器中直接打开。",
        score: 90,
        tone: "warning"
      },
      {
        title: "再检查 .env 配置",
        detail: "智能建议会读取 Gemini 和数据库配置，配置缺失或错误都会导致真实建议加载失败。",
        score: 86,
        tone: "neutral"
      }
    ],
    insights: [
      {
        title: "已启用前端兜底",
        detail: "即使智能建议服务失败，页面也会展示排查说明，不再表现为打不开。",
        evidence: message,
        tone: "warning"
      }
    ],
    actions: [
      {
        title: "点击验证 Gemini",
        detail: "进入智能建议页面后，点击右上角验证按钮，查看 API key 和接口是否连通。",
        impact: "判断是否为模型接口配置问题",
        difficulty: "低",
        timeline: "现在",
        tone: "neutral"
      }
    ],
    derivedContents: [
      {
        title: "配置排查顺序",
        detail: "先确认 dev 服务和 Electron 桥接，再确认 MySQL，最后确认 Gemini API。",
        reason: "智能建议页面依赖链路较长，按顺序排查能更快定位问题。",
        category: "habit",
        cta: "完成配置后刷新页面"
      }
    ],
    reminders: ["不要把 .env 提交到 Git", "不要在报告或截图中暴露 API key", "配置完成后重新运行 npm run dev"],
    conversation: [
      {
        id: -100,
        role: "assistant",
        content: `智能建议模块服务暂时没有返回成功结果。当前错误摘要：${message}`,
        tag: "配置提示",
        createdAt: new Date().toISOString()
      }
    ]
  };
}

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
    } catch (error) {
      console.error(`Failed to load ${key}`, error);
      if (key === "assistant") {
        (target as { value: AssistantPlan | null }).value = createAssistantFallbackPlan(error);
      } else {
        target.value = null;
      }
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
    } catch (error) {
      console.error("Failed to refresh assistant plan", error);
      assistantPlan.value = createAssistantFallbackPlan(error);
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
    // 每次切换标签时，自动为进入的模块静默刷新一次最新数据，确保与其他页面的修改同步
    switch (view) {
      case "overview":
        void refreshOverview();
        break;
      case "body":
        void refreshBody();
        break;
      case "diet":
        void loadRefData("diet", getDietSummary, diet);
        break;
      case "exercise":
        void loadRefData("exercise", getExerciseSummary, exercise);
        break;
      case "trend":
        void loadRefData("trend", getTrendSummary, trend);
        break;
    }
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
