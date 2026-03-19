"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("lightBalanceBridge", {
    platform: process.platform,
    login(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:login", payload);
    },
    register(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:register", payload);
    },
    getBodyProfile(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:get-body-profile", payload);
    },
    getOverviewSummary(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:get-overview-summary", payload);
    },
    getDietSummary(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:get-diet-summary", payload);
    },
    getExerciseSummary(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:get-exercise-summary", payload);
    },
    getTrendSummary(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:get-trend-summary", payload);
    },
    getAssistantPlan(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:get-assistant-plan", payload);
    },
    askAssistant(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:ask-assistant", payload);
    },
    probeGeminiConnection() {
        return electron_1.ipcRenderer.invoke("lightbalance:probe-gemini-connection");
    },
    addDietEntry(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:add-diet-entry", payload);
    },
    updateDietEntry(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:update-diet-entry", payload);
    },
    deleteDietEntry(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:delete-diet-entry", payload);
    },
    addWaterIntake(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:add-water-intake", payload);
    },
    addExerciseEntry(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:add-exercise-entry", payload);
    },
    updateExerciseEntry(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:update-exercise-entry", payload);
    },
    deleteExerciseEntry(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:delete-exercise-entry", payload);
    },
    updateAccountSettings(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:update-account-settings", payload);
    },
    updateProfile(payload) {
        return electron_1.ipcRenderer.invoke("lightbalance:update-profile", payload);
    },
    notifyAuthSuccess() {
        return electron_1.ipcRenderer.invoke("lightbalance:auth-success");
    },
    requestLogout() {
        return electron_1.ipcRenderer.invoke("lightbalance:logout");
    },
    minimizeWindow() {
        return electron_1.ipcRenderer.invoke("lightbalance:window-minimize");
    },
    toggleMaximizeWindow() {
        return electron_1.ipcRenderer.invoke("lightbalance:window-toggle-maximize");
    },
    closeWindow() {
        return electron_1.ipcRenderer.invoke("lightbalance:window-close");
    }
});
