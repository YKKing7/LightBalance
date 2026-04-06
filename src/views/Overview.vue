<script setup lang="ts">
import { computed, ref } from "vue";
import { addWaterIntake } from "../services/backend/diet";
import type { OverviewSummary } from "../services/types";

const props = defineProps<{
  summary: OverviewSummary;
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
  (e: "navigate", target: import("../services/types").ModuleKey): void;
}>();

const updatedAtLabel = computed(() => {
  if (!props.summary.profileUpdatedAt) {
    return "尚未同步";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(props.summary.profileUpdatedAt));
});

const workloadPeak = computed(() => {
  return Math.max(...props.summary.weeklyLoad.map((item) => item.durationMinutes), 1);
});

function progressWidth(progress: number) {
  return `${Math.max(8, Math.min(progress, 100))}%`;
}

const interacting = ref("");

// 模拟或真实互动对接
const showSleepModal = ref(false);
const sleepDuration = ref(8);

async function saveSleep() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { updateTrendSleep } = await import('../services/backend/trend');
    await updateTrendSleep({ 
      recordDate: today,
      sleepHours: sleepDuration.value
    });
    showSleepModal.value = false;
    emit('refresh');
  } catch (err) {
    console.error('Failed to update sleep', err);
  }
}

async function handleInteraction(action: string) {
  if (!action) return;
  if (action === 'go_water' || action === 'drink_water') {
    if (interacting.value === "water") return;
    interacting.value = "water";
    try {
      await addWaterIntake({ amountMl: 200 });
      emit('refresh'); // 触发重新拉取概览数据
    } finally {
      interacting.value = "";
    }
  } else if (action === 'go_exercise' || action === 'start_workout') {
    emit("navigate", "exercise");
  } else if (action === 'go_diet') {
    emit("navigate", "diet");
  } else if (action === 'update_sleep') {
    showSleepModal.value = true;
  } else if (action !== 'completed' && action !== 'none') {
    console.warn('Unknown action:', action);
  }
}
</script>

