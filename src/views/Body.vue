<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type { BodyProfile, UserProfileRecord } from "../services/types";

const props = defineProps<{
  profile: BodyProfile;
  record: UserProfileRecord | null;
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
  Math.min(Math.max(((props.profile.weightKg - weightScaleMin.value) / weightScaleRange.value) * 100, 0), 100)
);
const targetWeightPercent = computed(() =>
  Math.min(Math.max(((props.profile.targetWeightKg - weightScaleMin.value) / weightScaleRange.value) * 100, 0), 100)
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

const archiveRows = computed(() => [
  {
    category: "基础资料",
    label: "年龄 / 性别",
    value: `${props.profile.age} 岁 / ${props.profile.gender || "未设置"}`,
    note: "影响基础代谢和建议阈值"
  },
  {
    category: "当前状态",
    label: "身高 / 体重",
    value: `${props.profile.heightCm} cm / ${props.profile.weightKg} kg`,
    note: "用于 BMI、目标体重和热量估算"
  },
  {
    category: "体成分",
    label: "体脂率 / BMI",
    value: `${props.profile.bodyFatRate ?? "--"}% / ${props.profile.bmi ?? "--"}`,
    note: "观察减脂而不是只盯体重"
  },
  {
    category: "目标设定",
    label: "目标体重 / 目标体脂",
    value: `${props.profile.targetWeightKg} kg / ${props.profile.targetBodyFatRate ?? "--"}%`,
    note: "让饮食与训练计划更有方向"
  },
  {
    category: "执行节奏",
    label: "训练 / 睡眠目标",
    value: `${props.profile.weeklyWorkoutTarget} 次每周 / ${props.profile.sleepTargetHours} 小时`,
    note: "决定恢复与长期可持续性"
  },
  {
    category: "生活方式",
    label: "工作 / 烟酒情况",
    value: `${props.profile.workStyle || "待补充"} / ${props.profile.smokingStatus} / ${props.profile.drinkingFrequency}`,
    note: "帮助判断恢复压力与风险因素"
  }
]);

function handleSave() {
  emit("save", {
    nickname: form.nickname.trim(),
    age: Number(form.age),
    gender: form.gender.trim(),
    heightCm: Number(form.heightCm),
    currentWeightKg: Number(form.currentWeightKg),
    bodyFatRate: form.bodyFatRate === "" ? null : Number(form.bodyFatRate),
    targetWeightKg: Number(form.targetWeightKg),
    targetBodyFatRate: form.targetBodyFatRate === "" ? null : Number(form.targetBodyFatRate),
    weeklyWorkoutTarget: Number(form.weeklyWorkoutTarget),
    dailyCalorieTarget: Number(form.dailyCalorieTarget),
    sleepTargetHours: Number(form.sleepTargetHours),
    workStyle: form.workStyle.trim(),
    stressLevel: form.stressLevel.trim(),
    smokingStatus: form.smokingStatus.trim(),
    drinkingFrequency: form.drinkingFrequency.trim(),
    habitSleep: form.habitSleep.trim(),
    habitDiet: form.habitDiet.trim(),
    habitExercise: form.habitExercise.trim()
  });
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
            <h3>身体档案总览</h3>
            <p class="hero__lead">{{ profile.healthSummary }}</p>
          </div>

          <div class="hero__identity">
            <span class="hero__identity-label">当前档案</span>
            <strong>{{ profile.nickname || "当前用户" }}</strong>
            <small>{{ habitSummary }}</small>
          </div>
        </div>

        <div class="hero__summary">
          <div class="weight-bar-card">
            <div class="weight-bar-card__header">
              <div>
                <span class="weight-bar-card__eyebrow">Weight Progress</span>
                <strong>体重目标进度</strong>
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
          <div class="hero-stat">
            <span>当前 BMI</span>
            <strong>{{ profile.bmi ?? "--" }}</strong>
          </div>
          <div class="hero-stat">
            <span>基础代谢</span>
            <strong>{{ profile.bmr ?? "--" }} kcal</strong>
          </div>
          <div class="hero-stat">
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
          <p class="eyebrow">核心指标</p>

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

        <article class="panel panel--table">
          <div class="panel__header panel__header--compact">
            <div>
              <p class="eyebrow">Profile Matrix</p>
              <h4>个人数据总览表</h4>
            </div>
            <span class="panel__badge">重点关注“当前状态”和“目标设定”</span>
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
            <h4>健康档案与目标设置</h4>
            <p class="panel__intro">把基础数据、目标和生活方式分开填写，后续看板和建议会更贴近你的真实情况。</p>
          </div>
          <button class="save" type="button" :disabled="saving || loading" @click="handleSave">
            {{ saving ? "保存中..." : "保存档案" }}
          </button>
        </div>

        <div v-if="loading" class="loading">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <template v-else>
          <section class="form-section">
            <div class="form-section__head">
              <h5>基础身份</h5>
              <p>先补全最核心的个人资料，便于系统建立基线。</p>
            </div>

            <div class="fields fields--four">
              <label class="field">
                <span>昵称</span>
                <input v-model.trim="form.nickname" type="text" placeholder="例如：小林" />
              </label>

              <label class="field">
                <span>年龄</span>
                <input v-model="form.age" type="number" min="0" placeholder="18" />
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
              <p>这里决定你的身体画像，也是后续趋势分析的输入基础。</p>
            </div>

            <div class="fields fields--four">
              <label class="field">
                <span>身高(cm)</span>
                <input v-model="form.heightCm" type="number" min="0" step="0.1" placeholder="170" />
              </label>

              <label class="field">
                <span>当前体重(kg)</span>
                <input v-model="form.currentWeightKg" type="number" min="0" step="0.1" placeholder="60" />
              </label>

              <label class="field">
                <span>体脂率(%)</span>
                <input v-model="form.bodyFatRate" type="number" min="0" max="100" step="0.1" placeholder="可选" />
              </label>

              <label class="field field--readonly">
                <span>当前评估</span>
                <div class="field-card">
                  <strong>BMI {{ profile.bmi ?? "--" }}</strong>
                  <small>BMR {{ profile.bmr ?? "--" }} kcal</small>
                </div>
              </label>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section__head">
              <h5>目标设置</h5>
              <p>别只写“想瘦一点”，把目标落成可执行的体重、睡眠和训练节奏。</p>
            </div>

            <div class="fields fields--four">
              <label class="field">
                <span>目标体重(kg)</span>
                <input v-model="form.targetWeightKg" type="number" min="0" step="0.1" />
              </label>

              <label class="field">
                <span>目标体脂(%)</span>
                <input v-model="form.targetBodyFatRate" type="number" min="0" max="100" step="0.1" placeholder="可选" />
              </label>

              <label class="field">
                <span>每周训练目标</span>
                <input v-model="form.weeklyWorkoutTarget" type="number" min="0" max="14" />
              </label>

              <label class="field">
                <span>每日热量目标</span>
                <input v-model="form.dailyCalorieTarget" type="number" min="1000" step="10" />
              </label>
            </div>

            <div class="fields fields--three">
              <label class="field">
                <span>睡眠目标(小时)</span>
                <input v-model="form.sleepTargetHours" type="number" min="0" max="24" step="0.5" />
              </label>

              <label class="field">
                <span>压力水平</span>
                <select v-model="form.stressLevel">
                  <option value="低">低</option>
                  <option value="中">中</option>
                  <option value="高">高</option>
                </select>
              </label>

              <label class="field field--readonly">
                <span>目标提示</span>
                <div class="field-card">
                  <strong>{{ profile.goalSummary }}</strong>
                  <small>目标越清晰，建议越准确</small>
                </div>
              </label>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section__head">
              <h5>生活方式</h5>
              <p>这些不是附加项，它们会直接影响恢复、食欲和执行稳定性。</p>
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
              <p>尽量写真实的日常情况，不必写得完美，真实比“标准答案”更有用。</p>
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
          <h4>生活习惯标签</h4>
        </div>
      </div>
      <div class="habits">
        <span v-for="habit in profile.habits" :key="habit">{{ habit }}</span>
      </div>
      <p class="copy">{{ profile.goalSummary }}</p>
    </article>
  </section>
</template>

<style scoped>
.assessment {
  display: grid;
  gap: 18px;
}

.hero,
.panel,
.goal-card {
  padding: 22px;
  border-radius: 28px;
  background: rgba(255, 252, 246, 0.92);
  border: 1px solid rgba(57, 87, 63, 0.12);
  box-shadow: 0 18px 44px rgba(30, 44, 37, 0.08);
}

.hero {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 252, 246, 0.98), rgba(244, 248, 241, 0.96) 52%, rgba(231, 241, 233, 0.92));
}

