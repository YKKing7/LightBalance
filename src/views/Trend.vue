<script setup lang="ts">
import { computed, ref, watch } from "vue";
import * as XLSX from "xlsx";
import type { TrendMetricKey, TrendRecordRow, TrendSeriesPoint, TrendSummary } from "../services/types";
import { formatDateOnly, formatIntegerSigned, formatSigned, todayDateString } from "../services/utils/format";

const props = defineProps<{
  summary: TrendSummary;
}>();

const activeMetric = ref<TrendMetricKey>("weightKg");
const activeStatus = ref<"全部" | string>("全部");
const selectedDate = ref<string | null>(props.summary.series.length ? props.summary.series[props.summary.series.length - 1]?.date ?? null : null);
const hoveredIndex = ref<number | null>(null);
const latestAvailableDate = computed(() => {
  const series = props.summary.series;
  const records = props.summary.records;
  if (series.length) return series[series.length - 1].date;
  if (records.length) return records[records.length - 1].date;
  return null;
});

watch(
  () => props.summary,
  (summary) => {
    const availableDates = new Set([...summary.series.map((item) => item.date), ...summary.records.map((item) => item.date)]);

    if (!selectedDate.value || !availableDates.has(selectedDate.value)) {
      const series = summary.series;
      const records = summary.records;
      selectedDate.value = series.length ? series[series.length - 1].date : records.length ? records[records.length - 1].date : null;
    }
  },
  { deep: true }
);

const metricMeta: Record<
  TrendMetricKey,
  {
    label: string;
    unit: string;
    accent: string;
    formatter: (value: number) => string;
    judge: (delta: number) => string;
  }
> = {
  weightKg: {
    label: "体重",
    unit: "kg",
    accent: "#2f6b55",
    formatter: (value) => `${value.toFixed(1)} kg`,
    judge: (delta) => (delta <= 0 ? "体重回落" : "体重上浮")
  },
  bodyFatRate: {
    label: "体脂",
    unit: "%",
    accent: "#bc7b3f",
    formatter: (value) => `${value.toFixed(1)}%`,
    judge: (delta) => (delta <= 0 ? "体脂下降" : "体脂抬升")
  },
  waistCm: {
    label: "腰围",
    unit: "cm",
    accent: "#7b5bd6",
    formatter: (value) => `${value.toFixed(1)} cm`,
    judge: (delta) => (delta <= 0 ? "围度收紧" : "围度增加")
  },
  sleepHours: {
    label: "睡眠",
    unit: "h",
    accent: "#3a7bd5",
    formatter: (value) => `${value.toFixed(1)} h`,
    judge: (delta) => (delta >= 0 ? "睡眠改善" : "睡眠走低")
  },
  steps: {
    label: "步数",
    unit: "steps",
    accent: "#178a82",
    formatter: (value) => `${Math.round(value)} 步`,
    judge: (delta) => (delta >= 0 ? "活动提升" : "活动减少")
  },
  trainingMinutes: {
    label: "训练",
    unit: "min",
    accent: "#c0392b",
    formatter: (value) => `${Math.round(value)} 分钟`,
    judge: (delta) => (delta >= 0 ? "训练增加" : "训练减少")
  },
  calorieIntake: {
    label: "摄入",
    unit: "kcal",
    accent: "#e67e22",
    formatter: (value) => `${Math.round(value)} kcal`,
    judge: (delta) => (delta <= 0 ? "摄入收紧" : "摄入增加")
  },
  calorieBurned: {
    label: "运动消耗",
    unit: "kcal",
    accent: "#8e44ad",
    formatter: (value) => `${Math.round(value)} kcal`,
    judge: (delta) => (delta >= 0 ? "消耗提升" : "消耗减少")
  }
};

const INTEGER_METRICS: TrendMetricKey[] = ["steps", "trainingMinutes", "calorieIntake", "calorieBurned"];

const selectedMetricMeta = computed(() => metricMeta[activeMetric.value]);

function isIntegerMetric(metric: TrendMetricKey = activeMetric.value) {
  return INTEGER_METRICS.includes(metric);
}

function formatMetricRangeValue(value: number) {
  return isIntegerMetric() ? Math.round(value).toString() : value.toFixed(1);
}

// 过滤掉与 digest 卡片重复的 metric card（恢复节律、活动基础）
const overviewMetricCards = computed(() =>
  props.summary.metricCards.filter((card) => card.label !== "恢复节律" && card.label !== "活动基础")
);

const statuses = computed(() => ["全部", ...new Set(props.summary.records.map((item) => item.status))]);
const hasFilteredRecords = computed(() => filteredRecords.value.length > 0);

const filteredRecords = computed(() => {
  if (activeStatus.value === "全部") {
    return props.summary.records;
  }

  return props.summary.records.filter((item) => item.status === activeStatus.value);
});

const selectedSeriesPoint = computed(() => {
  const fallbackDate = selectedDate.value ?? latestAvailableDate.value;
  const s = props.summary.series;
  return s.find((item) => item.date === fallbackDate) ?? (s.length ? s[s.length - 1] : null);
});

const selectedRecord = computed(() => {
  const fallbackDate = selectedDate.value ?? latestAvailableDate.value;
  const r = props.summary.records;
  return r.find((item) => item.date === fallbackDate) ?? (r.length ? r[r.length - 1] : null);
});

const latestSeriesPoint = computed(() => {
  const series = props.summary.series;
  return series.length ? series[series.length - 1] : null;
});
const firstSeriesPoint = computed(() => props.summary.series[0] ?? null);

const metricValues = computed(() => props.summary.series.map((item) => Number(item[activeMetric.value])));

