<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from "vue";
import type { ExerciseSummary } from "../services/types";

type Intensity = "低强度" | "中等" | "中高强度" | "高强度";
type WorkoutType = "有氧" | "力量" | "瑜伽" | "HIIT" | "骑行" | "综合";
type TipTone = "positive" | "neutral" | "warning";

interface WeeklyGoal {
  targetSessions: number;
  targetMinutes: number;
  targetCalories: number;
}

interface Workout {
  id: number;
  title: string;
  type: WorkoutType;
  intensity: Intensity;
  plannedMinutes: number;
  calories: number;
  completed: boolean;
  actualSeconds: number;
  date: string;
  notes: string;
  suggestedTime: string;
  completedAt: string | null;
}

interface WorkoutForm {
  title: string;
  type: WorkoutType;
  intensity: Intensity;
  plannedMinutes: number;
  calories: number;
  notes: string;
  suggestedTime: string;
}

const props = defineProps<{
  summary: ExerciseSummary;
}>();

const emit = defineEmits<{
  (event: "change"): void;
}>();

const STORAGE_KEYS = {
  workouts: "lightbalance:exercise:workouts",
  timer: "lightbalance:exercise:timer",
  goal: "lightbalance:exercise:goal"
} as const;

const defaultWeeklyGoal: WeeklyGoal = {
  targetSessions: 5,
  targetMinutes: 180,
  targetCalories: 1200
};

const defaultWorkouts: Workout[] = [
  {
    id: 101,
    title: "快走燃脂",
    type: "有氧",
    intensity: "中等",
    plannedMinutes: 35,
    calories: 220,
    completed: true,
    actualSeconds: 31 * 60,
    date: getTodayDateString(),
    notes: "控制心率，保持可持续节奏。",
    suggestedTime: "晚饭后 1 小时",
    completedAt: new Date().toISOString()
  },
  {
    id: 102,
    title: "核心力量",
    type: "力量",
    intensity: "中高强度",
    plannedMinutes: 30,
    calories: 180,
    completed: false,
    actualSeconds: 0,
    date: getTodayDateString(),
    notes: "平板支撑、死虫、臀桥组合。",
    suggestedTime: "下午或傍晚",
    completedAt: null
  },
  {
    id: 103,
    title: "瑜伽拉伸",
    type: "瑜伽",
    intensity: "低强度",
    plannedMinutes: 25,
    calories: 90,
    completed: false,
    actualSeconds: 0,
    date: getTodayDateString(),
    notes: "肩颈、髋部和下背放松。",
    suggestedTime: "睡前 40 分钟",
    completedAt: null
  },
  {
    id: 104,
    title: "HIIT 间歇",
    type: "HIIT",
    intensity: "高强度",
    plannedMinutes: 18,
    calories: 210,
    completed: false,
    actualSeconds: 0,
    date: getTodayDateString(),
    notes: "20 秒动作 + 40 秒恢复，按状态减少组数。",
    suggestedTime: "精力较好时",
    completedAt: null
  },
  {
    id: 105,
    title: "骑行有氧",
    type: "骑行",
    intensity: "中等",
    plannedMinutes: 40,
    calories: 260,
    completed: false,
    actualSeconds: 0,
    date: getTodayDateString(),
    notes: "保持稳定踏频，避免一开始冲太快。",
    suggestedTime: "周末上午",
    completedAt: null
  }
];

const fallbackWorkouts = computed<Workout[]>(() =>
  props.summary.workouts.map((item) => ({
    id: item.id,
    title: item.name,
    type: normalizeWorkoutType(item.category),
    intensity: normalizeIntensity(item.intensity),
    plannedMinutes: normalizeNumber(item.durationMinutes, 20),
    calories: normalizeNumber(item.caloriesBurned, 100),
    completed: item.status.includes("完成"),
    actualSeconds: normalizeNumber(item.durationMinutes, 0) * 60,
    date: item.performedAt.slice(0, 10),
    notes: item.notes,
    suggestedTime: "根据个人日程安排",
    completedAt: item.status.includes("完成") ? item.performedAt : null
  }))
);

