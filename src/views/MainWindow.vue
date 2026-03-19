<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import Assistant from "./Assistant.vue";
import Body from "./Body.vue";
import Overview from "./Overview.vue";
import Diet from "./Diet.vue";
import Exercise from "./Exercise.vue";
import ProfilePanel from "./ProfilePanel.vue";
import Trend from "./Trend.vue";
import { useAuth } from "../services/composables/useAuth";
import { useDesktopApp } from "../services/composables/useDesktopApp";
import type { UserProfileRecord } from "../services/types";

const modules: import("../services/types").ModuleDefinition[] = [
  { key: "overview", label: "观 · 今日概览", description: "看见当下状态与恢复节律" },
  { key: "body", label: "体 · 身体画像", description: "沉淀基础数据与目标轮廓" },
  { key: "diet", label: "饮 · 饮食规划", description: "平衡摄入结构与饮水节奏" },
  { key: "exercise", label: "动 · 训练计划", description: "安排训练任务与消耗反馈" },
  { key: "trend", label: "衡 · 追踪趋势", description: "观察身体指标的长期变化" },
  { key: "assistant", label: "引 · 智能建议", description: "听取适合当下的行动指引" }
];

const { currentUser, loadProfile, logout, updateAccountSettings, updateProfile } = useAuth();

const {
  assistantPlan,
  body,
  currentView,
  overview,
  diet,
  exercise,
  geminiProbeResult,
  handleNavigate,
  loadedModulesCount,
  loading,
  moduleLoading,
  planBusy,
  probeBusy,
  refreshBody,
  refreshOverview,
  refreshAssistantPlan,
  runGeminiProbe,
  totalModules,
  trend
} = useDesktopApp();

const panelView = ref<"profile" | "settings" | null>(null);
const profile = ref<UserProfileRecord | null>(null);
const profileLoading = ref(false);
const profileSaving = ref(false);
const settingsSaving = ref(false);
const shellBodyRef = ref<HTMLElement | null>(null);
const pageScrollPositions = new Map<string, number>();

const nickname = computed(() => currentUser.value?.nickname ?? "鐢ㄦ埛");
const username = computed(() => currentUser.value?.username ?? "guest");
const avatarText = computed(() => nickname.value.slice(0, 1).toUpperCase());
const currentModuleMeta = computed(() => modules.find((item) => item.key === currentView.value) ?? null);
const currentModuleLoading = computed(() => moduleLoading[currentView.value]);
const isAssistantView = computed(() => panelView.value === null && currentView.value === "assistant");
const currentPageKey = computed(() => (panelView.value ? `panel:${panelView.value}` : `module:${currentView.value}`));
const bottomBarTitle = computed(() => {
  if (panelView.value === "profile") return "个人档案";
  if (panelView.value === "settings") return "账户设置";
  return currentModuleMeta.value?.label ?? "LightBalance";
});
const bottomBarMessage = computed(() => {
  if (loading.value) {
    return `正在同步 ${loadedModulesCount.value}/${totalModules} 个模块`;
  }

  return currentModuleMeta.value?.description ?? "让每一次记录都更接近稳定、轻盈的日常。";
});
const todayLabel = computed(() =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date())
);

watch(
  () => currentPageKey.value,
  async (nextKey, previousKey) => {
    if (previousKey && shellBodyRef.value) {
      pageScrollPositions.set(previousKey, shellBodyRef.value.scrollTop);
    }

    await nextTick();
    if (shellBodyRef.value) {
      shellBodyRef.value.scrollTop = pageScrollPositions.get(nextKey) ?? 0;
    }
  }
);

function handleShellBodyScroll() {
  if (!shellBodyRef.value) return;
  pageScrollPositions.set(currentPageKey.value, shellBodyRef.value.scrollTop);
}

async function handleModuleNavigate(view: (typeof currentView.value)) {
  panelView.value = null;
  if (view === "body") {
    await ensureProfileLoaded();
  }
  handleNavigate(view);
}

async function ensureProfileLoaded(force = false) {
  if (!currentUser.value) {
    return;
  }

  if (profile.value && !force) {
    return;
  }

  profileLoading.value = true;

  try {
    profile.value = await loadProfile();
  } finally {
    profileLoading.value = false;
  }
}

async function openProfile() {
  panelView.value = "profile";
  await ensureProfileLoaded();
}