const metricRange = computed(() => {
  const values = metricValues.value;
  if (!values.length) {
    return {
      min: 0,
      max: 0,
      spread: 1
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || Math.max(1, max * 0.06);

  return {
    min,
    max,
    spread
  };
});

const metricAverage = computed(() => {
  const values = metricValues.value;
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
});

const metricChange = computed(() => {
  const first = firstSeriesPoint.value;
  const latest = latestSeriesPoint.value;

  if (!first || !latest) {
    return 0;
  }

  return Number(latest[activeMetric.value]) - Number(first[activeMetric.value]);
});

const metricTrack = computed(() => {
  return props.summary.series.map((point) => {
    const value = Number(point[activeMetric.value]);
    const baseline = metricRange.value.min;
    const span = metricRange.value.spread || 1;
    const intensity = ((value - baseline) / span) * 100;

    return {
      ...point,
      value,
      intensity: Math.max(18, intensity),
      deviation: value - metricAverage.value
    };
  });
});

const metricHeadline = computed(() => {
  const point = selectedSeriesPoint.value;

  if (!point) {
    return "--";
  }

  return selectedMetricMeta.value.formatter(Number(point[activeMetric.value]));
});

const metricChangeLabel = computed(() =>
  isIntegerMetric()
    ? formatIntegerSigned(metricChange.value, selectedMetricMeta.value.unit)
    : formatSigned(metricChange.value, selectedMetricMeta.value.unit)
);

const metricRangeLabel = computed(() =>
  `${formatMetricRangeValue(metricRange.value.min)} - ${formatMetricRangeValue(metricRange.value.max)} ${selectedMetricMeta.value.unit}`
);

const progressGap = computed(() => (props.summary.latestWeight - props.summary.targetWeight).toFixed(1));

const progressLabel = computed(() => {
  if (props.summary.latestWeight <= props.summary.targetWeight) {
    return "已进入目标区间";
  }

  if (props.summary.averageSleepHours < 7) {
    return "减重仍在推进，但恢复节律拖后腿";
  }

  return "推进平稳，可以继续压实当前结构";
});

const progressNarrative = computed(() => {
  if (props.summary.latestWeight <= props.summary.targetWeight) {
    return '体重已经贴近目标，后续重点可以从"继续下降"转向"维持状态与优化体态"。';
  }

  if (props.summary.averageSleepHours < 7) {
    return `距离目标体重还有 ${progressGap.value} kg，建议先把睡眠拉回 7 小时以上，再追求更快的下降速度。`;
  }

  return `距离目标体重还有 ${progressGap.value} kg，当前训练、步数和围度变化是同向的，说明执行结构没有跑偏。`;
});

const recoveryMax = computed(() => Math.max(...props.summary.recoveryBreakdown.map((item) => item.value), 1));
const behaviorMax = computed(() => Math.max(...props.summary.behaviorBreakdown.map((item) => item.value), 1));

// 饮食概要
const dietAvgIntake = computed(() => {
  const series = props.summary.series;
  return Math.round(series.reduce((s, p) => s + p.calorieIntake, 0) / Math.max(series.length, 1));
});

const dietAvgBurned = computed(() => {
  const series = props.summary.series;
  return Math.round(series.reduce((s, p) => s + p.calorieBurned, 0) / Math.max(series.length, 1));
});

const dietNarrative = computed(() => {
  const gap = props.summary.averageCalorieGap;
  if (gap <= 0) return "摄入低于消耗，当前饮食结构有利于减脂推进。";
  if (gap <= 500) return "热量差处于可控区间，摄入与消耗节奏基本匹配，可以继续维持当前策略。";
  if (gap <= 1500) return "热量差略有偏高，建议适当压缩晚间碳水和高油脂食物的摄入比例。";
  return "热量差明显偏大，摄入远超消耗，需要重点审视饮食结构，尤其是零食和高热量饮品。";
});

// 训练概要
const trainingActiveDays = computed(() => {
  return props.summary.series.filter((p) => p.trainingMinutes >= 20).length;
});

const trainingNarrative = computed(() => {
  const avgMin = props.summary.averageTrainingMinutes;
  const days = trainingActiveDays.value;
  const total = props.summary.series.length;
  if (avgMin >= 35 && days >= total * 0.5) return "训练强度和频次都处于较好水平，适合继续维持或小幅微调训练量。";
  if (avgMin >= 20) return "训练量处于中等水平，仍有提升空间，可以尝试逐步增加单次训练时长或强度。";
  return "训练量偏低，建议每周至少安排 3-4 次中等强度训练，以提高基础代谢和消耗能力。";
});

// 达标统计 caption
const recoveryCaption = computed(() => {
  const items = props.summary.recoveryBreakdown;
  const sleep = items[0];
  if (sleep && sleep.value >= Math.round(props.summary.series.length * 0.65)) {
    return "恢复指标整体达标率较高，睡眠和步数维持稳定，训练活跃度良好。";
  }
  return "恢复端仍有波动，优先保障睡眠连续性，再逐步提升步数和训练天数的覆盖。";
});

const behaviorCaption = computed(() => {
  const gap = props.summary.averageCalorieGap;
  if (gap <= 500) return "摄入与消耗结构健康，热量差处于安全区间，当前饮食-运动配比可持续。";
  if (gap <= 1500) return "热量差偏中性，若想加速推进可以适当增加有氧消耗或微调餐次分配。";
  return "热量差偏大，建议从饮食端入手——降低精加工食物占比，增加高饱腹感的蛋白和蔬菜。";
});

// 饮食达标 breakdown
const dietBreakdown = computed(() => {
  const series = props.summary.series;
  const avgIntake = dietAvgIntake.value;
  const controlledDays = series.filter((p) => p.calorieIntake <= avgIntake).length;
  const highCalorieDays = series.filter((p) => p.calorieIntake > avgIntake + 300).length;
  return [
    { label: "控量达标天数", value: controlledDays, unit: `/${series.length} 天`, tone: controlledDays >= series.length * 0.6 ? "positive" as const : "warning" as const },
    { label: "超标天数", value: highCalorieDays, unit: `/${series.length} 天`, tone: highCalorieDays <= 3 ? "positive" as const : "warning" as const }
  ];
});

const dietBreakdownMax = computed(() => props.summary.series.length || 1);

// 训练达标 breakdown
const trainingBreakdown = computed(() => {
  const series = props.summary.series;
  const intenseDays = series.filter((p) => p.trainingMinutes >= 35).length;
  const lightDays = series.filter((p) => p.trainingMinutes >= 15 && p.trainingMinutes < 35).length;
  const restDays = series.filter((p) => p.trainingMinutes < 15).length;
  return [
    { label: "高强度训练天数", value: intenseDays, unit: `/${series.length} 天`, tone: intenseDays >= 5 ? "positive" as const : "neutral" as const },
    { label: "轻度训练天数", value: lightDays, unit: `/${series.length} 天`, tone: "neutral" as const },
    { label: "休息天数", value: restDays, unit: `/${series.length} 天`, tone: restDays <= series.length * 0.4 ? "positive" as const : "warning" as const }
  ];
});

const trainingBreakdownMax = computed(() => props.summary.series.length || 1);

// 饮食洞察
const dietInsights = computed(() => {
  const series = props.summary.series;
  const highDays = series.filter((p) => p.calorieIntake > dietAvgIntake.value + 300).length;
  const gap = props.summary.averageCalorieGap;
  const results: { title: string; detail: string; tone: "positive" | "warning" | "neutral" }[] = [];

  if (gap <= 500) {
    results.push({ title: "热量控制节奏稳定", detail: `日均热量差 ${gap} kcal，摄入与消耗配比合理，有利于持续减脂。`, tone: "positive" });
  } else if (gap <= 1500) {
    results.push({ title: "热量差略偏高", detail: `日均热量差 ${gap} kcal，建议关注晚间进食量和加餐频率，适当收紧摄入。`, tone: "warning" });
  } else {
    results.push({ title: "热量差明显偏大", detail: `日均热量差高达 ${gap} kcal，需要从饮食结构入手，优先减少高热量密度食物。`, tone: "warning" });
  }

  if (highDays <= 3) {
    results.push({ title: "摄入波动可控", detail: `21 天内仅有 ${highDays} 天摄入明显偏高，整体饮食纪律较好。`, tone: "positive" });
  } else {
    results.push({ title: "摄入波动偏大", detail: `有 ${highDays} 天摄入超过均值 300+ kcal，建议建立更规律的用餐节奏。`, tone: "neutral" });
  }

  return results;
});

// 训练洞察
const trainingInsights = computed(() => {
  const series = props.summary.series;
  const days = trainingActiveDays.value;
  const avgMin = props.summary.averageTrainingMinutes;
  const avgSteps = props.summary.averageSteps;
  const results: { title: string; detail: string; tone: "positive" | "warning" | "neutral" }[] = [];

  if (days >= series.length * 0.5 && avgMin >= 25) {
    results.push({ title: "训练执行力扎实", detail: `${days} 天训练活跃、日均 ${avgMin} 分钟，执行力已形成稳定节律。`, tone: "positive" });
  } else {
    results.push({ title: "训练频次有提升空间", detail: `活跃天数 ${days}/${series.length}，建议固定每周训练日程，减少随机性。`, tone: "neutral" });
  }

  if (avgSteps >= 10000) {
    results.push({ title: "日常活动量充足", detail: `日均 ${avgSteps} 步，非训练时段的活动基础也很扎实。`, tone: "positive" });
  } else if (avgSteps >= 8000) {
    results.push({ title: "日常活动量达标", detail: `日均 ${avgSteps} 步，处于健康区间，可以尝试小幅提升。`, tone: "neutral" });
  } else {
    results.push({ title: "日常活动量偏低", detail: `日均仅 ${avgSteps} 步，建议增加步行通勤或餐后散步来补足基础活动量。`, tone: "warning" });
  }

  return results;
});

const dailyPulse = computed(() => {
  const record = selectedRecord.value;

  if (!record) {
    return 0;
  }

  const sleepScore = Math.min(record.sleepHours / 8, 1);
  const stepsScore = Math.min(record.steps / 10000, 1);
  const trainingScore = Math.min(record.trainingMinutes / 40, 1);

  return Math.round(((sleepScore + stepsScore + trainingScore) / 3) * 100);
});

// SVG line chart constants
const SVG_PADDING_X = 40;
const SVG_PADDING_TOP = 40;
const SVG_PADDING_BOTTOM = 40;
const SVG_HEIGHT = 300;
const SVG_WIDTH = 760;

const svgPoints = computed(() => {
  const series = props.summary.series;
  if (series.length === 0) return { polyline: "", dots: [] };

  const range = metricRange.value;
  const xStep = series.length > 1 ? (SVG_WIDTH - SVG_PADDING_X * 2) / (series.length - 1) : 0;
  const chartHeight = SVG_HEIGHT - SVG_PADDING_TOP - SVG_PADDING_BOTTOM;

  const dots = series.map((point, i) => {
    const value = Number(point[activeMetric.value]);
    const x = SVG_PADDING_X + i * xStep;
    const ratio = range.spread > 0 ? (value - range.min) / range.spread : 0.5;
    const y = SVG_PADDING_TOP + chartHeight - ratio * chartHeight;
    return { x, y, value, date: point.date, label: point.label, index: i };
  });

  const polyline = dots.map((d) => `${d.x},${d.y}`).join(" ");

  return { polyline, dots };
});

function formatDate(value: string) {
  return formatDateOnly(value);
}

function exportToExcel() {
  if (!filteredRecords.value.length) {
    return;
  }

  const data = filteredRecords.value.map((item) => ({
    "日期": item.date,
    "体重(kg)": item.weightKg,
    "体脂率(%)": item.bodyFatRate,
    "腰围(cm)": item.waistCm,
    "睡眠(h)": item.sleepHours,
    "步数": item.steps,
    "训练(分钟)": item.trainingMinutes,
    "热量差(kcal)": item.calorieGap,
    "状态": item.status
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "每日记录");
  XLSX.writeFile(workbook, `LightBalance_趋势记录_${todayDateString()}.xlsx`);
}

function describeDeviation(value: number) {
  if (Math.abs(value) < 0.15) {
    return "接近阶段均值";
  }

  const absValue = isIntegerMetric() ? Math.round(Math.abs(value)) : Math.abs(value).toFixed(1);
  const unit = selectedMetricMeta.value.unit;
  return value > 0 ? `高于均值 ${absValue} ${unit}` : `低于均值 ${absValue} ${unit}`;
}

function selectPoint(point: TrendSeriesPoint | TrendRecordRow) {
  selectedDate.value = point.date;
}

function onSvgDotHover(index: number | null) {
  hoveredIndex.value = index;
}

function onSvgDotClick(index: number) {
  const point = props.summary.series[index];
  if (point) selectPoint(point);
}

// SVG Y-axis ticks (4 ticks)
const svgYTicks = computed(() => {
  const range = metricRange.value;
  const chartHeight = SVG_HEIGHT - SVG_PADDING_TOP - SVG_PADDING_BOTTOM;
  const ticks: { y: number; label: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const ratio = i / 3;
    const y = SVG_PADDING_TOP + chartHeight - ratio * chartHeight;
    const value = range.min + ratio * range.spread;
    const label = formatMetricRangeValue(value);
    ticks.push({ y, label });
  }
  return ticks;
});
</script>

<template>
  <section class="trend">
    <!-- Section A: 顶部概览 -->
    <article class="overview-bar">
      <div class="overview-bar__header">
        <p class="overview-bar__eyebrow">Trend Tracker</p>
        <h3>长期趋势分析</h3>
        <p class="overview-bar__narrative">{{ progressNarrative }}</p>
      </div>

      <div class="metric-cards">
        <article v-for="card in overviewMetricCards" :key="card.label" class="metric-card" :data-tone="card.tone">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <em>{{ card.change }}</em>
          <small>{{ card.note }}</small>
        </article>
      </div>

      <div class="overview-bar__meta">
        <div class="meta-item">
          <span>当前判断</span>
          <strong>{{ progressLabel }}</strong>
        </div>
        <div class="meta-item">
          <span>目标差值</span>
          <strong>{{ progressGap }} kg</strong>
        </div>
        <div class="meta-item">
          <span>完成度</span>
          <strong>{{ summary.completionRate }}%</strong>
        </div>
      </div>

      <!-- 饮食 & 训练概要 -->
      <div class="overview-bar__digest">
        <article class="digest-card">
          <div class="digest-card__header">
            <span class="digest-card__icon">&#x1F35D;</span>
            <div>
              <h5>饮食结构概览</h5>
            </div>
          </div>
          <p class="digest-card__narrative">{{ dietNarrative }}</p>
          <div class="digest-card__stats">
            <div class="digest-stat">
              <span>日均摄入</span>
              <strong>{{ dietAvgIntake }} kcal</strong>
            </div>
            <div class="digest-stat">
              <span>日均消耗</span>
              <strong>{{ dietAvgBurned }} kcal</strong>
            </div>
            <div class="digest-stat">
              <span>日均热量差</span>
              <strong :class="summary.averageCalorieGap <= 0 ? 'digest-stat--positive' : 'digest-stat--warning'">
                {{ summary.averageCalorieGap > 0 ? '+' : '' }}{{ summary.averageCalorieGap }} kcal
              </strong>
            </div>
          </div>
        </article>
        <article class="digest-card">
          <div class="digest-card__header">
            <span class="digest-card__icon">&#x1F3CB;</span>
            <div>
              <h5>训练执行概览</h5>
            </div>
          </div>
          <p class="digest-card__narrative">{{ trainingNarrative }}</p>
          <div class="digest-card__stats">
            <div class="digest-stat">
              <span>日均训练</span>
              <strong>{{ summary.averageTrainingMinutes }} 分钟</strong>
            </div>
            <div class="digest-stat">
              <span>训练活跃天数</span>
              <strong>{{ trainingActiveDays }}/{{ summary.series.length }} 天</strong>
            </div>
            <div class="digest-stat">
              <span>日均步数</span>
              <strong>{{ summary.averageSteps }}</strong>
            </div>
          </div>
        </article>
      </div>
    </article>

    <!-- Section B: 图表区 -->
    <section class="chart-grid">
      <!-- 左侧：SVG 折线图 -->
      <article class="chart-card">
        <div class="chart-card__header">
          <div>
            <p class="chart-card__eyebrow">Trend Line</p>
            <h4>核心指标趋势</h4>
          </div>
          <div class="metric-pills">
            <button
              v-for="(meta, key) in metricMeta"
              :key="key"
              type="button"
              class="metric-pill"
              :class="{ 'metric-pill--active': key === activeMetric }"
              :style="key === activeMetric ? { '--pill-accent': meta.accent } : undefined"
              @click="activeMetric = key as TrendMetricKey"
            >
              {{ meta.label }}
            </button>
          </div>
        </div>

        <div class="chart-hero">
          <div class="chart-hero__stat">
            <span>{{ selectedMetricMeta.label }}当前读数</span>
            <strong>{{ metricHeadline }}</strong>
            <small>{{ metricChangeLabel }} · {{ selectedMetricMeta.judge(metricChange) }}</small>
          </div>
          <div class="chart-hero__stat">
            <span>阶段均值</span>
            <strong>{{ selectedMetricMeta.formatter(metricAverage) }}</strong>
            <small>区间 {{ metricRangeLabel }}</small>
          </div>
        </div>

        <!-- SVG 折线图 -->
        <div class="svg-chart">
          <svg
            :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`"
            preserveAspectRatio="xMidYMid meet"
            class="svg-chart__svg"
          >
            <!-- 网格线 -->
            <line
              v-for="tick in svgYTicks"
              :key="tick.y"
              :x1="SVG_PADDING_X"
              :y1="tick.y"
              :x2="SVG_WIDTH - SVG_PADDING_X"
              :y2="tick.y"
              class="svg-grid-line"
            />

            <!-- Y轴标签 -->
            <text
              v-for="tick in svgYTicks"
              :key="'label-' + tick.y"
              :x="SVG_PADDING_X - 8"
              :y="tick.y + 4"
              class="svg-axis-label"
              text-anchor="end"
            >
              {{ tick.label }}
            </text>

            <!-- 折线 -->
            <polyline
              v-if="svgPoints.polyline"
              :points="svgPoints.polyline"
              :stroke="selectedMetricMeta.accent"
              class="svg-line"
            />

            <!-- 均值参考线 -->
            <line
              v-if="svgPoints.dots.length > 1"
              :x1="SVG_PADDING_X"
              :y1="svgYTicks[1]?.y ?? 0"
              :x2="SVG_WIDTH - SVG_PADDING_X"
              :y2="svgYTicks[1]?.y ?? 0"
              class="svg-avg-line"
              :stroke="selectedMetricMeta.accent"
            />

            <!-- 数据点 -->
            <g
              v-for="dot in svgPoints.dots"
              :key="dot.date"
              class="svg-dot-group"
              @mouseenter="onSvgDotHover(dot.index)"
              @mouseleave="onSvgDotHover(null)"
              @click="onSvgDotClick(dot.index)"
            >
              <circle
                :cx="dot.x"
                :cy="dot.y"
                :r="hoveredIndex === dot.index || selectedDate === dot.date ? 7 : 4"
                :fill="selectedDate === dot.date ? selectedMetricMeta.accent : '#fff'"
                :stroke="selectedMetricMeta.accent"
                :stroke-width="selectedDate === dot.date ? 3 : 2"
                class="svg-dot"
              />

              <!-- 悬浮提示 -->
              <g v-if="hoveredIndex === dot.index || (selectedDate === dot.date && hoveredIndex === null)">
                <rect
                  :x="dot.x - 36"
                  :y="dot.y - 34"
                  width="72"
                  height="24"
                  rx="8"
                  class="svg-tooltip-bg"
                />
                <text
                  :x="dot.x"
                  :y="dot.y - 18"
                  class="svg-tooltip-text"
                  text-anchor="middle"
                >
                  {{ isIntegerMetric() ? Math.round(dot.value) : dot.value.toFixed(1) }}
                </text>
              </g>

              <!-- X轴日期 -->
              <text
                v-if="svgPoints.dots.length <= 14 || dot.index % 2 === 0"
                :x="dot.x"
                :y="SVG_HEIGHT - SVG_PADDING_BOTTOM + 20"
                class="svg-axis-label"
                text-anchor="middle"
              >
                {{ dot.label }}
              </text>
            </g>
          </svg>
        </div>

        <div v-if="selectedSeriesPoint" class="chart-summary">
          <div>
            <span>选中节点</span>
            <strong>{{ selectedSeriesPoint.label }}</strong>
          </div>
          <p>{{ describeDeviation(selectedSeriesPoint[activeMetric] - metricAverage) }}</p>
        </div>
      </article>

      <!-- 右侧：单日详情 -->
      <aside class="detail-card">
        <div class="detail-card__header">
          <p class="detail-card__eyebrow">Day Snapshot</p>
          <h4>单日状态快照</h4>
        </div>

        <div v-if="selectedRecord" class="snapshot">
          <div class="snapshot__ring">
            <div
              class="snapshot__ring-fill"
              :style="{ background: `conic-gradient(#d9782f 0 ${dailyPulse}%, rgba(217, 120, 47, 0.12) ${dailyPulse}% 100%)` }"
            >
              <div class="snapshot__ring-core">
                <span>{{ formatDate(selectedRecord.date) }}</span>
                <strong>{{ dailyPulse }}</strong>
                <small>日节律分</small>
              </div>
            </div>
          </div>

          <div class="snapshot__meta">
            <span class="snapshot__status">{{ selectedRecord.status }}</span>
            <p>
              热量差 {{ selectedRecord.calorieGap }} kcal（摄入 − 运动消耗 − 基础代谢），训练 {{ selectedRecord.trainingMinutes }} 分钟，步数
              {{ selectedRecord.steps }}，睡眠 {{ selectedRecord.sleepHours }} 小时。
            </p>
          </div>

          <div class="snapshot__metrics">
            <article>
              <span>体重</span>
              <strong>{{ selectedRecord.weightKg }} kg</strong>
            </article>
            <article>
              <span>体脂</span>
              <strong>{{ selectedRecord.bodyFatRate }}%</strong>
            </article>
            <article>
              <span>腰围</span>
              <strong>{{ selectedRecord.waistCm }} cm</strong>
            </article>
            <article>
              <span>睡眠</span>
              <strong>{{ selectedRecord.sleepHours }} h</strong>
            </article>
          </div>

          <div class="snapshot__bars">
            <div class="snapshot__bar-row">
              <span>步数完成</span>
              <div class="snapshot__bar-rail">
                <span class="snapshot__bar-fill" :style="{ width: `${Math.min(selectedRecord.steps / 10000, 1) * 100}%` }"></span>
              </div>
              <strong>{{ selectedRecord.steps }}</strong>
            </div>
            <div class="snapshot__bar-row">
              <span>训练时长</span>
              <div class="snapshot__bar-rail">
                <span class="snapshot__bar-fill snapshot__bar-fill--warm" :style="{ width: `${Math.min(selectedRecord.trainingMinutes / 60, 1) * 100}%` }"></span>
              </div>
              <strong>{{ selectedRecord.trainingMinutes }} 分钟</strong>
            </div>
            <div class="snapshot__bar-row">
              <span>热量差</span>
              <div class="snapshot__bar-rail">
                <span
                  class="snapshot__bar-fill"
                  :class="selectedRecord.calorieGap >= 0 ? 'snapshot__bar-fill--positive' : 'snapshot__bar-fill--negative'"
                  :style="{ width: `${Math.min(Math.abs(selectedRecord.calorieGap) / 500, 1) * 100}%` }"
                ></span>
              </div>
              <strong>{{ selectedRecord.calorieGap }} kcal</strong>
            </div>
          </div>
        </div>

        <div v-else class="snapshot--empty">
          <p>暂无选中日期的详情数据</p>
        </div>
      </aside>
    </section>

    <!-- Section C: 底部区域 -->
    <section class="bottom-grid">
      <!-- 左侧：达标统计 -->
      <article class="breakdown-card">
        <div class="breakdown-card__header">
          <p class="breakdown-card__eyebrow">Breakdown</p>
          <h4>阶段达标统计</h4>
        </div>

        <div class="breakdown-group">
          <header>
            <span>恢复达标</span>
            <strong>21 天内各项恢复指标的达标情况</strong>
          </header>
          <article v-for="item in summary.recoveryBreakdown" :key="item.label" class="breakdown-row" :data-tone="item.tone">
            <div class="breakdown-row__head">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}{{ item.unit }}</strong>
            </div>
            <div class="breakdown-row__rail">
              <span class="breakdown-row__fill" :style="{ width: `${(item.value / recoveryMax) * 100}%` }"></span>
            </div>
          </article>
          <p class="breakdown-caption">{{ recoveryCaption }}</p>
        </div>

        <div class="breakdown-group">
          <header>
            <span>行为分析</span>
            <strong>摄入、消耗和热量缺口的结构关系</strong>
          </header>
          <article v-for="item in summary.behaviorBreakdown" :key="item.label" class="breakdown-row breakdown-row--warm" :data-tone="item.tone">
            <div class="breakdown-row__head">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }} {{ item.unit }}</strong>
            </div>
            <div class="breakdown-row__rail">
              <span class="breakdown-row__fill breakdown-row__fill--warm" :style="{ width: `${(item.value / behaviorMax) * 100}%` }"></span>
            </div>
          </article>
          <p class="breakdown-caption">{{ behaviorCaption }}</p>
        </div>

        <!-- 饮食达标详情 -->
        <div class="breakdown-group">
          <header>
            <span>饮食达标</span>
            <strong>热量摄入控制与营养结构分析</strong>
          </header>
          <p class="breakdown-criterion">达标标准：日均摄入 ≤ {{ dietAvgIntake }} kcal 为达标，> {{ dietAvgIntake + 300 }} kcal 为超标</p>
          <article v-for="item in dietBreakdown" :key="item.label" class="breakdown-row breakdown-row--warm" :data-tone="item.tone">
            <div class="breakdown-row__head">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }} {{ item.unit }}</strong>
            </div>
            <div class="breakdown-row__rail">
              <span class="breakdown-row__fill breakdown-row__fill--warm" :style="{ width: `${(item.value / dietBreakdownMax) * 100}%` }"></span>
            </div>
          </article>
        </div>

        <!-- 训练达标详情 -->
        <div class="breakdown-group">
          <header>
            <span>训练达标</span>
            <strong>训练频次与消耗量的阶段表现</strong>
          </header>
          <p class="breakdown-criterion">达标标准：≥ 35 分钟为高强度训练，15 ~ 35 分钟为轻度训练，< 15 分钟为休息日</p>
          <article v-for="item in trainingBreakdown" :key="item.label" class="breakdown-row" :data-tone="item.tone">
            <div class="breakdown-row__head">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }} {{ item.unit }}</strong>
            </div>
            <div class="breakdown-row__rail">
              <span class="breakdown-row__fill" :style="{ width: `${(item.value / trainingBreakdownMax) * 100}%` }"></span>
            </div>
          </article>
        </div>
      </article>

      <!-- 右侧：趋势洞察 -->
      <article class="insights-card">
        <div class="insights-card__header">
          <p class="insights-card__eyebrow">Insights</p>
          <h4>综合趋势洞察</h4>
        </div>

        <div class="insight-stack">
          <article v-for="item in summary.insights" :key="item.title" class="insight-item" :data-tone="item.tone">
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
          </article>
        </div>

        <!-- 饮食洞察 -->
        <div class="insight-section">
          <p class="insight-section__eyebrow">Diet Insights</p>
          <h5>饮食行为洞察</h5>
          <div class="insight-stack">
            <article v-for="item in dietInsights" :key="item.title" class="insight-item" :data-tone="item.tone">
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </article>
          </div>
        </div>

        <!-- 训练洞察 -->
        <div class="insight-section">
          <p class="insight-section__eyebrow">Training Insights</p>
          <h5>训练与活动洞察</h5>
          <div class="insight-stack">
            <article v-for="item in trainingInsights" :key="item.title" class="insight-item" :data-tone="item.tone">
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </article>
          </div>
        </div>
      </article>
    </section>

    <!-- Section D: 每日记录 -->
    <article class="records-card">
      <div class="records-card__header">
        <div>
          <p class="records-card__eyebrow">Records</p>
          <h4>每日数据记录</h4>
        </div>
        <div class="records-card__actions">
          <button type="button" class="records-card__export" :disabled="!hasFilteredRecords" @click="exportToExcel">导出趋势记录</button>
          <div class="status-pills">
          <button
            v-for="status in statuses"
            :key="status"
            type="button"
            class="status-pill"
            :class="{ 'status-pill--active': status === activeStatus }"
            @click="activeStatus = status"
          >
            {{ status }}
          </button>
        </div>
        </div>
      </div>

      <div class="record-list">
        <button
          v-for="item in filteredRecords"
          :key="item.date"
          type="button"
          class="record-row"
          :class="{ 'record-row--active': item.date === selectedDate }"
          @click="selectPoint(item)"
        >
          <div class="record-row__date">
            <span>{{ formatDate(item.date) }}</span>
            <strong>{{ item.status }}</strong>
          </div>
          <div class="record-row__metrics">
            <span>体重 {{ item.weightKg }} kg</span>
            <span>体脂 {{ item.bodyFatRate }}%</span>
            <span>腰围 {{ item.waistCm }} cm</span>
            <span>睡眠 {{ item.sleepHours }} h</span>
            <span>步数 {{ item.steps }}</span>
            <span>训练 {{ item.trainingMinutes }} 分钟</span>
            <span>热量差 {{ item.calorieGap }} kcal</span>
          </div>
        </button>
        <div v-if="!hasFilteredRecords" class="record-empty">
          当前筛选条件下暂无记录
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.trend {
  display: grid;
  gap: 18px;
  padding-right: 18px;
}

