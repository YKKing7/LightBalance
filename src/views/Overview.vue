<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { addWaterIntake } from "../services/backend/diet";
import { useToast } from "../services/composables/useToast";
import type { OverviewSummary, Tone } from "../services/types";
import { formatDateTime, todayDateString } from "../services/utils/format";
import { readJson, writeJson } from "../services/utils/storage";

const props = defineProps<{
  summary: OverviewSummary;
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
  (e: "navigate", target: import("../services/types").ModuleKey): void;
}>();

type KanbanColumnKey = "todo" | "doing" | "done";

interface KanbanCard {
  uid: string;
  title: string;
  detail: string;
  meta: string;
  tone: Tone;
  period: string;
  tag: string;
  action?: string;
  finished: boolean;
}

interface KanbanBoardState {
  todo: KanbanCard[];
  doing: KanbanCard[];
  done: KanbanCard[];
}

const updatedAtLabel = computed(() => {
  if (!props.summary.profileUpdatedAt) {
    return "尚未同步";
  }

  return formatDateTime(props.summary.profileUpdatedAt, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
});

const workloadPeak = computed(() => {
  return Math.max(...props.summary.weeklyLoad.map((item) => item.durationMinutes), 1);
});

function progressWidth(progress: number) {
  return `${Math.max(8, Math.min(progress, 100))}%`;
}

const currentHour = ref(new Date().getHours());

const timeContext = computed(() => {
  const hour = currentHour.value;
  if (hour >= 5 && hour < 10) {
    return { label: "清晨", greeting: "早上好", periodHints: ["清晨", "早", "早餐", "上午"] };
  }
  if (hour >= 10 && hour < 14) {
    return { label: "午间", greeting: "中午好", periodHints: ["午", "中午", "午餐"] };
  }
  if (hour >= 14 && hour < 18) {
    return { label: "下午", greeting: "下午好", periodHints: ["下午", "傍晚"] };
  }
  if (hour >= 18 && hour < 23) {
    return { label: "晚间", greeting: "晚上好", periodHints: ["晚", "夜", "晚餐"] };
  }
  return { label: "深夜", greeting: "夜深了", periodHints: ["夜", "晚"] };
});

const dynamicGreeting = computed(() => `${timeContext.value.greeting}，${props.summary.momentumLabel}`);

const contextualHeadline = computed(() => {
  return `${timeContext.value.label}先处理高优先级任务，让饮食、训练和恢复都跟上节奏。`;
});

const todoCards = ref<KanbanCard[]>([]);
const doingCards = ref<KanbanCard[]>([]);
const doneCards = ref<KanbanCard[]>([]);

const draggingCard = ref<{ uid: string; from: KanbanColumnKey } | null>(null);
const dragOverColumn = ref<KanbanColumnKey | null>(null);
const dragOverCardUid = ref<string | null>(null);
const dragOverPlacement = ref<"before" | "after" | null>(null);

const priorityTodoCount = computed(() => {
  const hints = timeContext.value.periodHints;
  return todoCards.value.filter((item) => hints.some((hint) => item.period.includes(hint))).length;
});

const topPriorityCard = computed(() => todoCards.value[0]);

function sortTodoByTimePriority(items: KanbanCard[]) {
  const hints = timeContext.value.periodHints;

  return [...items].sort((a, b) => {
    const aPriority = hints.some((hint) => a.period.includes(hint)) ? 0 : 1;
    const bPriority = hints.some((hint) => b.period.includes(hint)) ? 0 : 1;
    return aPriority - bPriority;
  });
}

const boardStorageKey = computed(() => {
  const dateKey = props.summary.dateLabel || todayDateString();
  return `lightbalance:overview:kanban:${props.summary.userName}:${dateKey}`;
});

function saveBoardState() {
  try {
    const payload: KanbanBoardState = {
      todo: todoCards.value,
      doing: doingCards.value,
      done: doneCards.value
    };
    writeJson(boardStorageKey.value, payload);
  } catch (err) {
    console.warn("Failed to save overview board state", err);
  }
}

function restoreBoardState(defaultState: KanbanBoardState) {
  try {
    const parsed = readJson<Partial<KanbanBoardState> | null>(boardStorageKey.value, null);
    if (!parsed) return defaultState;
    const parsedTodo = Array.isArray(parsed.todo) ? parsed.todo : [];
    const parsedDoing = Array.isArray(parsed.doing) ? parsed.doing : [];
    const parsedDone = Array.isArray(parsed.done) ? parsed.done : [];

    const baseMap = new Map<string, KanbanCard>();
    [...defaultState.todo, ...defaultState.doing, ...defaultState.done].forEach((item) => {
      baseMap.set(item.uid, item);
    });

    const seen = new Set<string>();
    const mergeColumn = (items: KanbanCard[], column: KanbanColumnKey) => {
      const merged: KanbanCard[] = [];
      for (const storedItem of items) {
        const base = baseMap.get(storedItem.uid);
        if (!base || seen.has(storedItem.uid)) {
          continue;
        }

        const card: KanbanCard = { ...base, ...storedItem };
        applyCardStatusForColumn(card, column);
        merged.push(card);
        seen.add(storedItem.uid);
      }
      return merged;
    };

    const todo = mergeColumn(parsedTodo, "todo");
    const doing = mergeColumn(parsedDoing, "doing");
    const done = mergeColumn(parsedDone, "done");

    const appendRemaining = (columnItems: KanbanCard[], target: KanbanCard[], column: KanbanColumnKey) => {
      for (const item of columnItems) {
        if (seen.has(item.uid)) continue;
        const card: KanbanCard = { ...item };
        applyCardStatusForColumn(card, column);
        target.push(card);
      }
    };

    appendRemaining(defaultState.todo, todo, "todo");
    appendRemaining(defaultState.doing, doing, "doing");
    appendRemaining(defaultState.done, done, "done");

    return { todo, doing, done };
  } catch (err) {
    console.warn("Failed to restore overview board state", err);
    return defaultState;
  }
}

function rebuildBoard() {
  const todo = props.summary.plannedToday.map((item, index) => ({
    uid: `todo-${index}-${item.title}`,
    title: item.title,
    detail: item.detail,
    meta: "待推进",
    tone: "neutral" as Tone,
    period: item.period,
    tag: item.tag,
    action: item.action,
    finished: item.action === "completed"
  }));

  const doing = props.summary.pendingToday.map((item, index) => ({
    uid: `doing-${index}-${item.title}`,
    title: item.title,
    detail: item.detail,
    meta: item.meta,
    tone: item.tone,
    period: "进行中",
    tag: "推进",
    action: item.action,
    finished: false
  }));

  const done = props.summary.completedToday.map((item, index) => ({
    uid: `done-${index}-${item.title}`,
    title: item.title,
    detail: item.detail,
    meta: item.meta,
    tone: item.tone,
    period: "已完成",
    tag: "完成",
    action: "completed",
    finished: true
  }));

  const defaultState: KanbanBoardState = {
    todo: sortTodoByTimePriority(todo),
    doing,
    done
  };

  const restoredState = restoreBoardState(defaultState);
  todoCards.value = restoredState.todo;
  doingCards.value = restoredState.doing;
  doneCards.value = restoredState.done;
}

watch(
  () => props.summary,
  () => {
    rebuildBoard();
  },
  { immediate: true }
);

function listByColumn(column: KanbanColumnKey) {
  if (column === "todo") return todoCards.value;
  if (column === "doing") return doingCards.value;
  return doneCards.value;
}

function onCardDragStart(column: KanbanColumnKey, uid: string) {
  draggingCard.value = { uid, from: column };
}

function onCardDragEnd() {
  draggingCard.value = null;
  dragOverColumn.value = null;
  dragOverCardUid.value = null;
  dragOverPlacement.value = null;
}

function onColumnDragOver(column: KanbanColumnKey) {
  dragOverColumn.value = column;
  dragOverCardUid.value = null;
  dragOverPlacement.value = null;
}

function onCardDragOver(column: KanbanColumnKey, uid: string, event: DragEvent) {
  dragOverColumn.value = column;
  dragOverCardUid.value = uid;
  const target = event.currentTarget as HTMLElement | null;
  if (!target) {
    dragOverPlacement.value = "before";
    return;
  }

  const rect = target.getBoundingClientRect();
  const middleY = rect.top + rect.height / 2;
  const pointerY = event.clientY > 0 ? event.clientY : rect.top + rect.height / 2;
  dragOverPlacement.value = pointerY >= middleY ? "after" : "before";
}

function applyCardStatusForColumn(card: KanbanCard, target: KanbanColumnKey) {
  if (target === "done") {
    card.finished = true;
    card.action = "completed";
    card.meta = "已完成";
    card.tone = "positive";
    return;
  }

  if (target === "doing") {
    card.finished = false;
    card.meta = card.meta === "已完成" ? "进行中" : card.meta;
    card.action = card.action === "completed" ? "update_progress" : card.action;
    return;
  }

  card.finished = false;
  card.action = card.action === "completed" ? "complete_task" : card.action;
  card.period = card.period || `${timeContext.value.label}优先`;
  card.tag = card.tag || "计划";
}

function moveCardInList(list: KanbanCard[], fromUid: string, toUid: string, placement: "before" | "after") {
  const fromIndex = list.findIndex((item) => item.uid === fromUid);
  const toIndex = list.findIndex((item) => item.uid === toUid);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return false;
  }

  let insertIndex = placement === "after" ? toIndex + 1 : toIndex;
  if (fromIndex < insertIndex) {
    insertIndex -= 1;
  }

  if (insertIndex === fromIndex) {
    return false;
  }

  const [card] = list.splice(fromIndex, 1);
  list.splice(insertIndex, 0, card);
  return true;
}

