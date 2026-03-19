<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { addExerciseEntry, deleteExerciseEntry, updateExerciseEntry } from "../services/backend/exercise";
import type { ExerciseEntryInput, ExerciseSummary, UpdateExerciseEntryInput, WorkoutItem } from "../services/types";

const props = defineProps<{
  summary: ExerciseSummary;
}>();

const localSummary = ref<ExerciseSummary>(props.summary);
const saving = ref(false);
const activeCategory = ref<"全部" | string>("全部");
const editingWorkoutId = ref<number | null>(null);

function toLocalDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const quickPlans: ExerciseEntryInput[] = [
  {
    name: "上肢力量循环",
    category: "力量",
    durationMinutes: 40,
    caloriesBurned: 280,
    intensity: "中高强度",
    notes: "适合下班后快速完成的推拉循环。"
  },
  {
    name: "晚间快走恢复",
    category: "有氧",
    durationMinutes: 30,
    caloriesBurned: 180,
    intensity: "中等",
    notes: "通勤后补足活动量，提升恢复感。"
  },
  {
    name: "核心稳定组合",
    category: "功能",
    durationMinutes: 25,
    caloriesBurned: 150,
    intensity: "中等",
    notes: "适合久坐后激活核心和臀部。"
  },
  {
    name: "拉伸舒展",
    category: "恢复",
    durationMinutes: 18,
    caloriesBurned: 70,
    intensity: "低强度",
    notes: "睡前放松肩颈和下背。"
  }
];

const form = reactive<ExerciseEntryInput>({
  name: "",
  category: "力量",
  durationMinutes: 35,
  caloriesBurned: 220,
  intensity: "中等",
  status: "已完成",
  notes: ""
});

watch(
  () => props.summary,
  (value) => {
    localSummary.value = value;
  }
);

const completionWidth = computed(() => `${Math.max(8, localSummary.value.completionRate)}%`);
const categories = computed(() => ["全部", ...new Set(localSummary.value.workouts.map((item) => item.category))]);
const filteredWorkouts = computed(() => {
  if (activeCategory.value === "全部") {
    return localSummary.value.workouts;
  }

  return localSummary.value.workouts.filter((item) => item.category === activeCategory.value);
});

const weeklyCards = computed(() => [
  { label: "本周目标", value: `${localSummary.value.weeklyGoalDays} 天`, note: "训练目标频次来自身体档案中的每周设置。" },
  { label: "已完成天数", value: `${localSummary.value.completedDays} 天`, note: "按本周存在训练记录的日期自动统计。" },
  { label: "总训练时长", value: `${localSummary.value.totalMinutes} 分钟`, note: `单次平均 ${localSummary.value.averageMinutes} 分钟` },
  { label: "累计消耗", value: `${localSummary.value.totalCaloriesBurned} kcal`, note: `当前连续训练 ${localSummary.value.streakDays} 天` }
]);

const focusSignal = computed(() => {
  if (localSummary.value.todayMinutes >= 30) {
    return "今天已经完成有效训练，后续更适合恢复和拉伸。";
  }

  if (localSummary.value.completedDays >= localSummary.value.weeklyGoalDays) {
    return "本周目标已达成，建议把重点切换到恢复和保持。";
  }

  return `距离本周目标还差 ${Math.max(localSummary.value.weeklyGoalDays - localSummary.value.completedDays, 0)} 天，今天适合补一段短训练。`;
});

const calendarDays = computed(() => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + mondayOffset);

  const workoutsByDate = localSummary.value.workouts.reduce(
    (map, item) => {
      const key = toLocalDateKey(item.performedAt);
      const bucket = map.get(key) ?? { totalMinutes: 0, count: 0, calories: 0 };
      bucket.totalMinutes += item.durationMinutes;
      bucket.count += 1;
      bucket.calories += item.caloriesBurned;
      map.set(key, bucket);
      return map;
    },
    new Map<string, { totalMinutes: number; count: number; calories: number }>()
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const isoDate = toLocalDateKey(date);
    const bucket = workoutsByDate.get(isoDate);
    const intensityLevel = !bucket ? 0 : bucket.totalMinutes >= 50 ? 4 : bucket.totalMinutes >= 35 ? 3 : bucket.totalMinutes >= 20 ? 2 : 1;

    return {
      key: isoDate,
      label: new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date),
      dateLabel: new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date),
      totalMinutes: bucket?.totalMinutes ?? 0,
      count: bucket?.count ?? 0,
      calories: bucket?.calories ?? 0,
      intensityLevel,
      isToday: isoDate === toLocalDateKey(now)
    };
  });
});

function formatPerformedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function resetForm() {
  form.name = "";
  form.category = "力量";
  form.durationMinutes = 35;
  form.caloriesBurned = 220;
  form.intensity = "中等";
  form.status = "已完成";
  form.notes = "";
  editingWorkoutId.value = null;
}

function startEdit(item: WorkoutItem) {
  editingWorkoutId.value = item.id;
  form.name = item.name;
  form.category = item.category;
  form.durationMinutes = item.durationMinutes;
  form.caloriesBurned = item.caloriesBurned;
  form.intensity = item.intensity;
  form.status = item.status;
  form.notes = item.notes;
}

function cancelEdit() {
  resetForm();
}

async function applySummary(task: Promise<ExerciseSummary>) {
  saving.value = true;

  try {
    localSummary.value = await task;
  } finally {
    saving.value = false;
  }
}

async function handleQuickAdd(item: ExerciseEntryInput) {
  await applySummary(addExerciseEntry(item));
  activeCategory.value = "全部";
}

async function handleSubmit() {
  if (!form.name.trim()) {
    return;
  }

  const notes = form.notes?.trim() ?? "";

  if (editingWorkoutId.value !== null) {
    await applySummary(
      updateExerciseEntry({
        id: editingWorkoutId.value,
        name: form.name.trim(),
        category: form.category,
        durationMinutes: form.durationMinutes,
        caloriesBurned: form.caloriesBurned,
        intensity: form.intensity,
        status: form.status,
        notes
      } satisfies UpdateExerciseEntryInput)
    );
  } else {
    await applySummary(
      addExerciseEntry({
        name: form.name.trim(),
        category: form.category,
        durationMinutes: form.durationMinutes,
        caloriesBurned: form.caloriesBurned,
        intensity: form.intensity,
        status: form.status,
        notes
      })
    );
  }

  resetForm();
  activeCategory.value = "全部";
}

async function handleDelete(item: WorkoutItem) {
  if (!window.confirm(`确定删除“${item.name}”这条训练记录吗？`)) {
    return;
  }

  await applySummary(deleteExerciseEntry(item.id));

  if (editingWorkoutId.value === item.id) {
    resetForm();
  }
}
</script>