/* ===== 通用面板样式 ===== */
.overview-bar,
.chart-card,
.detail-card,
.breakdown-card,
.insights-card,
.records-card {
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  box-shadow: var(--shadow-panel);
}

.overview-bar__eyebrow,
.chart-card__eyebrow,
.detail-card__eyebrow,
.breakdown-card__eyebrow,
.insights-card__eyebrow,
.records-card__eyebrow {
  margin: 0 0 8px;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

/* ===== Section A: 顶部概览 ===== */
.overview-bar {
  padding: 28px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0 1px, transparent 1px 12px),
    var(--color-surface);
}

.overview-bar__header h3 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--color-text);
}

.overview-bar__narrative {
  margin: 10px 0 0;
  color: var(--color-text-soft);
  line-height: 1.75;
  max-width: 800px;
}

.metric-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.metric-card {
  padding: 18px;
  border-radius: var(--radius-card);
  background: var(--color-surface-soft);
  border: 1px solid var(--color-line);
}

.metric-card span {
  color: var(--color-text-soft);
  font-size: 0.88rem;
}

.metric-card strong {
  display: block;
  margin-top: 6px;
  font-size: 1.5rem;
  color: var(--color-text);
}

.metric-card em {
  display: block;
  margin-top: 6px;
  font-style: normal;
  font-weight: 700;
  color: #225c49;
}