async function openSettings() {
  panelView.value = "settings";
  await ensureProfileLoaded();
}

function closePanel() {
  panelView.value = null;
}

async function handleSaveProfile(payload: {
  nickname: string;
  age: number;
  gender: string;
  heightCm: number;
  currentWeightKg: number;
  bodyFatRate: number | null;
  targetWeightKg?: number;
  targetBodyFatRate?: number | null;
  weeklyWorkoutTarget?: number;
  dailyCalorieTarget?: number;
  sleepTargetHours?: number;
  workStyle?: string;
  stressLevel?: string;
  smokingStatus?: string;
  drinkingFrequency?: string;
  habitSleep: string;
  habitDiet: string;
  habitExercise: string;
}) {
  profileSaving.value = true;

  try {
    profile.value = await updateProfile({
      ...payload,
      targetWeightKg: payload.targetWeightKg ?? profile.value?.targetWeightKg ?? payload.currentWeightKg,
      targetBodyFatRate: payload.targetBodyFatRate ?? profile.value?.targetBodyFatRate ?? null,
      weeklyWorkoutTarget: payload.weeklyWorkoutTarget ?? profile.value?.weeklyWorkoutTarget ?? 4,
      dailyCalorieTarget: payload.dailyCalorieTarget ?? profile.value?.dailyCalorieTarget ?? 1600,
      sleepTargetHours: payload.sleepTargetHours ?? profile.value?.sleepTargetHours ?? 7.5,
      workStyle: payload.workStyle ?? profile.value?.workStyle ?? "",
      stressLevel: payload.stressLevel ?? profile.value?.stressLevel ?? "中",
      smokingStatus: payload.smokingStatus ?? profile.value?.smokingStatus ?? "从不",
      drinkingFrequency: payload.drinkingFrequency ?? profile.value?.drinkingFrequency ?? "几乎不"
    });
    await refreshBody();
    await refreshOverview();
  } finally {
    profileSaving.value = false;
  }
}

async function handleSaveSettings(payload: {
  action: "email" | "password";
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}) {
  settingsSaving.value = true;

  try {
    if (payload.action === "email") {
      await updateAccountSettings({
        email: payload.email ?? "",
        currentPassword: "",
        newPassword: ""
      });
    } else {
      if (payload.newPassword && payload.newPassword !== payload.confirmPassword) {
        throw new Error("两次输入的新密码不一致");
      }

      await updateAccountSettings({
        email: profile.value?.email ?? currentUser.value?.email ?? "",
        currentPassword: payload.currentPassword ?? "",
        newPassword: payload.newPassword ?? ""
      });
    }

    profile.value = await loadProfile();
  } finally {
    settingsSaving.value = false;
  }
}

async function handleLogout() {
  logout();
  await window.lightBalanceBridge?.requestLogout?.();
}

async function handleMinimizeWindow() {
  await window.lightBalanceBridge?.minimizeWindow?.();
}

async function handleToggleMaximizeWindow() {
  await window.lightBalanceBridge?.toggleMaximizeWindow?.();
}

async function handleCloseWindow() {
  await window.lightBalanceBridge?.closeWindow?.();
}
</script>