<template>
  <section class="exercise-board">
    <article class="hero">
      <div class="hero__layer"></div>
      <div class="hero__main">
        <p class="eyebrow">Movement Studio</p>
        <div class="hero__header">
          <div>
            <h3>训练节奏、任务录入和本周反馈放在同一张指挥台里</h3>
            <p class="hero__copy">
              新增、编辑或删除训练后会即时写入数据库，并同步刷新进度、热力图、分类统计和日志表，让这块页面既能看趋势，也能直接执行。
            </p>
          </div>
          <div class="hero__completion">
            <span>周目标完成度</span>
            <strong>{{ localSummary.completionRate }}%</strong>
            <small>{{ localSummary.completedDays }} / {{ localSummary.weeklyGoalDays }} 天</small>
          </div>
        </div>

        <div class="hero__track">
          <div class="hero__track-meta">
            <span>本周训练进度</span>
            <strong>{{ focusSignal }}</strong>
          </div>
          <div class="hero__track-bar">
            <span class="hero__track-fill" :style="{ width: completionWidth }"></span>
          </div>
        </div>

        <div class="metric-grid">
          <article v-for="card in weeklyCards" :key="card.label" class="metric-card">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.note }}</small>
          </article>
        </div>
      </div>

      <aside class="hero__aside">
        <div class="today-card">
          <p class="eyebrow">Today Pulse</p>
          <strong>{{ localSummary.todayMinutes }} 分钟</strong>
          <span>今天已记录训练时长</span>
        </div>

        <div class="aside-grid">
          <article class="mini-card">
            <span>平均单次训练</span>
            <strong>{{ localSummary.averageMinutes }} 分钟</strong>
          </article>
          <article class="mini-card">
            <span>连续训练</span>
            <strong>{{ localSummary.streakDays }} 天</strong>
          </article>
        </div>

        <div class="insight-list">
          <article v-for="item in localSummary.insights" :key="item.title" class="insight-card" :data-tone="item.tone">
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
          </article>
        </div>
      </aside>
    </article>

    <section class="board-grid">
      <article class="panel panel--calendar">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Weekly Heatmap</p>
            <h4>周训练日历</h4>
          </div>
          <span class="panel__hint">颜色越深代表当天训练负荷越高</span>
        </div>

        <div class="calendar-grid">
          <article
            v-for="day in calendarDays"
            :key="day.key"
            class="calendar-card"
            :class="[`calendar-card--level-${day.intensityLevel}`, { 'calendar-card--today': day.isToday }]"
          >
            <div class="calendar-card__top">
              <span>{{ day.label }}</span>
              <strong>{{ day.dateLabel }}</strong>
            </div>
            <div class="calendar-card__body">
              <em>{{ day.totalMinutes }} 分钟</em>
              <small>{{ day.count > 0 ? `${day.count} 条记录 · ${day.calories} kcal` : "当天暂无训练" }}</small>
            </div>
          </article>
        </div>
      </article>

      <aside class="panel panel--breakdown">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Structure</p>
            <h4>训练结构分布</h4>
          </div>
        </div>

        <div class="breakdown-list">
          <article v-for="item in localSummary.categoryBreakdown" :key="item.category" class="breakdown-card">
            <div class="breakdown-card__head">
              <strong>{{ item.category }}</strong>
              <span>{{ item.sessions }} 次</span>
            </div>
            <div class="breakdown-card__bar">
              <span
                class="breakdown-card__fill"
                :style="{ width: `${Math.max(18, (item.totalMinutes / Math.max(localSummary.totalMinutes, 1)) * 100)}%` }"
              ></span>
            </div>
            <p>{{ item.totalMinutes }} 分钟 · {{ item.totalCaloriesBurned }} kcal</p>
          </article>
        </div>
      </aside>
    </section>

    <section class="studio-grid">
      <article class="panel panel--planner">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Quick Start</p>
            <h4>快速开始一段训练</h4>
          </div>
          <span class="panel__hint">{{ saving ? "训练数据同步中..." : "点击模板可直接写入记录" }}</span>
        </div>

        <div class="quick-grid">
          <button
            v-for="item in quickPlans"
            :key="`${item.category}-${item.name}`"
            class="quick-card"
            type="button"
            :disabled="saving"
            @click="handleQuickAdd(item)"
          >
            <span class="quick-card__tag">{{ item.category }}</span>
            <strong>{{ item.name }}</strong>
            <p>{{ item.notes }}</p>
            <small>{{ item.durationMinutes }} 分钟 · {{ item.caloriesBurned }} kcal · {{ item.intensity }}</small>
          </button>
        </div>

        <form class="entry-form" @submit.prevent="handleSubmit">
          <div class="entry-form__header">
            <div>
              <p class="eyebrow">Custom Entry</p>
              <h4>{{ editingWorkoutId !== null ? "编辑训练记录" : "自定义录入训练" }}</h4>
            </div>
            <button v-if="editingWorkoutId !== null" class="ghost-button" type="button" :disabled="saving" @click="cancelEdit">
              取消编辑
            </button>
          </div>

          <div class="entry-form__grid">
            <label class="entry-form__wide">
              <span>训练名称</span>
              <input v-model="form.name" type="text" placeholder="例如：下肢力量训练 / 慢跑 / 瑜伽恢复" />
            </label>

            <label>
              <span>训练分类</span>
              <select v-model="form.category">
                <option>力量</option>
                <option>有氧</option>
                <option>功能</option>
                <option>恢复</option>
                <option>综合训练</option>
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
              <span>状态</span>
              <select v-model="form.status">
                <option>已完成</option>
                <option>恢复训练</option>
              </select>
            </label>

            <label>
              <span>时长</span>
              <input v-model.number="form.durationMinutes" type="number" min="10" />
            </label>

            <label>
              <span>消耗热量</span>
              <input v-model.number="form.caloriesBurned" type="number" min="20" />
            </label>

            <label class="entry-form__wide">
              <span>训练备注</span>
              <input v-model="form.notes" type="text" placeholder="例如：偏恢复、配速稳定、今天状态轻松" />
            </label>
          </div>

          <button class="submit-button" type="submit" :disabled="saving || !form.name.trim()">
            {{ editingWorkoutId !== null ? "保存修改" : "保存训练记录" }}
          </button>
        </form>
      </article>
    </section>

    <article class="panel panel--table">
      <div class="panel__header">
        <div>
          <p class="eyebrow">Session Log</p>
          <h4>本周训练日志</h4>
        </div>
        <div class="filters">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            class="filter-chip"
            :class="{ 'filter-chip--active': category === activeCategory }"
            @click="activeCategory = category"
          >
            {{ category }}
          </button>
        </div>
      </div>

      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>训练</th>
              <th>分类</th>
              <th>强度</th>
              <th>状态</th>
              <th>时长</th>
              <th>热量</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredWorkouts" :key="item.id">
              <td>{{ formatPerformedAt(item.performedAt) }}</td>
              <td>{{ item.name }}</td>
              <td><span class="table-pill">{{ item.category }}</span></td>
              <td>{{ item.intensity }}</td>
              <td>{{ item.status }}</td>
              <td>{{ item.durationMinutes }} 分钟</td>
              <td>{{ item.caloriesBurned }} kcal</td>
              <td>{{ item.notes || "无备注" }}</td>
              <td>
                <div class="row-actions">
                  <button class="row-action" type="button" :disabled="saving" @click="startEdit(item)">编辑</button>
                  <button class="row-action row-action--danger" type="button" :disabled="saving" @click="handleDelete(item)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>

