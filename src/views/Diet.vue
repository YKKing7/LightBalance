<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { addDietEntry, addWaterIntake, deleteDietEntry, updateDietEntry } from "../services/backend/diet";
import type { CreateDietEntryInput, DietSummary, MealItem, UpdateDietEntryInput } from "../services/types";

const props = defineProps<{
  summary: DietSummary;
}>();

const localSummary = ref<DietSummary>(props.summary);
const saving = ref(false);
const activeMealType = ref<"全部" | string>("全部");
const editingMealId = ref<number | null>(null);

const quickMeals: CreateDietEntryInput[] = [
  { mealType: "早餐", foodName: "高蛋白酸奶燕麦杯", portionLabel: "1 份", calories: 320, protein: 20, carbs: 36, fat: 9 },
  { mealType: "午餐", foodName: "鸡胸糙米能量碗", portionLabel: "1 盒", calories: 520, protein: 38, carbs: 52, fat: 14 },
  { mealType: "晚餐", foodName: "香煎鳕鱼时蔬盘", portionLabel: "1 盘", calories: 430, protein: 35, carbs: 24, fat: 16 },
  { mealType: "加餐", foodName: "香蕉花生酱吐司", portionLabel: "1 份", calories: 260, protein: 9, carbs: 31, fat: 11 }
];

const form = reactive<CreateDietEntryInput>({
  mealType: "加餐",
  foodName: "",
  portionLabel: "1 份",
  calories: 180,
  protein: 12,
  carbs: 18,
  fat: 6
});

watch(
  () => props.summary,
  (value) => {
    localSummary.value = value;
  }
);

const calorieProgress = computed(() => {
  if (localSummary.value.calorieTarget <= 0) {
    return 0;
  }

  return Math.min((localSummary.value.todayCalories / localSummary.value.calorieTarget) * 100, 100);
});

const waterProgress = computed(() => {
  if (localSummary.value.waterTargetMl <= 0) {
    return 0;
  }

  return Math.min((localSummary.value.waterIntakeMl / localSummary.value.waterTargetMl) * 100, 100);
});

const macros = computed(() => [
  {
    label: "蛋白质",
    value: localSummary.value.protein,
    target: localSummary.value.proteinTarget,
    tone: localSummary.value.protein >= localSummary.value.proteinTarget ? "positive" : "neutral"
  },
  {
    label: "碳水",
    value: localSummary.value.carbs,
    target: localSummary.value.carbsTarget,
    tone: localSummary.value.carbs > localSummary.value.carbsTarget ? "warning" : "neutral"
  },
  {
    label: "脂肪",
    value: localSummary.value.fat,
    target: localSummary.value.fatTarget,
    tone: localSummary.value.fat > localSummary.value.fatTarget ? "warning" : "neutral"
  }
]);

const mealTypes = computed(() => ["全部", ...new Set(localSummary.value.meals.map((item) => item.mealType))]);

const filteredMeals = computed(() => {
  if (activeMealType.value === "全部") {
    return localSummary.value.meals;
  }

  return localSummary.value.meals.filter((item) => item.mealType === activeMealType.value);
});

function progressWidth(value: number, target: number) {
  if (target <= 0) {
    return "0%";
  }

  return `${Math.max(6, Math.min((value / target) * 100, 100))}%`;
}

function formatRecordedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function resetForm() {
  form.mealType = "加餐";
  form.foodName = "";
  form.portionLabel = "1 份";
  form.calories = 180;
  form.protein = 12;
  form.carbs = 18;
  form.fat = 6;
  editingMealId.value = null;
}

function startEdit(meal: MealItem) {
  editingMealId.value = meal.id;
  form.mealType = meal.mealType;
  form.foodName = meal.foodName;
  form.portionLabel = meal.portionLabel;
  form.calories = meal.calories;
  form.protein = meal.protein;
  form.carbs = meal.carbs;
  form.fat = meal.fat;
}

function cancelEdit() {
  resetForm();
}

async function applySummary(task: Promise<DietSummary>) {
  saving.value = true;

  try {
    localSummary.value = await task;
  } finally {
    saving.value = false;
  }
}

async function handleQuickAdd(item: CreateDietEntryInput) {
  await applySummary(addDietEntry(item));
  activeMealType.value = "全部";
}

async function handleAddWater(amountMl: number) {
  await applySummary(addWaterIntake({ amountMl }));
}

