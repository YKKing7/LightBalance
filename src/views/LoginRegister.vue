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

const COPY = {
  login: {
    eyebrow: "Welcome Back",
    title: "继续管理你的健康节奏",
    description: "登录后查看今日任务、饮食记录、训练计划和长期趋势。",
    submit: "进入健康工作台",
    switchText: "还没有账号？",
    switchAction: "去注册"
  },
  register: {
    eyebrow: "Create Account",
    title: "创建专属健康档案",
    description: "从身体数据、目标设置和生活方式开始，建立可持续的管理基础。",
    submit: "创建档案并进入",
    switchText: "已经有账号了？",
    switchAction: "去登录"
  }
} as const;

const currentCopy = computed(() => COPY[mode.value]);

function switchMode(nextMode: "login" | "register") {
  mode.value = nextMode;
  errorMessage.value = "";
}

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
      throw new Error("桌面窗口桥接未连接，请重启应用后再试。");
    }

    await window.lightBalanceBridge.notifyAuthSuccess();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "提交失败，请稍后重试。";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth-screen">
    <div class="auth-drag" aria-hidden="true"></div>

    <section class="auth-shell">
      <aside class="auth-hero">
        <div class="auth-hero__panel">
          <p class="auth-hero__eyebrow">LightBalance</p>

          <div class="auth-hero__mark">
            <span>LB</span>
          </div>

          <h1>轻享健康</h1>
          <p class="auth-hero__lead">把身体档案、饮食摄入、训练执行与趋势分析收进同一处，让每天的选择更清楚。</p>

          <div class="auth-hero__line"></div>
          <p class="auth-hero__note">个人健康管理平台</p>
        </div>
      </aside>

      <main class="auth-panel">
        <div class="auth-card">
          <header class="auth-card__header">
            <p class="auth-card__eyebrow">{{ currentCopy.eyebrow }}</p>
            <h2>{{ currentCopy.title }}</h2>
            <p>{{ currentCopy.description }}</p>
          </header>

          <div class="auth-tabs" role="tablist" aria-label="登录注册切换">
            <button
              class="auth-tabs__item"
              :class="{ 'auth-tabs__item--active': mode === 'login' }"
              type="button"
              @click="switchMode('login')"
            >
              登录
            </button>
            <button
              class="auth-tabs__item"
              :class="{ 'auth-tabs__item--active': mode === 'register' }"
              type="button"
              @click="switchMode('register')"
            >
              注册
            </button>
          </div>

          <form class="auth-form" @submit.prevent="handleSubmit">
            <label class="auth-field">
              <span class="auth-field__label">账号</span>
              <input
                v-model.trim="form.username"
                type="text"
                autocomplete="username"
                placeholder="请输入用户名或账号"
              />
            </label>

            <div v-if="mode === 'register'" class="auth-form__row">
              <label class="auth-field">
                <span class="auth-field__label">邮箱</span>
                <input
                  v-model.trim="form.email"
                  type="email"
                  autocomplete="email"
                  placeholder="name@example.com"
                />
              </label>

              <label class="auth-field">
                <span class="auth-field__label">昵称</span>
                <input
                  v-model.trim="form.nickname"
                  type="text"
                  autocomplete="nickname"
                  placeholder="例如：小林"
                />
              </label>
            </div>

            <label class="auth-field">
              <span class="auth-field__label">密码</span>
              <input
                v-model="form.password"
                type="password"
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                placeholder="请输入登录密码"
              />
            </label>

            <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

            <button class="auth-submit" type="submit" :disabled="submitting">
              {{ submitting ? "请稍候..." : currentCopy.submit }}
            </button>

            <p class="auth-switch">
              <span>{{ currentCopy.switchText }}</span>
              <button
                class="auth-switch__button"
                type="button"
                @click="switchMode(mode === 'login' ? 'register' : 'login')"
              >
                {{ currentCopy.switchAction }}
              </button>
            </p>
          </form>
        </div>
      </main>
    </section>
  </div>
</template>

<style scoped>
.auth-screen {
  --auth-ink: #223127;
  --auth-ink-soft: #667469;
  --auth-panel: var(--color-surface);
  --auth-panel-strong: var(--color-surface-strong);
  --auth-forest: var(--color-primary-strong);
  --auth-forest-soft: var(--color-primary);
  --auth-line: var(--color-line);
  --auth-shadow: var(--shadow-panel);
  --auth-sans: "Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", sans-serif;
  min-height: calc(100vh - 44px);
  display: grid;
  grid-template-rows: 14px minmax(0, 1fr);
  position: relative;
  overflow: hidden;
  font-family: var(--auth-sans);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0 1px, transparent 1px 12px),
    linear-gradient(135deg, #f7f2e8 0%, #eef4ec 52%, #f7f4ee 100%);
}

.auth-screen::before,
.auth-screen::after {
  content: none;
}

.auth-screen::before {
  top: 76px;
  right: -80px;
  width: 240px;
  height: 240px;
  background: radial-gradient(circle, rgba(232, 214, 184, 0.42), transparent 72%);
  animation: authFloat 12s ease-in-out infinite;
}

.auth-screen::after {
  bottom: -100px;
  left: 42%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(205, 224, 206, 0.36), transparent 74%);
  animation: authFloat 14s ease-in-out infinite reverse;
}

.auth-drag {
  height: 14px;
  -webkit-app-region: drag;
  app-region: drag;
}

.auth-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(360px, 0.95fr) minmax(420px, 1.05fr);
  min-height: 100%;
}

