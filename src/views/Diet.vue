<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from "vue";
import type { DietSummary } from "../services/types";

type MealType = "早餐" | "午餐" | "晚餐" | "加餐";
type MealFilter = "全部" | MealType;
type TipTone = "positive" | "neutral" | "warning";

interface NutritionTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
}

interface FoodRecord {
  id: number;
  mealType: MealType;
  foodName: string;
  portionLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  recordedAt: string;
}

interface MealPlan {
  id: string;
  mealType: MealType;
  title: string;
  portionLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  reason: string;
}

interface NewFoodForm {
  mealType: MealType;
  foodName: string;
  portionLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

const props = defineProps<{
  summary: DietSummary;
}>();

const STORAGE_KEYS = {
  records: "lightbalance:diet:records",
  water: "lightbalance:diet:water",
  target: "lightbalance:diet:target",
  filter: "lightbalance:diet:filter"
} as const;

const mealTypes: MealType[] = ["早餐", "午餐", "晚餐", "加餐"];
const mealFilters: MealFilter[] = ["全部", ...mealTypes];

const defaultNutritionTarget: NutritionTarget = {
  calories: 1800,
  protein: 100,
  carbs: 230,
  fat: 55,
  fiber: 25,
  water: 2000
};

const defaultMealPlans: MealPlan[] = [
  {
    id: "breakfast-oat",
    mealType: "早餐",
    title: "希腊酸奶燕麦碗",
    portionLabel: "燕麦 45g + 酸奶 180g + 蓝莓",
    calories: 390,
    protein: 26,
    carbs: 52,
    fat: 9,
    fiber: 7,
    reason: "早餐安排优质蛋白和慢消化碳水，能稳定上午饱腹感，也便于控制全天热量。"
  },
  {
    id: "lunch-chicken",
    mealType: "午餐",
    title: "鸡胸藜麦能量盘",
    portionLabel: "鸡胸 130g + 藜麦 90g + 时蔬",
    calories: 540,
    protein: 42,
    carbs: 62,
    fat: 13,
    fiber: 8,
    reason: "午餐适当提高碳水和蛋白质，有利于下午学习与训练前能量供应。"
  },
  {
    id: "dinner-fish",
    mealType: "晚餐",
    title: "清蒸鱼配杂粮饭",
    portionLabel: "鱼肉 130g + 杂粮饭 80g + 西兰花",
    calories: 455,
    protein: 36,
    carbs: 45,
    fat: 12,
    fiber: 6,
    reason: "晚餐保持清淡但不极端节食，兼顾蛋白质修复和足量蔬菜。"
  },
  {
    id: "snack-soy",
    mealType: "加餐",
    title: "无糖豆浆坚果加餐",
    portionLabel: "豆浆 250ml + 坚果 12g",
    calories: 210,
    protein: 12,
    carbs: 15,
    fat: 11,
    fiber: 3,
    reason: "加餐用小份量补充蛋白和健康脂肪，减少晚餐前过度饥饿。"
  }
];

const fallbackRecords = computed<FoodRecord[]>(() =>
  props.summary.meals.map((meal) => ({
    id: meal.id,
    mealType: normalizeMealType(meal.mealType),
    foodName: meal.foodName,
    portionLabel: meal.portionLabel,
    calories: normalizeNumber(meal.calories),
    protein: normalizeNumber(meal.protein),
    carbs: normalizeNumber(meal.carbs),
    fat: normalizeNumber(meal.fat),
    fiber: 0,
    recordedAt: meal.recordedAt
  }))
);

const nutritionTarget = reactive<NutritionTarget>({ ...defaultNutritionTarget });
const foodRecords = ref<FoodRecord[]>([]);
const waterIntake = ref(0);
const selectedMealFilter = ref<MealFilter>("全部");
const lastAddedPlanId = ref("");
const formError = ref("");
const toast = ref("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const form = reactive<NewFoodForm>({
  mealType: "早餐",
  foodName: "",
  portionLabel: "1 份",
  calories: 300,
  protein: 20,
  carbs: 35,
  fat: 8,
  fiber: 4
});

loadDietState();