function dropToCard(target: KanbanColumnKey, targetUid: string) {
  if (!draggingCard.value) return;

  const { from, uid } = draggingCard.value;
  const placement = dragOverPlacement.value || "before";
  if (uid === targetUid) {
    onCardDragEnd();
    return;
  }

  if (from === target) {
    const moved = moveCardInList(listByColumn(from), uid, targetUid, placement);
    if (moved) {
      saveBoardState();
      notify("已更新卡片顺序", "info");
    }
    onCardDragEnd();
    return;
  }

  const fromList = listByColumn(from);
  const toList = listByColumn(target);
  const fromIndex = fromList.findIndex((item) => item.uid === uid);
  const targetIndex = toList.findIndex((item) => item.uid === targetUid);
  if (fromIndex < 0 || targetIndex < 0) {
    onCardDragEnd();
    return;
  }

  const [card] = fromList.splice(fromIndex, 1);
  applyCardStatusForColumn(card, target);
  const insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
  toList.splice(insertIndex, 0, card);
  saveBoardState();
  notify(`已移动到${target === "todo" ? "待完成" : target === "doing" ? "进行中" : "已完成"}列`);
  onCardDragEnd();
}

function dropToColumn(target: KanbanColumnKey) {
  if (!draggingCard.value) return;

  const { from, uid } = draggingCard.value;
  if (from === target) {
    onCardDragEnd();
    return;
  }

  const fromList = listByColumn(from);
  const toList = listByColumn(target);
  const cardIndex = fromList.findIndex((item) => item.uid === uid);
  if (cardIndex < 0) {
    onCardDragEnd();
    return;
  }

  const [card] = fromList.splice(cardIndex, 1);
  applyCardStatusForColumn(card, target);

  toList.unshift(card);
  saveBoardState();
  notify(`已移动到${target === "todo" ? "待完成" : target === "doing" ? "进行中" : "已完成"}列`);
  onCardDragEnd();
}