<style scoped>
.exercise-board {
  display: grid;
  gap: 18px;
  padding-right: 18px;
}

.hero,
.panel {
  position: relative;
  overflow: hidden;
  padding: 24px;
  border-radius: 30px;
  border: 1px solid rgba(57, 87, 63, 0.12);
  box-shadow: 0 18px 44px rgba(31, 44, 36, 0.08);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) 360px;
  gap: 18px;
  background:
    linear-gradient(140deg, rgba(253, 248, 239, 0.98), rgba(240, 247, 241, 0.97)),
    linear-gradient(90deg, #fff, #fff);
}

.hero__layer {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 8% 18%, rgba(244, 175, 84, 0.24), transparent 23%),
    radial-gradient(circle at 82% 14%, rgba(91, 154, 116, 0.2), transparent 22%),
    linear-gradient(125deg, transparent 0%, rgba(255, 255, 255, 0.46) 48%, transparent 100%);
  pointer-events: none;
}

.hero__main,
.hero__aside {
  position: relative;
  z-index: 1;
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 0.76rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.hero__header,
.hero__track-meta,
.panel__header,
.breakdown-card__head,
.calendar-card__top,
.entry-form__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.hero__header {
  align-items: flex-start;
}

.hero h3,
.panel h4 {
  margin: 0;
  color: var(--color-text);
}

.hero h3 {
  max-width: 720px;
  font-size: 2.15rem;
  line-height: 1.1;
}

.hero__copy,
.metric-card small,
.panel__hint,
.quick-card p,
.quick-card small,
.insight-card p,
.breakdown-card p,
.breakdown-card span,
.mini-card span,
.today-card span,
.calendar-card small,
table thead th {
  color: var(--color-text-soft);
}

.hero__copy {
  margin: 12px 0 0;
  max-width: 760px;
  line-height: 1.78;
}

.hero__completion,
.today-card,
.mini-card,
.metric-card,
.quick-card,
.insight-card,
.breakdown-card,
.calendar-card {
  border-radius: 24px;
  border: 1px solid rgba(57, 87, 63, 0.1);
}

.hero__completion {
  min-width: 150px;
  padding: 18px;
  display: grid;
  gap: 6px;
  background: rgba(255, 255, 255, 0.62);
  text-align: center;
}

.hero__completion strong {
  font-size: 2rem;
  color: #224330;
}

.hero__track {
  margin-top: 22px;
  padding: 20px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(4px);
}

.hero__track-meta span {
  color: var(--color-text-soft);
}

.hero__track-meta strong {
  max-width: 660px;
  color: var(--color-text);
  font-size: 1rem;
  font-weight: 700;
}

.hero__track-bar,
.breakdown-card__bar {
  height: 12px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(57, 87, 63, 0.08);
}

.hero__track-fill,
.breakdown-card__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.hero__track-fill {
  background: linear-gradient(90deg, #2f4b3b, #74aa71, #f0c46e);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.metric-card {
  padding: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.68), rgba(247, 248, 243, 0.62));
}

