"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
const projectRoot = node_path_1.default.resolve(__dirname, "..", "..", "..", "..");
const viteCli = node_path_1.default.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
const electronBinary = require("electron");
const vite = (0, node_child_process_1.spawn)(process.execPath, [viteCli], {
    cwd: projectRoot,
    stdio: "inherit"
});
const electronEnv = {
    ...process.env,
    ELECTRON_RENDERER_URL: "http://127.0.0.1:5173"
};
let electron;
let shuttingDown = false;
function shutdown(code = 0) {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;
    if (electron && !electron.killed) {
        electron.kill();
    }
    if (!vite.killed) {
        vite.kill();
    }
    process.exit(code);
}
function startElectron() {
    electron = (0, node_child_process_1.spawn)(electronBinary, ["."], {
        cwd: projectRoot,
        stdio: "inherit",
        env: electronEnv
    });
    electron.on("exit", (code) => {
        shutdown(code ?? 0);
    });
}
vite.on("exit", (code) => {
    if (!shuttingDown) {
        shutdown(code ?? 1);
    }
});
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
setTimeout(startElectron, 3000);