<template>
  <div class="shell">
    <aside class="shell__sidebar">
      <div class="brand">
        <p class="brand__eyebrow">LightBalance</p>
        <h1>轻享健康</h1>
        <p class="brand__copy">科学减重健康平台</p>
      </div>

      <nav class="nav no-drag">
        <button
          v-for="item in modules"
          :key="item.key"
          class="nav__item"
          :class="{ 'nav__item--active': panelView === null && item.key === currentView }"
          type="button"
          @click="handleModuleNavigate(item.key)"
        >
          <span>{{ item.label }}</span>
          <small>{{ item.description }}</small>
        </button>
      </nav>
    </aside>

    <section class="shell__main">
      <div class="app-titlebar">
        <div class="app-titlebar__left">
          <div class="app-titlebar__mark" aria-hidden="true"></div>
          <span class="app-titlebar__brand">LightBalance</span>
        </div>

        <div class="app-titlebar__right no-drag">
          <button class="user-chip" type="button" @click="openProfile">
            <span class="user-chip__avatar">{{ avatarText }}</span>
            <span class="user-chip__meta">
              <strong>{{ nickname }}</strong>
              <small>@{{ username }}</small>
            </span>
          </button>

          <button class="icon-chip icon-chip--square" type="button" aria-label="璁剧疆" title="璁剧疆" @click="openSettings">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.3 7.3 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96c.24.1.51.01.64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
          </button>

          <div class="window-controls">
            <button class="window-control" type="button" aria-label="最小化" title="最小化" @click="handleMinimizeWindow">
              <span class="window-control__line" aria-hidden="true"></span>
            </button>

            <button class="window-control" type="button" aria-label="最大化或还原" title="最大化或还原" @click="handleToggleMaximizeWindow">
              <span class="window-control__square" aria-hidden="true"></span>
            </button>

            <button
              class="window-control window-control--close"
              type="button"
              aria-label="关闭"
              title="关闭"
              @click="handleCloseWindow"
            >
              <span class="window-control__cross" aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </div>

      <div
        ref="shellBodyRef"
        class="shell__body"
        :class="{ 'shell__body--assistant': isAssistantView }"
        @scroll="handleShellBodyScroll"
      >
        <header class="shell__header">
          <div>
            <h2 v-if="panelView === 'profile'">个人信息与身体档案</h2>
            <h2 v-else-if="panelView === 'settings'">桌面偏好与账户设置</h2>
            <template v-else>
              <h2>{{ nickname }}，从今天的状态出发，走向更轻盈、更稳定的自己！</h2>
            </template>
          </div>

          <div class="status-card no-drag">
            <small class="status-card__message">
              <span v-if="loading" class="status-card__spinner" aria-hidden="true"></span>
              <span v-else class="status-card__check" aria-hidden="true">✓</span>
              <span v-if="loading">同步信息中... {{ loadedModulesCount }}/{{ totalModules }}</span>
              <span v-else>已同步</span>
            </small>
          </div>
        </header>

        <main class="shell__content" :class="{ 'shell__content--assistant': isAssistantView }">
          <ProfilePanel
            v-if="panelView"
            :username="username"
            :nickname="nickname"
            :mode="panelView"
            :profile="profile"
            :loading="profileLoading"
            :saving="panelView === 'profile' ? profileSaving : settingsSaving"
            @close="closePanel"
            @save-profile="handleSaveProfile"
            @save-settings="handleSaveSettings"
            @logout="handleLogout"
          />
          <Overview v-else-if="currentView === 'overview' && overview" :summary="overview" />
          <Body
            v-else-if="currentView === 'body' && body"
            :profile="body"
            :record="profile"
            :loading="profileLoading"
            :saving="profileSaving"
            @save="handleSaveProfile"
          />
          <Diet v-else-if="currentView === 'diet' && diet" :summary="diet" />
          <Exercise v-else-if="currentView === 'exercise' && exercise" :summary="exercise" />
          <Trend v-else-if="currentView === 'trend' && trend" :summary="trend" />
          <Assistant
            v-else-if="currentView === 'assistant' && assistantPlan"
            :plan="assistantPlan"
            :busy="planBusy"
            :probe-busy="probeBusy"
            :probe-result="geminiProbeResult"
            @refresh="refreshAssistantPlan()"
            @ask="refreshAssistantPlan"
            @probe="runGeminiProbe"
          />

          <section v-else class="module-loading">
            <article class="module-loading__hero">
              <p class="module-loading__eyebrow">{{ currentModuleMeta?.label ?? "模块加载中" }}</p>
              <h3>{{ currentModuleLoading ? "模块内容正在同步" : "模块内容暂不可用" }}</h3>
              <p>
                {{ currentModuleLoading
                  ? "主框架和导航已经可以使用，当前模块的数据会在准备完成后自动显示。"
                  : "这部分内容还没有拿到数据，你可以稍后重试或先切换到其他模块。" }}
              </p>
            </article>

            <div class="module-loading__grid" aria-hidden="true">
              <div v-for="item in 4" :key="item" class="module-loading__card">
                <span class="module-loading__line module-loading__line--title"></span>
                <span class="module-loading__line"></span>
                <span class="module-loading__line module-loading__line--short"></span>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer class="bottom-bar no-drag">
        <div class="bottom-bar__section">
          <span class="bottom-bar__label">当前区域</span>
          <strong>{{ bottomBarTitle }}</strong>
        </div>

        <div class="bottom-bar__section bottom-bar__section--status">
          <span class="bottom-bar__signal" :class="{ 'bottom-bar__signal--busy': loading }" aria-hidden="true"></span>
          <span>{{ bottomBarMessage }}</span>
        </div>

        <div class="bottom-bar__section bottom-bar__section--date">
          <span class="bottom-bar__label">今天</span>
          <strong>{{ todayLabel }}</strong>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 248px 1fr;
  height: 100vh;
  overflow: hidden;
}

