import { createApp } from "vue";
import AppRoot from "../views/AppRoot.vue";

const globalStyle = `
:root {
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #233127;
  background:
    radial-gradient(circle at top left, rgba(255, 223, 168, 0.7), transparent 28%),
    linear-gradient(180deg, #f3efe6, #e7efe7 55%, #eef5ef);
  color-scheme: light;
  --color-text: #233127;
  --color-text-soft: #647068;
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
}

button,
input,
textarea,
select {
  font: inherit;
}
`;

const styleElement = document.createElement("style");
styleElement.textContent = globalStyle;
document.head.appendChild(styleElement);

createApp(AppRoot).mount("#app");