async function handleSubmit() {
  if (!form.foodName.trim()) {
    return;
  }

  if (editingMealId.value !== null) {
    await applySummary(
      updateDietEntry({
        id: editingMealId.value,
        mealType: form.mealType,
        foodName: form.foodName.trim(),
        portionLabel: form.portionLabel.trim() || "1 份",
        calories: form.calories,
        protein: form.protein,
        carbs: form.carbs,
        fat: form.fat
      } satisfies UpdateDietEntryInput)
    );
  } else {
    await applySummary(
      addDietEntry({
        mealType: form.mealType,
        foodName: form.foodName.trim(),
        portionLabel: form.portionLabel.trim() || "1 份",
        calories: form.calories,
        protein: form.protein,
        carbs: form.carbs,
        fat: form.fat
      })
    );
  }

  resetForm();
  activeMealType.value = "全部";
}

async function handleDelete(meal: MealItem) {
  if (!window.confirm(`确定删除“${meal.foodName}”这条饮食记录吗？`)) {
    return;
  }

  await applySummary(deleteDietEntry(meal.id));

  if (editingMealId.value === meal.id) {
    resetForm();
  }
}
</script>

<template>
  <section class="diet-board">
    <article class="hero">
      <div class="hero__main">
        <p class="eyebrow">Fuel Dashboard</p>
        <div class="hero__header">
          <div>
            <h3>{{ localSummary.dateLabel }}的饮食节奏</h3>
            <p class="hero__copy">把热量、营养和饮水放在同一张面板里，记录之后会立刻回写数据库并刷新今天的汇总。</p>
          </div>
          <span class="hero__badge" :class="{ 'hero__badge--warning': localSummary.remainingCalories < 0 }">
            {{ localSummary.remainingCalories >= 0 ? `剩余 ${localSummary.remainingCalories} kcal` : `超出 ${Math.abs(localSummary.remainingCalories)} kcal` }}
          </span>
        </div>

        <div class="hero__grid">
          <div class="hero-card">
            <span>今日摄入</span>
            <strong>{{ localSummary.todayCalories }} kcal</strong>
            <div class="progress"><span class="progress__fill" :style="{ width: `${calorieProgress}%` }"></span></div>
            <small>目标 {{ localSummary.calorieTarget }} kcal</small>
          </div>

          <div class="hero-card hero-card--water">
            <span>饮水完成</span>
            <strong>{{ localSummary.waterIntakeMl }} / {{ localSummary.waterTargetMl }} ml</strong>
            <div class="progress"><span class="progress__fill progress__fill--water" :style="{ width: `${waterProgress}%` }"></span></div>
            <div class="water-actions">
              <button type="button" :disabled="saving" @click="handleAddWater(250)">+250 ml</button>
              <button type="button" :disabled="saving" @click="handleAddWater(500)">+500 ml</button>
            </div>
          </div>
        </div>
      </div>

      <div class="hero__side">
        <p class="eyebrow">Macro Balance</p>
        <div class="macro-list">
          <article v-for="macro in macros" :key="macro.label" class="macro-card" :data-tone="macro.tone">
            <div class="macro-card__row">
              <span>{{ macro.label }}</span>
              <strong>{{ macro.value }} / {{ macro.target }} g</strong>
            </div>
            <div class="progress progress--thin">
              <span class="progress__fill" :style="{ width: progressWidth(macro.value, macro.target) }"></span>
            </div>
          </article>
        </div>
      </div>
    </article>

    <section class="content-grid">
      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Quick Add</p>
            <h4>常用餐食快捷录入</h4>
          </div>
          <span class="panel__hint">{{ saving ? "正在同步..." : "点击即可入库" }}</span>
        </div>

        <div class="quick-grid">
          <button
            v-for="item in quickMeals"
            :key="`${item.mealType}-${item.foodName}`"
            class="quick-card"
            type="button"
            :disabled="saving"
            @click="handleQuickAdd(item)"
          >
            <strong>{{ item.foodName }}</strong>
            <span>{{ item.mealType }} · {{ item.portionLabel }}</span>
            <small>{{ item.calories }} kcal · P{{ item.protein }} C{{ item.carbs }} F{{ item.fat }}</small>
          </button>
        </div>

        <form class="entry-form" @submit.prevent="handleSubmit">
          <div class="entry-form__header">
            <div>
              <p class="eyebrow">Custom Entry</p>
              <h4>{{ editingMealId !== null ? "编辑饮食记录" : "添加自定义记录" }}</h4>
            </div>
            <button v-if="editingMealId !== null" class="ghost-button" type="button" :disabled="saving" @click="cancelEdit">取消编辑</button>
          </div>

          <div class="entry-form__grid">
            <label>
              <span>餐次</span>
              <select v-model="form.mealType">
                <option>早餐</option>
                <option>午餐</option>
                <option>晚餐</option>
                <option>加餐</option>
              </select>
            </label>

            <label class="entry-form__wide">
              <span>食物名称</span>
              <input v-model="form.foodName" type="text" placeholder="例如：鸡蛋三明治" />
            </label>

            <label>
              <span>份量</span>
              <input v-model="form.portionLabel" type="text" placeholder="1 份" />
            </label>

            <label>
              <span>热量</span>
              <input v-model.number="form.calories" type="number" min="1" />
            </label>

            <label>
              <span>蛋白质</span>
              <input v-model.number="form.protein" type="number" min="0" />
            </label>

            <label>
              <span>碳水</span>
              <input v-model.number="form.carbs" type="number" min="0" />
            </label>

            <label>
              <span>脂肪</span>
              <input v-model.number="form.fat" type="number" min="0" />
            </label>
          </div>

          <button class="submit-button" type="submit" :disabled="saving || !form.foodName.trim()">
            {{ editingMealId !== null ? "保存修改" : "添加自定义记录" }}
          </button>
        </form>
      </article>

      <article class="panel panel--insights">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Signals</p>
            <h4>今天的饮食提示</h4>
          </div>
        </div>

        <div class="insight-list">
          <article v-for="item in localSummary.insights" :key="item.title" class="insight-card" :data-tone="item.tone">
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
          </article>
        </div>

        <div class="group-list">
          <article v-for="group in localSummary.mealGroups" :key="group.mealType" class="group-card">
            <div>
              <strong>{{ group.mealType }}</strong>
              <small>{{ group.count }} 条记录</small>
            </div>
            <span>{{ group.calories }} kcal</span>
          </article>
        </div>
      </article>
    </section>

    <article class="panel panel--table">
      <div class="panel__header">
        <div>
          <p class="eyebrow">Meal Log</p>
          <h4>今日饮食记录表</h4>
        </div>
        <div class="filters">
          <button
            v-for="type in mealTypes"
            :key="type"
            type="button"
            class="filter-chip"
            :class="{ 'filter-chip--active': type === activeMealType }"
            @click="activeMealType = type"
          >
            {{ type }}
          </button>
        </div>
      </div>

      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>餐次</th>
              <th>食物</th>
              <th>份量</th>
              <th>热量</th>
              <th>蛋白质</th>
              <th>碳水</th>
              <th>脂肪</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="meal in filteredMeals" :key="meal.id">
              <td>{{ formatRecordedAt(meal.recordedAt) }}</td>
              <td>{{ meal.mealType }}</td>
              <td>{{ meal.foodName }}</td>
              <td>{{ meal.portionLabel }}</td>
              <td>{{ meal.calories }} kcal</td>
              <td>{{ meal.protein }} g</td>
              <td>{{ meal.carbs }} g</td>
              <td>{{ meal.fat }} g</td>
              <td>
                <div class="row-actions">
                  <button class="row-action" type="button" :disabled="saving" @click="startEdit(meal)">编辑</button>
                  <button class="row-action row-action--danger" type="button" :disabled="saving" @click="handleDelete(meal)">删除</button>
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
.diet-board {
  display: grid;
  gap: 18px;
  padding-right: 18px;
}

