"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const electron_1 = require("electron");
const index_cjs_1 = require("./db/index.cjs");
const AUTH_WINDOW = {
    width: 1040,
    height: 640
};
const MAIN_WINDOW = {
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760
};
const projectRoot = node_path_1.default.resolve(__dirname, "..", "..", "..", "..");
const rendererUrl = process.env.ELECTRON_RENDERER_URL;
const distIndexPath = node_path_1.default.join(projectRoot, "dist", "index.html");
const preloadPath = node_path_1.default.join(__dirname, "preload.cjs");
let authWindow = null;
let mainWindow = null;
function createAuthWindow() {
    return new electron_1.BrowserWindow({
        show: false,
        width: AUTH_WINDOW.width,
        height: AUTH_WINDOW.height,
        minWidth: AUTH_WINDOW.width,
        minHeight: AUTH_WINDOW.height,
        maxWidth: AUTH_WINDOW.width,
        maxHeight: AUTH_WINDOW.height,
        resizable: false,
        maximizable: false,
        title: "LightBalance 登录",
        backgroundColor: "#f7f3ea",
        titleBarStyle: "hidden",
        titleBarOverlay: {
            color: "#f7f3ea",
            symbolColor: "#233127",
            height: 44
        },
        webPreferences: {
            preload: preloadPath
        }
    });
}
function createMainWindow() {
    return new electron_1.BrowserWindow({
        show: false,
        width: MAIN_WINDOW.width,
        height: MAIN_WINDOW.height,
        minWidth: MAIN_WINDOW.minWidth,
        minHeight: MAIN_WINDOW.minHeight,
        resizable: true,
        maximizable: true,
        minimizable: true,
        title: "LightBalance 轻享健康",
        backgroundColor: "#f3efe6",
        frame: false,
        webPreferences: {
            preload: preloadPath
        }
    });
}
function buildRendererTarget(mode) {
    if (rendererUrl) {
        const url = new URL(rendererUrl);
        url.searchParams.set("window", mode);
        return url.toString();
    }
    if (node_fs_1.default.existsSync(distIndexPath)) {
        const fileUrl = (0, node_url_1.pathToFileURL)(distIndexPath);
        fileUrl.searchParams.set("window", mode);
        return fileUrl.toString();
    }
    return "about:blank";
}
async function loadWindow(window, mode) {
    await window.loadURL(buildRendererTarget(mode));
}
async function openAuthWindow() {
    if (authWindow && !authWindow.isDestroyed()) {
        authWindow.focus();
        return;
    }
    authWindow = createAuthWindow();
    authWindow.once("ready-to-show", () => authWindow?.show());
    await loadWindow(authWindow, "auth");
    if (!authWindow.isDestroyed() && !authWindow.isVisible()) {
        authWindow.show();
    }
    authWindow.on("closed", () => {
        authWindow = null;
    });
}
async function openMainWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return;
    }
    mainWindow = createMainWindow();
    mainWindow.once("ready-to-show", () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return;
        }
        mainWindow.maximize();
        mainWindow.show();
    });
    await loadWindow(mainWindow, "main");
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        mainWindow.maximize();
        mainWindow.show();
    }
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
electron_1.ipcMain.handle("lightbalance:login", async (_event, payload) => {
    return (0, index_cjs_1.loginUser)(payload?.username ?? "", payload?.password ?? "");
});
electron_1.ipcMain.handle("lightbalance:register", async (_event, payload) => {
    return (0, index_cjs_1.registerUser)({
        username: payload?.username ?? "",
        password: payload?.password ?? "",
        email: payload?.email ?? "",
        nickname: payload?.nickname ?? ""
    });
});
electron_1.ipcMain.handle("lightbalance:get-body-profile", async (_event, payload) => {
    return (0, index_cjs_1.getBodyProfile)(Number(payload?.userId));
});
electron_1.ipcMain.handle("lightbalance:get-overview-summary", async (_event, payload) => {
    return (0, index_cjs_1.getOverviewSummary)(Number(payload?.userId));
});
electron_1.ipcMain.handle("lightbalance:get-diet-summary", async (_event, payload) => {
    return (0, index_cjs_1.getDietSummary)(Number(payload?.userId));
});
electron_1.ipcMain.handle("lightbalance:get-exercise-summary", async (_event, payload) => {
    return (0, index_cjs_1.getExerciseSummary)(Number(payload?.userId));
});
electron_1.ipcMain.handle("lightbalance:get-trend-summary", async (_event, payload) => {
    return (0, index_cjs_1.getTrendSummary)(Number(payload?.userId));
});
electron_1.ipcMain.handle("lightbalance:get-assistant-plan", async (_event, payload) => {
    return (0, index_cjs_1.getAssistantPlan)(Number(payload?.userId));
});
electron_1.ipcMain.handle("lightbalance:ask-assistant", async (_event, payload) => {
    return (0, index_cjs_1.askAssistant)(payload ?? {});
});
electron_1.ipcMain.handle("lightbalance:probe-gemini-connection", async () => {
    return (0, index_cjs_1.probeGeminiConnection)();
});
electron_1.ipcMain.handle("lightbalance:add-diet-entry", async (_event, payload) => {
    return (0, index_cjs_1.addDietEntry)(payload ?? {});
});
electron_1.ipcMain.handle("lightbalance:update-diet-entry", async (_event, payload) => {
    return (0, index_cjs_1.updateDietEntry)(payload ?? {});
});
electron_1.ipcMain.handle("lightbalance:delete-diet-entry", async (_event, payload) => {
    return (0, index_cjs_1.deleteDietEntry)(payload ?? {});
});
electron_1.ipcMain.handle("lightbalance:add-water-intake", async (_event, payload) => {
    return (0, index_cjs_1.addWaterIntake)(payload ?? {});
});
electron_1.ipcMain.handle("lightbalance:add-exercise-entry", async (_event, payload) => {
    return (0, index_cjs_1.addExerciseEntry)(payload ?? {});
});
electron_1.ipcMain.handle("lightbalance:update-exercise-entry", async (_event, payload) => {
    return (0, index_cjs_1.updateExerciseEntry)(payload ?? {});
});
electron_1.ipcMain.handle("lightbalance:delete-exercise-entry", async (_event, payload) => {
    return (0, index_cjs_1.deleteExerciseEntry)(payload ?? {});
});
electron_1.ipcMain.handle("lightbalance:update-account-settings", async (_event, payload) => {
    return (0, index_cjs_1.updateAccountSettings)(payload ?? {});
});
electron_1.ipcMain.handle("lightbalance:update-profile", async (_event, payload) => {
    return (0, index_cjs_1.updateBodyProfile)(payload ?? {});
});
electron_1.ipcMain.handle("lightbalance:auth-success", async () => {
    await openMainWindow();
    if (authWindow && !authWindow.isDestroyed()) {
        authWindow.close();
    }
    return true;
});
electron_1.ipcMain.handle("lightbalance:logout", async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
    await openAuthWindow();
    return true;
});
electron_1.ipcMain.handle("lightbalance:window-minimize", (event) => {
    electron_1.BrowserWindow.fromWebContents(event.sender)?.minimize();
    return true;
});
electron_1.ipcMain.handle("lightbalance:window-toggle-maximize", (event) => {
    const currentWindow = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (!currentWindow) {
        return false;
    }
    if (currentWindow.isMaximized()) {
        currentWindow.unmaximize();
    }
    else {
        currentWindow.maximize();
    }
    return true;
});
electron_1.ipcMain.handle("lightbalance:window-close", (event) => {
    electron_1.BrowserWindow.fromWebContents(event.sender)?.close();
    return true;
});
void electron_1.app.whenReady().then(async () => {
    electron_1.Menu.setApplicationMenu(null);
    await (0, index_cjs_1.ensureAnalyticsSchema)();
    await (0, index_cjs_1.migrateLegacyPasswords)();
    await openAuthWindow();
    electron_1.app.on("activate", async () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            await openAuthWindow();
        }
    });
});
electron_1.app.on("window-all-closed", async () => {
    await (0, index_cjs_1.closePool)();
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