.metric-card small {
  display: block;
  margin-top: 4px;
  color: var(--color-text-soft);
  font-size: 0.82rem;
}

.metric-card[data-tone="warning"] em {
  color: #af6f2b;
}

.overview-bar__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.meta-item {
  padding: 16px 18px;
  border-radius: var(--radius-card);
  background: var(--color-surface-soft);
  backdrop-filter: blur(4px);
}

.meta-item span {
  color: var(--color-text-soft);
  font-size: 0.88rem;
}

.meta-item strong {
  display: block;
  margin-top: 6px;
  color: var(--color-text);
  font-size: 1.2rem;
}

/* ===== Section B: 图表区 ===== */
.chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 340px;
  gap: 18px;
}

.chart-card {
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0 1px, transparent 1px 12px),
    var(--color-surface);
}

.chart-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.chart-card__header h4 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}

.metric-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metric-pill {
  border: 0;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(34, 52, 42, 0.08);
  color: var(--color-text);
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.metric-pill--active {
  background: var(--pill-accent);
  color: #fffaf0;
}

.chart-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 18px;
  padding: 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.6);
}

.chart-hero__stat span {
  color: var(--color-text-soft);
  font-size: 0.88rem;
}

.chart-hero__stat strong {
  display: block;
  margin-top: 6px;
  font-size: 1.6rem;
  color: var(--color-text);
}

