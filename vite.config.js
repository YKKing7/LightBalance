import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
export default defineConfig({
    root: "src",
    plugins: [vue()],
    server: {
        host: '127.0.0.1', // 强制 Vite 监听 IPv4 地址，解决与 Electron 的连接问题
        port: 5173,        // 固定端口号
        strictPort: true   // 如果 5173 被占用直接报错，防止自动切换到 5174 导致 Electron 找不到
    }
});