function finishTodoQuick(uid: string) {
  const cardIndex = todoCards.value.findIndex((item) => item.uid === uid);
  if (cardIndex < 0) return;

  const [card] = todoCards.value.splice(cardIndex, 1);
  card.finished = true;
  card.action = "completed";
  card.meta = "已完成";
  card.tone = "positive";
  doneCards.value.unshift(card);
  saveBoardState();
  notify("任务已标记完成");
}

const { toast, toastVisible, showToast } = useToast<{ message: string; tone: "success" | "info" }>({
  message: "",
  tone: "success"
}, { duration: 1600 });

function notify(message: string, tone: "success" | "info" = "success") {
  showToast({ message, tone });
}

function toNumber(text: string) {
  const cleaned = text.replace(/,/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

const waterProgress = computed(() => {
  const metric = props.summary.metrics.find((item) => /饮水|补水|water/i.test(item.label));
  if (metric) {
    const pair = metric.value.match(/([\d.,]+)\s*\/\s*([\d.,]+)/);
    if (pair) {
      const current = toNumber(pair[1]);
      const target = Math.max(toNumber(pair[2]), 1);
      const percent = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
      return { current, target, percent };
    }
  }

  const fallback = props.summary.complianceTable.find((item) => /水/.test(item.module));
  if (fallback) {
    const current = toNumber((fallback.actual.match(/[\d.,]+/) || ["0"])[0]);
    const target = Math.max(toNumber((fallback.target.match(/[\d.,]+/) || ["1"])[0]), 1);
    const percent = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
    return { current, target, percent };
  }

  return { current: 0, target: 2000, percent: 0 };
});

const ringCircumference = 2 * Math.PI * 24;
const ringDashOffset = computed(() => ringCircumference * (1 - waterProgress.value.percent / 100));

const interacting = ref("");

// 模拟或真实互动对接
const showSleepModal = ref(false);
const sleepDuration = ref(8);

async function saveSleep() {
  try {
    const today = todayDateString();
    const { updateTrendSleep } = await import("../services/backend/trend");
    await updateTrendSleep({
      recordDate: today,
      sleepHours: sleepDuration.value
    });
    showSleepModal.value = false;
    notify("睡眠时长已更新");
    emit("refresh");
  } catch (err) {
    console.error("Failed to update sleep", err);
  }
}

async function handleInteraction(action: string) {
  if (!action) return;
  if (action === "go_water" || action === "drink_water") {
    if (interacting.value === "water") return;
    interacting.value = "water";
    try {
      await addWaterIntake({ amountMl: 200 });
      notify("已记录喝水 +200ml");
      emit("refresh");
    } finally {
      interacting.value = "";
    }
  } else if (action === "go_exercise" || action === "start_workout") {
    emit("navigate", "exercise");
  } else if (action === "go_diet") {
    emit("navigate", "diet");
  } else if (action === "update_sleep") {
    showSleepModal.value = true;
  } else if (action === "complete_task") {
    notify("任务已推进");
  } else if (action === "update_progress") {
    emit("navigate", "diet");
  } else if (action !== "completed" && action !== "none") {
    console.warn("Unknown action:", action);
  }
}

function isWaterRelatedCard(card: KanbanCard) {
  const text = `${card.title} ${card.detail} ${card.meta} ${card.tag}`.toLowerCase();
  if (card.action === "go_water" || card.action === "drink_water") {
    return true;
  }
  return /水|补水|water/.test(text);
}

function handleUpdateProgressClick(card: KanbanCard) {
  if (isWaterRelatedCard(card)) {
    emit("navigate", "diet");
    return;
  }
  handleInteraction(card.action || "update_progress");
}

const todoEmpty = computed(() => todoCards.value.length === 0);
const doingEmpty = computed(() => doingCards.value.length === 0);
const doneEmpty = computed(() => doneCards.value.length === 0);

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && showSleepModal.value) {
    showSleepModal.value = false;
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <section class="board">
    <article class="hero">
      <div class="hero__content">
        <div class="hero__topline">
          <p class="eyebrow">Today Dashboard</p>
          <span class="hero__date">{{ summary.dateLabel }}</span>
        </div>

        <div class="hero__header">
          <div>
            <h3>{{ summary.userName }}，{{ dynamicGreeting }}</h3>
            <p class="hero__headline">{{ contextualHeadline }}</p>
          </div>
          <div class="hero__score">
            <strong>{{ summary.todayScore }}</strong>
            <span>今日状态分</span>
          </div>
        </div>

        <p class="hero__subheadline">{{ summary.subheadline }}</p>

        <div class="hero__meta">
          <div class="hero__goal">
            <span>当前体重 {{ summary.currentWeight }} kg</span>
            <strong>目标体重 {{ summary.targetWeight }} kg</strong>
            <small>{{ summary.weightDelta > 0 ? `还差 ${summary.weightDelta.toFixed(1)} kg` : "已接近当前阶段目标" }}</small>
          </div>

          <div class="hero__completion">
            <span>今日完成 / 待完成</span>
            <strong>{{ summary.todayCompletedCount }} / {{ summary.todayPendingCount }}</strong>
            <small>{{ summary.todaySummary }}</small>
          </div>
        </div>

        <!-- 互动：快捷记录按键与操作区 -->
        <div class="hero__quick-actions">
          <div class="hero__quick-actions-main">
          <span class="hero__quick-actions-label">快速记录</span>
            <button class="btn btn--water" :disabled="interacting === 'water'" @click="handleInteraction('drink_water')">
              {{ interacting === 'water' ? '记录中...' : '喝水 +200ml' }}
            </button>
            <button class="btn btn--workout" @click="handleInteraction('start_workout')">开始训练</button>
          </div>

          <div class="water-ring">
            <svg viewBox="0 0 60 60" class="water-ring__svg" aria-hidden="true">
              <circle class="water-ring__bg" cx="30" cy="30" r="24"></circle>
              <circle
                class="water-ring__fg"
                cx="30"
                cy="30"
                r="24"
                :stroke-dasharray="ringCircumference"
                :stroke-dashoffset="ringDashOffset"
              ></circle>
            </svg>
            <div class="water-ring__text">
              <strong>{{ waterProgress.percent }}%</strong>
              <span>{{ waterProgress.current }} / {{ waterProgress.target }} ml</span>
            </div>
          </div>
        </div>

        <div class="hero__focus" style="margin-top: 16px;">
          <span class="hero__focus-priority">{{ timeContext.label }}高优先任务 {{ priorityTodoCount }} 项</span>
          <span v-for="item in summary.focusModules" :key="item">{{ item }}</span>
        </div>
      </div>

      <div class="hero__action">
        <p class="eyebrow">Recommended Action</p>
        <h4>{{ topPriorityCard?.title || summary.nextReminder }}</h4>
        <p>{{ topPriorityCard?.detail || summary.plannedToday[0]?.detail }}</p>

        <div class="hero__stamp-group">
          <span class="hero__stamp">档案更新时间：{{ updatedAtLabel }}</span>
          <span class="hero__stamp hero__stamp--soft">整体完成度 {{ summary.completionRate }}%</span>
        </div>
      </div>
    </article>

    <section class="metrics">
      <article v-for="metric in summary.metrics" :key="metric.label" class="metric-card" :data-tone="metric.tone">
        <p>{{ metric.label }}</p>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </article>
    </section>

    <!-- 转换：将今天原本堆叠的块改为看板列 (Kanban Board) 格式 -->
    <section class="today-grid kanban-board">
      <article
        class="panel kanban-column kanban--todo"
        :class="{ 'kanban-column--dragover': dragOverColumn === 'todo' }"
        @dragover.prevent="onColumnDragOver('todo')"
        @drop.prevent="dropToColumn('todo')"
      >
        <div class="panel__header">
          <div>
            <p class="eyebrow">To Do</p>
            <h4>待完成计划</h4>
          </div>
        </div>

        <div class="plan-list kanban-list">
          <div v-if="todoEmpty" class="kanban-empty">暂无待办任务，今天的基础安排已经清空。</div>
          <TransitionGroup name="kanban-card-move" tag="div" class="kanban-list-inner">
            <div
              v-for="item in todoCards"
              :key="item.uid"
              class="plan-card kanban-card"
              :class="{
                'kanban-card--drag-target': dragOverCardUid === item.uid,
                'kanban-card--drag-target-before': dragOverCardUid === item.uid && dragOverPlacement === 'before',
                'kanban-card--drag-target-after': dragOverCardUid === item.uid && dragOverPlacement === 'after'
              }"
              draggable="true"
              @dragstart="onCardDragStart('todo', item.uid)"
              @dragover.prevent.stop="onCardDragOver('todo', item.uid, $event)"
              @drop.prevent.stop="dropToCard('todo', item.uid)"
              @dragend="onCardDragEnd"
            >
              <div class="plan-card__top">
                <span class="tag tag--period">{{ item.period }}</span>
                <label class="tag tag--type">{{ item.tag }}</label>
              </div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
              <button
                class="kanban-action-btn"
                :class="{ 'kanban-action-btn--completed': item.action === 'completed' }"
                :disabled="item.action === 'completed'"
                @click="finishTodoQuick(item.uid)"
              >
                {{ item.action === 'completed' ? '已达标' : '标记完成' }}
              </button>
            </div>
          </TransitionGroup>
        </div>
      </article>

      <article
        class="panel kanban-column kanban--doing"
        :class="{ 'kanban-column--dragover': dragOverColumn === 'doing' }"
        @dragover.prevent="onColumnDragOver('doing')"
        @drop.prevent="dropToColumn('doing')"
      >
        <div class="panel__header">
          <div>
            <p class="eyebrow">Pending / Doing</p>
            <h4>进行中任务</h4>
          </div>
        </div>

        <div class="today-list kanban-list">
          <div v-if="doingEmpty" class="kanban-empty">暂无进行中的事项，可以从待完成计划中拖入一项开始推进。</div>
          <TransitionGroup name="kanban-card-move" tag="div" class="kanban-list-inner">
            <div
              v-for="item in doingCards"
              :key="item.uid"
              class="today-card kanban-card"
              :data-tone="item.tone"
              :class="{
                'kanban-card--drag-target': dragOverCardUid === item.uid,
                'kanban-card--drag-target-before': dragOverCardUid === item.uid && dragOverPlacement === 'before',
                'kanban-card--drag-target-after': dragOverCardUid === item.uid && dragOverPlacement === 'after'
              }"
              draggable="true"
              @dragstart="onCardDragStart('doing', item.uid)"
              @dragover.prevent.stop="onCardDragOver('doing', item.uid, $event)"
              @drop.prevent.stop="dropToCard('doing', item.uid)"
              @dragend="onCardDragEnd"
            >
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
              <small>{{ item.meta }}</small>
              <button class="kanban-action-btn kanban-action-btn--update" @click="handleUpdateProgressClick(item)">✎ 更新进度</button>
            </div>
          </TransitionGroup>
        </div>
      </article>

      <article
        class="panel kanban-column kanban--done"
        :class="{ 'kanban-column--dragover': dragOverColumn === 'done' }"
        @dragover.prevent="onColumnDragOver('done')"
        @drop.prevent="dropToColumn('done')"
      >
        <div class="panel__header">
          <div>
            <p class="eyebrow">Done</p>
            <h4>已完成事项</h4>
          </div>
        </div>

        <div class="today-list kanban-list">
          <div v-if="doneEmpty" class="kanban-empty">今天还没有完成记录，先从一项小任务开始。</div>
          <TransitionGroup name="kanban-card-move" tag="div" class="kanban-list-inner">
            <div
              v-for="item in doneCards"
              :key="item.uid"
              class="today-card kanban-card kanban-card--finished"
              :data-tone="item.tone"
              :class="{
                'kanban-card--drag-target': dragOverCardUid === item.uid,
                'kanban-card--drag-target-before': dragOverCardUid === item.uid && dragOverPlacement === 'before',
                'kanban-card--drag-target-after': dragOverCardUid === item.uid && dragOverPlacement === 'after'
              }"
              draggable="true"
              @dragstart="onCardDragStart('done', item.uid)"
              @dragover.prevent.stop="onCardDragOver('done', item.uid, $event)"
              @drop.prevent.stop="dropToCard('done', item.uid)"
              @dragend="onCardDragEnd"
            >
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
              <small>{{ item.meta }}</small>
              <span class="kanban-card__stamp">完成</span>
            </div>
          </TransitionGroup>
        </div>
      </article>
    </section>

    <section class="module-grid">
      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Today Focus</p>
            <h4>饮食、训练与恢复完成度</h4>
          </div>
        </div>

        <div class="module-cards">
          <div v-for="item in summary.moduleStats" :key="item.title" class="module-card" :data-tone="item.tone">
            <div class="module-card__top">
              <span>{{ item.title }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <p>{{ item.subtitle }}</p>
            <div class="progress">
              <span class="progress__fill" :style="{ width: progressWidth(item.progress) }"></span>
            </div>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">This Week</p>
            <h4>本周训练负荷</h4>
          </div>
        </div>

        <div class="load-chart">
          <div v-for="point in summary.weeklyLoad" :key="point.label" class="load-chart__item">
            <div class="load-chart__bars">
              <span
                class="load-chart__bar"
                :style="{ height: `${Math.max(18, (point.durationMinutes / workloadPeak) * 120)}px` }"
              ></span>
            </div>
            <strong>{{ point.durationMinutes }} 分钟</strong>
            <small>{{ point.caloriesBurned }} kcal</small>
            <span>{{ point.steps }} 步</span>
            <label>{{ point.label }}</label>
          </div>
        </div>
      </article>
    </section>

    <section class="table-grid">
      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Recent Sessions</p>
            <h4>近期训练明细</h4>
          </div>
        </div>

        <div class="table-shell">
          <table class="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>训练内容</th>
                <th>类型</th>
                <th>时长</th>
                <th>消耗</th>
                <th>强度</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in summary.recentWorkouts" :key="`${row.date}-${row.name}`">
                <td>{{ row.date }}</td>
                <td>{{ row.name }}</td>
                <td>{{ row.category }}</td>
                <td>{{ row.durationMinutes }} 分钟</td>
                <td>{{ row.caloriesBurned }} kcal</td>
                <td>{{ row.intensity }}</td>
                <td><span class="status-pill">{{ row.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Daily Goals</p>
            <h4>目标完成对照</h4>
          </div>
        </div>

        <div class="compliance-list">
          <div v-for="row in summary.complianceTable" :key="row.module" class="compliance-row">
            <div class="compliance-row__meta">
              <strong>{{ row.module }}</strong>
              <span>{{ row.target }}</span>
            </div>

            <div class="compliance-row__body">
              <div class="progress progress--thin">
                <span class="progress__fill" :style="{ width: progressWidth(row.completion) }"></span>
              </div>
              <div class="compliance-row__values">
                <strong>{{ row.actual }}</strong>
                <small>{{ row.note }}</small>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>

    <!-- 睡眠更新弹窗 -->
    <div v-if="showSleepModal" class="modal-overlay" @click.self="showSleepModal = false">
      <div class="modal-content">
        <h3>更新睡眠记录</h3>
        <p>填写昨晚睡眠时长，系统会同步到趋势与恢复分析。</p>
        <input type="number" v-model.number="sleepDuration" step="0.5" min="0" max="24" />
        <div class="modal-btns">
          <button @click="saveSleep" class="btn-save">保存</button>
          <button @click="showSleepModal = false" class="btn-cancel">取消</button>
        </div>
      </div>
    </div>

    <transition name="toast-fade">
      <div v-if="toastVisible" class="action-toast" :data-tone="toast.tone">
        {{ toast.message }}
      </div>
    </transition>
  </section>
</template>

<style scoped>
.board {
  display: grid;
  gap: 18px;
}

.hero,
.panel,
.metric-card {
  padding: 24px;
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  box-shadow: var(--shadow-panel);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) 340px;
  gap: 20px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0 1px, transparent 1px 12px),
    linear-gradient(135deg, var(--color-surface-strong), rgba(247, 242, 232, 0.96));
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 0.76rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.hero__topline,
.hero__header,
.hero__meta,
.hero__stamp-group,
.module-card__top,
.compliance-row__meta,
.compliance-row__values,
.plan-card__top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.hero__topline {
  align-items: center;
}

.hero__date {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(53, 93, 62, 0.08);
  color: #375641;
  font-size: 0.84rem;
  font-weight: 600;
}

.hero h3,
.panel h4 {
  margin: 0;
  color: var(--color-text);
}

.hero h3 {
  font-size: 1.8rem;
  line-height: 1.1;
}

.hero__headline,
.hero__subheadline,
.hero__action p,
.module-card p,
.metric-card small,
.compliance-row__meta span,
.compliance-row__values small,
.load-chart__item small,
.load-chart__item span,
.today-card p,
.today-card small,
.plan-card p {
  color: var(--color-text-soft);
}

.hero__headline {
  margin: 12px 0 0;
  font-size: 1rem;
  line-height: 1.7;
}

.hero__subheadline {
  margin: 18px 0 0;
  max-width: 760px;
  line-height: 1.8;
}

.hero__score {
  min-width: 112px;
  padding: 18px 16px;
  border-radius: var(--radius-card);
  background: var(--color-surface-soft);
  border: 1px solid var(--color-line);
  text-align: center;
}

.hero__score strong {
  display: block;
  font-size: 2.4rem;
  line-height: 1;
  color: var(--color-text);
}

.hero__score span {
  display: block;
  margin-top: 8px;
  color: var(--color-text-soft);
  font-size: 0.86rem;
}

.hero__meta {
  margin-top: 22px;
  align-items: stretch;
}

.hero__goal,
.hero__completion,
.hero__action {
  border-radius: var(--radius-card);
  background: var(--color-surface-soft);
  border: 1px solid var(--color-line);
}

.hero__goal,
.hero__completion {
  flex: 1;
  padding: 18px;
  display: grid;
  gap: 6px;
}

.hero__goal span,
.hero__completion span {
  color: var(--color-text-soft);
}

.hero__goal strong,
.hero__completion strong {
  font-size: 1.6rem;
  color: var(--color-text);
}

.hero__focus {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.hero__focus .hero__focus-priority {
  background: rgba(239, 200, 110, 0.22);
  color: #614822;
}

.hero__focus span,
.plan-card__top label {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(43, 74, 53, 0.08);
  color: #22422d;
  font-weight: 700;
}

.hero__action {
  display: grid;
  align-content: space-between;
  gap: 18px;
  padding: 22px;
}

.hero__quick-actions {
  margin-top: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 20px;
  justify-content: space-between;
}

.hero__quick-actions-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hero__quick-actions-label {
  font-size: 0.85rem;
  color: var(--color-text-soft);
}

.water-ring {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(57, 87, 63, 0.12);
}

.water-ring__svg {
  width: 54px;
  height: 54px;
}

.water-ring__bg,
.water-ring__fg {
  fill: none;
  stroke-width: 6;
}

.water-ring__bg {
  stroke: rgba(57, 87, 63, 0.12);
}

.water-ring__fg {
  stroke: #4f88ce;
  stroke-linecap: round;
  transform-origin: 50% 50%;
  transform: rotate(-90deg);
  transition: stroke-dashoffset 0.45s ease;
}

.water-ring__text {
  display: grid;
  gap: 2px;
}

.water-ring__text strong {
  color: var(--color-text);
  font-size: 1rem;
}

.water-ring__text span {
  font-size: 0.78rem;
  color: var(--color-text-soft);
}

.hero__action h4 {
  margin: 0;
  font-size: 1.45rem;
}

.hero__stamp-group {
  flex-wrap: wrap;
}

.hero__stamp {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(53, 93, 62, 0.08);
  color: #375641;
  font-size: 0.84rem;
  font-weight: 600;
}

.hero__stamp--soft {
  background: rgba(255, 205, 107, 0.18);
  color: #6c5326;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.metric-card p {
  margin: 0 0 10px;
}

.metric-card strong {
  display: block;
  font-size: 1.8rem;
  color: var(--color-text);
}

.metric-card[data-tone="positive"] {
  background: linear-gradient(180deg, rgba(234, 247, 233, 0.92), rgba(255, 252, 246, 0.92));
}

.metric-card[data-tone="warning"] {
  background: linear-gradient(180deg, rgba(251, 239, 214, 0.92), rgba(255, 252, 246, 0.92));
}

.today-grid,
.module-grid,
.table-grid {
  display: grid;
  gap: 18px;
}

.today-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.module-grid,
.table-grid {
  grid-template-columns: 1.05fr 0.95fr;
}

.panel__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.today-list,
.module-cards,
.compliance-list,
.plan-list {
  display: grid;
  gap: 12px;
}

.today-card,
.module-card,
.compliance-row,
.plan-card {
  padding: 18px;
  border-radius: var(--radius-card);
  background: var(--color-surface-soft);
}

.today-card {
  border: 1px solid rgba(57, 87, 63, 0.08);
}

.today-card strong,
.plan-card strong,
.module-card__top strong,
.load-chart__item strong,
.compliance-row__values strong {
  color: var(--color-text);
}

.today-card[data-tone="positive"] {
  background: linear-gradient(180deg, rgba(235, 247, 234, 0.9), rgba(246, 243, 235, 0.82));
}

.today-card[data-tone="warning"] {
  background: linear-gradient(180deg, rgba(251, 241, 220, 0.9), rgba(246, 243, 235, 0.82));
}

.plan-card__top {
  align-items: center;
  margin-bottom: 10px;
}

.plan-card__top span,
.module-card__top span {
  color: var(--color-text-soft);
}

.module-card[data-tone="positive"] {
  border: 1px solid rgba(69, 144, 92, 0.22);
}

.module-card[data-tone="warning"] {
  border: 1px solid rgba(196, 151, 53, 0.24);
}

.progress {
  height: 10px;
  margin-top: 12px;
  border-radius: 999px;
  background: rgba(57, 87, 63, 0.08);
  overflow: hidden;
}

.progress--thin {
  height: 8px;
  margin-top: 0;
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #25442f, #6aa46b, #efc86e);
}

.load-chart {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
  min-height: 220px;
}

.load-chart__item {
  display: grid;
  justify-items: center;
  gap: 6px;
}

.load-chart__bars {
  height: 120px;
  display: flex;
  align-items: end;
}

.load-chart__bar {
  width: 38px;
  border-radius: 18px 18px 10px 10px;
  background: linear-gradient(180deg, #9fcf8e, #42624b);
}

.load-chart__item label {
  color: #47624f;
  font-weight: 700;
}

.table-shell {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(57, 87, 63, 0.1);
}

.table th {
  color: var(--color-text-soft);
  font-weight: 600;
  font-size: 0.9rem;
}

.table td {
  color: var(--color-text);
}

.status-pill {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(77, 168, 103, 0.14);
  color: #1d6033;
  font-weight: 700;
  font-size: 0.84rem;
}

.compliance-row {
  display: grid;
  gap: 12px;
}

@media (max-width: 1360px) {
  .today-grid {
    grid-template-columns: 1fr;
  }

  .kanban-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .kanban--done {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1240px) {
  .hero,
  .metrics,
  .module-grid,
  .table-grid {
    grid-template-columns: 1fr;
  }

  .kanban-board {
    grid-template-columns: 1fr;
  }

  .kanban--done {
    grid-column: auto;
  }

  .load-chart {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero__action {
    order: -1;
  }

  .hero h3 {
    font-size: 1.55rem;
  }

  .hero__score strong {
    font-size: 2rem;
  }

  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
/* 交互按钮样式 */
.btn {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.btn--water {
  background: rgba(85, 142, 233, 0.15);
  color: #2b55a0;
}

.btn--water:hover {
  background: rgba(85, 142, 233, 0.25);
}

.btn--workout {
  background: rgba(46, 204, 113, 0.15);
  color: #1e8449;
}

.btn--workout:hover {
  background: rgba(46, 204, 113, 0.25);
}

.kanban-card-move-enter-active,
.kanban-card-move-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.kanban-card-move-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.kanban-card-move-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.kanban-card-move-leave-active {
  position: absolute;
}

.kanban-empty {
  padding: 28px 18px;
  border-radius: 14px;
  background: rgba(240, 245, 239, 0.65);
  border: 1px dashed rgba(100, 125, 105, 0.18);
  color: #7d9485;
  font-size: 0.9rem;
  text-align: center;
  line-height: 1.6;
}

/* Kanban 看板列及其互动样式 */
.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.kanban-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.kanban-list-inner {
  display: grid;
  gap: 12px;
}

.kanban-card {
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(80, 100, 85, 0.08);
  box-shadow: 0 4px 12px rgba(80, 100, 85, 0.03);
  position: relative;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(50, 75, 60, 0.08);
  border-color: rgba(80, 100, 85, 0.14);
}

.kanban-card[draggable="true"] {
  cursor: grab;
}

.kanban-column--dragover {
  border: 1px dashed rgba(67, 110, 80, 0.46);
  background: rgba(228, 240, 231, 0.46);
}

.kanban-card--drag-target {
  border-color: rgba(67, 110, 80, 0.55);
  box-shadow: 0 0 0 2px rgba(67, 110, 80, 0.14);
}

.kanban-card--drag-target-before {
  box-shadow:
    inset 0 3px 0 rgba(50, 98, 67, 0.85),
    0 0 0 2px rgba(67, 110, 80, 0.14);
}

.kanban-card--drag-target-after {
  box-shadow:
    inset 0 -3px 0 rgba(50, 98, 67, 0.85),
    0 0 0 2px rgba(67, 110, 80, 0.14);
}

.kanban-card p {
  color: var(--color-text-soft);
  margin-top: 4px;
}

.kanban-card--finished {
  background: rgba(230, 240, 232, 0.4);
  opacity: 0.8;
}

.kanban-card--finished strong {
  text-decoration: line-through;
  color: var(--color-text-soft);
}

.kanban-action-btn {
  margin-top: 12px;
  width: 100%;
  border: 1px dashed rgba(60, 90, 70, 0.3);
  background: transparent;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  color: #3e5a45;
  font-weight: 500;
  transition: background 0.2s;
}

.kanban-action-btn:hover {
  background: rgba(60, 90, 70, 0.05);
}

.kanban-card__stamp {
  position: absolute;
  right: 12px;
  bottom: 12px;
  font-size: 0.75rem;
  color: #4CAF50;
  border: 1px solid #4CAF50;
  padding: 2px 6px;
  border-radius: 4px;
  transform: rotate(-5deg);
  opacity: 0.6;
}

.action-toast {
  position: fixed;
  right: 22px;
  bottom: 20px;
  z-index: 1200;
  padding: 10px 14px;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 12px 26px rgba(24, 33, 27, 0.18);
}

.action-toast[data-tone="success"] {
  background: #3a6c48;
}

.action-toast[data-tone="info"] {
  background: #3f608f;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (max-width: 820px) {
  .hero__header,
  .hero__meta,
  .hero__stamp-group,
  .module-card__top,
  .compliance-row__meta,
  .compliance-row__values,
  .plan-card__top {
    flex-direction: column;
    align-items: flex-start;
  }

  .metrics,
  .load-chart {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero__quick-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .water-ring {
    width: 100%;
    justify-content: flex-start;
  }

  .action-toast {
    right: 12px;
    bottom: 12px;
    max-width: calc(100vw - 24px);
  }
}

@media (max-width: 600px) {
  .hero h3 {
    font-size: 1.35rem;
  }

  .hero__score strong {
    font-size: 1.7rem;
  }

  .hero__goal strong,
  .hero__completion strong {
    font-size: 1.3rem;
  }

  .metrics,
  .load-chart {
    grid-template-columns: 1fr;
  }

  .load-chart {
    gap: 8px;
    min-height: 180px;
  }

  .load-chart__bars {
    height: 90px;
  }

  .load-chart__bar {
    width: 28px;
  }

  .hero,
  .panel,
  .metric-card {
    padding: 18px;
    border-radius: 20px;
  }

  .kanban-card {
    padding: 12px;
  }
}

/* Action & Modal Styles */
.kanban-action-btn--completed {
  color: #7d9e85;
  background: rgba(125, 158, 133, 0.1);
  border-color: rgba(125, 158, 133, 0.2);
  cursor: default;
}
.kanban-action-btn--completed:hover {
  background: rgba(125, 158, 133, 0.1);
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 320px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  text-align: center;
}
.modal-content h3 {
  margin-top: 0;
  color: #2c3e2e;
}
.modal-content input {
  width: 100%;
  padding: 8px;
  margin: 1rem 0;
  border: 1px solid #c9d8ce;
  border-radius: 6px;
  font-size: 1.1rem;
  text-align: center;
  box-sizing: border-box;
}
.modal-btns {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
.btn-save {
  background: #3c5a46;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}
.btn-cancel {
  background: transparent;
  color: #666;
  border: 1px solid #ccc;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}
</style>