const workouts = ref<Workout[]>([]);
const weeklyGoal = reactive<WeeklyGoal>({ ...defaultWeeklyGoal });
const currentWorkoutId = ref<number | null>(null);
const timerSeconds = ref(0);
const timerRunning = ref(false);
const formError = ref("");
const toast = ref("");
let timerId: ReturnType<typeof setInterval> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const form = reactive<WorkoutForm>({
  title: "",
  type: "综合",
  intensity: "中等",
  plannedMinutes: 30,
  calories: 180,
  notes: "",
  suggestedTime: "今天傍晚"
});

loadExerciseState();

const completedWorkouts = computed(() => workouts.value.filter((item) => item.completed));
const incompleteWorkouts = computed(() => workouts.value.filter((item) => !item.completed));
const currentWorkout = computed(() => workouts.value.find((item) => item.id === currentWorkoutId.value) ?? null);

const weeklySummary = computed(() => {
  const completed = completedWorkouts.value;
  const totalMinutes = completed.reduce((sum, item) => sum + actualMinutes(item), 0);
  const totalCalories = completed.reduce((sum, item) => sum + item.calories, 0);
  const highIntensityCount = completed.filter((item) => item.intensity === "高强度" || item.intensity === "中高强度").length;

  return {
    completedSessions: completed.length,
    totalMinutes,
    totalCalories,
    remainingSessions: Math.max(weeklyGoal.targetSessions - completed.length, 0),
    sessionRate: safePercent(completed.length, weeklyGoal.targetSessions),
    minuteRate: safePercent(totalMinutes, weeklyGoal.targetMinutes),
    calorieRate: safePercent(totalCalories, weeklyGoal.targetCalories),
    highIntensityCount
  };
});

const summaryCards = computed(() => [
  {
    label: "本周目标",
    value: `${weeklyGoal.targetSessions} 次`,
    note: `${weeklyGoal.targetMinutes} 分钟 / ${weeklyGoal.targetCalories} kcal`
  },
  {
    label: "已完成次数",
    value: `${weeklySummary.value.completedSessions} 次`,
    note: `还需 ${weeklySummary.value.remainingSessions} 次`
  },
  {
    label: "累计分钟数",
    value: `${weeklySummary.value.totalMinutes} 分钟`,
    note: `完成率 ${Math.round(weeklySummary.value.minuteRate)}%`
  },
  {
    label: "累计消耗",
    value: `${weeklySummary.value.totalCalories} kcal`,
    note: `目标完成 ${Math.round(weeklySummary.value.calorieRate)}%`
  }
]);

const trainingTips = computed(() => {
  const tips: { title: string; detail: string; tone: TipTone }[] = [];
  const summary = weeklySummary.value;

  if (summary.remainingSessions > 0) {
    tips.push({
      title: "训练次数还需推进",
      detail: `本周还需要完成 ${summary.remainingSessions} 次训练，可优先选择 20 到 35 分钟的低门槛计划。`,
      tone: summary.remainingSessions >= 3 ? "warning" : "neutral"
    });
  }

  if (summary.totalMinutes < weeklyGoal.targetMinutes) {
    tips.push({
      title: "累计时长仍有缺口",
      detail: `距离周目标还差 ${weeklyGoal.targetMinutes - summary.totalMinutes} 分钟，可安排快走、骑行或瑜伽拉伸补足。`,
      tone: "neutral"
    });
  }

  if (summary.completedSessions >= weeklyGoal.targetSessions && summary.totalMinutes >= weeklyGoal.targetMinutes) {
    tips.push({
      title: "本周训练目标已达成",
      detail: "后续重点可以放在恢复、睡眠和轻量活动，保持节奏比额外加量更重要。",
      tone: "positive"
    });
  }

  if (summary.highIntensityCount >= 3) {
    tips.push({
      title: "高强度训练偏多",
      detail: "连续高强度训练容易影响恢复，建议穿插低强度有氧或拉伸，给肌肉和关节留出恢复时间。",
      tone: "warning"
    });
  }

  if (tips.length === 0) {
    tips.push({
      title: "训练节奏稳定",
      detail: "当前计划有完成也有待执行任务，适合继续按计划推进，不需要突然增加训练量。",
      tone: "positive"
    });
  }

  return tips;
});

