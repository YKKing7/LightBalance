<script setup lang="ts">
import { computed, reactive, watch, ref } from "vue";
import type { BodyProfile, TrendSeriesPoint, TrendSummary, UserProfileRecord } from "../services/types";
import { clamp } from "../services/utils/format";

const isEditing = ref(false);

const props = defineProps<{
  profile: BodyProfile;
  record: UserProfileRecord | null;
  trendSummary?: TrendSummary | null;
  loading: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [
    payload: {
      nickname: string;
      age: number;
      gender: string;
      heightCm: number;
      currentWeightKg: number;
      bodyFatRate: number | null;
      targetWeightKg: number;
      targetBodyFatRate: number | null;
      weeklyWorkoutTarget: number;
      dailyCalorieTarget: number;
      sleepTargetHours: number;
      workStyle: string;
      stressLevel: string;
      smokingStatus: string;
      drinkingFrequency: string;
      habitSleep: string;
      habitDiet: string;
      habitExercise: string;
    }
  ];
}>();

const form = reactive({
  nickname: "",
  age: 18,
  gender: "未设置",
  heightCm: 170,
  currentWeightKg: 60,
  bodyFatRate: "" as string | number,
  targetWeightKg: 57,
  targetBodyFatRate: "" as string | number,
  weeklyWorkoutTarget: 4,
  dailyCalorieTarget: 1600,
  sleepTargetHours: 7.5,
  workStyle: "",
  stressLevel: "中",
  smokingStatus: "从不",
  drinkingFrequency: "几乎不",
  habitSleep: "",
  habitDiet: "",
  habitExercise: ""
});

const saveNotice = ref<{ tone: "warning" | "success"; message: string } | null>(null);
const isDirty = ref(false);
const showUnsavedDialog = ref(false);

function toFiniteNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return NaN;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  return NaN;
}

function roundNumber(value: number, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function bmiToneByValue(value: number | null): "positive" | "warning" | "danger" {
  if (value === null) return "positive";
  if (value >= 18.5 && value < 24) return "positive";
  if (value >= 24 && value < 28) return "warning";
  return "danger";
}

function bmiLabelByValue(value: number | null) {
  if (value === null) return "待完善";
  if (value < 18.5) return "偏瘦";
  if (value < 24) return "正常";
  if (value < 28) return "超重";
  return "肥胖";
}

const draftBmi = computed(() => {
  const heightCm = toFiniteNumber(form.heightCm);
  const weightKg = toFiniteNumber(form.currentWeightKg);
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) {
    return null;
  }

  return roundNumber(weightKg / (heightCm / 100) ** 2, 1);
});

const draftBmiTone = computed(() => bmiToneByValue(draftBmi.value));
const draftBmiLabel = computed(() => bmiLabelByValue(draftBmi.value));

const validationIssues = computed(() => {
  const issues: string[] = [];

  if (!form.nickname.trim()) {
    issues.push("昵称不能为空");
  }

  const age = toFiniteNumber(form.age);
  if (!Number.isFinite(age) || age < 10 || age > 100) {
    issues.push("年龄需在 10-100 之间");
  }

  const heightCm = toFiniteNumber(form.heightCm);
  if (!Number.isFinite(heightCm) || heightCm < 120 || heightCm > 230) {
    issues.push("身高需在 120-230 cm 之间");
  }

  const weightKg = toFiniteNumber(form.currentWeightKg);
  if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 300) {
    issues.push("当前体重需在 25-300 kg 之间");
  }

  const targetWeightKg = toFiniteNumber(form.targetWeightKg);
  if (!Number.isFinite(targetWeightKg) || targetWeightKg < 25 || targetWeightKg > 250) {
    issues.push("目标体重需在 25-250 kg 之间");
  }

  const bodyFatRate = form.bodyFatRate === "" ? null : toFiniteNumber(form.bodyFatRate);
  if (bodyFatRate !== null && (!Number.isFinite(bodyFatRate) || bodyFatRate < 3 || bodyFatRate > 70)) {
    issues.push("体脂率建议填写在 3%-70% 区间");
  }

  const targetBodyFatRate = form.targetBodyFatRate === "" ? null : toFiniteNumber(form.targetBodyFatRate);
  if (targetBodyFatRate !== null && (!Number.isFinite(targetBodyFatRate) || targetBodyFatRate < 3 || targetBodyFatRate > 65)) {
    issues.push("目标体脂建议填写在 3%-65% 区间");
  }

  const weeklyWorkoutTarget = toFiniteNumber(form.weeklyWorkoutTarget);
  if (!Number.isFinite(weeklyWorkoutTarget) || weeklyWorkoutTarget < 0 || weeklyWorkoutTarget > 14) {
    issues.push("每周训练目标需在 0-14 次之间");
  }

  const dailyCalorieTarget = toFiniteNumber(form.dailyCalorieTarget);
  if (!Number.isFinite(dailyCalorieTarget) || dailyCalorieTarget < 1000 || dailyCalorieTarget > 5000) {
    issues.push("每日热量目标需在 1000-5000 kcal 之间");
  }

  const sleepTargetHours = toFiniteNumber(form.sleepTargetHours);
  if (!Number.isFinite(sleepTargetHours) || sleepTargetHours < 4 || sleepTargetHours > 12) {
    issues.push("睡眠目标建议填写在 4-12 小时");
  }

  return issues;
});

const canSubmit = computed(() => validationIssues.value.length === 0);

