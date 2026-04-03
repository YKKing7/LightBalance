<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { TrendMetricKey, TrendRecordRow, TrendSeriesPoint, TrendSummary } from "../services/types";

const props = defineProps<{
  summary: TrendSummary;
}>();

const activeMetric = ref<TrendMetricKey>("weightKg");
const activeStatus = ref<"全部" | string>("全部");
const selectedDate = ref<string | null>(props.summary.series.at(-1)?.date ?? null);
const hoveredIndex = ref<number | null>(null);
const latestAvailableDate = computed(() => props.summary.series.at(-1)?.date ?? props.summary.records.at(-1)?.date ?? null);

watch(
  () => props.summary,
  (summary) => {
    const availableDates = new Set([...summary.series.map((item) => item.date), ...summary.records.map((item) => item.date)]);

    if (!selectedDate.value || !availableDates.has(selectedDate.value)) {
      selectedDate.value = summary.series.at(-1)?.date ?? summary.records.at(-1)?.date ?? null;
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
    judge: (delta) => (delta <= 0 ? "持续回落" : "出现反弹")
  },
  bodyFatRate: {
    label: "体脂",
    unit: "%",
    accent: "#bc7b3f",
    formatter: (value) => `${value.toFixed(1)}%`,
    judge: (delta) => (delta <= 0 ? "脂率下行" : "脂率抬头")
  },
  waistCm: {
    label: "腰围",
    unit: "cm",
    accent: "#7b5bd6",
    formatter: (value) => `${value.toFixed(1)} cm`,
    judge: (delta) => (delta <= 0 ? "围度收紧" : "围度放大")
  },
  sleepHours: {
    label: "睡眠",
    unit: "h",
    accent: "#3a7bd5",
    formatter: (value) => `${value.toFixed(1)} h`,
    judge: (delta) => (delta >= 0 ? "恢复升温" : "恢复走低")
  },
  steps: {
    label: "步数",
    unit: "steps",
    accent: "#178a82",
    formatter: (value) => `${Math.round(value)} 步`,
    judge: (delta) => (delta >= 0 ? "活动抬升" : "活动偏低")
  }
};

const statuses = computed(() => ["全部", ...new Set(props.summary.records.map((item) => item.status))]);

const filteredRecords = computed(() => {
  if (activeStatus.value === "全部") {
    return props.summary.records;
  }

  return props.summary.records.filter((item) => item.status === activeStatus.value);
});

const selectedSeriesPoint = computed(() => {
  const fallbackDate = selectedDate.value ?? latestAvailableDate.value;
  return props.summary.series.find((item) => item.date === fallbackDate) ?? props.summary.series.at(-1) ?? null;
});

const selectedRecord = computed(() => {
  const fallbackDate = selectedDate.value ?? latestAvailableDate.value;
  return props.summary.records.find((item) => item.date === fallbackDate) ?? props.summary.records.at(-1) ?? null;
});

const latestSeriesPoint = computed(() => props.summary.series.at(-1) ?? null);
const firstSeriesPoint = computed(() => props.summary.series[0] ?? null);

const metricValues = computed(() => props.summary.series.map((item) => Number(item[activeMetric.value])));

const metricRange = computed(() => {
  const values = metricValues.value;
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

  return metricMeta[activeMetric.value].formatter(Number(point[activeMetric.value]));
});

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
    return '体重已经贴近目标，后续重点可以从"继续掉秤"转向"维持状态和塑形"。';
  }

  if (props.summary.averageSleepHours < 7) {
    return `距离目标体重还有 ${progressGap.value} kg，建议先把睡眠拉回 7 小时以上，再追求更快的下降速度。`;
  }

  return `距离目标体重还有 ${progressGap.value} kg，当前训练、步数和围度变化是同向的，说明执行结构没有跑偏。`;
});

const recoveryMax = computed(() => Math.max(...props.summary.recoveryBreakdown.map((item) => item.value), 1));
const behaviorMax = computed(() => Math.max(...props.summary.behaviorBreakdown.map((item) => item.value), 1));

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
const SVG_PADDING_TOP = 24;
const SVG_PADDING_BOTTOM = 40;
const SVG_HEIGHT = 280;
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
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(`${value}T00:00:00`));
}

