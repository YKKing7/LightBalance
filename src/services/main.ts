import { createApp } from "vue";
import AppRoot from "../views/AppRoot.vue";

const globalStyle = `
:root {
  font-family: "Microsoft YaHei UI", "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif;
  color: #223127;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.48) 0 1px, transparent 1px 10px),
    linear-gradient(180deg, #f6f2e9 0%, #edf3ed 52%, #f4f6f1 100%);
  color-scheme: light;
  --color-text: #223127;
  --color-text-strong: #15231b;
  --color-text-soft: #66756d;
  --color-text-muted: #8a968f;
  --color-surface: rgba(255, 252, 246, 0.94);
  --color-surface-strong: rgba(255, 255, 255, 0.96);
  --color-surface-soft: rgba(247, 250, 245, 0.78);
  --color-line: rgba(57, 87, 63, 0.12);
  --color-line-strong: rgba(57, 87, 63, 0.18);
  --color-primary: #2f5742;
  --color-primary-soft: #e1eee4;
  --color-primary-strong: #1f3b2d;
  --color-accent: #bc7b3f;
  --color-danger: #9e3f35;
  --shadow-panel: 0 18px 44px rgba(31, 44, 36, 0.08);
  --shadow-raised: 0 12px 28px rgba(31, 44, 36, 0.1);
  --radius-panel: 22px;
  --radius-card: 16px;
  --radius-control: 12px;
  --ease-standard: 180ms ease;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100%;
  margin: 0;
}

body {
  min-height: 100vh;
  color: var(--color-text);
  background: transparent;
  text-rendering: geometricPrecision;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 3px solid rgba(69, 122, 88, 0.2);
  outline-offset: 2px;
}

button:disabled,
input:disabled,
textarea:disabled,
select:disabled {
  cursor: not-allowed;
}

::selection {
  color: #122018;
  background: rgba(188, 123, 63, 0.22);
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background: rgba(74, 102, 84, 0.32);
  background-clip: padding-box;
}

::-webkit-scrollbar-track {
  background: transparent;
}
`;

const styleElement = document.createElement("style");
styleElement.textContent = globalStyle;
document.head.appendChild(styleElement);

createApp(AppRoot).mount("#app");
