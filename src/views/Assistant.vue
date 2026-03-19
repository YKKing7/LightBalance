<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { AskAssistantInput, AssistantModalityIdea, AssistantPlan, GeminiProbeResult } from "../services/types";

const props = defineProps<{
  plan: AssistantPlan;
  busy: boolean;
  probeBusy: boolean;
  probeResult: GeminiProbeResult | null;
}>();

const emit = defineEmits<{
  refresh: [];
  ask: [payload: AskAssistantInput];
  probe: [];
}>();

const question = ref("");
const conversationRef = ref<HTMLElement | null>(null);
const pendingQuestion = ref("");
const pendingCreatedAt = ref("");

const displayedConversation = computed(() => {
  const items = props.plan.conversation.map((item) => ({
    ...item,
    content: String(item.content ?? "").replace(/\*/g, "")
  }));

  if (pendingQuestion.value) {
    items.push({
      id: -1,
      role: "user" as const,
      content: pendingQuestion.value,
      tag: "刚刚发送",
      createdAt: pendingCreatedAt.value || new Date().toISOString()
    });
  }

  if (props.busy && pendingQuestion.value) {
    items.push({
      id: -2,
      role: "assistant" as const,
      content: "模型正在思考，请稍等...",
      tag: "思考中",
      createdAt: new Date().toISOString()
    });
  }

  return items;
});

watch(
  () => displayedConversation.value.length,
  async () => {
    await nextTick();
    if (conversationRef.value) {
      conversationRef.value.scrollTop = conversationRef.value.scrollHeight;
    }
  }
);

watch(
  () => props.busy,
  (value) => {
    if (!value) {
      pendingQuestion.value = "";
      pendingCreatedAt.value = "";
    }
  }
);

onMounted(async () => {
  await nextTick();
  if (conversationRef.value) {
    conversationRef.value.scrollTop = conversationRef.value.scrollHeight;
  }
});

const agentName = computed(() => props.plan.agentName || "Astra");
const modelLabel = computed(() => props.plan.modelLabel || "[L]gemini-2.5-flash");

const subtitleLabel = computed(() => {
  if (props.probeBusy) return "正在检测 Gemini 连通状态";
  return "在线健康助理";
});

const probeResultLabel = computed(() => {
  if (props.probeBusy) return "Gemini 检测中";
  if (!props.probeResult) return "";
  return props.probeResult.ok ? "Gemini 验证成功" : "Gemini 验证失败";
});

const modalityIdeas = computed<AssistantModalityIdea[]>(() =>
  props.plan.modalityIdeas?.length
    ? props.plan.modalityIdeas
    : [
        {
          title: "餐盘照片",
          detail: "上传餐盘图片，帮助判断热量和结构。",
          prompt: "我准备发一张餐盘照片，你希望我怎么拍？",
          inputType: "meal_photo",
          why: "适合快速分析进食结构。",
          captureTips: ["从正上方拍摄", "带上饮料", "尽量在开吃前拍"]
        },
        {
          title: "体态记录",
          detail: "固定角度拍摄，便于观察变化。",
          prompt: "如果我想用体态照追踪变化，你建议我怎么拍？",
          inputType: "body_photo",
          why: "适合观察平台期变化。",
          captureTips: ["固定角度", "固定光线", "按周记录"]
        },
        {
          title: "睡眠截图",
          detail: "补充睡眠数据，帮助判断恢复节奏。",
          prompt: "我可以给你睡眠截图，你会重点看哪些数据？",
          inputType: "sleep_screenshot",
          why: "适合解释疲劳和状态波动。",
          captureTips: ["带总时长", "带清醒次数", "补充入睡时间"]
        }
      ]
);

const suggestedPrompts = computed(() => {
  const merged = [...(props.plan.quickQuestions ?? []), ...modalityIdeas.value.map((item) => item.prompt)];
  return merged.filter((item, index) => Boolean(item) && merged.indexOf(item) === index);
});

function submitQuestion() {
  const content = question.value.trim();
  if (!content || props.busy) return;
  pendingQuestion.value = content;
  pendingCreatedAt.value = new Date().toISOString();
  emit("ask", { question: content });
  question.value = "";
}

