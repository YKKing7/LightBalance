<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { TrendMetricKey, TrendRecordRow, TrendSeriesPoint, TrendSummary } from "../services/types";

const props = defineProps<{
  summary: TrendSummary;
}>();

const activeMetric = ref<TrendMetricKey>("weightKg");
const activeStatus = ref<"全部" | string>("全部");
const selectedDate = ref<string | null>(props.summary.series.at(-1)?.date ?? null);
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
    return "体重已经贴近目标，后续重点可以从“继续掉秤”转向“维持状态和塑形”。";
  }

  if (props.summary.averageSleepHours < 7) {
    return `距离目标体重还有 ${progressGap.value} kg，建议先把睡眠拉回 7 小时以上，再追求更快的下降速度。`;
  }

  return `距离目标体重还有 ${progressGap.value} kg，当前训练、步数和围度变化是同向的，说明执行结构没有跑偏。`;
});

const orbitMetrics = computed(() => {
  return props.summary.metricCards.map((item, index) => ({
    ...item,
    angle: `${index * 90}deg`
  }));
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
</script>

<template>
  <section class="trend-lab">
    <article class="signal-deck">
      <div class="signal-deck__copy">
        <p class="deck-tag">Body Signal Lab</p>
        <h3>把减重节奏、恢复质量和行为波动，放进一张更像“体征驾驶舱”的趋势页</h3>
        <p class="deck-summary">{{ progressNarrative }}</p>

        <div class="deck-status">
          <div>
            <span>当前判断</span>
            <strong>{{ progressLabel }}</strong>
          </div>
          <div>
            <span>目标差值</span>
            <strong>{{ progressGap }} kg</strong>
          </div>
          <div>
            <span>执行完成度</span>
            <strong>{{ summary.completionRate }}%</strong>
          </div>
        </div>

        <div class="deck-ribbon">
          <article v-for="card in summary.metricCards" :key="card.label" class="ribbon-card" :data-tone="card.tone">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <em>{{ card.change }}</em>
            <small>{{ card.note }}</small>
          </article>
        </div>
      </div>

      <aside class="signal-orbit">
        <div class="signal-orbit__core">
          <div
            class="signal-orbit__ring"
            :style="{ background: `conic-gradient(#204e41 0 ${summary.completionRate}%, rgba(32, 78, 65, 0.12) ${summary.completionRate}% 100%)` }"
          >
            <div class="signal-orbit__center">
              <span>21 天体征状态</span>
              <strong>{{ summary.latestWeight }} kg</strong>
              <small>目标 {{ summary.targetWeight }} kg</small>
            </div>
          </div>

          <article
            v-for="item in orbitMetrics"
            :key="item.label"
            class="orbit-node"
            :style="{ transform: `translate(-50%, -50%) rotate(${item.angle}) translateY(-168px) rotate(-${item.angle})` }"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>

        <div class="signal-orbit__footer">
          <article>
            <span>日均睡眠</span>
            <strong>{{ summary.averageSleepHours.toFixed(1) }} h</strong>
          </article>
          <article>
            <span>日均步数</span>
            <strong>{{ summary.averageSteps }}</strong>
          </article>
          <article>
            <span>日均训练</span>
            <strong>{{ summary.averageTrainingMinutes }} 分钟</strong>
          </article>
        </div>
      </aside>
    </article>

    <section class="lab-grid">
      <article class="panel panel--track">
        <div class="panel__header">
          <div>
            <p class="panel__eyebrow">Metric Track</p>
            <h4>用节律柱带看指标，不再只是看一根折线</h4>
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

        <div class="track-hero">
          <div>
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
          <div>
            <span>阶段均值</span>
            <strong>{{ metricMeta[activeMetric].formatter(metricAverage) }}</strong>
            <small>区间 {{ metricRange.min.toFixed(1) }} - {{ metricRange.max.toFixed(1) }} {{ metricMeta[activeMetric].unit }}</small>
          </div>
        </div>

        <div class="track-strip">
          <button
            v-for="point in metricTrack"
            :key="point.date"
            type="button"
            class="track-bar"
            :class="{ 'track-bar--active': selectedDate === point.date }"
            @click="selectPoint(point)"
          >
            <span class="track-bar__glow" :style="{ background: metricMeta[activeMetric].accent, height: `${point.intensity}%` }"></span>
            <small>{{ point.label }}</small>
            <strong>{{ activeMetric === 'steps' ? Math.round(point.value) : point.value.toFixed(1) }}</strong>
          </button>
        </div>

        <div v-if="selectedSeriesPoint" class="track-note">
          <div>
            <span>选中节点</span>
            <strong>{{ selectedSeriesPoint.label }}</strong>
          </div>
          <p>{{ describeDeviation(selectedSeriesPoint[activeMetric] - metricAverage) }}</p>
        </div>
      </article>

      <aside class="panel panel--spotlight">
        <div class="panel__header">
          <div>
            <p class="panel__eyebrow">Day Capsule</p>
            <h4>单日体征胶囊</h4>
          </div>
        </div>

        <div v-if="selectedRecord" class="capsule">
          <div class="capsule__pulse">
            <div
              class="capsule__pulse-ring"
              :style="{ background: `conic-gradient(#d9782f 0 ${dailyPulse}%, rgba(217, 120, 47, 0.12) ${dailyPulse}% 100%)` }"
            >
              <div class="capsule__pulse-core">
                <span>{{ formatDate(selectedRecord.date) }}</span>
                <strong>{{ dailyPulse }}</strong>
                <small>日节律分</small>
              </div>
            </div>
          </div>

          <div class="capsule__meta">
            <span class="capsule__status">{{ selectedRecord.status }}</span>
            <p>
              热量差 {{ selectedRecord.calorieGap }} kcal，训练 {{ selectedRecord.trainingMinutes }} 分钟，步数
              {{ selectedRecord.steps }}，睡眠 {{ selectedRecord.sleepHours }} 小时。
            </p>
          </div>

          <div class="capsule__grid">
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
        </div>
      </aside>
    </section>

    <section class="matrix-grid">
      <article class="panel panel--matrix">
        <div class="panel__header">
          <div>
            <p class="panel__eyebrow">Behavior Matrix</p>
            <h4>恢复与行为拆成两条矩阵轨道</h4>
          </div>
        </div>

        <div class="matrix">
          <section class="matrix__group">
            <header>
              <span>恢复轨道</span>
              <strong>越长说明过去 21 天越稳定</strong>
            </header>
            <article v-for="item in summary.recoveryBreakdown" :key="item.label" class="matrix-row" :data-tone="item.tone">
              <div class="matrix-row__head">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}{{ item.unit }}</strong>
              </div>
              <div class="matrix-row__rail">
                <span class="matrix-row__fill" :style="{ width: `${(item.value / recoveryMax) * 100}%` }"></span>
              </div>
            </article>
          </section>

          <section class="matrix__group">
            <header>
              <span>行为轨道</span>
              <strong>用摄入、消耗和缺口看结构关系</strong>
            </header>
            <article v-for="item in summary.behaviorBreakdown" :key="item.label" class="matrix-row matrix-row--warm" :data-tone="item.tone">
              <div class="matrix-row__head">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }} {{ item.unit }}</strong>
              </div>
              <div class="matrix-row__rail">
                <span class="matrix-row__fill matrix-row__fill--warm" :style="{ width: `${(item.value / behaviorMax) * 100}%` }"></span>
              </div>
            </article>
          </section>
        </div>
      </article>

      <aside class="panel panel--insights">
        <div class="panel__header">
          <div>
            <p class="panel__eyebrow">Signal Notes</p>
            <h4>趋势便签</h4>
          </div>
        </div>

        <div class="note-stack">
          <article v-for="item in summary.insights" :key="item.title" class="note-card" :data-tone="item.tone">
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
          </article>
        </div>
      </aside>
    </section>

    <article class="panel panel--records">
      <div class="panel__header">
        <div>
          <p class="panel__eyebrow">Record Feed</p>
          <h4>趋势记录流</h4>
        </div>
        <div class="status-switches">
          <button
            v-for="status in statuses"
            :key="status"
            type="button"
            class="status-switch"
            :class="{ 'status-switch--active': status === activeStatus }"
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
          class="record-card"
          :class="{ 'record-card--active': item.date === selectedDate }"
          @click="selectPoint(item)"
        >
          <div class="record-card__date">
            <span>{{ formatDate(item.date) }}</span>
            <strong>{{ item.status }}</strong>
          </div>
          <div class="record-card__metrics">
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
  </section>