.hero__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 14% 18%, rgba(246, 214, 153, 0.2), transparent 24%),
    radial-gradient(circle at 88% 18%, rgba(130, 181, 114, 0.22), transparent 28%),
    radial-gradient(circle at 72% 78%, rgba(194, 223, 196, 0.2), transparent 26%);
  pointer-events: none;
}

.hero__content {
  position: relative;
  display: grid;
  gap: 24px;
}

.hero__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.hero__lead {
  max-width: 760px;
  margin: 14px 0 0;
  font-size: 1.08rem;
  line-height: 1.85;
  color: #66756d;
}

.hero__identity {
  display: grid;
  gap: 6px;
  min-width: 220px;
  padding: 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(78, 106, 81, 0.1);
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
  padding: 20px;
  border-radius: 22px;
  border: 1px solid rgba(78, 106, 81, 0.1);
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
  padding: 16px 18px;
  border-radius: 18px;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.hero-stat {
  background: rgba(255, 255, 255, 0.72);
}

.hero-stat--accent {
  background: linear-gradient(135deg, rgba(43, 71, 53, 0.92), rgba(80, 120, 93, 0.9));
  color: #fff9f1;
}

.hero-stat--accent span,
.hero-stat--accent strong {
  color: inherit;
}

.hero-stat strong {
  font-size: 1.35rem;
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
  font-size: 2rem;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.goal-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(247, 250, 245, 0.95));
}