const fieldErrors = computed(() => {
  const errors: Record<string, string | null> = {};

  if (!form.nickname.trim()) {
    errors.nickname = "昵称不能为空";
  }

  const age = toFiniteNumber(form.age);
  if (!Number.isFinite(age) || age < 10 || age > 100) {
    errors.age = "年龄需在 10-100 之间";
  }

  const heightCm = toFiniteNumber(form.heightCm);
  if (!Number.isFinite(heightCm) || heightCm < 120 || heightCm > 230) {
    errors.heightCm = "身高需在 120-230 cm 之间";
  }

  const weightKg = toFiniteNumber(form.currentWeightKg);
  if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 300) {
    errors.currentWeightKg = "当前体重需在 25-300 kg 之间";
  }

  const targetWeightKg = toFiniteNumber(form.targetWeightKg);
  if (!Number.isFinite(targetWeightKg) || targetWeightKg < 25 || targetWeightKg > 250) {
    errors.targetWeightKg = "目标体重需在 25-250 kg 之间";
  }

  const bodyFatRate = form.bodyFatRate === "" ? null : toFiniteNumber(form.bodyFatRate);
  if (bodyFatRate !== null && (!Number.isFinite(bodyFatRate) || bodyFatRate < 3 || bodyFatRate > 70)) {
    errors.bodyFatRate = "体脂率建议填写在 3%-70% 区间";
  }

  const targetBodyFatRate = form.targetBodyFatRate === "" ? null : toFiniteNumber(form.targetBodyFatRate);
  if (targetBodyFatRate !== null && (!Number.isFinite(targetBodyFatRate) || targetBodyFatRate < 3 || targetBodyFatRate > 65)) {
    errors.targetBodyFatRate = "目标体脂建议填写在 3%-65% 区间";
  }

  const weeklyWorkoutTarget = toFiniteNumber(form.weeklyWorkoutTarget);
  if (!Number.isFinite(weeklyWorkoutTarget) || weeklyWorkoutTarget < 0 || weeklyWorkoutTarget > 14) {
    errors.weeklyWorkoutTarget = "每周训练目标需在 0-14 次之间";
  }

  const dailyCalorieTarget = toFiniteNumber(form.dailyCalorieTarget);
  if (!Number.isFinite(dailyCalorieTarget) || dailyCalorieTarget < 1000 || dailyCalorieTarget > 5000) {
    errors.dailyCalorieTarget = "每日热量目标需在 1000-5000 kcal 之间";
  }

  const sleepTargetHours = toFiniteNumber(form.sleepTargetHours);
  if (!Number.isFinite(sleepTargetHours) || sleepTargetHours < 4 || sleepTargetHours > 12) {
    errors.sleepTargetHours = "睡眠目标建议填写在 4-12 小时";
  }

  return errors;
});

const hasFieldErrors = computed(() => Object.values(fieldErrors.value).some((v) => v !== null && v !== undefined));

watch(
  () => ({ ...form }),
  (current, previous) => {
    if (!props.record) {
      isDirty.value = false;
      return;
    }

    if (previous && JSON.stringify(current) === JSON.stringify(previous)) {
      return;
    }

    const record = props.record;
    isDirty.value =
      form.nickname !== record.nickname ||
      form.age !== record.age ||
      form.gender !== record.gender ||
      form.heightCm !== record.heightCm ||
      form.currentWeightKg !== record.currentWeightKg ||
      (form.bodyFatRate === "" ? null : Number(form.bodyFatRate)) !== (record.bodyFatRate ?? null) ||
      form.targetWeightKg !== record.targetWeightKg ||
      (form.targetBodyFatRate === "" ? null : Number(form.targetBodyFatRate)) !== (record.targetBodyFatRate ?? null) ||
      form.weeklyWorkoutTarget !== record.weeklyWorkoutTarget ||
      form.dailyCalorieTarget !== record.dailyCalorieTarget ||
      form.sleepTargetHours !== record.sleepTargetHours ||
      form.workStyle !== record.workStyle ||
      form.stressLevel !== record.stressLevel ||
      form.smokingStatus !== record.smokingStatus ||
      form.drinkingFrequency !== record.drinkingFrequency ||
      form.habitSleep !== record.habitSleep ||
      form.habitDiet !== record.habitDiet ||
      form.habitExercise !== record.habitExercise;
  },
  { deep: false }
);

const bodyTrendSeries = computed(() => {
  const series = props.trendSummary?.series ?? [];
  if (!series.length) {
    return [] as TrendSeriesPoint[];
  }
  return series.slice(-10);
});