const timerProgress = computed(() => {
  if (!currentWorkout.value) return 0;
  return safePercent(timerSeconds.value, currentWorkout.value.plannedMinutes * 60);
});

watch(
  [workouts, currentWorkoutId, timerSeconds, weeklyGoal],
  () => {
    saveExerciseState();
  },
  { deep: true }
);

function loadExerciseState() {
  const storedGoal = readJson<Partial<WeeklyGoal>>(STORAGE_KEYS.goal, {});
  Object.assign(weeklyGoal, sanitizeWeeklyGoal({ ...defaultWeeklyGoal, ...storedGoal }));

  const storedWorkouts = readJson<Workout[] | null>(STORAGE_KEYS.workouts, null);
  const initialWorkouts = Array.isArray(storedWorkouts) ? storedWorkouts : fallbackWorkouts.value.length > 0 ? fallbackWorkouts.value : defaultWorkouts;
  workouts.value = initialWorkouts.map(sanitizeWorkout).filter((item): item is Workout => item !== null);

  const timerState = readJson<{ currentWorkoutId: number | null; timerSeconds: number }>(STORAGE_KEYS.timer, {
    currentWorkoutId: null,
    timerSeconds: 0
  });
  currentWorkoutId.value = workouts.value.some((item) => item.id === timerState.currentWorkoutId) ? timerState.currentWorkoutId : null;
  timerSeconds.value = Math.round(normalizeNumber(timerState.timerSeconds));
  timerRunning.value = false;
}

function saveExerciseState() {
  localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(workouts.value));
  localStorage.setItem(
    STORAGE_KEYS.timer,
    JSON.stringify({
      currentWorkoutId: currentWorkoutId.value,
      timerSeconds: timerSeconds.value
    })
  );
  localStorage.setItem(STORAGE_KEYS.goal, JSON.stringify({ ...weeklyGoal }));
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (err) {
    console.warn(`Failed to parse ${key}`, err);
    return fallback;
  }
}

function sanitizeWeeklyGoal(goal: WeeklyGoal): WeeklyGoal {
  return {
    targetSessions: Math.max(Math.round(normalizeNumber(goal.targetSessions, defaultWeeklyGoal.targetSessions)), 1),
    targetMinutes: Math.max(Math.round(normalizeNumber(goal.targetMinutes, defaultWeeklyGoal.targetMinutes)), 1),
    targetCalories: Math.max(Math.round(normalizeNumber(goal.targetCalories, defaultWeeklyGoal.targetCalories)), 1)
  };
}

function sanitizeWorkout(item: Partial<Workout>): Workout | null {
  const title = String(item.title ?? "").trim();
  if (!title) return null;

  return {
    id: Number.isFinite(Number(item.id)) ? Number(item.id) : Date.now(),
    title,
    type: normalizeWorkoutType(String(item.type ?? "")),
    intensity: normalizeIntensity(String(item.intensity ?? "")),
    plannedMinutes: Math.max(Math.round(normalizeNumber(item.plannedMinutes, 20)), 1),
    calories: Math.max(Math.round(normalizeNumber(item.calories, 100)), 0),
    completed: Boolean(item.completed),
    actualSeconds: Math.round(normalizeNumber(item.actualSeconds)),
    date: String(item.date ?? getTodayDateString()),
    notes: String(item.notes ?? ""),
    suggestedTime: String(item.suggestedTime ?? "根据个人日程安排"),
    completedAt: item.completedAt ? String(item.completedAt) : null
  };
}

function normalizeWorkoutType(value: string): WorkoutType {
  const types: WorkoutType[] = ["有氧", "力量", "瑜伽", "HIIT", "骑行", "综合"];
  return types.includes(value as WorkoutType) ? (value as WorkoutType) : "综合";
}

function normalizeIntensity(value: string): Intensity {
  const intensities: Intensity[] = ["低强度", "中等", "中高强度", "高强度"];
  return intensities.includes(value as Intensity) ? (value as Intensity) : "中等";
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(numberValue, 0) : fallback;
}

function safePercent(value: number, target: number) {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.min(Math.max((Math.max(value, 0) / target) * 100, 0), 100);
}