.hero,
.panel {
  padding: 24px;
  border-radius: 28px;
  border: 1px solid rgba(57, 87, 63, 0.12);
  box-shadow: 0 18px 44px rgba(31, 44, 36, 0.08);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) 360px;
  gap: 18px;
  background:
    radial-gradient(circle at right top, rgba(123, 180, 214, 0.22), transparent 24%),
    radial-gradient(circle at left top, rgba(255, 194, 116, 0.22), transparent 28%),
    linear-gradient(135deg, rgba(255, 251, 244, 0.98), rgba(244, 249, 247, 0.96));
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 0.76rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.hero__header,
.hero__grid,
.panel__header,
.macro-card__row,
.group-card,
.entry-form__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.hero__header {
  align-items: flex-start;
}

.hero__copy {
  margin: 10px 0 0;
  max-width: 720px;
  line-height: 1.7;
  color: var(--color-text-soft);
}

.hero h3,
.panel h4 {
  margin: 0;
  color: var(--color-text);
}

.hero h3 {
  font-size: 2rem;
}

.hero__badge {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(72, 136, 92, 0.12);
  color: #215635;
  font-weight: 700;
  white-space: nowrap;
}

.hero__badge--warning {
  background: rgba(202, 144, 51, 0.16);
  color: #8a4f14;
}