function formatSigned(value: number, unit: string, digits = 1) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)} ${unit}`;
}

function formatIntegerSigned(value: number, unit: string) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${Math.round(value)} ${unit}`;
}

function describeDeviation(value: number) {
  if (Math.abs(value) < 0.15) {
    return "接近阶段均值";
  }

  const absValue = activeMetric.value === "steps" ? Math.round(Math.abs(value)) : Math.abs(value).toFixed(1);
  const unit = metricMeta[activeMetric.value].unit;
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
    const label = activeMetric.value === "steps" ? Math.round(value).toString() : value.toFixed(1);
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
        <h3>趋势追踪</h3>
        <p class="overview-bar__narrative">{{ progressNarrative }}</p>
      </div>

      <div class="metric-cards">
        <article v-for="card in summary.metricCards" :key="card.label" class="metric-card" :data-tone="card.tone">
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
        <div class="meta-item">
          <span>日均训练</span>
          <strong>{{ summary.averageTrainingMinutes }} 分钟</strong>
        </div>
      </div>
    </article>

    <!-- Section B: 图表区 -->
    <section class="chart-grid">
      <!-- 左侧：SVG 折线图 -->
      <article class="chart-card">
        <div class="chart-card__header">
          <div>
            <p class="chart-card__eyebrow">Trend Line</p>
            <h4>指标趋势</h4>
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
            <span>{{ metricMeta[activeMetric].label }}当前读数</span>
            <strong>{{ metricHeadline }}</strong>
            <small>
              {{
                activeMetric === "steps"
                  ? formatIntegerSigned(metricChange, metricMeta[activeMetric].unit)
                  : formatSigned(metricChange, metricMeta[activeMetric].unit)
              }}
              · {{ metricMeta[activeMetric].judge(metricChange) }}
            </small>
          </div>
          <div class="chart-hero__stat">
            <span>阶段均值</span>
            <strong>{{ metricMeta[activeMetric].formatter(metricAverage) }}</strong>
            <small>区间 {{ metricRange.min.toFixed(1) }} - {{ metricRange.max.toFixed(1) }} {{ metricMeta[activeMetric].unit }}</small>
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
              :stroke="metricMeta[activeMetric].accent"
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
              :stroke="metricMeta[activeMetric].accent"
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
                :fill="selectedDate === dot.date ? metricMeta[activeMetric].accent : '#fff'"
                :stroke="metricMeta[activeMetric].accent"
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
                  {{ activeMetric === "steps" ? Math.round(dot.value) : dot.value.toFixed(1) }}
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
          <h4>单日详情</h4>
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
              热量差 {{ selectedRecord.calorieGap }} kcal，训练 {{ selectedRecord.trainingMinutes }} 分钟，步数
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
          <h4>达标统计</h4>
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
        </div>
      </article>

      <!-- 右侧：洞察 + 记录列表 -->
      <div class="side-stack">
        <!-- 趋势洞察 -->
        <article class="insights-card">
          <div class="insights-card__header">
            <p class="insights-card__eyebrow">Insights</p>
            <h4>趋势洞察</h4>
          </div>

          <div class="insight-stack">
            <article v-for="item in summary.insights" :key="item.title" class="insight-item" :data-tone="item.tone">
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </article>
          </div>
        </article>

        <!-- 记录列表 -->
        <article class="records-card">
          <div class="records-card__header">
            <div>
              <p class="records-card__eyebrow">Records</p>
              <h4>每日记录</h4>
            </div>
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
          </div>
        </article>
      </div>
    </section>
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
  border-radius: 24px;
  background: rgba(255, 252, 246, 0.92);
  border: 1px solid rgba(57, 87, 63, 0.1);
  box-shadow: 0 16px 40px rgba(30, 44, 37, 0.08);
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
}

.overview-bar__header h3 {
  margin: 0;
  font-size: 2rem;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.metric-card {
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(244, 247, 252, 0.72));
  border: 1px solid rgba(57, 87, 63, 0.08);
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.meta-item {
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
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
    radial-gradient(circle at right top, rgba(45, 137, 110, 0.08), transparent 24%),
    rgba(255, 252, 246, 0.96);
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
  overflow: hidden;
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

.side-stack {
  display: grid;
  gap: 18px;
  align-content: start;
}

.insights-card {
  padding: 24px;
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

/* 记录列表 */
.records-card {
  padding: 24px;
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