function getTodayDateString() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function actualMinutes(workout: Workout) {
  const seconds = workout.actualSeconds > 0 ? workout.actualSeconds : workout.plannedMinutes * 60;
  return Math.round(seconds / 60);
}

function startWorkout(workout: Workout) {
  if (timerRunning.value && currentWorkoutId.value !== workout.id) {
    showToast("当前训练仍在计时，请先暂停或完成后再开始新的任务");
    return;
  }

  currentWorkoutId.value = workout.id;
  timerSeconds.value = workout.actualSeconds || 0;
  startTimer();
  showToast(`${workout.title} 已开始`);
}

function startTimer() {
  if (!currentWorkout.value || timerId) {
    return;
  }

  timerRunning.value = true;
  timerId = setInterval(() => {
    timerSeconds.value += 1;
  }, 1000);
}

function pauseTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  timerRunning.value = false;
}

function resumeTimer() {
  if (!currentWorkout.value) {
    showToast("请先从未完成任务中选择训练");
    return;
  }
  startTimer();
}

function resetTimer() {
  pauseTimer();
  timerSeconds.value = 0;
  showToast("计时器已重置");
}

function completeCurrentWorkout() {
  const workout = currentWorkout.value;
  if (!workout) {
    showToast("请先选择当前训练任务");
    return;
  }

  pauseTimer();
  const actualSeconds = Math.max(timerSeconds.value, 0);
  workouts.value = workouts.value.map((item) =>
    item.id === workout.id
      ? {
          ...item,
          completed: true,
          actualSeconds,
          date: getTodayDateString(),
          completedAt: new Date().toISOString()
        }
      : item
  );
  currentWorkoutId.value = null;
  timerSeconds.value = 0;
  emit("change");
  showToast(`${workout.title} 已完成并写入训练日志`);
}

function undoComplete(workout: Workout) {
  workouts.value = workouts.value.map((item) =>
    item.id === workout.id
      ? {
          ...item,
          completed: false,
          actualSeconds: 0,
          completedAt: null
        }
      : item
  );
  emit("change");
  showToast("已恢复为未完成任务");
}

function handleSubmit() {
  formError.value = "";
  const title = form.title.trim();
  const numbers = [form.plannedMinutes, form.calories];

  if (!title) {
    formError.value = "请填写训练名称。";
    return;
  }

  if (numbers.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) {
    formError.value = "训练时长和预计热量不能为负数。";
    return;
  }

  workouts.value = [
    {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title,
      type: form.type,
      intensity: form.intensity,
      plannedMinutes: Math.round(Number(form.plannedMinutes)),
      calories: Math.round(Number(form.calories)),
      completed: false,
      actualSeconds: 0,
      date: getTodayDateString(),
      notes: form.notes.trim(),
      suggestedTime: form.suggestedTime.trim() || "根据个人日程安排",
      completedAt: null
    },
    ...workouts.value
  ];
  resetForm();
  showToast("自定义训练已加入未完成计划");
}

function resetForm() {
  form.title = "";
  form.type = "综合";
  form.intensity = "中等";
  form.plannedMinutes = 30;
  form.calories = 180;
  form.notes = "";
  form.suggestedTime = "今天傍晚";
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(Math.round(seconds), 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  const minuteLabel = `${minutes}`.padStart(2, "0");
  const secondLabel = `${secs}`.padStart(2, "0");
  return hours > 0 ? `${hours}:${minuteLabel}:${secondLabel}` : `${minuteLabel}:${secondLabel}`;
}

function formatCompletedAt(value: string | null) {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function showToast(message: string) {
  toast.value = message;
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    toast.value = "";
  }, 1800);
}

onUnmounted(() => {
  pauseTimer();
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
});
</script>