.hero__grid {
  margin-top: 22px;
}

.hero-card,
.macro-card,
.quick-card,
.insight-card,
.group-card {
  border-radius: 22px;
  border: 1px solid rgba(57, 87, 63, 0.1);
}

.hero-card {
  flex: 1;
  padding: 20px;
  background: rgba(255, 255, 255, 0.58);
}

.hero-card span,
.hero-card small,
.panel__hint,
.quick-card span,
.quick-card small,
.insight-card p,
.group-card small,
table thead th {
  color: var(--color-text-soft);
}

.hero-card strong {
  display: block;
  margin-top: 8px;
  font-size: 1.8rem;
  color: var(--color-text);
}

.water-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.water-actions button,
.submit-button,
.filter-chip,
.ghost-button,
.row-action {
  border: 0;
  cursor: pointer;
}

.water-actions button,
.submit-button {
  padding: 10px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2e596a, #4e8ea2);
  color: #f7fbfc;
  font-weight: 700;
}

.water-actions button:disabled,
.submit-button:disabled,
.quick-card:disabled,
.ghost-button:disabled,
.row-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hero__side {
  padding: 22px;
  border-radius: 24px;
  background: rgba(34, 58, 67, 0.94);
  color: #f3f7f8;
}

.hero__side .eyebrow {
  color: rgba(232, 241, 243, 0.7);
}

.macro-list,
.insight-list,
.group-list {
  display: grid;
  gap: 12px;
}

.macro-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
}

.macro-card span {
  color: rgba(232, 241, 243, 0.72);
}

.macro-card strong {
  color: #fff9f1;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) 380px;
  gap: 18px;
}

.panel {
  background: rgba(255, 252, 246, 0.92);
}

.panel--insights {
  background:
    radial-gradient(circle at top right, rgba(161, 206, 176, 0.18), transparent 24%),
    rgba(255, 252, 246, 0.95);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.quick-card {
  padding: 18px;
  text-align: left;
  background: linear-gradient(180deg, rgba(244, 248, 241, 0.95), rgba(255, 252, 246, 0.92));
}

.quick-card strong,
.insight-card strong,
.group-card strong,
table tbody td {
  color: var(--color-text);
}

.quick-card strong,
.quick-card span,
.quick-card small {
  display: block;
}

.quick-card span,
.quick-card small {
  margin-top: 6px;
}

.entry-form {
  padding: 20px;
  border-radius: 24px;
  background: rgba(241, 245, 239, 0.86);
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
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-text);
}

.submit-button {
  margin-top: 16px;
}

.ghost-button {
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(57, 87, 63, 0.08);
  color: #335140;
  font-weight: 700;
}

.insight-card {
  padding: 18px;
  background: rgba(255, 255, 255, 0.58);
}

.insight-card[data-tone="positive"] {
  border-color: rgba(69, 144, 92, 0.26);
}

.insight-card[data-tone="warning"] {
  border-color: rgba(201, 148, 65, 0.28);
}

.insight-card p {
  margin: 8px 0 0;
  line-height: 1.6;
}

.group-list {
  margin-top: 16px;
}

.group-card {
  padding: 16px 18px;
  align-items: center;
  background: rgba(243, 246, 241, 0.86);
}

.group-card span {
  font-weight: 800;
  color: #355540;
}

.panel--table {
  overflow: hidden;
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
  padding: 13px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(57, 87, 63, 0.1);
  vertical-align: top;
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
}

.row-action--danger {
  background: rgba(185, 77, 77, 0.12);
  color: #8a3c3c;
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
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #3b5f45, #71a96f, #f2c56f);
}

.progress__fill--water {
  background: linear-gradient(90deg, #2d6070, #5cb9d5);
}

@media (max-width: 1280px) {
  .hero,
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .hero__header,
  .hero__grid,
  .panel__header,
  .macro-card__row,
  .group-card,
  .entry-form__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .quick-grid,
  .entry-form__grid {
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