.chart-hero__stat small {
  display: block;
  margin-top: 4px;
  color: var(--color-text-soft);
}

/* SVG 折线图 */
.svg-chart {
  margin-top: 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.5);
  padding: 8px 4px;
  overflow: visible;
}

.svg-chart__svg {
  width: 100%;
  height: auto;
  display: block;
}

.svg-grid-line {
  stroke: rgba(57, 87, 63, 0.08);
  stroke-width: 1;
}

.svg-avg-line {
  stroke-dasharray: 6 4;
  stroke-width: 1;
  opacity: 0.4;
}

.svg-axis-label {
  font-size: 11px;
  fill: var(--color-text-soft);
}

.svg-line {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.svg-dot-group {
  cursor: pointer;
}

.svg-dot {
  transition: r 0.15s ease, fill 0.15s ease, stroke-width 0.15s ease;
}

.svg-tooltip-bg {
  fill: rgba(255, 252, 246, 0.95);
  stroke: rgba(57, 87, 63, 0.12);
  stroke-width: 1;
}

.svg-tooltip-text {
  font-size: 12px;
  font-weight: 700;
  fill: var(--color-text);
}

.chart-summary {
  margin-top: 14px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
}

.chart-summary span {
  color: var(--color-text-soft);
  font-size: 0.88rem;
}

.chart-summary strong {
  display: block;
  margin-top: 4px;
  color: var(--color-text);
}

.chart-summary p {
  margin: 0;
  color: var(--color-text-soft);
}

/* 单日详情卡片 */
.detail-card {
  padding: 24px;
  align-content: start;
  background:
    radial-gradient(circle at center top, rgba(240, 149, 75, 0.1), transparent 28%),
    rgba(255, 252, 246, 0.96);
}

.detail-card__header h4 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}