<template>
  <section class="exercise-page">
    <article class="hero panel">
      <div class="hero__content">
        <p class="eyebrow">Weekly Training</p>
        <h3>训练计划执行与本周完成反馈</h3>
        <p class="hero__copy">
          将训练目标、当前任务、计时器、未完成计划和训练日志放在同一页面，形成计划、执行、反馈闭环。
        </p>
      </div>

      <div class="hero__progress">
        <strong>{{ Math.round(weeklySummary.sessionRate) }}%</strong>
        <span>本周次数完成率</span>
        <div class="progress">
          <span class="progress__fill" :style="{ width: `${weeklySummary.sessionRate}%` }"></span>
        </div>
      </div>
    </article>

    <section class="summary-grid">
      <article v-for="card in summaryCards" :key="card.label" class="metric-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <small>{{ card.note }}</small>
      </article>
    </section>

    <section class="layout-grid">
      <article class="panel timer-panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Current Session</p>
            <h4>当前训练任务</h4>
          </div>
          <span class="status-pill" :data-active="timerRunning">{{ timerRunning ? "计时中" : "待执行" }}</span>
        </div>

        <div v-if="currentWorkout" class="current-card">
          <div>
            <strong>{{ currentWorkout.title }}</strong>
            <p>{{ currentWorkout.type }} / {{ currentWorkout.intensity }} / 计划 {{ currentWorkout.plannedMinutes }} 分钟</p>
            <small>预计消耗 {{ currentWorkout.calories }} kcal，建议 {{ currentWorkout.suggestedTime }}</small>
          </div>
          <div class="timer-display">{{ formatDuration(timerSeconds) }}</div>
          <div class="progress">
            <span class="progress__fill" :style="{ width: `${timerProgress}%` }"></span>
          </div>
          <div class="button-row">
            <button type="button" :disabled="timerRunning" @click="resumeTimer">开始/继续</button>
            <button type="button" :disabled="!timerRunning" @click="pauseTimer">暂停</button>
            <button type="button" @click="resetTimer">重置</button>
            <button type="button" class="primary-button" @click="completeCurrentWorkout">完成训练</button>
          </div>
        </div>

        <div v-else class="empty-state">
          <strong>尚未选择训练</strong>
          <p>从未完成训练计划中点击“开始训练”，这里会显示任务信息和计时器。</p>
        </div>
      </article>

      <aside class="panel panel--tips">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Feedback</p>
            <h4>周统计与训练建议</h4>
          </div>
        </div>

        <div class="target-bars">
          <article>
            <span>次数目标</span>
            <strong>{{ weeklySummary.completedSessions }} / {{ weeklyGoal.targetSessions }}</strong>
            <div class="progress progress--thin">
              <span class="progress__fill" :style="{ width: `${weeklySummary.sessionRate}%` }"></span>
            </div>
          </article>
          <article>
            <span>分钟目标</span>
            <strong>{{ weeklySummary.totalMinutes }} / {{ weeklyGoal.targetMinutes }}</strong>
            <div class="progress progress--thin">
              <span class="progress__fill" :style="{ width: `${weeklySummary.minuteRate}%` }"></span>
            </div>
          </article>
          <article>
            <span>热量目标</span>
            <strong>{{ weeklySummary.totalCalories }} / {{ weeklyGoal.targetCalories }}</strong>
            <div class="progress progress--thin">
              <span class="progress__fill" :style="{ width: `${weeklySummary.calorieRate}%` }"></span>
            </div>
          </article>
        </div>

        <div class="tip-list">
          <article v-for="tip in trainingTips" :key="tip.title" class="tip-card" :data-tone="tip.tone">
            <strong>{{ tip.title }}</strong>
            <p>{{ tip.detail }}</p>
          </article>
        </div>
      </aside>
    </section>

    <section class="layout-grid">
      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Todo</p>
            <h4>未完成训练计划</h4>
          </div>
          <span class="panel__hint">{{ incompleteWorkouts.length }} 项待完成</span>
        </div>

        <div class="workout-list">
          <article v-for="workout in incompleteWorkouts" :key="workout.id" class="workout-card">
            <div class="workout-card__main">
              <span>{{ workout.type }} / {{ workout.intensity }}</span>
              <strong>{{ workout.title }}</strong>
              <p>{{ workout.notes || "暂无备注" }}</p>
            </div>
            <div class="workout-card__meta">
              <span>{{ workout.plannedMinutes }} 分钟</span>
              <span>{{ workout.calories }} kcal</span>
              <span>{{ workout.suggestedTime }}</span>
            </div>
            <button class="primary-button" type="button" :disabled="timerRunning && currentWorkoutId !== workout.id" @click="startWorkout(workout)">
              {{ currentWorkoutId === workout.id ? "继续当前训练" : "开始训练" }}
            </button>
          </article>
          <div v-if="incompleteWorkouts.length === 0" class="empty-state">
            <strong>未完成任务已清空</strong>
            <p>可以添加自定义训练，或在已完成日志中撤销某条记录用于演示。</p>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Done</p>
            <h4>已完成训练日志</h4>
          </div>
          <span class="panel__hint">{{ completedWorkouts.length }} 条记录</span>
        </div>

        <div class="workout-list">
          <article v-for="workout in completedWorkouts" :key="workout.id" class="workout-card workout-card--done">
            <div class="workout-card__main">
              <span>{{ formatCompletedAt(workout.completedAt) }}</span>
              <strong>{{ workout.title }}</strong>
              <p>{{ workout.notes || "暂无备注" }}</p>
            </div>
            <div class="workout-card__meta">
              <span>实际 {{ formatDuration(workout.actualSeconds) }}</span>
              <span>{{ workout.calories }} kcal</span>
              <span>{{ workout.intensity }}</span>
            </div>
            <button class="ghost-button" type="button" @click="undoComplete(workout)">恢复为未完成</button>
          </article>
          <div v-if="completedWorkouts.length === 0" class="empty-state">
            <strong>暂无完成记录</strong>
            <p>完成当前训练后，这里会同步生成训练日志。</p>
          </div>
        </div>
      </article>
    </section>

    <article class="panel">
      <div class="panel__header">
        <div>
          <p class="eyebrow">Custom Plan</p>
          <h4>添加自定义训练</h4>
        </div>
      </div>

      <form class="entry-form" @submit.prevent="handleSubmit">
        <label class="entry-form__wide">
          <span>训练名称</span>
          <input v-model="form.title" type="text" placeholder="例如：下肢力量训练" />
        </label>
        <label>
          <span>类型</span>
          <select v-model="form.type">
            <option>有氧</option>
            <option>力量</option>
            <option>瑜伽</option>
            <option>HIIT</option>
            <option>骑行</option>
            <option>综合</option>
          </select>
        </label>
        <label>
          <span>强度</span>
          <select v-model="form.intensity">
            <option>低强度</option>
            <option>中等</option>
            <option>中高强度</option>
            <option>高强度</option>
          </select>
        </label>
        <label>
          <span>计划分钟</span>
          <input v-model.number="form.plannedMinutes" type="number" min="0" />
        </label>
        <label>
          <span>预计热量</span>
          <input v-model.number="form.calories" type="number" min="0" />
        </label>
        <label>
          <span>建议时间</span>
          <input v-model="form.suggestedTime" type="text" />
        </label>
        <label class="entry-form__wide">
          <span>备注</span>
          <input v-model="form.notes" type="text" placeholder="例如：控制配速、注意膝盖、训练后拉伸" />
        </label>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <button class="primary-button" type="submit">加入未完成训练</button>
      </form>
    </article>

    <transition name="toast-fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </section>