.shell__sidebar {
  height: 100vh;
  padding: 24px 18px;
  overflow-y: auto;
  font-family: "KaiTi", "STKaiti", "Kaiti SC", serif;
  background:
    radial-gradient(circle at top left, rgba(255, 219, 152, 0.5), transparent 42%),
    linear-gradient(180deg, rgba(35, 48, 40, 0.98), rgba(18, 25, 22, 0.98));
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.brand {
  padding: 20px 18px 22px;
  color: rgba(250, 246, 236, 0.96);
  background:
    repeating-linear-gradient(
      0deg,
      rgba(255, 245, 220, 0.016) 0,
      rgba(255, 245, 220, 0.016) 1px,
      transparent 1px,
      transparent 11px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(78, 60, 32, 0.028) 0,
      rgba(78, 60, 32, 0.028) 2px,
      rgba(255, 255, 255, 0.01) 2px,
      rgba(255, 255, 255, 0.01) 18px
    ),
    radial-gradient(circle at 18% 14%, rgba(214, 178, 103, 0.14), transparent 28%),
    radial-gradient(circle at 82% 88%, rgba(62, 82, 63, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(112, 101, 72, 0.98), rgba(92, 84, 60, 0.98));
  border: 1px solid rgba(225, 200, 146, 0.24);
  border-radius: 28px;
  box-shadow:
    inset 0 1px 0 rgba(255, 244, 214, 0.16),
    inset 0 -10px 20px rgba(48, 41, 28, 0.14),
    0 18px 36px rgba(7, 12, 10, 0.18);
  position: relative;
  overflow: hidden;
}

.brand::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 248, 232, 0.08), transparent 22%),
    radial-gradient(circle at 78% 76%, rgba(40, 34, 21, 0.08), transparent 28%);
  opacity: 0.55;
  pointer-events: none;
}

.brand::after {
  content: "";
  position: absolute;
  inset: 10px;
  border-radius: 20px;
  border: 1px solid rgba(230, 208, 162, 0.2);
  box-shadow: inset 0 0 0 1px rgba(255, 247, 228, 0.03);
  pointer-events: none;
}

.brand h1 {
  margin: 12px 0 10px;
  font-family: "STKaiti", "KaiTi", "Kaiti SC", "Songti SC", serif;
  font-size: 2.34rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.06;
  color: rgba(255, 247, 228, 0.98);
  text-shadow: 0 2px 8px rgba(41, 31, 14, 0.14);
  text-wrap: balance;
  position: relative;
  z-index: 1;
  text-align: center;
}

.brand__eyebrow,
.shell__eyebrow,
.module-loading__eyebrow {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: rgba(243, 220, 176, 0.9);
}

.brand__eyebrow,
.brand__copy {
  position: relative;
  z-index: 1;
}

.brand__eyebrow {
  text-align: center;
}

.brand__copy {
  margin: 0 auto;
  max-width: 10em;
  color: rgba(245, 236, 216, 0.84);
  font-size: 0.92rem;
  line-height: 1.7;
  letter-spacing: 0.08em;
  text-wrap: pretty;
  text-align: center;
}

.nav {
  display: grid;
  gap: 20px;
  margin-top: 18px;
}

.nav__item {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(248, 242, 231, 0.86);
  text-align: center;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.nav__item span,
.nav__item small {
  display: block;
}

.nav__item span {
  font-size: 1.23rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1.18;
}

.nav__item small {
  margin-top: 6px;
  color: rgba(248, 242, 231, 0.62);
  font-size: 0.95rem;
  line-height: 1.4;
  letter-spacing: 0.03em;
}

.nav__item:hover,
.nav__item--active {
  transform: translateX(4px);
  border-color: rgba(255, 214, 135, 0.65);
  background: rgba(255, 214, 135, 0.1);
}

.shell__main {
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr) 26px;
  min-width: 0;
  height: 100vh;
  padding: 0;
  overflow: hidden;
}