.snapshot {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.snapshot__ring {
  display: grid;
  place-items: center;
}

.snapshot__ring-fill {
  width: 180px;
  height: 180px;
  padding: 14px;
  border-radius: 50%;
}

.snapshot__ring-core {
  width: 100%;
  height: 100%;
  display: grid;
  place-content: center;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(248, 244, 238, 0.98));
  text-align: center;
}

.snapshot__ring-core span {
  color: var(--color-text-soft);
  font-size: 0.88rem;
}

.snapshot__ring-core strong {
  display: block;
  margin-top: 4px;
  font-size: 2.2rem;
  line-height: 1;
  color: var(--color-text);
}

.snapshot__ring-core small {
  display: block;
  margin-top: 4px;
  color: var(--color-text-soft);
}

.snapshot__meta {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
}

.snapshot__status {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(27, 68, 93, 0.08);
  color: #264a63;
  font-weight: 700;
  font-size: 0.88rem;
}

.snapshot__meta p {
  margin: 10px 0 0;
  color: var(--color-text-soft);
  line-height: 1.7;
  font-size: 0.88rem;
}

.snapshot__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.snapshot__metrics article {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
}

.snapshot__metrics span {
  color: var(--color-text-soft);
  font-size: 0.82rem;
}

.snapshot__metrics strong {
  display: block;
  margin-top: 4px;
  color: var(--color-text);
}

