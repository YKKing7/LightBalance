<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useAuth } from "../services/composables/useAuth";

const { login, register } = useAuth();

const mode = ref<"login" | "register">("login");
const submitting = ref(false);
const errorMessage = ref("");

const form = reactive({
  username: "admin",
  password: "123456",
  email: "",
  nickname: ""
});

const submitText = computed(() => (mode.value === "login" ? "登录" : "注册并进入"));
const modeTitle = computed(() => (mode.value === "login" ? "欢迎回来" : "创建你的账号"));
const modeDescription = computed(() =>
  mode.value === "login"
    ? "输入账号和密码，继续进入你的桌面健康工作台。"
    : "补充账号、邮箱和密码，马上开始使用 LightBalance。"
);

async function handleSubmit() {
  errorMessage.value = "";
  submitting.value = true;

  try {
    if (mode.value === "login") {
      await login(form.username, form.password);
    } else {
      await register(form.username, form.password, form.email, form.nickname);
    }

    if (!window.lightBalanceBridge?.notifyAuthSuccess) {
      throw new Error("桌面窗口桥接未连接，请重启应用后重试");
    }

    await window.lightBalanceBridge.notifyAuthSuccess();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "提交失败，请稍后重试";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth-screen">
    <div class="auth-drag" aria-hidden="true"></div>

    <section class="auth-shell">
      <aside class="auth-brand">
        <div class="auth-brand__content">
          <p class="auth-brand__eyebrow">LightBalance</p>
          <h1>轻享健康</h1>
          <p class="auth-brand__copy">把评估、饮食、训练、追踪和提醒整合到一个更顺手的桌面工作台里。</p>

          <div class="auth-brand__chips">
            <span>评估建档</span>
            <span>训练计划</span>
            <span>数据追踪</span>
          </div>
        </div>

        <div class="auth-brand__panel">
          <strong>测试账号</strong>
          <p>账号：admin</p>
          <p>密码：123456</p>
        </div>
      </aside>

      <main class="auth-panel">
        <div class="auth-panel__box">
          <header class="auth-panel__header">
            <p class="auth-panel__eyebrow">{{ mode === "login" ? "登录" : "注册" }}</p>
            <h2>{{ modeTitle }}</h2>
            <p>{{ modeDescription }}</p>
          </header>

          <div class="auth-tabs">
            <button
              class="auth-tabs__item"
              :class="{ 'auth-tabs__item--active': mode === 'login' }"
              type="button"
              @click="mode = 'login'"
            >
              登录
            </button>
            <button
              class="auth-tabs__item"
              :class="{ 'auth-tabs__item--active': mode === 'register' }"
              type="button"
              @click="mode = 'register'"
            >
              注册
            </button>
          </div>

          <form class="auth-form" @submit.prevent="handleSubmit">
            <label class="auth-field">
              <span>账号</span>
              <input v-model.trim="form.username" type="text" autocomplete="username" placeholder="请输入账号" />
            </label>

            <label v-if="mode === 'register'" class="auth-field">
              <span>邮箱</span>
              <input v-model.trim="form.email" type="email" autocomplete="email" placeholder="请输入邮箱" />
            </label>

            <label v-if="mode === 'register'" class="auth-field">
              <span>昵称</span>
              <input v-model.trim="form.nickname" type="text" autocomplete="nickname" placeholder="请输入昵称，可选" />
            </label>

            <label class="auth-field">
              <span>密码</span>
              <input
                v-model="form.password"
                type="password"
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                placeholder="请输入密码"
              />
            </label>

            <div class="auth-meta">
              <span>{{ mode === "login" ? "登录将直接校验 MySQL 用户数据" : "注册成功后会立即写入数据库并进入主界面" }}</span>
            </div>

            <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

            <button class="auth-submit" type="submit" :disabled="submitting">
              {{ submitting ? "请稍候..." : submitText }}
            </button>
          </form>
        </div>
      </main>
    </section>
  </div>
</template>

<style scoped>
.auth-screen {
  min-height: calc(100vh - 44px);
  display: grid;
  grid-template-rows: 14px 1fr;
  background:
    radial-gradient(circle at top left, rgba(255, 223, 170, 0.22), transparent 22%),
    linear-gradient(180deg, #f7f3ea, #eff4ed 88%);
  overflow: hidden;
}

.auth-drag {
  -webkit-app-region: drag;
  app-region: drag;
}

.auth-shell {
  display: grid;
  grid-template-columns: minmax(380px, 1.04fr) minmax(420px, 0.96fr);
  min-height: 100%;
}

.auth-brand {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  padding: 48px 44px 40px;
  color: #f8f4ea;
  background:
    radial-gradient(circle at top left, rgba(255, 221, 167, 0.4), transparent 28%),
    linear-gradient(155deg, #1f3128, #2d493d 58%, #486955);
  overflow: hidden;
}

.auth-brand::after {
  content: "";
  position: absolute;
  inset: auto -72px -92px auto;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 236, 199, 0.22), transparent 64%);
}

.auth-brand__content {
  position: relative;
  z-index: 1;
}

.auth-brand__eyebrow {
  margin: 0;
  font-size: 0.76rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(255, 232, 191, 0.82);
}

.auth-brand h1 {
  margin: 24px 0 16px;
  font-size: 4.3rem;
  line-height: 0.95;
}

.auth-brand__copy {
  max-width: 360px;
  margin: 0;
  line-height: 1.8;
  color: rgba(246, 241, 231, 0.84);
}

.auth-brand__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 30px;
}

.auth-brand__chips span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(249, 245, 236, 0.9);
  font-size: 0.84rem;
  font-weight: 700;
}