</template>

<style scoped>
.exercise-page {
  display: grid;
  gap: 18px;
  padding-right: 18px;
}

.panel,
.metric-card {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.panel {
  padding: 22px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 18px;
  background: linear-gradient(135deg, var(--color-surface-strong), rgba(240, 248, 242, 0.96));
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 0.76rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.hero h3,
.panel h4 {
  margin: 0;
  color: var(--color-text);
}

.hero h3 {
  font-size: 1.8rem;
  line-height: 1.18;
}

.hero__copy,
.metric-card small,
.panel__hint,
.workout-card p,
.workout-card__main span,
.workout-card__meta span,
.tip-card p,
.empty-state p,
.current-card p,
.current-card small,
.target-bars span {
  color: var(--color-text-soft);
}

.hero__copy {
  max-width: 760px;
  margin: 12px 0 0;
  line-height: 1.75;
}

.hero__progress {
  display: grid;
  align-content: center;
  gap: 8px;
  padding: 20px;
  border-radius: var(--radius-card);
  background: var(--color-surface-soft);
  border: 1px solid var(--color-line);
}

.hero__progress strong {
  color: var(--color-text);
  font-size: 2rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.metric-card span {
  color: var(--color-text-soft);
}

.metric-card strong,
.current-card strong,
.workout-card strong,
.tip-card strong,
.target-bars strong,
.empty-state strong {
  color: var(--color-text);
}

.metric-card strong {
  font-size: 1.45rem;
}

.layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.82fr);
  gap: 18px;
}

.panel__header,
.workout-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.panel__header {
  align-items: flex-start;
  margin-bottom: 16px;
}

.status-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(57, 87, 63, 0.08);
  color: #335140;
  font-weight: 800;
}