function useQuickQuestion(content: string) {
  question.value = content;
  submitQuestion();
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function runProbe() {
  if (!props.probeBusy) emit("probe");
}
</script>

<template>
  <section class="assistant-chat">
    <article class="assistant-chat__shell">
      <header class="assistant-chat__header">
        <div class="assistant-chat__identity">
          <div class="assistant-chat__avatar">{{ agentName.slice(0, 1).toUpperCase() }}</div>
          <div class="assistant-chat__title">
            <h2>{{ agentName }}</h2>
            <p>{{ subtitleLabel }}</p>
          </div>
        </div>

        <div class="assistant-chat__tools">
          <span class="assistant-chat__model">{{ modelLabel }}</span>
          <span v-if="probeResultLabel" class="assistant-chat__probe-result">{{ probeResultLabel }}</span>
          <button type="button" class="tool-button tool-button--accent" :disabled="probeBusy" @click="runProbe">
            {{ probeBusy ? "检测中..." : "验证 Gemini" }}
          </button>
        </div>
      </header>

      <div class="assistant-chat__stream-shell">
        <div ref="conversationRef" class="assistant-chat__stream">
          <article
            v-for="item in displayedConversation"
            :key="item.id"
            class="chat-bubble"
            :class="{ 'chat-bubble--user': item.role === 'user', 'chat-bubble--assistant': item.role === 'assistant' }"
          >
            <div class="chat-bubble__meta">
              <strong>{{ item.role === "user" ? "你" : agentName }}</strong>
              <span>{{ item.tag }}</span>
              <small>{{ formatTime(item.createdAt) }}</small>
            </div>
            <p>{{ item.content }}</p>
          </article>
        </div>
      </div>

      <footer class="assistant-chat__composer">
        <div class="assistant-chat__suggestions">
          <button
            v-for="item in suggestedPrompts"
            :key="item"
            type="button"
            class="suggestion-chip"
            :disabled="busy"
            @click="useQuickQuestion(item)"
          >
            {{ item }}
          </button>
        </div>

        <div class="assistant-chat__inputbox">
          <label class="message-entry">
            <textarea
              v-model="question"
              :disabled="busy"
              placeholder="告诉我你今天的饮食、训练或状态变化，我会结合健康管理目标给你建议。"
            ></textarea>
          </label>

          <button type="button" class="send-button" :disabled="busy || !question.trim()" @click="submitQuestion">
            发送
          </button>
        </div>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.assistant-chat {
  --bg: linear-gradient(180deg, rgba(247, 243, 236, 0.96), rgba(240, 236, 227, 0.98));
  --surface: rgba(255, 252, 247, 0.9);
  --surface-strong: rgba(255, 255, 255, 0.97);
  --line: rgba(36, 58, 57, 0.12);
  --line-strong: rgba(36, 58, 57, 0.18);
  --text: #203133;
  --text-soft: #687876;
  --deep: #173b40;
  --mint: #dcefe2;
  --gold: #f3e4c7;
  display: grid;
  height: 100%;
  min-height: 0;
  padding-right: 18px;
}

.assistant-chat__shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 26px;
  background:
    radial-gradient(circle at top left, rgba(220, 178, 99, 0.16), transparent 28%),
    radial-gradient(circle at top right, rgba(118, 164, 150, 0.12), transparent 24%),
    var(--bg);
  box-shadow: 0 24px 60px rgba(21, 32, 34, 0.08);
}

.assistant-chat__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 252, 247, 0.74);
  backdrop-filter: blur(14px);
}

.assistant-chat__identity,
.assistant-chat__tools {
  display: flex;
  gap: 12px;
  align-items: center;
}

.assistant-chat__identity {
  min-width: 0;
}