const consumedNutrition = computed(() =>
  foodRecords.value.reduce(
    (total, item) => ({
      calories: total.calories + normalizeNumber(item.calories),
      protein: total.protein + normalizeNumber(item.protein),
      carbs: total.carbs + normalizeNumber(item.carbs),
      fat: total.fat + normalizeNumber(item.fat),
      fiber: total.fiber + normalizeNumber(item.fiber),
      water: waterIntake.value
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: waterIntake.value }
  )
);

const remainingNutrition = computed(() => ({
  calories: Math.max(nutritionTarget.calories - consumedNutrition.value.calories, 0),
  protein: Math.max(nutritionTarget.protein - consumedNutrition.value.protein, 0),
  carbs: Math.max(nutritionTarget.carbs - consumedNutrition.value.carbs, 0),
  fat: Math.max(nutritionTarget.fat - consumedNutrition.value.fat, 0),
  fiber: Math.max(nutritionTarget.fiber - consumedNutrition.value.fiber, 0),
  water: Math.max(nutritionTarget.water - waterIntake.value, 0)
}));

const nutritionCards = computed(() => [
  {
    key: "calories",
    label: "热量",
    value: consumedNutrition.value.calories,
    target: nutritionTarget.calories,
    unit: "kcal",
    tone: consumedNutrition.value.calories > nutritionTarget.calories ? "warning" : "neutral"
  },
  {
    key: "protein",
    label: "蛋白质",
    value: consumedNutrition.value.protein,
    target: nutritionTarget.protein,
    unit: "g",
    tone: consumedNutrition.value.protein >= nutritionTarget.protein ? "positive" : "neutral"
  },
  {
    key: "carbs",
    label: "碳水",
    value: consumedNutrition.value.carbs,
    target: nutritionTarget.carbs,
    unit: "g",
    tone: consumedNutrition.value.carbs > nutritionTarget.carbs ? "warning" : "neutral"
  },
  {
    key: "fat",
    label: "脂肪",
    value: consumedNutrition.value.fat,
    target: nutritionTarget.fat,
    unit: "g",
    tone: consumedNutrition.value.fat > nutritionTarget.fat ? "warning" : "neutral"
  },
  {
    key: "fiber",
    label: "膳食纤维",
    value: consumedNutrition.value.fiber,
    target: nutritionTarget.fiber,
    unit: "g",
    tone: consumedNutrition.value.fiber >= nutritionTarget.fiber ? "positive" : "neutral"
  },
  {
    key: "water",
    label: "饮水",
    value: waterIntake.value,
    target: nutritionTarget.water,
    unit: "ml",
    tone: waterIntake.value >= nutritionTarget.water ? "positive" : "neutral"
  }
]);

const filteredRecords = computed(() => {
  if (selectedMealFilter.value === "全部") {
    return foodRecords.value;
  }

  return foodRecords.value.filter((item) => item.mealType === selectedMealFilter.value);
});

const mealStats = computed(() =>
  mealTypes.map((mealType) => {
    const records = foodRecords.value.filter((item) => item.mealType === mealType);
    return {
      mealType,
      count: records.length,
      calories: records.reduce((sum, item) => sum + normalizeNumber(item.calories), 0)
    };
  })
);

const supplementTips = computed(() => {
  const tips: { title: string; detail: string; tone: TipTone }[] = [];
  const consumed = consumedNutrition.value;
  const remaining = remainingNutrition.value;

  if (remaining.protein > 15) {
    tips.push({
      title: "蛋白质仍需补足",
      detail: `还差约 ${remaining.protein} g，可优先选择鸡蛋、鱼虾、豆腐、低脂奶等优质蛋白，避免只用高油食物补足。`,
      tone: "neutral"
    });
  }

  if (remaining.carbs > 45) {
    tips.push({
      title: "碳水不足会影响精力",
      detail: `还差约 ${remaining.carbs} g 碳水，下一餐可加入杂粮饭、燕麦、玉米或土豆，帮助维持学习和运动表现。`,
      tone: "neutral"
    });
  }

  if (consumed.fat > nutritionTarget.fat) {
    tips.push({
      title: "脂肪摄入略高",
      detail: "今日脂肪已超过目标，晚些时候建议以清蒸、炖煮和蔬菜为主，少加坚果、油炸和奶油类食物。",
      tone: "warning"
    });
  }

  if (remaining.fiber > 6) {
    tips.push({
      title: "膳食纤维还有空间",
      detail: `还差约 ${remaining.fiber} g 膳食纤维，可通过深色蔬菜、豆类、浆果或全谷物补充，注意循序渐进。`,
      tone: "neutral"
    });
  }

  if (remaining.water > 0) {
    tips.push({
      title: "饮水需要分次完成",
      detail: `还差 ${remaining.water} ml，建议分成 2 到 4 次补水，不必一次性喝完。`,
      tone: remaining.water > 900 ? "warning" : "neutral"
    });
  }

  if (consumed.calories < nutritionTarget.calories * 0.72) {
    tips.push({
      title: "热量偏低",
      detail: "当前摄入热量明显低于目标，减重也不建议长期过度节食，可用主食、蛋白质和蔬菜组合补足。",
      tone: "warning"
    });
  } else if (consumed.calories > nutritionTarget.calories) {
    tips.push({
      title: "热量略超目标",
      detail: "今天热量已经超过目标，后续餐次保持清淡即可，不需要用极端方式抵消。",
      tone: "warning"
    });
  }

  if (tips.length === 0) {
    tips.push({
      title: "今日营养结构较均衡",
      detail: "热量、宏量营养和饮水都接近目标，可以保持当前节奏，晚餐注意清淡和足量蔬菜。",
      tone: "positive"
    });
  }

  return tips;
});

const gapRows = computed(() => [
  buildGapRow("热量", consumedNutrition.value.calories, nutritionTarget.calories, remainingNutrition.value.calories, "kcal"),
  buildGapRow("蛋白质", consumedNutrition.value.protein, nutritionTarget.protein, remainingNutrition.value.protein, "g"),
  buildGapRow("碳水", consumedNutrition.value.carbs, nutritionTarget.carbs, remainingNutrition.value.carbs, "g"),
  buildGapRow("脂肪", consumedNutrition.value.fat, nutritionTarget.fat, remainingNutrition.value.fat, "g"),
  buildGapRow("膳食纤维", consumedNutrition.value.fiber, nutritionTarget.fiber, remainingNutrition.value.fiber, "g"),
  buildGapRow("饮水", waterIntake.value, nutritionTarget.water, remainingNutrition.value.water, "ml")
]);

watch(
  [foodRecords, waterIntake, selectedMealFilter, nutritionTarget],
  () => {
    saveDietState();
  },
  { deep: true }
);

function loadDietState() {
  const storedTarget = readJson<Partial<NutritionTarget>>(STORAGE_KEYS.target, {});
  Object.assign(nutritionTarget, sanitizeTarget({ ...defaultNutritionTarget, ...storedTarget }));

  const storedRecords = readJson<FoodRecord[] | null>(STORAGE_KEYS.records, null);
  const initialRecords = Array.isArray(storedRecords) ? storedRecords : fallbackRecords.value;
  foodRecords.value = initialRecords.map(sanitizeRecord).filter((item): item is FoodRecord => item !== null);

  waterIntake.value = normalizeNumber(readJson<number>(STORAGE_KEYS.water, props.summary.waterIntakeMl || 0));

  const storedFilter = readJson<MealFilter>(STORAGE_KEYS.filter, "全部");
  selectedMealFilter.value = mealFilters.includes(storedFilter) ? storedFilter : "全部";
}

function saveDietState() {
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(foodRecords.value));
  localStorage.setItem(STORAGE_KEYS.water, JSON.stringify(waterIntake.value));
  localStorage.setItem(STORAGE_KEYS.target, JSON.stringify({ ...nutritionTarget }));
  localStorage.setItem(STORAGE_KEYS.filter, JSON.stringify(selectedMealFilter.value));
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

function normalizeMealType(value: string): MealType {
  return mealTypes.includes(value as MealType) ? (value as MealType) : "加餐";
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(numberValue, 0) : fallback;
}

function sanitizeTarget(target: NutritionTarget): NutritionTarget {
  return {
    calories: Math.max(Math.round(normalizeNumber(target.calories, defaultNutritionTarget.calories)), 1),
    protein: Math.max(Math.round(normalizeNumber(target.protein, defaultNutritionTarget.protein)), 1),
    carbs: Math.max(Math.round(normalizeNumber(target.carbs, defaultNutritionTarget.carbs)), 1),
    fat: Math.max(Math.round(normalizeNumber(target.fat, defaultNutritionTarget.fat)), 1),
    fiber: Math.max(Math.round(normalizeNumber(target.fiber, defaultNutritionTarget.fiber)), 1),
    water: Math.max(Math.round(normalizeNumber(target.water, defaultNutritionTarget.water)), 1)
  };
}

function sanitizeRecord(record: Partial<FoodRecord>): FoodRecord | null {
  const foodName = String(record.foodName ?? "").trim();
  if (!foodName) return null;

  return {
    id: Number.isFinite(Number(record.id)) ? Number(record.id) : Date.now(),
    mealType: normalizeMealType(String(record.mealType ?? "")),
    foodName,
    portionLabel: String(record.portionLabel ?? "1 份").trim() || "1 份",
    calories: normalizeNumber(record.calories),
    protein: normalizeNumber(record.protein),
    carbs: normalizeNumber(record.carbs),
    fat: normalizeNumber(record.fat),
    fiber: normalizeNumber(record.fiber),
    recordedAt: String(record.recordedAt ?? new Date().toISOString())
  };
}

function safePercent(value: number, target: number) {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.min(Math.max((Math.max(value, 0) / target) * 100, 0), 100);
}

function progressWidth(value: number, target: number) {
  return `${safePercent(value, target)}%`;
}

function buildGapRow(label: string, value: number, target: number, remaining: number, unit: string) {
  const overflow = Math.max(value - target, 0);
  return {
    label,
    value,
    target,
    unit,
    progress: safePercent(value, target),
    status: overflow > 0 ? `略超 ${Math.round(overflow)} ${unit}` : remaining <= 0 ? "已达标" : `还缺 ${Math.round(remaining)} ${unit}`,
    tone: overflow > 0 ? "warning" : remaining <= 0 ? "positive" : "neutral"
  };
}

function addPlanToRecords(plan: MealPlan) {
  addFoodRecord({
    mealType: plan.mealType,
    foodName: plan.title,
    portionLabel: plan.portionLabel,
    calories: plan.calories,
    protein: plan.protein,
    carbs: plan.carbs,
    fat: plan.fat,
    fiber: plan.fiber
  });
  lastAddedPlanId.value = plan.id;
  selectedMealFilter.value = "全部";
  showToast(`${plan.title} 已加入今日记录`);
}

function addFoodRecord(input: NewFoodForm) {
  foodRecords.value = [
    {
      id: Date.now() + Math.floor(Math.random() * 1000),
      mealType: input.mealType,
      foodName: input.foodName.trim(),
      portionLabel: input.portionLabel.trim() || "1 份",
      calories: Math.round(normalizeNumber(input.calories)),
      protein: Math.round(normalizeNumber(input.protein)),
      carbs: Math.round(normalizeNumber(input.carbs)),
      fat: Math.round(normalizeNumber(input.fat)),
      fiber: Math.round(normalizeNumber(input.fiber)),
      recordedAt: new Date().toISOString()
    },
    ...foodRecords.value
  ];
}

function handleSubmit() {
  formError.value = "";
  const name = form.foodName.trim();
  const values = [form.calories, form.protein, form.carbs, form.fat, form.fiber];

  if (!name) {
    formError.value = "请先填写食物名称。";
    return;
  }

  if (values.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) {
    formError.value = "营养数值不能为负数，也不能为空。";
    return;
  }

  addFoodRecord({
    mealType: form.mealType,
    foodName: name,
    portionLabel: form.portionLabel.trim() || "1 份",
    calories: Number(form.calories),
    protein: Number(form.protein),
    carbs: Number(form.carbs),
    fat: Number(form.fat),
    fiber: Number(form.fiber)
  });
  resetForm();
  selectedMealFilter.value = "全部";
  showToast("自定义饮食记录已保存");
}

function resetForm() {
  form.mealType = "早餐";
  form.foodName = "";
  form.portionLabel = "1 份";
  form.calories = 300;
  form.protein = 20;
  form.carbs = 35;
  form.fat = 8;
  form.fiber = 4;
}

function deleteRecord(id: number) {
  foodRecords.value = foodRecords.value.filter((item) => item.id !== id);
  showToast("饮食记录已删除，统计已同步更新");
}

function addWater(amount: number) {
  waterIntake.value = Math.max(waterIntake.value + amount, 0);
  showToast(`饮水 +${amount} ml`);
}

function resetWater() {
  waterIntake.value = 0;
  showToast("今日饮水量已重置");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
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
    lastAddedPlanId.value = "";
  }, 1800);
}

