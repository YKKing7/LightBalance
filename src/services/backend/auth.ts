import type { LoginInput, RegisterInput, UpdateAccountSettingsInput, UpdateProfileInput } from "../types";
import { getBridge, requireBridgeMethod } from "./shared/bridge";

export function login(input: LoginInput) {
  const bridge = getBridge();
  const login = requireBridgeMethod(bridge?.login, "当前版本未启用数据库登录");
  return login(input);
}

export function register(input: RegisterInput) {
  const bridge = getBridge();
  const register = requireBridgeMethod(bridge?.register, "当前版本未启用数据库注册");
  return register(input);
}

export function loadProfile(userId: number) {
  const bridge = getBridge();
  const getBodyProfile = requireBridgeMethod(bridge?.getBodyProfile, "桌面桥接未连接，请重启应用后重试");
  return getBodyProfile({ userId });
}

export function updateAccountSettings(input: UpdateAccountSettingsInput) {
  const bridge = getBridge();
  const updateAccountSettings = requireBridgeMethod(bridge?.updateAccountSettings, "当前版本未启用账户设置更新");
  return updateAccountSettings(input);
}

export function updateProfile(input: UpdateProfileInput) {
  const bridge = getBridge();
  const updateProfile = requireBridgeMethod(bridge?.updateProfile, "当前版本未启用个人资料更新");
  return updateProfile(input);
}