.snapshot__bars {
  display: grid;
  gap: 10px;
}

.snapshot__bar-row {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  gap: 10px;
  align-items: center;
}

.snapshot__bar-row span {
  color: var(--color-text-soft);
  font-size: 0.82rem;
}

.snapshot__bar-row strong {
  color: var(--color-text);
  font-size: 0.82rem;
}

.snapshot__bar-rail {
  height: 8px;
  border-radius: 999px;
  background: rgba(57, 87, 63, 0.08);
  overflow: hidden;
}

.snapshot__bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2b60a1, #68b7b2);
}

.snapshot__bar-fill--warm {
  background: linear-gradient(90deg, #d9782f, #f0be62);
}

.snapshot__bar-fill--positive {
  background: linear-gradient(90deg, #2f6b55, #6aa46b);
}

.snapshot__bar-fill--negative {
  background: linear-gradient(90deg, #c0392b, #e67e22);
}

.snapshot__formula {
  margin: 2px 0 0;
  color: var(--color-text-soft);
  font-size: 0.75rem;
  text-align: right;
  opacity: 0.75;
}

.snapshot--empty {
  margin-top: 18px;
  padding: 40px;
  text-align: center;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.5);
}

.snapshot--empty p {
  margin: 0;
  color: var(--color-text-soft);
}

/* ===== Section C: 底部区域 ===== */
.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 18px;
}

.breakdown-card {
  padding: 24px;
  align-content: start;
  background:
    radial-gradient(circle at left top, rgba(102, 128, 255, 0.08), transparent 22%),
    rgba(255, 252, 246, 0.96);
}

.breakdown-card__header h4 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}