onUnmounted(() => {
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
});
</script>

<template>
  <section class="diet-page">
    <article class="hero panel">
      <div class="hero__content">
        <p class="eyebrow">Daily Nutrition</p>
        <h3>今日饮食规划与营养缺口分析</h3>
        <p class="hero__copy">
          以 1800 kcal 为默认目标，联动记录、饮水、推荐餐和营养建议，刷新后仍保留今日数据。
        </p>
      </div>

      <div class="hero__summary">
        <strong>{{ consumedNutrition.calories }} / {{ nutritionTarget.calories }} kcal</strong>
        <span>当前热量完成度 {{ Math.round(safePercent(consumedNutrition.calories, nutritionTarget.calories)) }}%</span>
        <div class="progress">
          <span class="progress__fill" :style="{ width: progressWidth(consumedNutrition.calories, nutritionTarget.calories) }"></span>
        </div>
      </div>
    </article>

    <section class="nutrition-grid">
      <article v-for="card in nutritionCards" :key="card.key" class="metric-card" :data-tone="card.tone">
        <div class="metric-card__top">
          <span>{{ card.label }}</span>
          <strong>{{ Math.round(card.value) }} {{ card.unit }}</strong>
        </div>
        <div class="progress progress--thin">
          <span class="progress__fill" :style="{ width: progressWidth(card.value, card.target) }"></span>
        </div>
        <small>今日目标 {{ card.target }} {{ card.unit }}</small>
      </article>
    </section>

    <section class="layout-grid">
      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Meal Plan</p>
            <h4>每日饮食规划</h4>
          </div>
          <span class="panel__hint">点击后自动进入今日摄入记录</span>
        </div>

        <div class="plan-grid">
          <article v-for="plan in defaultMealPlans" :key="plan.id" class="plan-card">
            <div class="plan-card__head">
              <span>{{ plan.mealType }}</span>
              <strong>{{ plan.title }}</strong>
            </div>
            <p>{{ plan.portionLabel }}</p>
            <div class="macro-line">
              <span>{{ plan.calories }} kcal</span>
              <span>P {{ plan.protein }}g</span>
              <span>C {{ plan.carbs }}g</span>
              <span>F {{ plan.fat }}g</span>
              <span>纤维 {{ plan.fiber }}g</span>
            </div>
            <small>{{ plan.reason }}</small>
            <button class="primary-button" type="button" @click="addPlanToRecords(plan)">
              {{ lastAddedPlanId === plan.id ? "已加入" : "一键加入今日记录" }}
            </button>
          </article>
        </div>
      </article>

      <aside class="panel panel--compact">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Water</p>
            <h4>饮水打卡</h4>
          </div>
        </div>
        <div class="water-card">
          <strong>{{ waterIntake }} / {{ nutritionTarget.water }} ml</strong>
          <div class="progress">
            <span class="progress__fill progress__fill--water" :style="{ width: progressWidth(waterIntake, nutritionTarget.water) }"></span>
          </div>
          <div class="button-row">
            <button type="button" @click="addWater(250)">+250 ml</button>
            <button type="button" @click="addWater(500)">+500 ml</button>
            <button type="button" class="ghost-button" @click="resetWater">重置</button>
          </div>
        </div>

        <div class="meal-stats">
          <article v-for="item in mealStats" :key="item.mealType">
            <span>{{ item.mealType }}</span>
            <strong>{{ item.calories }} kcal</strong>
            <small>{{ item.count }} 条记录</small>
          </article>
        </div>
      </aside>
    </section>

    <section class="layout-grid">
      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Nutrition Gap</p>
            <h4>营养缺口与完成度</h4>
          </div>
        </div>

        <div class="gap-list">
          <article v-for="row in gapRows" :key="row.label" class="gap-row" :data-tone="row.tone">
            <div class="gap-row__meta">
              <strong>{{ row.label }}</strong>
              <span>{{ row.status }}</span>
            </div>
            <div class="progress progress--thin">
              <span class="progress__fill" :style="{ width: `${row.progress}%` }"></span>
            </div>
            <small>已摄入 {{ Math.round(row.value) }} / {{ row.target }} {{ row.unit }}</small>
          </article>
        </div>
      </article>

      <aside class="panel panel--tips">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Suggestions</p>
            <h4>动态补充建议</h4>
          </div>
        </div>
        <div class="tip-list">
          <article v-for="tip in supplementTips" :key="tip.title" class="tip-card" :data-tone="tip.tone">
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
            <p class="eyebrow">Custom Entry</p>
            <h4>添加自定义饮食记录</h4>
          </div>
        </div>

        <form class="entry-form" @submit.prevent="handleSubmit">
          <label>
            <span>餐次</span>
            <select v-model="form.mealType">
              <option v-for="type in mealTypes" :key="type">{{ type }}</option>
            </select>
          </label>
          <label class="entry-form__wide">
            <span>食物名称</span>
            <input v-model="form.foodName" type="text" placeholder="例如：番茄鸡蛋全麦三明治" />
          </label>
          <label>
            <span>摄入量</span>
            <input v-model="form.portionLabel" type="text" placeholder="1 份" />
          </label>
          <label>
            <span>热量 kcal</span>
            <input v-model.number="form.calories" type="number" min="0" />
          </label>
          <label>
            <span>蛋白质 g</span>
            <input v-model.number="form.protein" type="number" min="0" />
          </label>
          <label>
            <span>碳水 g</span>
            <input v-model.number="form.carbs" type="number" min="0" />
          </label>
          <label>
            <span>脂肪 g</span>
            <input v-model.number="form.fat" type="number" min="0" />
          </label>
          <label>
            <span>膳食纤维 g</span>
            <input v-model.number="form.fiber" type="number" min="0" />
          </label>
          <p v-if="formError" class="form-error">{{ formError }}</p>
          <button class="primary-button" type="submit">保存饮食记录</button>
        </form>
      </article>

      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Meal Log</p>
            <h4>今日已摄入内容</h4>
          </div>
          <div class="filters">
            <button
              v-for="type in mealFilters"
              :key="type"
              type="button"
              class="filter-chip"
              :class="{ 'filter-chip--active': selectedMealFilter === type }"
              @click="selectedMealFilter = type"
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
                <th>摄入量</th>
                <th>热量</th>
                <th>蛋白质</th>
                <th>碳水</th>
                <th>脂肪</th>
                <th>纤维</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in filteredRecords" :key="record.id">
                <td>{{ formatTime(record.recordedAt) }}</td>
                <td>{{ record.mealType }}</td>
                <td>{{ record.foodName }}</td>
                <td>{{ record.portionLabel }}</td>
                <td>{{ record.calories }} kcal</td>
                <td>{{ record.protein }} g</td>
                <td>{{ record.carbs }} g</td>
                <td>{{ record.fat }} g</td>
                <td>{{ record.fiber }} g</td>
                <td>
                  <button class="danger-button" type="button" @click="deleteRecord(record.id)">删除</button>
                </td>
              </tr>
              <tr v-if="filteredRecords.length === 0">
                <td colspan="10" class="empty-cell">当前筛选下暂无记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <transition name="toast-fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </section>