function buildSparklinePath(values: number[], width = 280, height = 84, padding = 8) {
  if (!values.length) return "";
  if (values.length === 1) {
    const y = Math.round(height / 2);
    return `M ${padding} ${y} L ${width - padding} ${y}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * innerWidth;
      const ratio = (value - min) / span;
      const y = padding + (1 - ratio) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

const weightTrendValues = computed(() => bodyTrendSeries.value.map((item) => Number(item.weightKg)));
const bodyFatTrendValues = computed(() => bodyTrendSeries.value.map((item) => Number(item.bodyFatRate)));
const weightSparkPath = computed(() => buildSparklinePath(weightTrendValues.value));
const bodyFatSparkPath = computed(() => buildSparklinePath(bodyFatTrendValues.value));

const weightTrendDelta = computed(() => {
  const values = weightTrendValues.value;
  if (values.length < 2) return 0;
  return roundNumber(values[values.length - 1] - values[0], 1);
});

const bodyFatTrendDelta = computed(() => {
  const values = bodyFatTrendValues.value;
  if (values.length < 2) return 0;
  return roundNumber(values[values.length - 1] - values[0], 1);
});

const bodyMiniCards = computed(() => {
  const trendReady = bodyTrendSeries.value.length >= 2;
  const latestLabel = bodyTrendSeries.value[bodyTrendSeries.value.length - 1]?.label ?? "当前";

  return [
    {
      key: "weight",
      title: "体重趋势",
      latest: `${props.profile.weightKg.toFixed(1)} kg`,
      delta: trendReady ? `${weightTrendDelta.value > 0 ? "+" : ""}${weightTrendDelta.value.toFixed(1)} kg` : "样本不足",
      tone: weightTrendDelta.value <= 0 ? "positive" : "warning",
      hint: trendReady ? `近 ${bodyTrendSeries.value.length} 天（截止 ${latestLabel}）` : "保存几天数据后会自动生成曲线",
      path: weightSparkPath.value
    },
    {
      key: "body-fat",
      title: "体脂趋势",
      latest: `${props.profile.bodyFatRate ?? "--"}%`,
      delta: trendReady ? `${bodyFatTrendDelta.value > 0 ? "+" : ""}${bodyFatTrendDelta.value.toFixed(1)}%` : "样本不足",
      tone: bodyFatTrendDelta.value <= 0 ? "positive" : "warning",
      hint: trendReady ? `近 ${bodyTrendSeries.value.length} 天（截止 ${latestLabel}）` : "保存几天数据后会自动生成曲线",
      path: bodyFatSparkPath.value
    }
  ] as const;
});

watch(
  () => props.record,
  (record) => {
    if (!record) {
      return;
    }

    form.nickname = record.nickname;
    form.age = record.age;
    form.gender = record.gender;
    form.heightCm = record.heightCm;
    form.currentWeightKg = record.currentWeightKg;
    form.bodyFatRate = record.bodyFatRate ?? "";
    form.targetWeightKg = record.targetWeightKg;
    form.targetBodyFatRate = record.targetBodyFatRate ?? "";
    form.weeklyWorkoutTarget = record.weeklyWorkoutTarget;
    form.dailyCalorieTarget = record.dailyCalorieTarget;
    form.sleepTargetHours = record.sleepTargetHours;
    form.workStyle = record.workStyle;
    form.stressLevel = record.stressLevel;
    form.smokingStatus = record.smokingStatus;
    form.drinkingFrequency = record.drinkingFrequency;
    form.habitSleep = record.habitSleep;
    form.habitDiet = record.habitDiet;
    form.habitExercise = record.habitExercise;
  },
  { immediate: true }
);

const habitSummary = computed(() => {
  const workStyle = props.profile.workStyle || "工作方式待补充";
  const stressLevel = props.profile.stressLevel || "中";
  return `${workStyle} · 压力 ${stressLevel}`;
});

const weightDelta = computed(() => Number((props.profile.weightKg - props.profile.targetWeightKg).toFixed(1)));
const weightScaleMin = computed(() => {
  const base = Math.min(props.profile.weightKg, props.profile.targetWeightKg);
  return Math.max(Number((base - Math.max(base * 0.12, 4)).toFixed(1)), 0);
});
const weightScaleMax = computed(() => {
  const base = Math.max(props.profile.weightKg, props.profile.targetWeightKg, 1);
  return Number((base + Math.max(base * 0.12, 4)).toFixed(1));
});
const weightScaleRange = computed(() => Math.max(weightScaleMax.value - weightScaleMin.value, 1));
const currentWeightPercent = computed(() =>
  clamp(((props.profile.weightKg - weightScaleMin.value) / weightScaleRange.value) * 100, 0, 100)
);
const targetWeightPercent = computed(() =>
  clamp(((props.profile.targetWeightKg - weightScaleMin.value) / weightScaleRange.value) * 100, 0, 100)
);
const weightProgressLabel = computed(() => {
  if (weightDelta.value > 0) {
    return `距离目标还差 ${weightDelta.value.toFixed(1)} kg`;
  }

  if (weightDelta.value < 0) {
    return `已低于目标 ${Math.abs(weightDelta.value).toFixed(1)} kg`;
  }

  return "已到达当前目标";
});

const bmiTone = computed(() => {
  const bmi = props.profile.bmi;
  return bmiToneByValue(bmi);
});

const bodyFatTone = computed(() => {
  const rate = props.profile.bodyFatRate ?? 0;
  const isMale = props.profile.gender === "男";
  if (!rate) return "positive";
  
  if (isMale) {
    if (rate >= 10 && rate <= 20) return "positive";
    if (rate > 20 && rate <= 25) return "warning";
    return "danger";
  } else {
    // Female
    if (rate >= 20 && rate <= 30) return "positive";
    if (rate > 30 && rate <= 35) return "warning";
    return "danger";
  }
});

const archiveRows = computed(() => [
  {
    category: "基础资料",
    label: "年龄 / 性别",
    value: `${props.profile.age} 岁 / ${props.profile.gender || "未设置"}`,
    note: "用于建立代谢估算和健康建议基线"
  },
  {
    category: "当前状态",
    label: "身高 / 体重",
    value: `${props.profile.heightCm} cm / ${props.profile.weightKg} kg`,
    note: "用于计算 BMI、目标差距和热量建议"
  },
  {
    category: "体成分",
    label: "体脂率 / BMI",
    value: `${props.profile.bodyFatRate ?? "--"}% / ${props.profile.bmi ?? "--"}`,
    note: "帮助区分减脂、增肌和单纯体重波动"
  },
  {
    category: "目标设定",
    label: "目标体重 / 目标体脂",
    value: `${props.profile.targetWeightKg} kg / ${props.profile.targetBodyFatRate ?? "--"}%`,
    note: "让饮食、训练和趋势判断拥有明确参照"
  },
  {
    category: "执行节奏",
    label: "训练 / 睡眠目标",
    value: `${props.profile.weeklyWorkoutTarget} 次每周 / ${props.profile.sleepTargetHours} 小时`,
    note: "影响恢复质量和长期执行稳定性"
  },
  {
    category: "生活方式",
    label: "工作 / 烟酒情况",
    value: `${props.profile.workStyle || "待补充"} / ${props.profile.smokingStatus} / ${props.profile.drinkingFrequency}`,
    note: "帮助识别恢复压力、食欲波动和健康风险"
  }
]);

function handleSave() {
  if (!canSubmit.value) {
    saveNotice.value = {
      tone: "warning",
      message: validationIssues.value[0] ?? "请先修正输入后再保存"
    };
    return;
  }

  isEditing.value = false;
  isDirty.value = false;
  saveNotice.value = { tone: "success", message: "档案已提交，正在同步到数据库..." };
  emit("save", {
    nickname: form.nickname.trim(),
    age: Math.round(clamp(toFiniteNumber(form.age), 10, 100)),
    gender: form.gender.trim(),
    heightCm: roundNumber(clamp(toFiniteNumber(form.heightCm), 120, 230), 1),
    currentWeightKg: roundNumber(clamp(toFiniteNumber(form.currentWeightKg), 25, 300), 1),
    bodyFatRate:
      form.bodyFatRate === "" ? null : roundNumber(clamp(toFiniteNumber(form.bodyFatRate), 3, 70), 1),
    targetWeightKg: roundNumber(clamp(toFiniteNumber(form.targetWeightKg), 25, 250), 1),
    targetBodyFatRate:
      form.targetBodyFatRate === "" ? null : roundNumber(clamp(toFiniteNumber(form.targetBodyFatRate), 3, 65), 1),
    weeklyWorkoutTarget: Math.round(clamp(toFiniteNumber(form.weeklyWorkoutTarget), 0, 14)),
    dailyCalorieTarget: Math.round(clamp(toFiniteNumber(form.dailyCalorieTarget), 1000, 5000)),
    sleepTargetHours: roundNumber(clamp(toFiniteNumber(form.sleepTargetHours), 4, 12), 1),
    workStyle: form.workStyle.trim(),
    stressLevel: form.stressLevel.trim(),
    smokingStatus: form.smokingStatus.trim(),
    drinkingFrequency: form.drinkingFrequency.trim(),
    habitSleep: form.habitSleep.trim(),
    habitDiet: form.habitDiet.trim(),
    habitExercise: form.habitExercise.trim()
  });
}

function confirmDiscard() {
  showUnsavedDialog.value = false;
  isDirty.value = false;
}

function fieldErrorFor(key: string) {
  return fieldErrors.value[key] ?? null;
}
</script>

<template>
  <section class="assessment">
    <article class="hero">
      <div class="hero__backdrop"></div>

      <div class="hero__content">
        <div class="hero__heading">
          <div>
            <p class="eyebrow">Body Archive</p>
            <h3>身体档案与目标基线</h3>
            <p class="hero__lead">{{ profile.healthSummary }}</p>
          </div>

          <div class="hero__identity">
            <span class="hero__identity-label">档案对象</span>
            <strong>{{ profile.nickname || "当前用户" }}</strong>
            <small>{{ habitSummary }}</small>
          </div>
        </div>

        <div class="hero__summary">
          <div class="weight-bar-card">
            <div class="weight-bar-card__header">
              <div>
                <span class="weight-bar-card__eyebrow">Weight Progress</span>
                <strong>体重目标差距</strong>
              </div>
              <small>{{ weightProgressLabel }}</small>
            </div>

            <div class="weight-bar-card__metrics">
              <div>
                <span>当前体重</span>
                <strong>{{ profile.weightKg }} kg</strong>
              </div>
              <div>
                <span>目标体重</span>
                <strong>{{ profile.targetWeightKg }} kg</strong>
              </div>
            </div>

            <div class="weight-bar">
              <div class="weight-bar__track"></div>
              <div class="weight-bar__fill" :style="{ width: `${currentWeightPercent}%` }"></div>
              <div class="weight-bar__marker" :style="{ left: `${targetWeightPercent}%` }">
                <span>目标</span>
              </div>
            </div>

            <div class="weight-bar__footer">
              <span class="weight-bar__label weight-bar__label--start">基准 {{ weightScaleMin }} kg</span>
              <span class="weight-bar__label weight-bar__label--current" :style="{ left: `${currentWeightPercent}%` }">
                当前 {{ profile.weightKg }} kg
              </span>
              <span class="weight-bar__label weight-bar__label--target" :style="{ left: `${targetWeightPercent}%` }">
                目标 {{ profile.targetWeightKg }} kg
              </span>
              <span class="weight-bar__label weight-bar__label--end">上限 {{ weightScaleMax }} kg</span>
            </div>
          </div>
        </div>

        <div class="hero__stats">
          <div :class="['hero-stat', `tone-${bmiTone}`]">
            <span>当前 BMI</span>
            <strong>{{ profile.bmi ?? "--" }}</strong>
          </div>
          <div class="hero-stat">
            <span>基础代谢</span>
            <strong>{{ profile.bmr ?? "--" }} kcal</strong>
          </div>
          <div :class="['hero-stat', `tone-${bodyFatTone}`]">
            <span>体脂率</span>
            <strong>{{ profile.bodyFatRate ?? "--" }}%</strong>
          </div>
          <div class="hero-stat hero-stat--accent">
            <span>每周训练目标</span>
            <strong>{{ profile.weeklyWorkoutTarget }} 次</strong>
          </div>
        </div>
      </div>
    </article>

    <section class="goal-grid">
      <article v-for="item in profile.goalCards" :key="item.label" class="goal-card">
        <p>{{ item.label }}</p>
        <strong>{{ item.value }}</strong>
        <small>{{ item.description }}</small>
      </article>
    </section>

    <section class="content-grid">
      <div class="content-stack">
        <article class="panel">
          <p class="eyebrow">Key Metrics</p>

          <div class="metrics">
            <div>
              <span>身高</span>
              <strong>{{ profile.heightCm }} cm</strong>
            </div>
            <div>
              <span>体重</span>
              <strong>{{ profile.weightKg }} kg</strong>
            </div>
            <div>
              <span>BMI</span>
              <strong>{{ profile.bmi ?? "--" }}</strong>
            </div>
            <div>
              <span>BMR</span>
              <strong>{{ profile.bmr ?? "--" }} kcal</strong>
            </div>
          </div>

          <div class="insights">
            <div v-for="item in profile.habitInsights" :key="item.label" class="insight" :data-tone="item.tone">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel__header panel__header--compact">
            <div>
              <p class="eyebrow">Mini Trends</p>
              <h4>近期体重与体脂趋势</h4>
            </div>
            <span class="panel__badge">来自趋势模块最近 10 条记录</span>
          </div>

          <div class="mini-trends">
            <article v-for="item in bodyMiniCards" :key="item.key" class="mini-trend-card" :data-tone="item.tone">
              <div class="mini-trend-card__head">
                <span>{{ item.title }}</span>
                <strong>{{ item.latest }}</strong>
              </div>

              <svg v-if="item.path" class="mini-trend-card__chart" viewBox="0 0 280 84" preserveAspectRatio="none" aria-hidden="true">
                <path class="mini-trend-card__path" :d="item.path"></path>
              </svg>
              <div v-else class="mini-trend-card__empty">历史记录不足，连续保存后会自动生成变化曲线。</div>

              <div class="mini-trend-card__meta">
                <span>{{ item.hint }}</span>
                <em>{{ item.delta }}</em>
              </div>
            </article>
          </div>
        </article>

        <article class="panel panel--table">
          <div class="panel__header panel__header--compact">
            <div>
              <p class="eyebrow">Profile Matrix</p>
              <h4>个人数据矩阵</h4>
            </div>
          </div>

          <div class="table-shell">
            <table class="archive-table">
              <thead>
                <tr>
                  <th>模块</th>
                  <th>字段</th>
                  <th>当前值</th>
                  <th>填写意义</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in archiveRows" :key="row.label">
                  <td><span class="table-tag">{{ row.category }}</span></td>
                  <td>{{ row.label }}</td>
                  <td class="table-value">{{ row.value }}</td>
                  <td class="table-note">{{ row.note }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article class="panel panel--form">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Profile Editor</p>
            <h4>档案编辑与目标校准</h4>
            <p class="panel__intro">补全基础数据、目标和生活方式，后续看板、饮食规划与智能建议会更贴近真实情况。</p>
          </div>
          <div class="panel__actions">
            <button class="save btn btn--primary" type="button" :disabled="saving || loading" @click="handleSave">
              {{ saving ? "保存中..." : "保存档案" }}
            </button>
          </div>
        </div>

        <div v-if="saveNotice" class="save-notice" :data-tone="saveNotice.tone">
          {{ saveNotice.message }}
        </div>

        <ul v-if="validationIssues.length" class="validation-list">
          <li v-for="issue in validationIssues" :key="issue">{{ issue }}</li>
        </ul>

        <div v-if="loading" class="loading">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <template v-else>
          <section class="form-section">
            <div class="form-section__head">
              <h5>基础信息</h5>
              <p>先补全身份和工作状态，帮助系统建立个性化判断基线。</p>
            </div>

            <div class="fields fields--four">
              <label class="field" :class="{ 'field--error': fieldErrorFor('nickname') }">
                <span>昵称</span>
                <input v-model.trim="form.nickname" type="text" placeholder="例如：小林" />
                <p v-if="fieldErrorFor('nickname')" class="field-error">{{ fieldErrorFor('nickname') }}</p>
              </label>

              <label class="field" :class="{ 'field--error': fieldErrorFor('age') }">
                <span>年龄</span>
                <input v-model="form.age" type="number" min="0" placeholder="18" />
                <p v-if="fieldErrorFor('age')" class="field-error">{{ fieldErrorFor('age') }}</p>
              </label>

              <label class="field">
                <span>性别</span>
                <select v-model="form.gender">
                  <option value="未设置">未设置</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </label>

              <label class="field">
                <span>工作方式</span>
                <select v-model="form.workStyle">
                  <option value="">请选择</option>
                  <option value="久坐办公">久坐办公</option>
                  <option value="通勤较多">通勤较多</option>
                  <option value="经常站立">经常站立</option>
                  <option value="体力劳动">体力劳动</option>
                </select>
              </label>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section__head">
              <h5>身体数据</h5>
              <p>这些数值决定身体画像，也是趋势分析和目标差距计算的基础。</p>
            </div>

            <div class="fields fields--four">
              <label class="field" :class="{ 'field--error': fieldErrorFor('heightCm') }">
                <span>身高(cm)</span>
                <input v-model="form.heightCm" type="number" min="0" step="0.1" placeholder="170" />
                <p v-if="fieldErrorFor('heightCm')" class="field-error">{{ fieldErrorFor('heightCm') }}</p>
              </label>

              <label class="field" :class="{ 'field--error': fieldErrorFor('currentWeightKg') }">
                <span>当前体重(kg)</span>
                <input v-model="form.currentWeightKg" type="number" min="0" step="0.1" placeholder="60" />
                <p v-if="fieldErrorFor('currentWeightKg')" class="field-error">{{ fieldErrorFor('currentWeightKg') }}</p>
              </label>

              <label class="field" :class="{ 'field--error': fieldErrorFor('bodyFatRate') }">
                <span>体脂率(%)</span>
                <input v-model="form.bodyFatRate" type="number" min="0" max="100" step="0.1" placeholder="可选" />
                <p v-if="fieldErrorFor('bodyFatRate')" class="field-error">{{ fieldErrorFor('bodyFatRate') }}</p>
              </label>

              <label class="field field--readonly">
                <span>当前评估</span>
                <div class="field-card" :data-tone="draftBmiTone">
                  <strong>BMI {{ draftBmi ?? "--" }} · {{ draftBmiLabel }}</strong>
                  <small>BMR {{ profile.bmr ?? "--" }} kcal（保存后同步）</small>
                </div>
              </label>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section__head">
              <h5>目标设置</h5>
              <p>把目标落成可衡量的体重、体脂、热量、睡眠和训练节奏。</p>
            </div>

            <div class="fields fields--four">
              <label class="field" :class="{ 'field--error': fieldErrorFor('targetWeightKg') }">
                <span>目标体重(kg)</span>
                <input v-model="form.targetWeightKg" type="number" min="0" step="0.1" />
                <p v-if="fieldErrorFor('targetWeightKg')" class="field-error">{{ fieldErrorFor('targetWeightKg') }}</p>
              </label>

              <label class="field" :class="{ 'field--error': fieldErrorFor('targetBodyFatRate') }">
                <span>目标体脂(%)</span>
                <input v-model="form.targetBodyFatRate" type="number" min="0" max="100" step="0.1" placeholder="可选" />
                <p v-if="fieldErrorFor('targetBodyFatRate')" class="field-error">{{ fieldErrorFor('targetBodyFatRate') }}</p>
              </label>

              <label class="field" :class="{ 'field--error': fieldErrorFor('weeklyWorkoutTarget') }">
                <span>每周训练目标</span>
                <input v-model="form.weeklyWorkoutTarget" type="number" min="0" max="14" />
                <p v-if="fieldErrorFor('weeklyWorkoutTarget')" class="field-error">{{ fieldErrorFor('weeklyWorkoutTarget') }}</p>
              </label>

              <label class="field" :class="{ 'field--error': fieldErrorFor('dailyCalorieTarget') }">
                <span>每日热量目标</span>
                <input v-model="form.dailyCalorieTarget" type="number" min="1000" step="10" />
                <p v-if="fieldErrorFor('dailyCalorieTarget')" class="field-error">{{ fieldErrorFor('dailyCalorieTarget') }}</p>
              </label>
            </div>

            <div class="fields fields--three">
              <label class="field" :class="{ 'field--error': fieldErrorFor('sleepTargetHours') }">
                <span>睡眠目标(小时)</span>
                <input v-model="form.sleepTargetHours" type="number" min="0" max="24" step="0.5" />
                <p v-if="fieldErrorFor('sleepTargetHours')" class="field-error">{{ fieldErrorFor('sleepTargetHours') }}</p>
              </label>

              <label class="field">
                <span>压力水平</span>
                <select v-model="form.stressLevel">
                  <option value="低">低</option>
                  <option value="中">中</option>
                  <option value="高">高</option>
                </select>
              </label>

            </div>
          </section>

          <section class="form-section">
            <div class="form-section__head">
              <h5>生活方式</h5>
              <p>生活方式会影响恢复、食欲、训练表现和执行稳定性。</p>
            </div>

            <div class="fields fields--two">
              <label class="field">
                <span>吸烟情况</span>
                <select v-model="form.smokingStatus">
                  <option value="从不">从不</option>
                  <option value="已戒烟">已戒烟</option>
                  <option value="偶尔">偶尔</option>
                  <option value="经常">经常</option>
                </select>
              </label>

              <label class="field">
                <span>饮酒频率</span>
                <select v-model="form.drinkingFrequency">
                  <option value="几乎不">几乎不</option>
                  <option value="偶尔">偶尔</option>
                  <option value="每周">每周</option>
                  <option value="频繁">频繁</option>
                </select>
              </label>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section__head">
              <h5>习惯描述</h5>
              <p>记录真实日常即可，系统会基于习惯描述识别更可持续的调整方向。</p>
            </div>

            <div class="fields">
              <label class="field">
                <span>睡眠习惯</span>
                <textarea
                  v-model.trim="form.habitSleep"
                  rows="3"
                  placeholder="例如：工作日 23:30 入睡，7:00 起床，周末会晚睡一些"
                ></textarea>
              </label>

              <label class="field">
                <span>饮食习惯</span>
                <textarea
                  v-model.trim="form.habitDiet"
                  rows="3"
                  placeholder="例如：三餐基本规律，下午容易加餐，周末会有聚餐"
                ></textarea>
              </label>

              <label class="field">
                <span>训练与活动习惯</span>
                <textarea
                  v-model.trim="form.habitExercise"
                  rows="3"
                  placeholder="例如：每周力量训练 3 次，工作日步数偏少，周末活动量更高"
                ></textarea>
              </label>
            </div>
          </section>
        </template>
      </article>
    </section>

    <article class="panel">
      <div class="panel__header panel__header--compact">
        <div>
          <p class="eyebrow">Lifestyle Tags</p>
          <h4>生活方式摘要</h4>
        </div>
      </div>
      <div class="habits">
        <span v-for="habit in profile.habits" :key="habit">{{ habit }}</span>
      </div>
      <p class="copy">{{ profile.goalSummary }}</p>
    </article>

    <div v-if="showUnsavedDialog" class="unsaved-dialog-overlay" @click.self="showUnsavedDialog = false">
      <div class="unsaved-dialog">
        <div class="unsaved-dialog__icon">⚠</div>
        <h4>有未保存的修改</h4>
        <p>当前表单中有尚未保存的身体档案修改。离开前建议先保存，避免影响后续建议和统计。</p>
        <div class="unsaved-dialog__actions">
          <button class="btn btn--primary" @click="handleSave(); showUnsavedDialog = false">保存并离开</button>
          <button class="btn btn--secondary" @click="confirmDiscard">放弃修改</button>
          <button class="btn btn--ghost" @click="showUnsavedDialog = false">继续编辑</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.assessment {
  display: grid;
  gap: 16px;
  padding-right: 18px;
}

.hero,
.panel,
.goal-card {
  padding: 20px;
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  box-shadow: var(--shadow-panel);
}

.hero {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(135deg, var(--color-surface-strong), rgba(244, 248, 241, 0.96) 52%, rgba(231, 241, 233, 0.92));
}

.hero__backdrop {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0 1px, transparent 1px 12px);
  pointer-events: none;
}

.hero__content {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  gap: 18px;
}

.hero__heading {
  grid-column: 1 / -1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.hero__lead {
  max-width: 760px;
  margin: 10px 0 0;
  font-size: 1rem;
  line-height: 1.72;
  color: #66756d;
}

.hero__identity {
  display: grid;
  gap: 6px;
  min-width: 210px;
  padding: 14px 16px;
  border-radius: var(--radius-card);
  background: var(--color-surface-soft);
  border: 1px solid var(--color-line);
  backdrop-filter: blur(10px);
}

.hero__identity-label {
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.hero__identity strong {
  font-size: 1.15rem;
  color: var(--color-text);
}

.hero__identity small {
  color: var(--color-text-soft);
  line-height: 1.6;
}

.hero__summary {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.weight-bar-card,
.hero-stat {
  display: grid;
  gap: 8px;
  padding: 18px;
  border-radius: var(--radius-card);
  border: 1px solid var(--color-line);
  backdrop-filter: blur(12px);
}

.weight-bar-card {
  background: linear-gradient(135deg, rgba(44, 71, 55, 0.92), rgba(86, 124, 98, 0.88));
  color: #fffdf7;
}

.weight-bar-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.weight-bar-card__eyebrow {
  display: block;
  margin-bottom: 8px;
  font-size: 0.76rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.72;
}

.weight-bar-card__header strong {
  font-size: 1.32rem;
  color: inherit;
}

.weight-bar-card__header small {
  color: inherit;
  opacity: 0.84;
  line-height: 1.6;
}

.weight-bar-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.weight-bar-card__metrics div {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
}

.weight-bar-card__metrics span,
.hero-stat span {
  font-size: 0.84rem;
  color: inherit;
  opacity: 0.82;
}

.weight-bar-card__metrics strong {
  font-size: 1.6rem;
  line-height: 1.1;
  color: inherit;
}

.weight-bar {
  position: relative;
  height: 14px;
  margin-top: 8px;
}

.weight-bar__track,
.weight-bar__fill {
  position: absolute;
  inset: 0;
  border-radius: 999px;
}

.weight-bar__track {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.18);
}

.weight-bar__fill {
  background: linear-gradient(90deg, rgba(251, 220, 151, 0.92), rgba(255, 244, 218, 0.98));
  box-shadow: 0 0 24px rgba(248, 222, 170, 0.22);
}

.weight-bar__marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
}

.weight-bar__marker::before {
  content: "";
  display: block;
  width: 4px;
  height: 28px;
  margin: 0 auto;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.12);
}

.weight-bar__marker span {
  position: absolute;
  left: 50%;
  bottom: 30px;
  transform: translateX(-50%);
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: #fffdf7;
  font-size: 0.76rem;
  white-space: nowrap;
}

.weight-bar__footer {
  position: relative;
  height: 26px;
  margin-top: 14px;
  color: rgba(255, 253, 247, 0.86);
  font-size: 0.84rem;
}

.weight-bar__label {
  position: absolute;
  top: 0;
  white-space: nowrap;
}

.weight-bar__label--start {
  left: 0;
  transform: translateX(0);
}

.weight-bar__label--current,
.weight-bar__label--target {
  transform: translateX(-50%);
}

.weight-bar__label--end {
  right: 0;
  transform: translateX(0);
}

.hero__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: stretch;
  gap: 12px;
}

.hero-stat {
  background: rgba(255, 255, 255, 0.72);
}

.hero-stat--accent {
  background: linear-gradient(135deg, rgba(43, 71, 53, 0.92), rgba(80, 120, 93, 0.9));
  color: #fff9f1;
}

.hero-stat.tone-positive {
  background: linear-gradient(180deg, rgba(224, 241, 224, 0.9), rgba(244, 251, 244, 0.95));
  border: 1px solid rgba(46, 204, 113, 0.2);
}
.hero-stat.tone-positive span { color: #2ecc71; }
.hero-stat.tone-positive strong { color: #27ae60; }

.hero-stat.tone-warning {
  background: linear-gradient(180deg, rgba(253, 243, 225, 0.9), rgba(255, 249, 238, 0.95));
  border: 1px solid rgba(241, 196, 15, 0.2);
}
.hero-stat.tone-warning span { color: #e67e22; }
.hero-stat.tone-warning strong { color: #d35400; }

.hero-stat.tone-danger {
  background: linear-gradient(180deg, rgba(253, 237, 236, 0.9), rgba(255, 245, 245, 0.95));
  border: 1px solid rgba(231, 76, 60, 0.2);
}
.hero-stat.tone-danger span { color: #e74c3c; }
.hero-stat.tone-danger strong { color: #c0392b; }

.hero-stat--accent span,
.hero-stat--accent strong {
  color: inherit;
}

.hero-stat strong {
  font-size: 1.24rem;
  color: var(--color-text);
}

.eyebrow {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.hero h3,
.panel h4,
.form-section__head h5 {
  margin: 0;
  color: var(--color-text);
}

.hero h3 {
  font-size: 1.82rem;
  line-height: 1.16;
}

.copy,
.goal-card p,
.goal-card small,
.field span,
.form-section__head p,
.panel__intro {
  color: var(--color-text-soft);
}

.habits span,
.table-tag,
.panel__badge {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(53, 93, 62, 0.08);
  color: #25422e;
  font-weight: 700;
}

.goal-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 14px;
}

.goal-card {
  min-height: 130px;
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(247, 250, 245, 0.95));
}

.goal-card strong {
  display: block;
  margin-top: 8px;
  color: var(--color-text);
  font-size: 1.55rem;
  line-height: 1.16;
}

.goal-card small {
  display: block;
  margin-top: 8px;
  line-height: 1.55;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(430px, 0.92fr) minmax(0, 1.08fr);
  align-items: start;
  gap: 16px;
}

.content-stack {
  display: grid;
  gap: 16px;
}

.metrics,
.insights,
.fields {
  display: grid;
  gap: 12px;
}

.metrics {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metrics div,
.insight {
  padding: 15px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(236, 242, 234, 0.75), rgba(247, 250, 246, 0.88));
  border: 1px solid rgba(71, 99, 76, 0.08);
}

.metrics span,
.metrics strong,
.insight span,
.insight strong {
  display: block;
}

.metrics strong,
.insight strong {
  margin-top: 8px;
  color: var(--color-text);
  line-height: 1.25;
}

.insights {
  margin-top: 16px;
}

.insight[data-tone="warning"] {
  background: linear-gradient(180deg, rgba(248, 231, 202, 0.82), rgba(255, 247, 235, 0.92));
}

.insight[data-tone="positive"] {
  background: linear-gradient(180deg, rgba(224, 241, 224, 0.82), rgba(244, 251, 244, 0.92));
}

.panel--table,
.panel--form {
  display: grid;
  gap: 12px;
}

.panel--form {
  padding: 18px;
}

.panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.panel__header--compact {
  align-items: center;
}

.panel__intro {
  margin: 6px 0 0;
  line-height: 1.52;
}

.panel__actions {
  display: flex;
  gap: 12px;
}

.save-notice {
  margin-top: 4px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

.save-notice[data-tone="warning"] {
  color: #7a4c15;
  background: rgba(246, 228, 195, 0.8);
  border: 1px solid rgba(219, 164, 87, 0.35);
}

.save-notice[data-tone="success"] {
  color: #1f5b37;
  background: rgba(219, 238, 222, 0.86);
  border: 1px solid rgba(71, 153, 95, 0.28);
}

.validation-list {
  margin: 0;
  padding: 0 0 0 18px;
  display: grid;
  gap: 6px;
  color: #9c3d31;
}

.btn {
  border: 0;
  border-radius: 16px;
  padding: 12px 18px;
  font-weight: 700;
  cursor: pointer;
}

.btn--primary {
  background: linear-gradient(135deg, #22342a, #42604b);
  color: #fffaf0;
  box-shadow: 0 10px 24px rgba(44, 64, 51, 0.16);
}

.btn--primary:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.btn--secondary {
  background: rgba(224, 235, 227, 0.8);
  color: #2b4435;
  box-shadow: 0 4px 12px rgba(44, 64, 51, 0.04);
}
.btn--secondary:hover {
  background: rgba(210, 225, 214, 0.9);
}

.btn--ghost {
  background: transparent;
  color: #6b786f;
  box-shadow: none;
}
.btn--ghost:hover {
  background: rgba(210, 225, 214, 0.4);
}

.table-shell {
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(60, 88, 67, 0.1);
  background: rgba(255, 255, 255, 0.72);
}

.archive-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 0.9rem;
}

.archive-table th:nth-child(1),
.archive-table td:nth-child(1) {
  width: 18%;
}

.archive-table th:nth-child(2),
.archive-table td:nth-child(2) {
  width: 22%;
}

.archive-table th:nth-child(3),
.archive-table td:nth-child(3) {
  width: 24%;
}

.archive-table th:nth-child(4),
.archive-table td:nth-child(4) {
  width: 36%;
}

.archive-table thead th {
  padding: 13px 14px;
  text-align: left;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  color: #58705e;
  background: rgba(232, 239, 231, 0.86);
  white-space: nowrap;
}

.archive-table tbody tr {
  transition: background 180ms ease;
}

.archive-table tbody tr:hover {
  background: rgba(241, 247, 240, 0.88);
}

.archive-table tbody td {
  padding: 12px 14px;
  border-top: 1px solid rgba(85, 105, 89, 0.08);
  vertical-align: middle;
  color: var(--color-text);
  line-height: 1.48;
}

.archive-table tbody td:nth-child(2) {
  color: #425a4b;
  font-weight: 700;
}

.table-value {
  font-weight: 700;
  font-size: 0.98rem;
  line-height: 1.35;
}

.table-note {
  color: var(--color-text-soft);
  line-height: 1.5;
}

.table-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  padding: 7px 9px;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(236, 243, 237, 0.92), rgba(247, 250, 246, 0.96));
  border: 1px solid rgba(57, 87, 63, 0.08);
  color: #244331;
  font-size: 0.86rem;
  line-height: 1.15;
  white-space: nowrap;
}

.form-section {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(249, 251, 248, 0.88), rgba(255, 255, 255, 0.96));
  border: 1px solid rgba(78, 101, 84, 0.08);
}

.form-section__head {
  display: grid;
  gap: 4px;
}

.form-section__head h5 {
  font-size: 0.96rem;
}

.form-section__head p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
}

.fields--four {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.fields--three {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.fields--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 0.92rem;
  font-weight: 600;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(61, 84, 67, 0.14);
  background: rgba(255, 255, 255, 0.98);
  color: var(--color-text);
  outline: none;
  resize: none;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.field textarea {
  min-height: 76px;
}

.field:has(textarea) {
  grid-column: 1 / -1;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: rgba(68, 108, 78, 0.55);
  box-shadow: 0 0 0 4px rgba(129, 168, 136, 0.14);
  transform: translateY(-1px);
}

.field--error input,
.field--error select,
.field--error textarea {
  border-color: rgba(220, 80, 60, 0.45);
  box-shadow: 0 0 0 3px rgba(220, 80, 60, 0.08);
}

.field-error {
  margin: 4px 0 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: #c0392b;
  line-height: 1.4;
}

.field-card {
  display: grid;
  gap: 4px;
  min-height: 48px;
  padding: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(232, 239, 231, 0.74), rgba(245, 248, 244, 0.96));
  border: 1px solid rgba(61, 84, 67, 0.1);
}

.field-card strong {
  color: var(--color-text);
}

.field-card[data-tone="positive"] {
  background: linear-gradient(180deg, rgba(225, 243, 226, 0.86), rgba(243, 251, 244, 0.98));
  border-color: rgba(76, 167, 101, 0.24);
}

.field-card[data-tone="warning"] {
  background: linear-gradient(180deg, rgba(247, 234, 207, 0.86), rgba(255, 247, 235, 0.98));
  border-color: rgba(206, 141, 56, 0.24);
}

.field-card[data-tone="danger"] {
  background: linear-gradient(180deg, rgba(249, 226, 224, 0.88), rgba(255, 243, 242, 0.98));
  border-color: rgba(205, 96, 82, 0.24);
}

.mini-trends {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mini-trend-card {
  border-radius: 16px;
  padding: 12px;
  border: 1px solid rgba(62, 90, 70, 0.1);
  background: linear-gradient(180deg, rgba(239, 245, 238, 0.76), rgba(250, 252, 249, 0.96));
  display: grid;
  gap: 10px;
}

.mini-trend-card[data-tone="warning"] {
  background: linear-gradient(180deg, rgba(252, 241, 225, 0.9), rgba(255, 250, 242, 0.98));
}

.mini-trend-card__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.mini-trend-card__head span {
  color: var(--color-text-soft);
  font-size: 0.9rem;
}

.mini-trend-card__head strong {
  color: var(--color-text);
  font-size: 1.2rem;
}

.mini-trend-card__chart {
  width: 100%;
  height: 76px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(70, 98, 77, 0.1);
}

.mini-trend-card__path {
  fill: none;
  stroke: #3a6f52;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mini-trend-card[data-tone="warning"] .mini-trend-card__path {
  stroke: #b77b3f;
}

.mini-trend-card__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.mini-trend-card__meta span {
  color: var(--color-text-soft);
  font-size: 0.82rem;
}

.mini-trend-card__meta em {
  font-style: normal;
  font-weight: 700;
  color: #2a5c40;
}

.mini-trend-card[data-tone="warning"] .mini-trend-card__meta em {
  color: #a75f1d;
}

.mini-trend-card__empty {
  min-height: 84px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px dashed rgba(70, 98, 77, 0.2);
  color: var(--color-text-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px;
  line-height: 1.5;
}

.field-card small {
  color: var(--color-text-soft);
}

.habits {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.loading {
  display: grid;
  gap: 12px;
}

.loading span {
  display: block;
  height: 52px;
  border-radius: 18px;
  background: linear-gradient(90deg, rgba(224, 231, 223, 0.9), rgba(242, 245, 241, 0.98), rgba(224, 231, 223, 0.9));
  background-size: 220% 100%;
  animation: shimmer 1.2s linear infinite;
}

@keyframes shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: -100% 0;
  }
}

@media (max-width: 1280px) {
  .hero__content {
    grid-template-columns: 1fr;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .hero__stats,
  .fields--four,
  .fields--three {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .goal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .goal-grid,
  .hero__stats,
  .weight-bar-card__metrics,
  .fields--four,
  .fields--three,
  .fields--two,
  .metrics,
  .mini-trends {
    grid-template-columns: 1fr;
  }

  .panel__header,
  .hero__heading,
  .weight-bar-card__header {
    flex-direction: column;
  }

  .weight-bar__footer {
    height: auto;
    display: grid;
    gap: 8px;
  }

  .weight-bar__label {
    position: static;
    transform: none;
  }

  .hero h3 {
    font-size: 1.55rem;
  }

  .hero-stat strong {
    font-size: 1.15rem;
  }
}

@media (max-width: 640px) {
  .hero__content {
    gap: 16px;
  }

  .hero__identity {
    min-width: auto;
    width: 100%;
  }

  .hero,
  .panel,
  .goal-card {
    padding: 16px;
    border-radius: 20px;
  }

  .assessment {
    padding-right: 0;
  }

  .goal-card strong {
    font-size: 1.4rem;
  }

  .hero h3 {
    font-size: 1.35rem;
  }

  .mini-trend-card__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .hero-stat {
    padding: 14px;
  }

  .form-section {
    padding: 14px;
  }

  .fields--four,
  .fields--three,
  .fields--two {
    grid-template-columns: 1fr;
  }

  .archive-table {
    min-width: 640px;
  }

  .table-shell {
    overflow-x: auto;
  }

  .table-tag {
    min-width: max-content;
  }

  .field input,
  .field select,
  .field textarea {
    padding: 12px 14px;
  }

  .panel__actions {
    flex-direction: column;
  }

  .panel__actions button {
    width: 100%;
  }
}

.unsaved-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: unsaved-fade-in 0.2s ease;
}

.unsaved-dialog {
  background: rgba(255, 252, 248, 0.98);
  padding: 28px 24px;
  border-radius: 22px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 24px 54px rgba(24, 33, 27, 0.18);
  border: 1px solid rgba(78, 101, 84, 0.1);
  text-align: center;
  animation: unsaved-scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.unsaved-dialog__icon {
  font-size: 2.4rem;
  margin-bottom: 10px;
}

.unsaved-dialog h4 {
  margin: 0 0 10px;
  color: #2c3e2e;
  font-size: 1.2rem;
}

.unsaved-dialog p {
  color: #66756d;
  line-height: 1.7;
  margin: 0 0 20px;
}

.unsaved-dialog__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

@keyframes unsaved-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes unsaved-scale-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.form-section {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-section:focus-within {
  border-color: rgba(78, 105, 84, 0.18);
  box-shadow: 0 2px 12px rgba(78, 105, 84, 0.06);
}
</style>
