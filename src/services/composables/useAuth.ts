import { computed, ref } from "vue";
import type { SessionUser, UpdateAccountSettingsInput, UpdateProfileInput } from "../types";
import {
  loadProfile as loadProfileRecord,
  login as loginWithBackend,
  register as registerWithBackend,
  updateAccountSettings as updateAccountSettingsWithBackend,
  updateProfile as updateProfileWithBackend
} from "../backend/auth";

const SESSION_KEY = "lightbalance.session";

const currentUser = ref<SessionUser | null>(readSession());

function readSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SessionUser>;

    if (
      typeof parsed.userId !== "number" ||
      typeof parsed.username !== "string" ||
      typeof parsed.nickname !== "string" ||
      typeof parsed.email !== "string"
    ) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return parsed as SessionUser;
  } catch {
    return null;
  }
}

function writeSession(user: SessionUser | null) {
  currentUser.value = user;

  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function syncSessionUser(user: SessionUser) {
  writeSession({
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
    email: user.email
  });
}

export function useAuth() {
  const isLoggedIn = computed(() => currentUser.value !== null);

  async function login(username: string, password: string) {
    const user = await loginWithBackend({
      username: username.trim(),
      password
    });

    syncSessionUser(user);
    return user;
  }

  async function register(username: string, password: string, email: string, nickname: string) {
    const user = await registerWithBackend({
      username: username.trim(),
      password,
      email: email.trim(),
      nickname: nickname.trim()
    });

    syncSessionUser(user);
    return user;
  }

  async function loadProfile() {
    if (!currentUser.value) {
      return null;
    }

    const profile = await loadProfileRecord(currentUser.value.userId);
    syncSessionUser(profile);
    return profile;
  }

  async function updateAccountSettings(input: Omit<UpdateAccountSettingsInput, "userId">) {
    if (!currentUser.value) {
      throw new Error("当前用户未登录");
    }

    const user = await updateAccountSettingsWithBackend({
      userId: currentUser.value.userId,
      ...input
    });

    syncSessionUser(user);
    return user;
  }

  async function updateProfile(input: Omit<UpdateProfileInput, "userId">) {
    if (!currentUser.value) {
      throw new Error("当前用户未登录");
    }

    const profile = await updateProfileWithBackend({
      userId: currentUser.value.userId,
      ...input
    });

    syncSessionUser(profile);
    return profile;
  }

  function logout() {
    writeSession(null);
  }

  return {
    currentUser,
    isLoggedIn,
    loadProfile,
    login,
    logout,
    register,
    updateAccountSettings,
    updateProfile
  };
}