<template>
  <section class="board">
    <article class="hero">
      <div class="hero__content">
        <div class="hero__topline">
          <p class="eyebrow">Today Overview</p>
          <span class="hero__date">{{ summary.dateLabel }}</span>
        </div>

        <div class="hero__header">
          <div>
            <h3>{{ summary.userName }}，{{ summary.momentumLabel }}</h3>
            <p class="hero__headline">{{ summary.headline }}</p>
          </div>
          <div class="hero__score">
            <strong>{{ summary.todayScore }}</strong>
            <span>今日节奏分</span>
          </div>
        </div>

        <p class="hero__subheadline">{{ summary.subheadline }}</p>

        <div class="hero__meta">
          <div class="hero__goal">
            <span>当前体重 {{ summary.currentWeight }} kg</span>
            <strong>目标体重 {{ summary.targetWeight }} kg</strong>
            <small>{{ summary.weightDelta > 0 ? `还差 ${summary.weightDelta.toFixed(1)} kg` : "已接近当前阶段目标" }}</small>
          </div>

          <div class="hero__completion">
            <span>今日完成 / 待完成</span>
            <strong>{{ summary.todayCompletedCount }} / {{ summary.todayPendingCount }}</strong>
            <small>{{ summary.todaySummary }}</small>
          </div>
        </div>

        <!-- 互动：快捷记录按键与操作区 -->
        <div class="hero__quick-actions" style="margin-top: 20px; display: flex; gap: 12px; align-items: center; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 20px;">
           <span style="font-size: 0.85rem; color: var(--color-text-soft);">快捷打卡</span>
           <button class="btn btn--water" :disabled="interacting === 'water'" @click="handleInteraction('drink_water')">🥤 {{ interacting === 'water' ? '记录中...' : '喝水 +200ml' }}</button>
           <button class="btn btn--workout" @click="handleInteraction('start_workout')">🏃‍♂️ 开始训练</button>
        </div>

        <div class="hero__focus" style="margin-top: 16px;">
          <span v-for="item in summary.focusModules" :key="item">{{ item }}</span>
        </div>
      </div>

      <div class="hero__action">
        <p class="eyebrow">Next Action</p>
        <h4>{{ summary.nextReminder }}</h4>
        <p>{{ summary.plannedToday[0]?.detail }}</p>

        <div class="hero__stamp-group">
          <span class="hero__stamp">档案同步：{{ updatedAtLabel }}</span>
          <span class="hero__stamp hero__stamp--soft">整体完成度 {{ summary.completionRate }}%</span>
        </div>
      </div>
    </article>

    <section class="metrics">
      <article v-for="metric in summary.metrics" :key="metric.label" class="metric-card" :data-tone="metric.tone">
        <p>{{ metric.label }}</p>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </article>
    </section>

    <!-- 转换：将今天原本堆叠的块改为看板列 (Kanban Board) 格式 -->
    <section class="today-grid kanban-board" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
      <article class="panel kanban-column kanban--todo">
        <div class="panel__header">
          <div>
            <p class="eyebrow">To Do</p>
            <h4>待完成 · 计划</h4>
          </div>
        </div>

        <div class="plan-list kanban-list">
          <div v-for="item in summary.plannedToday" :key="`${item.period}-${item.title}`" class="plan-card kanban-card">
            <div class="plan-card__top">
              <span class="tag tag--period">{{ item.period }}</span>
              <label class="tag tag--type">{{ item.tag }}</label>
            </div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
            <!-- 增加模拟完成的按键 -->
            <button 
              class="kanban-action-btn" 
              :class="{ 'kanban-action-btn--completed': item.action === 'completed' }"
              :disabled="item.action === 'completed'"
              @click="handleInteraction(item.action || 'complete_task')">
              {{ item.action === 'completed' ? '✓ 已达标' : '✓ 去完成' }}
            </button>
          </div>
        </div>
      </article>

      <article class="panel kanban-column kanban--doing">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Pending / Doing</p>
            <h4>进行中 · 要推进</h4>
          </div>
        </div>

        <div class="today-list kanban-list">
          <div v-for="item in summary.pendingToday" :key="item.title" class="today-card kanban-card" :data-tone="item.tone">
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
            <small>{{ item.meta }}</small>
            <!-- 增加进度更新输入口或按钮 -->
            <button class="kanban-action-btn kanban-action-btn--update" @click="handleInteraction(item.action || 'update_progress')">✎ 更新进度</button>
          </div>
        </div>
      </article>

      <article class="panel kanban-column kanban--done">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Done</p>
            <h4>已完成 · 棒极了</h4>
          </div>
        </div>

        <div class="today-list kanban-list">
          <div v-for="item in summary.completedToday" :key="item.title" class="today-card kanban-card kanban-card--finished" :data-tone="item.tone">
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
            <small>{{ item.meta }}</small>
            <span class="kanban-card__stamp">💪 完成</span>
          </div>
        </div>
      </article>
    </section>

    <section class="module-grid">
      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Today Focus</p>
            <h4>关键模块完成度</h4>
          </div>
        </div>

        <div class="module-cards">
          <div v-for="item in summary.moduleStats" :key="item.title" class="module-card" :data-tone="item.tone">
            <div class="module-card__top">
              <span>{{ item.title }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <p>{{ item.subtitle }}</p>
            <div class="progress">
              <span class="progress__fill" :style="{ width: progressWidth(item.progress) }"></span>
            </div>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">This Week</p>
            <h4>本周训练负荷节奏</h4>
          </div>
        </div>

        <div class="load-chart">
          <div v-for="point in summary.weeklyLoad" :key="point.label" class="load-chart__item">
            <div class="load-chart__bars">
              <span
                class="load-chart__bar"
                :style="{ height: `${Math.max(18, (point.durationMinutes / workloadPeak) * 120)}px` }"
              ></span>
            </div>
            <strong>{{ point.durationMinutes }} 分钟</strong>
            <small>{{ point.caloriesBurned }} kcal</small>
            <span>{{ point.steps }} 步</span>
            <label>{{ point.label }}</label>
          </div>
        </div>
      </article>
    </section>

    <section class="table-grid">
      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Recent Sessions</p>
            <h4>最近训练记录</h4>
          </div>
        </div>

        <div class="table-shell">
          <table class="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>训练内容</th>
                <th>类型</th>
                <th>时长</th>
                <th>消耗</th>
                <th>强度</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in summary.recentWorkouts" :key="`${row.date}-${row.name}`">
                <td>{{ row.date }}</td>
                <td>{{ row.name }}</td>
                <td>{{ row.category }}</td>
                <td>{{ row.durationMinutes }} 分钟</td>
                <td>{{ row.caloriesBurned }} kcal</td>
                <td>{{ row.intensity }}</td>
                <td><span class="status-pill">{{ row.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Daily Goals</p>
            <h4>今日与本周目标对照</h4>
          </div>
        </div>

        <div class="compliance-list">
          <div v-for="row in summary.complianceTable" :key="row.module" class="compliance-row">
            <div class="compliance-row__meta">
              <strong>{{ row.module }}</strong>
              <span>{{ row.target }}</span>
            </div>

            <div class="compliance-row__body">
              <div class="progress progress--thin">
                <span class="progress__fill" :style="{ width: progressWidth(row.completion) }"></span>
              </div>
              <div class="compliance-row__values">
                <strong>{{ row.actual }}</strong>
                <small>{{ row.note }}</small>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>

    <!-- 睡眠更新弹窗 -->
    <div v-if="showSleepModal" class="modal-overlay" @click.self="showSleepModal = false">
      <div class="modal-content">
        <h3>记录睡眠状况</h3>
        <p>更新你昨晚的睡眠时长（小时）：</p>
        <input type="number" v-model.number="sleepDuration" step="0.5" min="0" max="24" />
        <div class="modal-btns">
          <button @click="saveSleep" class="btn-save">保存</button>
          <button @click="showSleepModal = false" class="btn-cancel">取消</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.board {
  display: grid;
  gap: 18px;
}

.hero,
.panel,
.metric-card {
  padding: 24px;
  border-radius: 26px;
  background: rgba(255, 252, 246, 0.92);
  border: 1px solid rgba(57, 87, 63, 0.12);
  box-shadow: 0 18px 44px rgba(31, 44, 36, 0.08);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) 340px;
  gap: 20px;
  background:
    radial-gradient(circle at 88% 14%, rgba(255, 205, 107, 0.35), transparent 24%),
    radial-gradient(circle at 10% 10%, rgba(115, 174, 113, 0.18), transparent 30%),
    linear-gradient(135deg, rgba(255, 252, 246, 0.98), rgba(247, 242, 232, 0.96));
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 0.76rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.hero__topline,
.hero__header,
.hero__meta,
.hero__stamp-group,
.module-card__top,
.compliance-row__meta,
.compliance-row__values,
.plan-card__top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.hero__topline {
  align-items: center;
}

.hero__date {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(53, 93, 62, 0.08);
  color: #375641;
  font-size: 0.84rem;
  font-weight: 600;
}

.hero h3,
.panel h4 {
  margin: 0;
  color: var(--color-text);
}

.hero h3 {
  font-size: 2rem;
  line-height: 1.1;
}

.hero__headline,
.hero__subheadline,
.hero__action p,
.module-card p,
.metric-card small,
.compliance-row__meta span,
.compliance-row__values small,
.load-chart__item small,
.load-chart__item span,
.today-card p,
.today-card small,
.plan-card p {
  color: var(--color-text-soft);
}

.hero__headline {
  margin: 12px 0 0;
  font-size: 1rem;
  line-height: 1.7;
}

.hero__subheadline {
  margin: 18px 0 0;
  max-width: 760px;
  line-height: 1.8;
}

.hero__score {
  min-width: 112px;
  padding: 18px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(57, 87, 63, 0.1);
  text-align: center;
}

.hero__score strong {
  display: block;
  font-size: 2.4rem;
  line-height: 1;
  color: var(--color-text);
}

.hero__score span {
  display: block;
  margin-top: 8px;
  color: var(--color-text-soft);
  font-size: 0.86rem;
}

.hero__meta {
  margin-top: 22px;
  align-items: stretch;
}

.hero__goal,
.hero__completion,
.hero__action {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(57, 87, 63, 0.1);
}

.hero__goal,
.hero__completion {
  flex: 1;
  padding: 18px;
  display: grid;
  gap: 6px;
}

.hero__goal span,
.hero__completion span {
  color: var(--color-text-soft);
}

.hero__goal strong,
.hero__completion strong {
  font-size: 1.6rem;
  color: var(--color-text);
}

.hero__focus {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.hero__focus span,
.plan-card__top label {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(43, 74, 53, 0.08);
  color: #22422d;
  font-weight: 700;
}

.hero__action {
  display: grid;
  align-content: space-between;
  gap: 18px;
  padding: 22px;
}

.hero__action h4 {
  margin: 0;
  font-size: 1.45rem;
}

.hero__stamp-group {
  flex-wrap: wrap;
}

.hero__stamp {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(53, 93, 62, 0.08);
  color: #375641;
  font-size: 0.84rem;
  font-weight: 600;
}

.hero__stamp--soft {
  background: rgba(255, 205, 107, 0.18);
  color: #6c5326;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.metric-card p {
  margin: 0 0 10px;
}

.metric-card strong {
  display: block;
  font-size: 1.8rem;
  color: var(--color-text);
}

.metric-card[data-tone="positive"] {
  background: linear-gradient(180deg, rgba(234, 247, 233, 0.92), rgba(255, 252, 246, 0.92));
}

.metric-card[data-tone="warning"] {
  background: linear-gradient(180deg, rgba(251, 239, 214, 0.92), rgba(255, 252, 246, 0.92));
}

.today-grid,
.module-grid,
.table-grid {
  display: grid;
  gap: 18px;
}

.today-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.module-grid,
.table-grid {
  grid-template-columns: 1.05fr 0.95fr;
}

.panel__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.today-list,
.module-cards,
.compliance-list,
.plan-list {
  display: grid;
  gap: 12px;
}

.today-card,
.module-card,
.compliance-row,
.plan-card {
  padding: 18px;
  border-radius: 20px;
  background: rgba(246, 243, 235, 0.82);
}

.today-card {
  border: 1px solid rgba(57, 87, 63, 0.08);
}

.today-card strong,
.plan-card strong,
.module-card__top strong,
.load-chart__item strong,
.compliance-row__values strong {
  color: var(--color-text);
}

.today-card[data-tone="positive"] {
  background: linear-gradient(180deg, rgba(235, 247, 234, 0.9), rgba(246, 243, 235, 0.82));
}

.today-card[data-tone="warning"] {
  background: linear-gradient(180deg, rgba(251, 241, 220, 0.9), rgba(246, 243, 235, 0.82));
}

.plan-card__top {
  align-items: center;
  margin-bottom: 10px;
}

.plan-card__top span,
.module-card__top span {
  color: var(--color-text-soft);
}

.module-card[data-tone="positive"] {
  border: 1px solid rgba(69, 144, 92, 0.22);
}

.module-card[data-tone="warning"] {
  border: 1px solid rgba(196, 151, 53, 0.24);
}

.progress {
  height: 10px;
  margin-top: 12px;
  border-radius: 999px;
  background: rgba(57, 87, 63, 0.08);
  overflow: hidden;
}

.progress--thin {
  height: 8px;
  margin-top: 0;
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #25442f, #6aa46b, #efc86e);
}

.load-chart {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
  min-height: 220px;
}

.load-chart__item {
  display: grid;
  justify-items: center;
  gap: 6px;
}

.load-chart__bars {
  height: 120px;
  display: flex;
  align-items: end;
}

.load-chart__bar {
  width: 38px;
  border-radius: 18px 18px 10px 10px;
  background: linear-gradient(180deg, #9fcf8e, #42624b);
}

.load-chart__item label {
  color: #47624f;
  font-weight: 700;
}

.table-shell {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(57, 87, 63, 0.1);
}

.table th {
  color: var(--color-text-soft);
  font-weight: 600;
  font-size: 0.9rem;
}

.table td {
  color: var(--color-text);
}

.status-pill {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(77, 168, 103, 0.14);
  color: #1d6033;
  font-weight: 700;
  font-size: 0.84rem;
}

.compliance-row {
  display: grid;
  gap: 12px;
}

@media (max-width: 1360px) {
  .today-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1240px) {
  .hero,
  .metrics,
  .module-grid,
  .table-grid {
    grid-template-columns: 1fr;
  }

  .load-chart {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
/* 交互按钮样式 */
.btn {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.btn--water {
  background: rgba(85, 142, 233, 0.15);
  color: #2b55a0;
}

.btn--water:hover {
  background: rgba(85, 142, 233, 0.25);
}

.btn--workout {
  background: rgba(46, 204, 113, 0.15);
  color: #1e8449;
}

.btn--workout:hover {
  background: rgba(46, 204, 113, 0.25);
}

/* Kanban 看板列及其互动样式 */
.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.kanban-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.kanban-card {
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(80, 100, 85, 0.08);
  box-shadow: 0 4px 12px rgba(80, 100, 85, 0.03);
  position: relative;
}

.kanban-card p {
  color: var(--color-text-soft);
  margin-top: 4px;
}

.kanban-card--finished {
  background: rgba(230, 240, 232, 0.4);
  opacity: 0.8;
}

.kanban-card--finished strong {
  text-decoration: line-through;
  color: var(--color-text-soft);
}

.kanban-action-btn {
  margin-top: 12px;
  width: 100%;
  border: 1px dashed rgba(60, 90, 70, 0.3);
  background: transparent;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  color: #3e5a45;
  font-weight: 500;
  transition: background 0.2s;
}

.kanban-action-btn:hover {
  background: rgba(60, 90, 70, 0.05);
}

.kanban-card__stamp {
  position: absolute;
  right: 12px;
  bottom: 12px;
  font-size: 0.75rem;
  color: #4CAF50;
  border: 1px solid #4CAF50;
  padding: 2px 6px;
  border-radius: 4px;
  transform: rotate(-5deg);
  opacity: 0.6;
}
@media (max-width: 820px) {
  .hero__header,
  .hero__meta,
  .hero__stamp-group,
  .module-card__top,
  .compliance-row__meta,
  .compliance-row__values,
  .plan-card__top {
    flex-direction: column;
    align-items: flex-start;
  }

  .metrics,
  .load-chart {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Action & Modal Styles */
.kanban-action-btn--completed {
  color: #7d9e85;
  background: rgba(125, 158, 133, 0.1);
  border-color: rgba(125, 158, 133, 0.2);
  cursor: default;
}
.kanban-action-btn--completed:hover {
  background: rgba(125, 158, 133, 0.1);
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 320px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  text-align: center;
}
.modal-content h3 {
  margin-top: 0;
  color: #2c3e2e;
}
.modal-content input {
  width: 100%;
  padding: 8px;
  margin: 1rem 0;
  border: 1px solid #c9d8ce;
  border-radius: 6px;
  font-size: 1.1rem;
  text-align: center;
  box-sizing: border-box;
}
.modal-btns {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
.btn-save {
  background: #3c5a46;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}
.btn-cancel {
  background: transparent;
  color: #666;
  border: 1px solid #ccc;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}
</style>