.goal-card strong {
  display: block;
  margin-top: 10px;
  color: var(--color-text);
  font-size: 1.8rem;
}

.goal-card small {
  display: block;
  margin-top: 8px;
  line-height: 1.6;
}

.content-grid {
  display: grid;
  grid-template-columns: 0.95fr 1.25fr;
  gap: 18px;
}

.content-stack {
  display: grid;
  gap: 18px;
}

.metrics,
.insights,
.fields {
  display: grid;
  gap: 14px;
}

.metrics {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metrics div,
.insight {
  padding: 18px;
  border-radius: 20px;
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
  margin-top: 10px;
  color: var(--color-text);
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
  gap: 16px;
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
  margin: 8px 0 0;
  line-height: 1.7;
}

.save {
  border: 0;
  border-radius: 16px;
  padding: 12px 18px;
  background: linear-gradient(135deg, #22342a, #42604b);
  color: #fffaf0;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(44, 64, 51, 0.16);
}

.save:disabled {
  opacity: 0.72;
  cursor: wait;
}

.table-shell {
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid rgba(60, 88, 67, 0.1);
  background: rgba(255, 255, 255, 0.72);
}

.archive-table {
  width: 100%;
  border-collapse: collapse;
}

.archive-table thead th {
  padding: 14px 16px;
  text-align: left;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  color: #58705e;
  background: rgba(232, 239, 231, 0.86);
}

.archive-table tbody tr {
  transition: background 180ms ease;
}

.archive-table tbody tr:hover {
  background: rgba(241, 247, 240, 0.88);
}

.archive-table tbody td {
  padding: 16px;
  border-top: 1px solid rgba(85, 105, 89, 0.08);
  vertical-align: top;
  color: var(--color-text);
}

.table-value {
  font-weight: 700;
}

.table-note {
  color: var(--color-text-soft);
  line-height: 1.6;
}

.form-section {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(249, 251, 248, 0.88), rgba(255, 255, 255, 0.96));
  border: 1px solid rgba(78, 101, 84, 0.08);
}

.form-section__head {
  display: grid;
  gap: 6px;
}

.form-section__head h5 {
  font-size: 1rem;
}

.form-section__head p {
  margin: 0;
  line-height: 1.6;
}

.fields--four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.fields--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.fields--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  font-size: 0.92rem;
  font-weight: 600;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(61, 84, 67, 0.14);
  background: rgba(255, 255, 255, 0.98);
  color: var(--color-text);
  outline: none;
  resize: none;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: rgba(68, 108, 78, 0.55);
  box-shadow: 0 0 0 4px rgba(129, 168, 136, 0.14);
  transform: translateY(-1px);
}

.field-card {
  display: grid;
  gap: 6px;
  min-height: 54px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(232, 239, 231, 0.74), rgba(245, 248, 244, 0.96));
  border: 1px solid rgba(61, 84, 67, 0.1);
}

.field-card strong {
  color: var(--color-text);
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
  .content-grid {
    grid-template-columns: 1fr;
  }

  .hero__stats,
  .fields--four,
  .fields--three {
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
  .metrics {
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

  .archive-table {
    min-width: 720px;
  }

  .table-shell {
    overflow-x: auto;
  }
}
</style>