</template>

<style scoped>
.trend-lab {
  display: grid;
  gap: 18px;
  padding-right: 18px;
}

.signal-deck,
.panel,
.ribbon-card,
.note-card,
.record-card,
.orbit-node {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(33, 53, 76, 0.1);
  box-shadow: 0 18px 44px rgba(32, 45, 64, 0.08);
}

.signal-deck,
.panel {
  border-radius: 32px;
}

.signal-deck {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) 430px;
  gap: 18px;
  padding: 28px;
  background:
    radial-gradient(circle at 10% 18%, rgba(43, 161, 120, 0.16), transparent 26%),
    radial-gradient(circle at 84% 22%, rgba(255, 166, 96, 0.22), transparent 24%),
    linear-gradient(135deg, rgba(247, 250, 255, 0.98), rgba(249, 245, 238, 0.97));
}

.deck-tag,
.panel__eyebrow {
  margin: 0 0 10px;
  font-size: 0.76rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #6b7689;
}

.signal-deck h3,
.panel h4 {
  margin: 0;
  color: #18263a;
}

.signal-deck h3 {
  max-width: 760px;
  font-size: 2.18rem;
  line-height: 1.08;
}

.deck-summary,
.ribbon-card small,
.track-hero small,
.capsule__meta p,
.note-card p,
.record-card__metrics span,
.matrix__group header span {
  color: #68758a;
}

