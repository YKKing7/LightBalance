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
    ? "这里会直接读取并保存 MySQL 中的用户资料与身体信息。"
    : "查看桌面端当前账号的状态，并从这里退出登录。"
);

function handleSave() {
  emit("saveProfile", {
    nickname: form.nickname.trim(),
    age: Number(form.age),
    gender: form.gender.trim(),
    heightCm: Number(form.heightCm),
    currentWeightKg: Number(form.currentWeightKg),
    bodyFatRate: form.bodyFatRate === "" ? null : Number(form.bodyFatRate),
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
      </article>

      <article v-if="mode === 'profile'" class="profile-card">
        <p class="profile-card__eyebrow">资料编辑</p>

        <div v-if="loading" class="profile-loading">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <template v-else>
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
              <input :value="profile?.bmi ?? ''" type="text" readonly />
            </label>

            <label class="profile-field profile-field--readonly">
              <span>BMR</span>
              <input :value="profile?.bmr ?? ''" type="text" readonly />
            </label>
          </div>

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

          <button class="profile-save" type="button" :disabled="saving" @click="handleSave">
            {{ saving ? "保存中..." : "保存资料" }}
          </button>
        </template>
      </article>

      <article v-else class="profile-card">
        <p class="profile-card__eyebrow">界面设置</p>
        <ul class="settings-list">
          <li>主界面支持固定顶部栏与左侧导航，内容区独立滚动。</li>
          <li>登录成功后主窗口会默认最大化显示。</li>
          <li>账号资料、昵称与健康档案均直接保存到 MySQL。</li>
        </ul>

        <div class="settings-block">
          <label class="profile-field">
            <span>邮箱</span>
            <input v-model.trim="settingsForm.email" type="email" placeholder="请输入新邮箱" />
          </label>

          <button class="profile-save" type="button" :disabled="saving" @click="handleSaveEmail">
            {{ saving ? "保存中..." : "修改邮箱" }}
          </button>
        </div>

        <div class="settings-block">
          <label class="profile-field">
            <span>当前密码</span>
            <input v-model="settingsForm.currentPassword" type="password" placeholder="修改密码时填写" />
          </label>

          <label class="profile-field">
            <span>新密码</span>
            <input v-model="settingsForm.newPassword" type="password" placeholder="留空则不修改密码" />
          </label>

          <label class="profile-field">
            <span>确认新密码</span>
            <input v-model="settingsForm.confirmPassword" type="password" placeholder="再次输入新密码" />
          </label>

          <button class="profile-save" type="button" :disabled="saving" @click="handleSavePassword">
            {{ saving ? "保存中..." : "修改密码" }}
          </button>
        </div>

        <button class="profile-logout" type="button" @click="$emit('logout')">退出登录</button>
      </article>
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

.profile-panel__eyebrow,
.profile-card__eyebrow {
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
.profile-card {
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

.profile-card {
  display: grid;
  gap: 16px;
}

.settings-block {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(246, 243, 235, 0.68);
  border: 1px solid rgba(57, 87, 63, 0.08);
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

.settings-list {
  margin: 0;
  padding-left: 18px;
  color: var(--color-text-soft);
}

.settings-list li + li {
  margin-top: 10px;
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
  .profile-grid,
  .profile-fields--two,
  .profile-fields--three,
  .profile-fields--four {
    grid-template-columns: 1fr;
  }
}
</style>