.shell__body {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  padding: 10px 0 16px 16px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(83, 108, 91, 0.32) transparent;
}

.shell__body::-webkit-scrollbar {
  width: 9px;
}

.shell__body::-webkit-scrollbar-track {
  background: transparent;
}

.shell__body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  border: 2px solid transparent;
  background: rgba(83, 108, 91, 0.28);
  background-clip: padding-box;
}

.shell__body::-webkit-scrollbar-thumb:hover {
  background: rgba(83, 108, 91, 0.44);
  background-clip: padding-box;
}

.app-titlebar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 8px 20px;
  background: rgba(244, 240, 231, 0.94);
  color: var(--color-text);
  border-bottom: 1px solid rgba(57, 87, 63, 0.12);
  -webkit-app-region: drag;
  app-region: drag;
}

.app-titlebar__left,
.app-titlebar__right {
  display: flex;
  align-items: center;
}

.app-titlebar__left {
  gap: 10px;
}

.app-titlebar__brand {
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #2b3f34;
}

.app-titlebar__right {
  gap: 10px;
  margin-right: 0;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
  padding-left: 10px;
  border-left: 1px solid rgba(57, 87, 63, 0.12);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.window-controls::before {
  content: none;
}

.app-titlebar__mark {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 223, 168, 0.95), transparent 45%),
    linear-gradient(135deg, #37553f, #223127);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.35);
}

.window-control {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #43584d;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}

.window-control:hover {
  background: rgba(53, 93, 62, 0.07);
}

.window-control--close:hover {
  background: rgba(182, 72, 72, 0.1);
  color: #7f3838;
}

.window-control__line {
  width: 12px;
  height: 1.5px;
  border-radius: 999px;
  background: currentColor;
}

.window-control__square {
  width: 11px;
  height: 11px;
  border: 1.6px solid currentColor;
  border-radius: 3px;
}

.window-control__cross {
  position: relative;
  width: 12px;
  height: 12px;
}

.window-control__cross::before,
.window-control__cross::after {
  content: "";
  position: absolute;
  top: 5px;
  left: 0;
  width: 12px;
  height: 1.5px;
  border-radius: 999px;
  background: currentColor;
}

.window-control__cross::before {
  transform: rotate(45deg);
}

.window-control__cross::after {
  transform: rotate(-45deg);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  border: 1px solid rgba(57, 87, 63, 0.1);
  border-radius: 999px;
  padding: 3px 10px 3px 3px;
  background: rgba(255, 252, 246, 0.52);
  color: #2d4336;
  cursor: pointer;
  box-shadow: none;
}

.user-chip__avatar {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #294033, #4d6b55);
  color: #f8f4ea;
  font-weight: 800;
  font-size: 0.9rem;
}

.user-chip__meta {
  display: grid;
  text-align: left;
  line-height: 1;
}

.user-chip__meta strong {
  font-size: 0.84rem;
  line-height: 1.05;
}

.user-chip__meta small {
  margin-top: 2px;
  color: #6b786f;
  font-size: 0.72rem;
  line-height: 1.05;
}

.icon-chip,
.app-titlebar__chip {
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid rgba(57, 87, 63, 0.1);
  border-radius: 999px;
  background: rgba(255, 252, 246, 0.5);
  color: #31473b;
  font-size: 0.78rem;
  font-weight: 600;
  box-shadow: none;
}

.icon-chip {
  cursor: pointer;
}

.icon-chip--square {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  padding: 0;
}

.icon-chip--square svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.app-titlebar__chip--muted {
  background: rgba(255, 247, 226, 0.58);
  color: #6a5734;
  border-color: rgba(168, 142, 79, 0.18);
}

.shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.shell__header h2 {
  margin: 0 0 0;
  padding-left: 8px;
  font-family: "STKaiti", "KaiTi", "Kaiti SC", "Songti SC", serif;
  font-size: 1.68rem;
  font-weight: 700;
  line-height: 1.06;
  letter-spacing: -0.02em;
  color: #5f6f65;
}

.status-card {
  width: fit-content;
  min-width: 0;
  margin-right: 14px;
  padding: 10px 14px;
  background: rgba(255, 250, 242, 0.82);
  border: 1px solid rgba(57, 87, 63, 0.12);
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(30, 44, 37, 0.08);
}

.status-card__message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--color-text-soft);
  font-size: 0.88rem;
  line-height: 1;
  white-space: nowrap;
}

