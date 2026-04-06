const fs = require('fs');

let c = fs.readFileSync('src/services/backend/electron/db/index.cjs', 'utf-8');
c = c.replace('exports.getTrendSummary =', 'exports.updateTrendSleep = exports.getTrendSummary =');
c += '\nObject.defineProperty(exports, "updateTrendSleep", { enumerable: true, get: function () { return require("./trend.cjs").updateTrendSleep; } });\n';
fs.writeFileSync('src/services/backend/electron/db/index.cjs', c);

let mainCjs = fs.readFileSync('src/services/backend/electron/main.cjs', 'utf-8');
mainCjs = mainCjs.replace(
    'electron_1.ipcMain.handle("lightbalance:get-trend-summary",',
    'electron_1.ipcMain.handle("lightbalance:update-trend-sleep", async (_event, payload) => {\n    await require("./db/index.cjs").updateTrendSleep(payload ?? {});\n    return require("./db/index.cjs").getTrendSummary(Number(payload?.userId));\n});\nelectron_1.ipcMain.handle("lightbalance:get-trend-summary",'
);
fs.writeFileSync('src/services/backend/electron/main.cjs', mainCjs);

let bridgeTs = fs.readFileSync('src/services/types.ts', 'utf-8');
bridgeTs = bridgeTs.replace(
    'getTrendSummary?: (payload: UserScopedPayload) => Promise<TrendSummary>;',
    'getTrendSummary?: (payload: UserScopedPayload) => Promise<TrendSummary>;\n  updateTrendSleep?: (payload: import("./types").UpdateTrendSleepRequest) => Promise<TrendSummary>;'
);
bridgeTs = bridgeTs.replace(
    'export interface UpdateExerciseEntryRequest extends UserScopedPayload, UpdateExerciseEntryInput { }',
    'export interface UpdateExerciseEntryRequest extends UserScopedPayload, UpdateExerciseEntryInput { }\n\nexport interface UpdateTrendSleepRequest {\n  recordDate: string;\n  sleepHours: number;\n  userId?: number;\n}'
);
bridgeTs = bridgeTs.replace(
    'updateTrendSleep?: (payload: import("./types").UpdateTrendSleepRequest)',
    'updateTrendSleep?: (payload: UpdateTrendSleepRequest)'
);
fs.writeFileSync('src/services/types.ts', bridgeTs);

let preloadCjs = fs.readFileSync('src/services/backend/electron/preload.cjs', 'utf-8');
preloadCjs = preloadCjs.replace(
    'getTrendSummary: (payload) => electron_1.ipcRenderer.invoke("lightbalance:get-trend-summary", payload),',
    'getTrendSummary: (payload) => electron_1.ipcRenderer.invoke("lightbalance:get-trend-summary", payload),\n        updateTrendSleep: (payload) => electron_1.ipcRenderer.invoke("lightbalance:update-trend-sleep", payload),'
);
fs.writeFileSync('src/services/backend/electron/preload.cjs', preloadCjs);

let frontEndTrend = fs.readFileSync('src/services/backend/trend.ts', 'utf-8');
frontEndTrend = frontEndTrend.replace(
    'export function getTrendSummary(): Promise<TrendSummary>',
    'export async function updateTrendSleep(payload: { recordDate: string, sleepHours: number }): Promise<TrendSummary> {\n  const bridge = getBridge();\n  const userId = readSessionUserId();\n  if (bridge?.updateTrendSleep && userId) {\n    return bridge.updateTrendSleep({ ...payload, userId });\n  }\n  throw new Error("Not implemented");\n}\n\nexport function getTrendSummary(): Promise<TrendSummary>'
);
fs.writeFileSync('src/services/backend/trend.ts', frontEndTrend);

console.log('done all patching!');