.assistant-chat__avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: linear-gradient(145deg, #173b40, #4f7f78);
  color: #fffaf1;
  font-weight: 800;
  font-size: 1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.assistant-chat__title h2,
.chat-bubble__meta strong {
  margin: 0;
  color: var(--text);
}

.assistant-chat__title h2 {
  font-size: 1.08rem;
  line-height: 1.15;
}

.assistant-chat__title p,
.chat-bubble__meta span,
.chat-bubble__meta small {
  margin: 0;
  color: var(--text-soft);
}

.assistant-chat__title p {
  margin-top: 3px;
  font-size: 0.84rem;
}

.assistant-chat__tools {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.assistant-chat__model,
.assistant-chat__probe-result {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--text-soft);
  font-size: 0.82rem;
  font-weight: 700;
}

.assistant-chat__model {
  color: var(--deep);
  background: rgba(255, 255, 255, 0.9);
  font-size: 0.84rem;
}

.tool-button,
.send-button,
.suggestion-chip {
  border: 0;
  font: inherit;
}

.tool-button {
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(29, 59, 64, 0.08);
  color: #294147;
  cursor: pointer;
  font-weight: 700;
}

.tool-button--accent {
  background: var(--gold);
  color: #7a5321;
}

.assistant-chat__stream-shell {
  min-height: 0;
  padding: 0;
}

.assistant-chat__stream {
  display: grid;
  align-content: start;
  gap: 12px;
  height: 100%;
  min-height: 0;
  padding: 14px 14px 16px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.2);
}

.chat-bubble {
  display: grid;
  gap: 7px;
  max-width: min(720px, 92%);
  padding: 13px 15px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 12px 26px rgba(20, 30, 34, 0.05);
}

.chat-bubble--assistant {
  justify-self: start;
  border-top-left-radius: 10px;
}

.chat-bubble--user {
  justify-self: end;
  border-top-right-radius: 10px;
  background: linear-gradient(180deg, rgba(221, 239, 230, 0.96), rgba(211, 233, 223, 0.96));
}

.chat-bubble__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.chat-bubble p {
  margin: 0;
  color: var(--text);
  font-size: 0.95rem;
  line-height: 1.64;
  white-space: pre-wrap;
}

.assistant-chat__composer {
  display: grid;
  gap: 6px;
  padding: 8px 10px 10px;
  border-top: 1px solid var(--line);
  background: rgba(250, 247, 241, 0.9);
  backdrop-filter: blur(18px);
}

.assistant-chat__suggestions {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  overflow: hidden;
}

.suggestion-chip {
  flex: 0 0 auto;
  padding: 7px 11px;
  border-radius: 999px;
  background: var(--mint);
  color: var(--deep);
  cursor: pointer;
  font-weight: 700;
  font-size: 0.84rem;
  white-space: nowrap;
}

.suggestion-chip:last-child {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assistant-chat__inputbox {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 14px;
  background: var(--surface-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.message-entry textarea {
  width: 100%;
  min-height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.96rem;
  line-height: 1.4;
  resize: none;
}

.message-entry textarea:focus {
  outline: none;
}

.send-button {
  min-width: 82px;
  align-self: stretch;
  padding: 7px 12px;
  border-radius: 10px;
  background: linear-gradient(145deg, #173b40, #5a8c84);
  color: #fffaf1;
  cursor: pointer;
  font-weight: 800;
  font-size: 0.9rem;
}

.tool-button:disabled,
.send-button:disabled,
.suggestion-chip:disabled {
  cursor: wait;
  opacity: 0.72;
}

@media (max-width: 1024px) {
  .assistant-chat__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .assistant-chat__tools {
    justify-content: flex-start;
  }

  .assistant-chat__inputbox {
    grid-template-columns: 1fr;
  }

  .send-button {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .assistant-chat {
    padding-right: 0;
  }

  .assistant-chat__shell {
    height: 100%;
    min-height: 0;
    border-radius: 20px;
  }

  .assistant-chat__header,
  .assistant-chat__stream-shell,
  .assistant-chat__composer {
    padding-left: 12px;
    padding-right: 12px;
  }

  .assistant-chat__header,
  .assistant-chat__identity,
  .assistant-chat__tools {
    align-items: flex-start;
    flex-direction: column;
  }

  .assistant-chat__title h2 {
    font-size: 1.15rem;
  }

  .assistant-chat__inputbox {
    padding: 6px 8px;
  }

  .message-entry textarea {
    min-height: 22px;
  }
}
</style>