.breakdown-group {
  margin-top: 18px;
  padding: 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.6);
}

.breakdown-group + .breakdown-group {
  margin-top: 14px;
}

.breakdown-group header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.breakdown-group header span {
  color: var(--color-text);
  font-weight: 700;
}

.breakdown-group header strong {
  color: var(--color-text-soft);
  font-size: 0.88rem;
  font-weight: 500;
}

.breakdown-row + .breakdown-row {
  margin-top: 12px;
}

.breakdown-row__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breakdown-row__head span {
  color: var(--color-text-soft);
  font-size: 0.88rem;
}

.breakdown-row__head strong {
  color: var(--color-text);
  font-size: 0.92rem;
}

.breakdown-row__rail {
  height: 10px;
  margin-top: 8px;
  border-radius: 999px;
  background: rgba(57, 87, 63, 0.06);
  overflow: hidden;
}

.breakdown-row__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2b60a1, #68b7b2);
}

.breakdown-row__fill--warm {
  background: linear-gradient(90deg, #d9782f, #f0be62);
}

.insights-card {
  padding: 24px;
  background:
    radial-gradient(circle at right bottom, rgba(162, 120, 210, 0.09), transparent 24%),
    rgba(255, 252, 246, 0.96);
}

.insights-card__header h4 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}

.insight-stack {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.insight-item {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(248, 244, 236, 0.82));
  border: 1px solid rgba(57, 87, 63, 0.08);
}

.insight-item strong {
  color: var(--color-text);
}

.insight-item p {
  margin: 6px 0 0;
  color: var(--color-text-soft);
  line-height: 1.7;
  font-size: 0.92rem;
}

.insight-item[data-tone="positive"] {
  border-color: rgba(46, 123, 96, 0.18);
}

.insight-item[data-tone="warning"] {
  border-color: rgba(217, 120, 47, 0.22);
}

/* 饮食 & 训练概要 digest */
.overview-bar__digest {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 18px;
}

.digest-card {
  padding: 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(57, 87, 63, 0.06);
}

.digest-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.digest-card__icon {
  font-size: 1.6rem;
  line-height: 1;
}

.digest-card__eyebrow {
  margin: 0 0 4px;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.digest-card h5 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-text);
}

.digest-card__narrative {
  margin: 12px 0 0;
  color: var(--color-text-soft);
  font-size: 0.88rem;
  line-height: 1.7;
}

.digest-card__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.digest-stat {
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
}

.digest-stat span {
  color: var(--color-text-soft);
  font-size: 0.78rem;
}

.digest-stat strong {
  display: block;
  margin-top: 4px;
  color: var(--color-text);
  font-size: 1.1rem;
}

.digest-stat--positive {
  color: #225c49;
}

.digest-stat--warning {
  color: #af6f2b;
}

/* 达标 caption */
.breakdown-caption {
  margin: 14px 0 0;
  color: var(--color-text-soft);
  font-size: 0.82rem;
  line-height: 1.7;
}

.breakdown-criterion {
  margin: 8px 0 4px;
  padding: 6px 10px;
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--color-text-soft);
  background: rgba(57, 87, 63, 0.05);
  border-radius: 6px;
}

/* 洞察子区域 */
.insight-section {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(57, 87, 63, 0.08);
}

.insight-section__eyebrow {
  margin: 0 0 6px;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.insight-section h5 {
  margin: 0 0 12px;
  font-size: 1.05rem;
  color: var(--color-text);
}

/* 记录列表 */
.records-card {
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0 1px, transparent 1px 12px),
    var(--color-surface);
}

.records-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.records-card__header h4 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}

.records-card__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.records-card__export {
  border: 1px solid rgba(57, 87, 63, 0.18);
  padding: 7px 14px;
  border-radius: 8px;
  background: rgba(57, 87, 63, 0.06);
  color: var(--color-primary);
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
}

.records-card__export:hover {
  background: rgba(57, 87, 63, 0.12);
  box-shadow: 0 2px 8px rgba(57, 87, 63, 0.15);
  transform: translateY(-1px);
}

.records-card__export:disabled {
  opacity: 0.5;
  transform: none;
  box-shadow: none;
}

.status-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-pill {
  border: 0;
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(34, 52, 42, 0.08);
  color: var(--color-text);
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
}

.status-pill--active {
  background: linear-gradient(135deg, #22342a, #42604b);
  color: #fffaf0;
}

.record-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.record-row {
  width: 100%;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 14px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(247, 250, 255, 0.9), rgba(255, 252, 247, 0.92));
  border: 1px solid rgba(57, 87, 63, 0.08);
  text-align: left;
  cursor: pointer;
}

.record-row__date span {
  color: var(--color-text-soft);
  font-size: 0.82rem;
}

.record-row__date strong {
  display: block;
  margin-top: 4px;
  color: var(--color-text);
  font-size: 1rem;
}

.record-row__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.record-row__metrics span {
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-text-soft);
  font-size: 0.82rem;
}

.record-row--active {
  box-shadow: inset 0 0 0 2px rgba(32, 78, 65, 0.16);
}

.record-empty {
  padding: 18px;
  border-radius: var(--radius-card);
  background: var(--color-surface-soft);
  color: var(--color-text-soft);
  text-align: center;
}

/* ===== 响应式 ===== */
@media (max-width: 1180px) {
  .chart-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .metric-cards,
  .overview-bar__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-bar__digest {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .trend {
    padding-right: 0;
  }

  .overview-bar,
  .chart-card,
  .detail-card,
  .breakdown-card,
  .insights-card,
  .records-card {
    padding: 20px;
  }

  .metric-cards,
  .overview-bar__meta,
  .overview-bar__digest,
  .digest-card__stats,
  .chart-hero,
  .snapshot__metrics,
  .record-row,
  .record-row__metrics {
    grid-template-columns: 1fr;
  }

  .chart-card__header,
  .breakdown-group header,
  .records-card__header {
    flex-direction: column;
  }

  .metric-pills,
  .status-pills {
    justify-content: flex-start;
  }
}
</style>
