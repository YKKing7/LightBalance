export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (err) {
    console.warn(`Failed to parse ${key}`, err);
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