.auth-brand__panel {
  position: relative;
  z-index: 1;
  width: min(320px, 100%);
  padding: 20px 20px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
}

.auth-brand__panel strong,
.auth-brand__panel p {
  display: block;
}

.auth-brand__panel strong {
  margin-bottom: 8px;
}

.auth-brand__panel p {
  margin: 0;
  color: rgba(246, 241, 231, 0.82);
  line-height: 1.6;
}

.auth-panel {
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgba(252, 249, 242, 0.94);
}

.auth-panel__box {
  width: min(430px, 100%);
}

.auth-panel__header {
  margin-bottom: 22px;
}

.auth-panel__eyebrow {
  margin: 0 0 6px;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #7a867d;
}

.auth-panel__header h2 {
  margin: 0;
  font-size: 2.2rem;
  color: #223127;
}

.auth-panel__header p {
  margin: 10px 0 0;
  max-width: 360px;
  line-height: 1.65;
  color: #66756b;
}

.auth-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 6px;
  border-radius: 18px;
  background: rgba(42, 63, 49, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.auth-tabs__item {
  padding: 12px 14px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #4a5d51;
  font-weight: 700;
  cursor: pointer;
  transition: background 180ms ease, color 180ms ease, transform 180ms ease;
}

.auth-tabs__item:hover {
  transform: translateY(-1px);
}

.auth-tabs__item--active {
  background: linear-gradient(135deg, #294033, #3f5f4b);
  color: #f8f4ea;
  box-shadow: 0 10px 24px rgba(35, 54, 43, 0.16);
}

.auth-form {
  display: grid;
  gap: 16px;
  margin-top: 24px;
}

.auth-field {
  display: grid;
  gap: 8px;
}

.auth-field span {
  color: #506156;
  font-size: 0.92rem;
  font-weight: 600;
}

.auth-field input {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(61, 84, 67, 0.14);
  background: rgba(255, 255, 255, 0.96);
  color: #223127;
  outline: none;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.auth-field input::placeholder {
  color: #9aa69d;
}

.auth-field input:focus {
  border-color: rgba(57, 98, 68, 0.36);
  box-shadow: 0 0 0 4px rgba(98, 141, 108, 0.12);
  transform: translateY(-1px);
}

.auth-meta {
  color: #718177;
  font-size: 0.86rem;
}

.auth-error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(193, 63, 45, 0.08);
  color: #b43b2d;
  font-size: 0.92rem;
}

.auth-submit {
  margin-top: 4px;
  padding: 16px 18px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, #22342a, #42604b);
  color: #fffaf0;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(39, 64, 49, 0.18);
  transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
}

.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 34px rgba(39, 64, 49, 0.22);
}

.auth-submit:disabled {
  opacity: 0.72;
  cursor: wait;
  box-shadow: none;
}

@media (max-width: 820px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .auth-brand {
    gap: 24px;
    padding: 28px 24px 24px;
  }

  .auth-brand h1 {
    font-size: 3rem;
  }

  .auth-panel {
    padding: 24px 22px 22px;
  }

  .auth-panel__box {
    width: 100%;
  }
}
</style>