.deck-summary {
  max-width: 780px;
  margin: 14px 0 0;
  line-height: 1.75;
}

.deck-status {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.deck-status > div,
.capsule__grid article,
.signal-orbit__footer article,
.track-note,
.matrix__group,
.capsule {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.62);
}

.deck-status > div {
  padding: 18px;
  backdrop-filter: blur(4px);
}

.deck-status span,
.ribbon-card span,
.signal-orbit__footer span,
.track-hero span,
.track-note span,
.capsule__grid span,
.record-card__date span,
.matrix-row__head span,
.capsule__pulse-core span {
  color: #728098;
}

.deck-status strong,
.ribbon-card strong,
.signal-orbit__footer strong,
.track-hero strong,
.track-note strong,
.capsule__grid strong,
.record-card__date strong,
.matrix-row__head strong,
.capsule__pulse-core strong {
  display: block;
  margin-top: 8px;
  color: #18263a;
}

.deck-status strong {
  font-size: 1.35rem;
}

.deck-ribbon {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.ribbon-card {
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(244, 247, 252, 0.72));
}

.ribbon-card strong {
  font-size: 1.5rem;
}

.ribbon-card em {
  display: block;
  margin-top: 8px;
  font-style: normal;
  font-weight: 700;
  color: #225c49;
}

.ribbon-card[data-tone="warning"] em {
  color: #af6f2b;
}

.signal-orbit {
  display: grid;
  gap: 18px;
  align-content: start;
}

.signal-orbit__core {
  position: relative;
  min-height: 410px;
  border-radius: 32px;
  background:
    radial-gradient(circle at center, rgba(32, 78, 65, 0.06), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(244, 241, 234, 0.76));
}

.signal-orbit__ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 280px;
  height: 280px;
  padding: 18px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.signal-orbit__center {
  width: 100%;
  height: 100%;
  display: grid;
  place-content: center;
  text-align: center;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(244, 248, 250, 0.98), rgba(254, 250, 243, 0.98));
}

.signal-orbit__center strong {
  font-size: 2.4rem;
  color: #183127;
}

.signal-orbit__center small {
  color: #718095;
}

.orbit-node {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 132px;
  padding: 12px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  text-align: center;
}

.orbit-node strong {
  font-size: 1.05rem;
}

.signal-orbit__footer {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.signal-orbit__footer article {
  padding: 16px;
}

.lab-grid,
.matrix-grid {
  display: grid;
  gap: 18px;
}

.lab-grid {
  grid-template-columns: minmax(0, 1.2fr) 340px;
}

.matrix-grid {
  grid-template-columns: minmax(0, 1.05fr) 360px;
}

.panel {
  padding: 24px;
  background: rgba(253, 251, 246, 0.94);
}

.panel--track {
  background:
    radial-gradient(circle at right top, rgba(45, 137, 110, 0.12), transparent 24%),
    rgba(253, 251, 246, 0.96);
}

.panel--spotlight {
  background:
    radial-gradient(circle at center top, rgba(240, 149, 75, 0.14), transparent 28%),
    rgba(252, 248, 242, 0.96);
}

.panel--matrix {
  background:
    radial-gradient(circle at left top, rgba(102, 128, 255, 0.12), transparent 22%),
    rgba(248, 251, 255, 0.96);
}

.panel--insights,
.panel--records {
  background: rgba(253, 251, 246, 0.96);
}

.panel__header,
.track-hero,
.matrix-row__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.metric-pills,
.status-switches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.metric-pill,
.status-switch {
  border: 0;
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(33, 53, 76, 0.08);
  color: #31445f;
  font-weight: 700;
  cursor: pointer;
}

.metric-pill--active {
  background: var(--pill-accent);
  color: #f8fbff;
}

.status-switch--active {
  background: linear-gradient(135deg, #1f4c66, #3b7386);
  color: #f8fbff;
}

.track-hero {
  margin-top: 18px;
  padding: 18px;
  border-radius: 24px;
  background: rgba(241, 247, 247, 0.86);
  align-items: end;
}

.track-hero strong {
  font-size: 1.7rem;
}

.track-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
  align-items: end;
}

.track-bar {
  min-height: 228px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  justify-content: end;
  gap: 6px;
  border: 0;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(240, 245, 250, 0.9), rgba(255, 255, 255, 0.9));
  cursor: pointer;
}