</template>

<style scoped>
.diet-page {
  display: grid;
  gap: 18px;
  padding-right: 18px;
}

.panel,
.metric-card {
  border: 1px solid rgba(57, 87, 63, 0.12);
  border-radius: 24px;
  background: rgba(255, 252, 246, 0.94);
  box-shadow: 0 18px 44px rgba(31, 44, 36, 0.08);
}

.panel {
  padding: 22px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  align-items: stretch;
  background: linear-gradient(135deg, rgba(255, 251, 244, 0.98), rgba(241, 248, 244, 0.96));
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
  font-size: 2rem;
}

.hero__copy,
.panel__hint,
.metric-card small,
.plan-card p,
.plan-card small,
.gap-row small,
.tip-card p,
.meal-stats small,
table thead th {
  color: var(--color-text-soft);
}

.hero__copy {
  max-width: 720px;
  margin: 12px 0 0;
  line-height: 1.75;
}

.hero__summary {
  display: grid;
  align-content: center;
  gap: 8px;
  padding: 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.62);
}

.hero__summary strong {
  color: var(--color-text);
  font-size: 1.55rem;
}

.nutrition-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 16px;
}

.metric-card__top,
.panel__header,
.gap-row__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.metric-card__top {
  align-items: flex-start;
}

.metric-card__top span,
.gap-row__meta span {
  color: var(--color-text-soft);
}