.status-card__spinner {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  border: 2px solid rgba(57, 87, 63, 0.16);
  border-top-color: #3d6a4d;
  border-radius: 999px;
  animation: status-card-spin 0.9s linear infinite;
}

.status-card__check {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: #1f8a4c;
  font-size: 0.95rem;
  font-weight: 800;
}

.shell__content {
  min-height: 0;
  padding-top: 8px;
}

.shell__content--assistant {
  height: 100%;
  overflow: hidden;
}

.shell__body--assistant {
  overflow: hidden;
}

.module-loading {
  display: grid;
  gap: 18px;
}

.module-loading__hero,
.module-loading__card {
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 252, 246, 0.92);
  border: 1px solid rgba(57, 87, 63, 0.12);
  box-shadow: 0 16px 40px rgba(30, 44, 37, 0.08);
}

.module-loading__hero {
  background:
    radial-gradient(circle at right top, rgba(130, 181, 114, 0.16), transparent 34%),
    rgba(255, 252, 246, 0.96);
}

.module-loading__eyebrow {
  color: var(--color-text-soft);
}

.module-loading__hero h3 {
  margin: 10px 0 0;
  font-size: 1.8rem;
  color: var(--color-text);
}

.module-loading__hero p:last-child {
  margin: 12px 0 0;
  max-width: 720px;
  color: var(--color-text-soft);
}

.module-loading__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.module-loading__card {
  display: grid;
  gap: 12px;
}

.module-loading__line {
  display: block;
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(224, 231, 223, 0.9), rgba(242, 245, 241, 0.98), rgba(224, 231, 223, 0.9));
  background-size: 220% 100%;
  animation: shimmer 1.2s linear infinite;
}

.module-loading__line--title {
  width: 56%;
  height: 18px;
}

.module-loading__line--short {
  width: 72%;
}

.bottom-bar {
  display: grid;
  grid-template-columns: minmax(0, 190px) minmax(0, 1fr) minmax(0, 150px);
  align-items: center;
  gap: 6px;
  padding: 0 10px 0 12px;
  background:
    linear-gradient(180deg, rgba(250, 247, 240, 0.94), rgba(241, 238, 229, 0.96)),
    radial-gradient(circle at right center, rgba(130, 181, 114, 0.12), transparent 26%);
  border-top: 1px solid rgba(57, 87, 63, 0.12);
  color: #39503f;
}

.bottom-bar__section {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 0.7rem;
  white-space: nowrap;
}

.bottom-bar__section strong {
  overflow: hidden;
  text-overflow: ellipsis;
}

.bottom-bar__section--status {
  justify-content: center;
  color: #55675c;
}

.bottom-bar__section--date {
  justify-content: flex-end;
}

.bottom-bar__label {
  color: rgba(85, 103, 92, 0.72);
  font-size: 0.58rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.bottom-bar__signal {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: #2b9a56;
  box-shadow: 0 0 0 2px rgba(43, 154, 86, 0.1);
}

.bottom-bar__signal--busy {
  background: #d59b2a;
  box-shadow: 0 0 0 2px rgba(213, 155, 42, 0.1);
  animation: bottom-bar-pulse 1.2s ease-in-out infinite;
}

.no-drag,
.no-drag * {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}


@keyframes shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: -100% 0;
  }
}

@keyframes status-card-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes bottom-bar-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(0.9);
    opacity: 0.7;
  }
}

@media (max-width: 1080px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .shell__main {
    padding: 0;
  }

  .shell__header {
    flex-direction: column;
  }

  .shell__body {
    padding: 12px 0 24px;
  }

  .app-titlebar {
    height: 52px;
    padding: 8px 10px 8px 12px;
  }

  .app-titlebar__right {
    gap: 8px;
    flex-wrap: wrap;
    margin-left: auto;
    margin-right: 0;
  }

  .module-loading__grid {
    grid-template-columns: 1fr;
  }

  .bottom-bar {
    grid-template-columns: 1fr;
    height: auto;
    gap: 3px;
    padding: 6px 10px;
  }

  .bottom-bar__section,
  .bottom-bar__section--status,
  .bottom-bar__section--date {
    justify-content: flex-start;
  }
}
</style>