.track-bar__glow {
  display: block;
  width: 100%;
  min-height: 18px;
  border-radius: 18px 18px 8px 8px;
  opacity: 0.88;
}

.track-bar strong {
  color: #18263a;
  font-size: 1rem;
}

.track-bar--active {
  box-shadow: inset 0 0 0 2px rgba(28, 90, 74, 0.18);
  transform: translateY(-2px);
}

.track-note {
  margin-top: 16px;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.track-note p {
  margin: 0;
  color: #516178;
}

.capsule {
  margin-top: 18px;
  padding: 18px;
}

.capsule__pulse {
  display: grid;
  place-items: center;
}

.capsule__pulse-ring {
  width: 190px;
  height: 190px;
  padding: 14px;
  border-radius: 50%;
}

.capsule__pulse-core {
  width: 100%;
  height: 100%;
  display: grid;
  place-content: center;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(248, 244, 238, 0.98));
  text-align: center;
}

.capsule__pulse-core strong {
  margin-top: 6px;
  font-size: 2.2rem;
  line-height: 1;
}

.capsule__meta {
  margin-top: 18px;
}

.capsule__status {
  display: inline-flex;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(27, 68, 93, 0.08);
  color: #264a63;
  font-weight: 700;
}

.capsule__meta p {
  margin: 12px 0 0;
  line-height: 1.7;
}

.capsule__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.capsule__grid article {
  padding: 16px;
}

.matrix {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.matrix__group {
  padding: 18px;
}

.matrix__group header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.matrix__group header strong {
  color: #23354b;
  font-size: 0.95rem;
}

.matrix-row + .matrix-row {
  margin-top: 12px;
}

.matrix-row__rail {
  height: 12px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(33, 53, 76, 0.08);
}

.matrix-row__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2b60a1, #68b7b2);
}

.matrix-row__fill--warm {
  background: linear-gradient(90deg, #d9782f, #f0be62);
}

.note-stack {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.note-card {
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(248, 244, 236, 0.82));
}

.note-card strong {
  color: #18263a;
}

.note-card p {
  margin: 8px 0 0;
  line-height: 1.7;
}

.note-card[data-tone="positive"] {
  border-color: rgba(46, 123, 96, 0.18);
}

.note-card[data-tone="warning"] {
  border-color: rgba(217, 120, 47, 0.22);
}

.record-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.record-card {
  width: 100%;
  padding: 18px;
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 18px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(247, 250, 255, 0.9), rgba(255, 252, 247, 0.92));
  text-align: left;
  cursor: pointer;
}

.record-card__date strong {
  font-size: 1.2rem;
}

.record-card__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.record-card__metrics span {
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
}

.record-card--active {
  box-shadow: inset 0 0 0 2px rgba(32, 78, 65, 0.16);
}

@media (max-width: 1360px) {
  .signal-deck,
  .lab-grid,
  .matrix-grid {
    grid-template-columns: 1fr;
  }

  .deck-ribbon,
  .track-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .signal-deck,
  .panel {
    padding: 20px;
  }

  .panel__header,
  .track-hero,
  .track-note,
  .matrix__group header,
  .matrix-row__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .deck-status,
  .deck-ribbon,
  .signal-orbit__footer,
  .capsule__grid,
  .record-card,
  .record-card__metrics,
  .track-strip {
    grid-template-columns: 1fr;
  }

  .record-card {
    grid-template-columns: 1fr;
  }

  .signal-orbit__core {
    min-height: 460px;
  }

  .orbit-node {
    width: 118px;
  }
}
</style>