.metric-card strong,
.gap-row strong,
.tip-card strong,
.plan-card strong,
.meal-stats strong,
table tbody td {
  color: var(--color-text);
}

.metric-card[data-tone="positive"],
.gap-row[data-tone="positive"],
.tip-card[data-tone="positive"] {
  border-color: rgba(67, 143, 82, 0.24);
  background: rgba(239, 249, 239, 0.82);
}

.metric-card[data-tone="warning"],
.gap-row[data-tone="warning"],
.tip-card[data-tone="warning"] {
  border-color: rgba(201, 148, 65, 0.28);
  background: rgba(255, 246, 226, 0.86);
}

.layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
  gap: 18px;
}

.panel__header {
  align-items: flex-start;
  margin-bottom: 16px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.plan-card,
.water-card,
.gap-row,
.tip-card,
.meal-stats article {
  border: 1px solid rgba(57, 87, 63, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
}

.plan-card {
  padding: 18px;
}

.plan-card__head {
  display: grid;
  gap: 6px;
}

.plan-card__head span {
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(57, 87, 63, 0.08);
  color: #315040;
  font-size: 0.82rem;
  font-weight: 700;
}

.macro-line,
.button-row,
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.macro-line {
  margin: 12px 0;
}

.macro-line span {
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(49, 79, 63, 0.08);
  color: #365745;
  font-size: 0.82rem;
  font-weight: 700;
}

.primary-button,
.danger-button,
.ghost-button,
.button-row button,
.filter-chip {
  border: 0;
  cursor: pointer;
  font-weight: 700;
}

.primary-button {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, #314f3f, #668f73);
  color: #f7fbf8;
}

.button-row button,
.ghost-button,
.filter-chip {
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(57, 87, 63, 0.08);
  color: #335140;
}

.button-row button:not(.ghost-button) {
  background: rgba(62, 127, 154, 0.14);
  color: #2e596a;
}

.danger-button {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(185, 77, 77, 0.12);
  color: #8a3c3c;
}

.filter-chip--active {
  background: linear-gradient(135deg, #305742, #4e7d64);
  color: #f7fbf8;
}

.water-card {
  padding: 18px;
}

.water-card strong {
  color: var(--color-text);
  font-size: 1.35rem;
}

.meal-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.meal-stats article {
  display: grid;
  gap: 5px;
  padding: 14px;
}

.meal-stats span {
  color: var(--color-text-soft);
}

.gap-list,
.tip-list {
  display: grid;
  gap: 12px;
}

.gap-row,
.tip-card {
  padding: 16px;
}

.tip-card p {
  margin: 8px 0 0;
  line-height: 1.65;
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
  border: 1px solid rgba(57, 87, 63, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
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

.table-shell {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table th,
table td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(57, 87, 63, 0.1);
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
}

.empty-cell {
  text-align: center;
  color: var(--color-text-soft);
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

.progress__fill--water {
  background: linear-gradient(90deg, #2d6070, #5cb9d5);
}

.toast {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 1200;
  padding: 12px 16px;
  border-radius: 12px;
  background: #335f42;
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
  .layout-grid,
  .nutrition-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .panel__header,
  .metric-card__top,
  .gap-row__meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .plan-grid,
  .meal-stats,
  .entry-form {
    grid-template-columns: 1fr;
  }

  .entry-form__wide {
    grid-column: span 1;
  }
}
</style>