.auth-hero {
  display: grid;
  place-items: center;
  padding: 32px;
}

.auth-hero__panel {
  width: min(360px, 100%);
  padding: 34px 30px;
  border-radius: var(--radius-panel);
  color: #f8f4eb;
  background:
    linear-gradient(155deg, rgba(28, 45, 36, 0.98), rgba(44, 67, 54, 0.96) 60%, rgba(74, 102, 84, 0.92)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
  box-shadow: 0 28px 60px rgba(31, 48, 39, 0.18);
  animation: authRise 720ms ease both;
}

.auth-hero__eyebrow {
  margin: 0;
  color: rgba(248, 233, 201, 0.78);
  font-size: 0.76rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.auth-hero__mark {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  margin-top: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(231, 209, 170, 0.34), rgba(255, 255, 255, 0.1));
  border: 1px solid rgba(244, 227, 193, 0.18);
}

.auth-hero__mark span {
  color: #fff6e6;
  font-size: 1.3rem;
  letter-spacing: 0.08em;
}

.auth-hero h1 {
  margin: 22px 0 12px;
  color: #fff8ec;
  font-size: 2.3rem;
  font-weight: 800;
  line-height: 1.08;
}

.auth-hero__lead {
  margin: 0;
  color: rgba(245, 239, 228, 0.8);
  line-height: 1.9;
}

.auth-hero__line {
  width: 56px;
  height: 1px;
  margin: 28px 0 16px;
  background: rgba(244, 227, 193, 0.34);
}

.auth-hero__note {
  margin: 0;
  color: rgba(245, 239, 228, 0.68);
  letter-spacing: 0.12em;
}

.auth-panel {
  display: grid;
  place-items: center;
  padding: 32px;
}

.auth-card {
  width: min(440px, 100%);
  padding: 32px 30px 28px;
  border-radius: var(--radius-panel);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.4)),
    var(--auth-panel);
  border: 1px solid rgba(97, 118, 99, 0.12);
  box-shadow: var(--auth-shadow);
  backdrop-filter: blur(14px);
  animation: authRise 820ms ease 80ms both;
}

.auth-card__header {
  margin-bottom: 22px;
}

.auth-card__eyebrow {
  margin: 0 0 8px;
  color: #907249;
  font-size: 0.76rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.auth-card__header h2 {
  margin: 0;
  color: var(--auth-ink);
  font-size: 2rem;
  line-height: 1.15;
}

.auth-card__header p {
  margin: 10px 0 0;
  color: var(--auth-ink-soft);
  line-height: 1.72;
}

.auth-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 6px;
  border-radius: var(--radius-card);
  background: rgba(54, 77, 62, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.auth-tabs__item {
  padding: 12px 14px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: #4c5f53;
  font-weight: 700;
  cursor: pointer;
  transition: transform 180ms ease, background 180ms ease, color 180ms ease, box-shadow 180ms ease;
}

.auth-tabs__item:hover {
  transform: translateY(-1px);
}

.auth-tabs__item--active {
  color: #fff8ee;
  background: linear-gradient(135deg, #2a3f33, #4a6754);
  box-shadow: 0 12px 24px rgba(39, 59, 47, 0.18);
}

.auth-form {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.auth-form__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.auth-field {
  display: grid;
  gap: 8px;
}

.auth-field__label {
  color: #4e6156;
  font-size: 0.9rem;
  font-weight: 700;
}

.auth-field input {
  width: 100%;
  padding: 15px 16px;
  border-radius: var(--radius-control);
  border: 1px solid var(--auth-line);
  background: var(--auth-panel-strong);
  color: var(--auth-ink);
  outline: none;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.auth-field input::placeholder {
  color: #9ca79d;
}

.auth-field input:focus {
  border-color: rgba(72, 109, 80, 0.34);
  box-shadow: 0 0 0 4px rgba(129, 166, 133, 0.12);
  transform: translateY(-1px);
}

.auth-error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(196, 70, 53, 0.08);
  border: 1px solid rgba(196, 70, 53, 0.12);
  color: #b34739;
  line-height: 1.6;
}

.auth-submit {
  margin-top: 4px;
  padding: 15px 18px;
  border: 0;
  border-radius: var(--radius-control);
  color: #fff9ef;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  background:
    linear-gradient(135deg, rgba(214, 183, 132, 0.32), rgba(255, 255, 255, 0.04)),
    linear-gradient(135deg, #273b30, #486654);
  box-shadow: 0 16px 30px rgba(39, 60, 47, 0.18);
  transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
}

.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 20px 34px rgba(39, 60, 47, 0.22);
}

.auth-submit:disabled {
  opacity: 0.72;
  cursor: wait;
  box-shadow: none;
}

.auth-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 4px 0 0;
  color: var(--auth-ink-soft);
  font-size: 0.9rem;
}

.auth-switch__button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--auth-forest-soft);
  font-weight: 700;
  cursor: pointer;
}

.auth-switch__button:hover {
  color: var(--auth-forest);
}

@keyframes authRise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes authFloat {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, -14px, 0);
  }
}

@media (max-width: 920px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .auth-hero,
  .auth-panel {
    padding: 24px 20px;
  }
}

@media (max-width: 640px) {
  .auth-card,
  .auth-hero__panel {
    padding: 24px 20px;
    border-radius: 26px;
  }

  .auth-form__row {
    grid-template-columns: 1fr;
  }

  .auth-hero h1 {
    font-size: 2.3rem;
  }
}
</style>
