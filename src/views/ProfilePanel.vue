<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type { UserProfileRecord } from "../services/types";

const props = defineProps<{
  username: string;
  nickname: string;
  mode: "profile" | "settings";
  profile: UserProfileRecord | null;
  loading: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{
  saveProfile: [
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
  saveSettings: [
    payload:
      | {
          action: "email";
          email: string;
        }
      | {
          action: "password";
          currentPassword: string;
          newPassword: string;
          confirmPassword: string;
        }
  ];
  close: [];
  logout: [];
}>();

const form = reactive({
  nickname: props.nickname,
  age: 18,
  gender: "未设置",
  heightCm: 170,
  currentWeightKg: 60,
  bodyFatRate: "" as string | number,
  targetWeightKg: 55,
  targetBodyFatRate: "" as string | number,
  weeklyWorkoutTarget: 4,
  dailyCalorieTarget: 1600,
  sleepTargetHours: 7.5,
  workStyle: "久坐办公",
  stressLevel: "中",
  smokingStatus: "从不",
  drinkingFrequency: "几乎不",
  habitSleep: "",
  habitDiet: "",
  habitExercise: ""
});

const settingsForm = reactive({
  email: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

watch(
  () => props.profile,
  (profile) => {
    if (!profile) {
      return;
    }

    form.nickname = profile.nickname;
    form.age = profile.age;
    form.gender = profile.gender;
    form.heightCm = profile.heightCm;
    form.currentWeightKg = profile.currentWeightKg;
    form.bodyFatRate = profile.bodyFatRate ?? "";
    form.targetWeightKg = profile.targetWeightKg;
    form.targetBodyFatRate = profile.targetBodyFatRate ?? "";
    form.weeklyWorkoutTarget = profile.weeklyWorkoutTarget;
    form.dailyCalorieTarget = profile.dailyCalorieTarget;
    form.sleepTargetHours = profile.sleepTargetHours;
    form.workStyle = profile.workStyle || "久坐办公";
    form.stressLevel = profile.stressLevel || "中";
    form.smokingStatus = profile.smokingStatus || "从不";
    form.drinkingFrequency = profile.drinkingFrequency || "几乎不";
    form.habitSleep = profile.habitSleep;
    form.habitDiet = profile.habitDiet;
    form.habitExercise = profile.habitExercise;
    settingsForm.email = profile.email;
  },
  { immediate: true }
);

const title = computed(() => (props.mode === "profile" ? "个人信息" : "偏好设置"));
const description = computed(() =>
  props.mode === "profile"
    ? "编辑个人资料、身体数据、健康目标与生活方式。"
    : "管理账号安全设置，查看账号状态。"
);

const bmiDisplay = computed(() => {
  if (!props.profile?.bmi) return "--";
  return Number(props.profile.bmi).toFixed(1);
});

const bmrDisplay = computed(() => {
  if (!props.profile?.bmr) return "--";
  return `${Math.round(Number(props.profile.bmr))} kcal`;
});

function handleSave() {
  emit("saveProfile", {
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
    workStyle: form.workStyle,
    stressLevel: form.stressLevel,
    smokingStatus: form.smokingStatus,
    drinkingFrequency: form.drinkingFrequency,
    habitSleep: form.habitSleep.trim(),
    habitDiet: form.habitDiet.trim(),
    habitExercise: form.habitExercise.trim()
  });
}

function handleSaveEmail() {
  emit("saveSettings", {
    action: "email",
    email: settingsForm.email.trim()
  });
}

function handleSavePassword() {
  emit("saveSettings", {
    action: "password",
    currentPassword: settingsForm.currentPassword,
    newPassword: settingsForm.newPassword,
    confirmPassword: settingsForm.confirmPassword
  });
}
</script>

<template>
  <section class="profile-panel">
    <div class="profile-panel__header">
      <div>
        <p class="profile-panel__eyebrow">User Center</p>
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>

      <button class="profile-panel__close" type="button" @click="$emit('close')">返回</button>
    </div>

    <div class="profile-grid">
      <article class="identity-card">
        <div class="identity-card__avatar">{{ nickname.slice(0, 1).toUpperCase() }}</div>
        <strong>{{ profile?.nickname ?? nickname }}</strong>
        <span>@{{ username }}</span>
        <small>{{ profile?.email ?? "未绑定邮箱" }}</small>

        <div v-if="mode === 'profile' && profile" class="identity-card__stats">
          <div class="stat-item">
            <span>BMI</span>
            <strong>{{ bmiDisplay }}</strong>
          </div>
          <div class="stat-item">
            <span>BMR</span>
            <strong>{{ bmrDisplay }}</strong>
          </div>
        </div>
      </article>

      <div class="profile-content">
        <template v-if="mode === 'profile'">
          <div v-if="loading" class="profile-loading">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <template v-else>
            <!-- 基本信息 -->
            <article class="section-card">
              <p class="section-card__title">基本信息</p>

              <div class="profile-fields profile-fields--two">
                <label class="profile-field">
                  <span>昵称</span>
                  <input v-model.trim="form.nickname" type="text" placeholder="请输入昵称" />
                </label>

                <label class="profile-field profile-field--readonly">
                  <span>邮箱</span>
                  <input :value="profile?.email ?? ''" type="text" readonly />
                </label>
              </div>

              <div class="profile-fields profile-fields--four">
                <label class="profile-field">
                  <span>年龄</span>
                  <input v-model="form.age" type="number" min="0" />
                </label>

                <label class="profile-field">
                  <span>性别</span>
                  <select v-model="form.gender">
                    <option value="未设置">未设置</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </label>

                <label class="profile-field">
                  <span>身高(cm)</span>
                  <input v-model="form.heightCm" type="number" min="0" step="0.1" />
                </label>

                <label class="profile-field">
                  <span>体重(kg)</span>
                  <input v-model="form.currentWeightKg" type="number" min="0" step="0.1" />
                </label>
              </div>

              <div class="profile-fields profile-fields--three">
                <label class="profile-field">
                  <span>体脂率(%)</span>
                  <input v-model="form.bodyFatRate" type="number" min="0" max="100" step="0.1" placeholder="可选" />
                </label>

                <label class="profile-field profile-field--readonly">
                  <span>BMI</span>
                  <input :value="bmiDisplay" type="text" readonly />
                </label>

                <label class="profile-field profile-field--readonly">
                  <span>BMR</span>
                  <input :value="bmrDisplay" type="text" readonly />
                </label>
              </div>
            </article>

            <!-- 目标设定 -->
            <article class="section-card">
              <p class="section-card__title">目标设定</p>

              <div class="profile-fields profile-fields--three">
                <label class="profile-field">
                  <span>目标体重(kg)</span>
                  <input v-model="form.targetWeightKg" type="number" min="0" step="0.1" />
                </label>

                <label class="profile-field">
                  <span>目标体脂率(%)</span>
                  <input v-model="form.targetBodyFatRate" type="number" min="0" max="100" step="0.1" placeholder="可选" />
                </label>

                <label class="profile-field">
                  <span>每周训练目标(次)</span>
                  <input v-model="form.weeklyWorkoutTarget" type="number" min="0" max="14" />
                </label>
              </div>

              <div class="profile-fields profile-fields--two">
                <label class="profile-field">
                  <span>每日热量目标(kcal)</span>
                  <input v-model="form.dailyCalorieTarget" type="number" min="800" max="5000" step="50" />
                </label>

                <label class="profile-field">
                  <span>睡眠目标(小时)</span>
                  <input v-model="form.sleepTargetHours" type="number" min="4" max="12" step="0.5" />
                </label>
              </div>
            </article>

            <!-- 生活方式 -->
            <article class="section-card">
              <p class="section-card__title">生活方式</p>

              <div class="profile-fields profile-fields--four">
                <label class="profile-field">
                  <span>工作方式</span>
                  <select v-model="form.workStyle">
                    <option value="久坐办公">久坐办公</option>
                    <option value="轻体力">轻体力</option>
                    <option value="重体力">重体力</option>
                    <option value="自由职业">自由职业</option>
                  </select>
                </label>

                <label class="profile-field">
                  <span>压力水平</span>
                  <select v-model="form.stressLevel">
                    <option value="低">低</option>
                    <option value="中">中</option>
                    <option value="高">高</option>
                  </select>
                </label>

                <label class="profile-field">
                  <span>吸烟状态</span>
                  <select v-model="form.smokingStatus">
                    <option value="从不">从不</option>
                    <option value="偶尔">偶尔</option>
                    <option value="经常">经常</option>
                  </select>
                </label>

                <label class="profile-field">
                  <span>饮酒频率</span>
                  <select v-model="form.drinkingFrequency">
                    <option value="几乎不">几乎不</option>
                    <option value="偶尔">偶尔</option>
                    <option value="经常">经常</option>
                  </select>
                </label>
              </div>
            </article>

            <!-- 习惯记录 -->
            <article class="section-card">
              <p class="section-card__title">习惯记录</p>

              <label class="profile-field">
                <span>睡眠习惯</span>
                <textarea v-model.trim="form.habitSleep" rows="2" placeholder="例如：23:30-07:00"></textarea>
              </label>

              <label class="profile-field">
                <span>饮食习惯</span>
                <textarea v-model.trim="form.habitDiet" rows="2" placeholder="例如：三餐规律，偶尔夜宵"></textarea>
              </label>

              <label class="profile-field">
                <span>运动习惯</span>
                <textarea v-model.trim="form.habitExercise" rows="2" placeholder="例如：每周力量训练 3 次"></textarea>
              </label>
            </article>

            <button class="profile-save" type="button" :disabled="saving" @click="handleSave">
              {{ saving ? "保存中..." : "保存全部资料" }}
            </button>
          </template>
        </template>

        <template v-else>
          <!-- 账号信息 -->
          <article class="section-card">
            <p class="section-card__title">账号信息</p>
            <div class="account-info">
              <div class="info-row">
                <span>用户 ID</span>
                <strong>{{ profile?.userId ?? "--" }}</strong>
              </div>
              <div class="info-row">
                <span>用户名</span>
                <strong>@{{ username }}</strong>
              </div>
              <div class="info-row">
                <span>昵称</span>
                <strong>{{ profile?.nickname ?? nickname }}</strong>
              </div>
              <div class="info-row">
                <span>邮箱</span>
                <strong>{{ profile?.email ?? "未绑定" }}</strong>
              </div>
            </div>
          </article>

          <!-- 邮箱修改 -->
          <article class="section-card">
            <p class="section-card__title">修改邮箱</p>
            <div class="profile-fields profile-fields--two">
              <label class="profile-field">
                <span>新邮箱地址</span>
                <input v-model.trim="settingsForm.email" type="email" placeholder="请输入新邮箱" />
              </label>
              <div class="field-action">
                <button class="profile-save" type="button" :disabled="saving" @click="handleSaveEmail">
                  {{ saving ? "保存中..." : "修改邮箱" }}
                </button>
              </div>
            </div>
          </article>

          <!-- 密码修改 -->
          <article class="section-card">
            <p class="section-card__title">修改密码</p>

            <div class="profile-fields profile-fields--three">
              <label class="profile-field">
                <span>当前密码</span>
                <input v-model="settingsForm.currentPassword" type="password" placeholder="输入当前密码" />
              </label>

              <label class="profile-field">
                <span>新密码</span>
                <input v-model="settingsForm.newPassword" type="password" placeholder="输入新密码" />
              </label>

              <label class="profile-field">
                <span>确认新密码</span>
                <input v-model="settingsForm.confirmPassword" type="password" placeholder="再次输入新密码" />
              </label>
            </div>

            <button class="profile-save" type="button" :disabled="saving" @click="handleSavePassword">
              {{ saving ? "保存中..." : "修改密码" }}
            </button>
          </article>

          <button class="profile-logout" type="button" @click="$emit('logout')">退出登录</button>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-panel {
  display: grid;
  gap: 18px;
}

.profile-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 252, 246, 0.92);
  border: 1px solid rgba(57, 87, 63, 0.12);
  box-shadow: 0 16px 40px rgba(30, 44, 37, 0.08);
}

.profile-panel__eyebrow {
  margin: 0 0 8px;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.profile-panel__header h3 {
  margin: 0;
  font-size: 2rem;
  color: var(--color-text);
}

.profile-panel__header p {
  margin: 10px 0 0;
  color: var(--color-text-soft);
}

.profile-panel__close {
  border: 0;
  border-radius: 14px;
  padding: 12px 16px;
  background: rgba(34, 52, 42, 0.08);
  color: #284033;
  font-weight: 700;
  cursor: pointer;
}

.profile-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 18px;
}

.identity-card,
.section-card {
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 252, 246, 0.92);
  border: 1px solid rgba(57, 87, 63, 0.12);
  box-shadow: 0 16px 40px rgba(30, 44, 37, 0.08);
}

.identity-card {
  display: grid;
  gap: 10px;
  align-content: start;
  height: fit-content;
}

.identity-card__avatar {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  background: linear-gradient(135deg, #294033, #4d6b55);
  color: #f8f4ea;
  font-size: 2rem;
  font-weight: 800;
}

.identity-card strong {
  font-size: 1.5rem;
  color: var(--color-text);
}

.identity-card span,
.identity-card small {
  color: var(--color-text-soft);
}

.identity-card__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid rgba(57, 87, 63, 0.1);
}

.stat-item {
  display: grid;
  gap: 4px;
}

.stat-item span {
  font-size: 0.82rem;
  color: var(--color-text-soft);
}

.stat-item strong {
  font-size: 1.2rem;
  color: var(--color-text);
}

.profile-content {
  display: grid;
  gap: 16px;
  align-content: start;
}

.section-card {
  display: grid;
  gap: 16px;
}

.section-card__title {
  margin: 0 0 4px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
}

.profile-fields {
  display: grid;
  gap: 14px;
}

.profile-fields--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-fields--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.profile-fields--four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.profile-field {
  display: grid;
  gap: 8px;
}

.profile-field span {
  color: #506156;
  font-size: 0.92rem;
  font-weight: 600;
}

.profile-field input,
.profile-field select,
.profile-field textarea {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(61, 84, 67, 0.14);
  background: rgba(255, 255, 255, 0.96);
  color: var(--color-text);
  outline: none;
  resize: none;
}

.profile-field--readonly input {
  color: var(--color-text-soft);
  background: rgba(246, 243, 235, 0.9);
}

.field-action {
  display: flex;
  align-items: end;
}

.profile-save,
.profile-logout {
  justify-self: start;
  border: 0;
  border-radius: 16px;
  padding: 14px 18px;
  color: #fffaf0;
  font-weight: 700;
  cursor: pointer;
}

.profile-save {
  background: linear-gradient(135deg, #22342a, #42604b);
}

.profile-save:disabled {
  opacity: 0.72;
  cursor: wait;
}

.profile-logout {
  margin-top: 8px;
  background: linear-gradient(135deg, #6d3d2f, #a14d3b);
}

.account-info {
  display: grid;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(246, 243, 235, 0.5);
}

.info-row span {
  color: var(--color-text-soft);
  font-size: 0.92rem;
}

.info-row strong {
  color: var(--color-text);
}

.profile-loading {
  display: grid;
  gap: 12px;
}

.profile-loading span {
  display: block;
  height: 44px;
  border-radius: 16px;
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

@media (max-width: 1180px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-fields--two,
  .profile-fields--three,
  .profile-fields--four {
    grid-template-columns: 1fr;
  }
}
</style>