.metric-card span {
  color: var(--color-text-soft);
}

.metric-card strong {
  display: block;
  margin-top: 8px;
  font-size: 1.55rem;
  color: var(--color-text);
}

.metric-card small {
  display: block;
  margin-top: 10px;
  line-height: 1.6;
}

.hero__aside {
  padding: 8px 0 0;
  display: grid;
  gap: 14px;
}

.today-card {
  padding: 20px;
  background: linear-gradient(160deg, rgba(37, 58, 47, 0.96), rgba(58, 94, 73, 0.92));
  color: #f8f4ea;
}

.today-card .eyebrow {
  color: rgba(236, 241, 237, 0.72);
}

.today-card strong {
  display: block;
  font-size: 2.2rem;
  color: #fff8ef;
}

.today-card span {
  display: block;
  margin-top: 8px;
  color: rgba(236, 241, 237, 0.76);
}

.aside-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mini-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.56);
}

.mini-card strong {
  display: block;
  margin-top: 8px;
  color: var(--color-text);
  font-size: 1.2rem;
}

.insight-list,
.breakdown-list {
  display: grid;
  gap: 12px;
}

.insight-card {
  padding: 18px;
  background: rgba(255, 255, 255, 0.58);
}

.insight-card[data-tone="positive"] {
  border-color: rgba(88, 169, 111, 0.24);
}

.insight-card[data-tone="warning"] {
  border-color: rgba(214, 164, 79, 0.28);
}

.insight-card strong,
.quick-card strong,
.breakdown-card strong,
.calendar-card strong,
table tbody td {
  color: var(--color-text);
}

.insight-card p {
  margin: 8px 0 0;
  line-height: 1.65;
}

.board-grid,
.studio-grid {
  display: grid;
  gap: 18px;
}

.board-grid {
  grid-template-columns: minmax(0, 1.2fr) 360px;
}

.studio-grid {
  grid-template-columns: 1fr;
}

.panel {
  background: rgba(255, 252, 246, 0.92);
}

.panel--calendar {
  background:
    radial-gradient(circle at right top, rgba(125, 181, 145, 0.14), transparent 22%),
    rgba(255, 252, 246, 0.94);
}

.panel--planner {
  background:
    radial-gradient(circle at left top, rgba(255, 197, 115, 0.14), transparent 22%),
    rgba(255, 252, 246, 0.94);
}

.panel--breakdown {
  background:
    radial-gradient(circle at top right, rgba(255, 196, 113, 0.18), transparent 24%),
    rgba(250, 248, 242, 0.96);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
}

.calendar-card {
  padding: 16px;
  min-height: 148px;
  background: rgba(247, 246, 242, 0.92);
}

.calendar-card__top span {
  color: var(--color-text-soft);
}

.calendar-card__body {
  display: grid;
  gap: 8px;
  margin-top: 22px;
}

.calendar-card__body em {
  font-style: normal;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-text);
}

.calendar-card--today {
  box-shadow: inset 0 0 0 2px rgba(61, 105, 76, 0.2);
}

.calendar-card--level-0 {
  background: rgba(245, 244, 240, 0.92);
}

.calendar-card--level-1 {
  background: linear-gradient(180deg, rgba(231, 243, 230, 0.96), rgba(247, 246, 242, 0.94));
}

