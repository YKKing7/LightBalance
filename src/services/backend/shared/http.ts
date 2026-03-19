const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080/api";
const SESSION_KEY = "lightbalance.session";

export interface HttpRequestOptions extends RequestInit {
  baseURL?: string;
}

interface SessionPayload {
  userId?: number;
}

function buildRequestPath(path: string, baseURL?: string) {
  return baseURL ? `${baseURL}${path}` : path;
}

function withDefaultHeaders(init: HttpRequestOptions = {}): HttpRequestOptions {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return { ...init, headers };
}

export async function http<T>(path: string, init: HttpRequestOptions = {}): Promise<T> {
  const response = await fetch(buildRequestPath(path, init.baseURL), withDefaultHeaders(init));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return http<T>(path, {
    baseURL: API_BASE,
    ...init
  });
}

export function readSessionUserId() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SessionPayload;
    return typeof parsed.userId === "number" ? parsed.userId : null;
  } catch {
    return null;
  }
}