.status-pill[data-active="true"] {
  background: rgba(64, 135, 82, 0.16);
  color: #236037;
}

.current-card,
.empty-state,
.tip-card,
.target-bars article,
.workout-card {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  background: var(--color-surface-soft);
}

.current-card {
  display: grid;
  gap: 14px;
  padding: 20px;
}

.timer-display {
  color: #273e32;
  font-size: 3.4rem;
  font-weight: 800;
  line-height: 1;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.button-row button,
.primary-button,
.ghost-button {
  border: 0;
  cursor: pointer;
  font-weight: 800;
}

.button-row button,
.ghost-button {
  padding: 10px 13px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.button-row button:disabled,
.primary-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.primary-button {
  padding: 10px 14px;
  border-radius: var(--radius-control);
  background: linear-gradient(135deg, var(--color-primary-strong), #5f876b);
  color: #f7fbf8;
  box-shadow: 0 10px 20px rgba(47, 87, 66, 0.16);
}

.target-bars,
.tip-list,
.workout-list {
  display: grid;
  gap: 12px;
}

.target-bars {
  margin-bottom: 14px;
}

.target-bars article,
.tip-card,
.empty-state {
  padding: 16px;
}

.tip-card[data-tone="positive"] {
  border-color: rgba(67, 143, 82, 0.24);
  background: rgba(239, 249, 239, 0.82);
}

.tip-card[data-tone="warning"] {
  border-color: rgba(201, 148, 65, 0.28);
  background: rgba(255, 246, 226, 0.86);
}

.tip-card p,
.empty-state p {
  margin: 8px 0 0;
  line-height: 1.65;
}

.workout-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  padding: 16px;
}

.workout-card--done {
  background: rgba(240, 248, 241, 0.72);
}

.workout-card__main {
  display: grid;
  gap: 6px;
}

.workout-card__main p {
  margin: 0;
}

.workout-card__meta {
  align-items: center;
  flex-wrap: wrap;
}

.workout-card__meta span {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(49, 79, 63, 0.08);
  color: #365745;
  font-size: 0.82rem;
  font-weight: 700;
}

.entry-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.entry-form label {
  display: grid;
  gap: 8px;
}

.entry-form__wide {
  grid-column: span 2;
}

.entry-form label span {
  color: var(--color-text-soft);
  font-size: 0.86rem;
}

.entry-form input,
.entry-form select {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 13px;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background: var(--color-surface-strong);
  color: var(--color-text);
}

.entry-form .primary-button,
.form-error {
  grid-column: 1 / -1;
}

.form-error {
  margin: 0;
  color: #8a3c3c;
  font-weight: 700;
}

.progress {
  height: 10px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(57, 87, 63, 0.1);
}

.progress--thin {
  height: 8px;
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #31513e, #78aa70, #f0c46e);
}

.toast {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 1200;
  padding: 12px 16px;
  border-radius: var(--radius-control);
  background: var(--color-primary);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 16px 30px rgba(24, 33, 27, 0.18);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 1280px) {
  .hero,
  .summary-grid,
  .layout-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 880px) {
  .panel__header,
  .workout-card,
  .workout-card__meta {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: flex-start;
  }

  .entry-form {
    grid-template-columns: 1fr;
  }

  .entry-form__wide {
    grid-column: span 1;
  }

  .timer-display {
    font-size: 2.8rem;
  }
}
</style>