.calendar-card--level-2 {
  background: linear-gradient(180deg, rgba(203, 229, 201, 0.96), rgba(241, 246, 238, 0.94));
}

.calendar-card--level-3 {
  background: linear-gradient(180deg, rgba(163, 205, 160, 0.96), rgba(231, 241, 229, 0.94));
}

.calendar-card--level-4 {
  background: linear-gradient(180deg, rgba(112, 167, 110, 0.96), rgba(214, 232, 212, 0.94));
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 6px;
}

.quick-card {
  padding: 18px;
  text-align: left;
  border: 0;
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease;
  background: linear-gradient(180deg, rgba(243, 247, 240, 0.96), rgba(255, 252, 246, 0.94));
}

.quick-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 28px rgba(45, 67, 52, 0.08);
}

.quick-card:disabled,
.submit-button:disabled,
.ghost-button:disabled,
.row-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-card__tag {
  display: inline-flex;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(45, 73, 55, 0.08);
  color: #315040;
  font-size: 0.8rem;
  font-weight: 700;
}

.quick-card strong {
  display: block;
  margin-top: 12px;
  font-size: 1.1rem;
}

.quick-card p,
.quick-card small {
  margin: 8px 0 0;
  line-height: 1.6;
}

.entry-form {
  margin-top: 18px;
  padding: 20px;
  border-radius: 26px;
  background: rgba(241, 245, 239, 0.88);
}

.entry-form__header {
  align-items: center;
  margin-bottom: 14px;
}

.entry-form__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.entry-form__wide {
  grid-column: span 2;
}

.entry-form label {
  display: grid;
  gap: 8px;
}

.entry-form label span {
  font-size: 0.86rem;
  color: var(--color-text-soft);
}

.entry-form input,
.entry-form select {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(57, 87, 63, 0.14);
  background: rgba(255, 255, 255, 0.84);
  color: var(--color-text);
}

.submit-button,
.filter-chip,
.ghost-button,
.row-action {
  border: 0;
}

.submit-button {
  margin-top: 16px;
  padding: 11px 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #314f3f, #668f73);
  color: #f7fbf8;
  font-weight: 700;
  cursor: pointer;
}

.ghost-button {
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(57, 87, 63, 0.08);
  color: #335140;
  font-weight: 700;
  cursor: pointer;
}

.breakdown-card {
  padding: 18px;
  background: rgba(255, 255, 255, 0.62);
}

.breakdown-card__bar {
  margin-top: 12px;
}

.breakdown-card__fill {
  background: linear-gradient(90deg, #2c4b3a, #76ab74);
}

.breakdown-card p {
  margin: 10px 0 0;
}

.panel--table {
  background: linear-gradient(180deg, rgba(255, 252, 246, 0.95), rgba(250, 248, 242, 0.94));
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(57, 87, 63, 0.08);
  color: #335140;
  font-weight: 700;
  cursor: pointer;
}

.filter-chip--active {
  background: linear-gradient(135deg, #305742, #4e7d64);
  color: #f7fbf8;
}

.table-shell {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table th,
table td {
  padding: 14px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(57, 87, 63, 0.1);
  vertical-align: top;
}

.table-pill {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(49, 79, 63, 0.08);
  color: #315040;
  font-weight: 700;
  font-size: 0.82rem;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.row-action {
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(57, 87, 63, 0.08);
  color: #335140;
  font-weight: 700;
  cursor: pointer;
}

.row-action--danger {
  background: rgba(185, 77, 77, 0.12);
  color: #8a3c3c;
}

@media (max-width: 1280px) {
  .hero,
  .board-grid {
    grid-template-columns: 1fr;
  }

  .calendar-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .hero__header,
  .hero__track-meta,
  .panel__header,
  .breakdown-card__head,
  .calendar-card__top,
  .entry-form__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .metric-grid,
  .quick-grid,
  .entry-form__grid,
  .aside-grid,
  .calendar-grid {
    grid-template-columns: 1fr;
  }

  .entry-form__wide {
    grid-column: span 1;
  }

  .row-actions {
    flex-direction: column;
  }
}
</style>
