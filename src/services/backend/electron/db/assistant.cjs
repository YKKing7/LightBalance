"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssistantPlan = getAssistantPlan;
exports.askAssistant = askAssistant;
exports.probeGeminiConnection = probeGeminiConnection;
const node_path_1 = __importDefault(require("node:path"));
const shared_cjs_1 = require("./shared.cjs");
const body_cjs_1 = require("./body.cjs");
const diet_cjs_1 = require("./diet.cjs");
const exercise_cjs_1 = require("./exercise.cjs");
const trend_cjs_1 = require("./trend.cjs");
const DEFAULT_FOCUS = "综合平衡";
const SNAPSHOT_TTL_MS = 1000 * 60 * 60 * 4;
const DEFAULT_MODEL = "[L]gemini-2.5-flash";
const DEFAULT_BASE_URL = "https://new.lemonapi.site/v1";
const AGENT_NAME = "Astra";
const AGENT_PERSONA = "健康节律 Agent";
const AGENT_CAPABILITIES = ["实时对话", "行动建议", "趋势解读", "饮食分析", "多模态提示"];
const DEFAULT_MODALITY_IDEAS = [
    {
        title: "餐盘照片",
        detail: "上传正上方餐盘图，让 Agent 判断热量、份量和结构偏差。",
        prompt: "我准备发一张餐盘照片，你希望我怎么拍？",
        inputType: "meal_photo",
        why: "适合分析热量误差、蛋白质比例和是否需要替换。",
        captureTips: ["正上方完整拍到餐盘", "把饮料和加餐一起拍进去", "最好在开吃前拍"]
    },
    {
        title: "体态记录",
        detail: "上传固定角度体态照，帮助 Agent 判断平台期里的体态变化。",
        prompt: "如果我想用体态照追踪变化，你建议我怎么拍？",
        inputType: "body_photo",
        why: "适合观察围度、体态和训练适应，而不是只盯体重。",
        captureTips: ["固定正面侧面背面", "保持相同光线和站姿", "每周同一时间记录"]
    },
    {
        title: "睡眠截图",
        detail: "上传睡眠或步数截图，帮助 Agent 解释食欲波动和恢复状态。",
        prompt: "我可以给你睡眠截图，你会重点看哪些数据？",
        inputType: "sleep_screenshot",
        why: "适合解释疲劳、执行力下降和训练状态不稳。",
        captureTips: ["带上总睡眠时长", "尽量包含清醒次数", "补充昨晚入睡时间"]
    }
];
function safeParseJson(value, fallback) {
    if (!value)
        return fallback;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
function normalizeTone(value, fallback = "neutral") {
    return value === "positive" || value === "warning" || value === "neutral" ? value : fallback;
}
function normalizeDerivedCategory(value, fallback = "habit") {
    return value === "habit" || value === "meal" || value === "training" || value === "recovery" || value === "mindset"
        ? value
        : fallback;
}
function normalizeInputType(value, fallback = "text_note") {
    return value === "meal_photo" ||
        value === "body_photo" ||
        value === "sleep_screenshot" ||
        value === "workout_screenshot" ||
        value === "text_note"
        ? value
        : fallback;
}
function sanitizeString(value, fallback) {
    const text = String(value ?? "").trim();
    return text || fallback;
}
function sanitizeStringArray(value, fallback, limit) {
    if (!Array.isArray(value))
        return fallback.slice(0, limit);
    const items = value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, limit);
    return items.length ? items : fallback.slice(0, limit);
}
function loadAssistantEnv() {
    (0, shared_cjs_1.loadEnvFile)(node_path_1.default.resolve(process.cwd(), ".env"));
}
function getApiKey() {
    loadAssistantEnv();
    return process.env.LIGHTBALANCE_GEMINI_API_KEY?.trim() || "";
}
function getBaseUrl() {
    loadAssistantEnv();
    return process.env.LIGHTBALANCE_GEMINI_BASE_URL?.trim() || DEFAULT_BASE_URL;
}
function getModel() {
    loadAssistantEnv();
    return process.env.LIGHTBALANCE_GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}
function buildChatEndpoint() {
    const baseUrl = getBaseUrl().replace(/\/+$/, "");
    return { baseUrl, endpoint: `${baseUrl}/chat/completions` };
}
async function parseChatCompletionResponse(response) {
    const json = (await response.json());
    const content = json.choices?.[0]?.message?.content;
    if (typeof content === "string")
        return content.trim();
    if (Array.isArray(content))
        return content.map((item) => (typeof item?.text === "string" ? item.text : "")).join("").trim();
    return "";
}
function extractJsonBlock(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1])
        return fenced[1];
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace)
        return text.slice(firstBrace, lastBrace + 1);
    return text;
}
async function ensureAssistantSchema(connection) {
    await connection.execute(`
    CREATE TABLE IF NOT EXISTS assistant_plan_snapshot (
      snapshot_id INT NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      focus VARCHAR(40) NOT NULL DEFAULT '${DEFAULT_FOCUS}',
      title VARCHAR(120) NOT NULL,
      summary TEXT NOT NULL,
      readiness_score INT NOT NULL DEFAULT 0,
      risk_label VARCHAR(40) NOT NULL DEFAULT '待分析',
      next_check_in VARCHAR(40) NOT NULL DEFAULT '',
      quick_questions_json JSON NOT NULL,
      metrics_json JSON NOT NULL,
      priorities_json JSON NOT NULL,
      insights_json JSON NOT NULL,
      actions_json JSON NOT NULL,
      reminders_json JSON NOT NULL,
      generated_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL,
      KEY idx_assistant_snapshot_user_generated (user_id, generated_at)
    )
  `);
    await connection.execute(`
    CREATE TABLE IF NOT EXISTS assistant_chat_message (
      message_id INT NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      role VARCHAR(20) NOT NULL,
      tag VARCHAR(40) NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      KEY idx_assistant_message_user_created (user_id, created_at)
    )
  `);
    const [columns] = await connection.execute(`SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'assistant_plan_snapshot'`);
    const names = new Set(columns.map((row) => String(row.COLUMN_NAME)));
    const defs = [
        ["derived_contents_json", "JSON NOT NULL DEFAULT ('[]')"],
        ["modality_ideas_json", "JSON NOT NULL DEFAULT ('[]')"]
    ];
    for (const [name, definition] of defs) {
        if (!names.has(name)) {
            await connection.execute(`ALTER TABLE assistant_plan_snapshot ADD COLUMN ${name} ${definition}`);
        }
    }
}
function computeReadinessScore(input) {
    const sleepScore = (0, shared_cjs_1.clamp)((input.trend.averageSleepHours / Math.max(input.profile.sleepTargetHours, 1)) * 28, 0, 28);
    const trainingScore = (0, shared_cjs_1.clamp)((input.exercise.completionRate / 100) * 28, 0, 28);
    const hydrationScore = (0, shared_cjs_1.clamp)((input.diet.waterIntakeMl / Math.max(input.diet.waterTargetMl, 1)) * 12, 0, 12);
    const proteinScore = (0, shared_cjs_1.clamp)((input.diet.protein / Math.max(input.diet.proteinTarget, 1)) * 16, 0, 16);
    const calorieScore = (0, shared_cjs_1.clamp)(16 - Math.abs(input.diet.remainingCalories) / 55, 0, 16);
    return Math.round(sleepScore + trainingScore + hydrationScore + proteinScore + calorieScore);
}
function buildMetrics(input) {
    const { profile, diet, exercise, trend } = input;
    const weightGap = Math.max((0, shared_cjs_1.round)(trend.latestWeight - profile.targetWeightKg, 1), 0);
    const sleepGap = Math.max((0, shared_cjs_1.round)(profile.sleepTargetHours - trend.averageSleepHours, 1), 0);
    const proteinGap = Math.max(Math.round(diet.proteinTarget - diet.protein), 0);
    return [
        {
            label: "距目标体重",
            value: `${weightGap} kg`,
            note: weightGap > 0 ? "先保持稳定执行，再考虑更激进的推进。" : "当前已经接近阶段目标。",
            tone: weightGap > 2 ? "warning" : "positive"
        },
        {
            label: "今日热量余量",
            value: `${diet.remainingCalories} kcal`,
            note: diet.remainingCalories < 0 ? "今天偏超，晚间更适合收口。" : "还有空间，但尽量留给高质量食物。",
            tone: diet.remainingCalories < -180 ? "warning" : "neutral"
        },
        {
            label: "训练完成度",
            value: `${exercise.completedDays}/${exercise.weeklyGoalDays}`,
            note: "先守住频率，再谈强度升级。",
            tone: exercise.completedDays >= exercise.weeklyGoalDays ? "positive" : "neutral"
        },
        {
            label: "平均睡眠",
            value: `${trend.averageSleepHours.toFixed(1)} h`,
            note: sleepGap > 0 ? `距离目标还差 ${sleepGap} h` : "恢复底盘基本在线。",
            tone: sleepGap > 0.6 ? "warning" : "positive"
        },
        {
            label: "蛋白质进度",
            value: `${Math.round(diet.protein)}/${Math.round(diet.proteinTarget)} g`,
            note: proteinGap > 0 ? "优先补齐蛋白质，饱腹和恢复都会更稳。" : "蛋白质结构基本在线。",
            tone: proteinGap > 20 ? "warning" : "positive"
        }
    ];
}
function buildBasePlan(input) {
    const readinessScore = computeReadinessScore(input);
    const sleepGap = Math.max((0, shared_cjs_1.round)(input.profile.sleepTargetHours - input.trend.averageSleepHours, 1), 0);
    const trainingGap = Math.max(input.exercise.weeklyGoalDays - input.exercise.completedDays, 0);
    const calorieOverflow = Math.max(Math.abs(Math.min(input.diet.remainingCalories, 0)), 0);
    const priorities = [
        {
            title: "先稳住晚间摄入",
            detail: calorieOverflow > 0
                ? `今天已经超出约 ${calorieOverflow} kcal，重点不是极端补救，而是别继续外扩。`
                : "晚餐结构决定了第二天状态是否稳定，优先守住主食、蛋白质和零食边界。",
            score: (0, shared_cjs_1.clamp)(88 + calorieOverflow / 20, 72, 97),
            tone: calorieOverflow > 120 ? "warning" : "neutral"
        },
        {
            title: "补齐恢复质量",
            detail: sleepGap > 0.5
                ? `最近平均睡眠仍比目标少 ${sleepGap} 小时，恢复不足会放大食欲和疲劳。`
                : "睡眠和恢复基本在线，继续守住固定上床时间。",
            score: (0, shared_cjs_1.clamp)(80 + sleepGap * 10, 68, 94),
            tone: sleepGap > 0.5 ? "warning" : "positive"
        },
        {
            title: "维持训练连续性",
            detail: trainingGap > 0
                ? `本周还差 ${trainingGap} 次训练，先补回频率，不要急着硬拉强度。`
                : "本周训练频率已经达标，接下来更应该关注动作质量和恢复。",
            score: (0, shared_cjs_1.clamp)(76 + input.exercise.completionRate / 4, 66, 93),
            tone: trainingGap > 0 ? "neutral" : "positive"
        }
    ];
    return {
        generatedAt: new Date().toISOString(),
        title: "今日 Agent 建议面板",
        focus: input.focus,
        summary: "先稳住节律、再推进目标，把对话、建议和多模态提示放在同一条链路里。",
        agentName: AGENT_NAME,
        modelLabel: getModel(),
        persona: AGENT_PERSONA,
        capabilities: AGENT_CAPABILITIES,
        modalityIdeas: DEFAULT_MODALITY_IDEAS,
        readinessScore,
        riskLabel: readinessScore >= 80 ? "可以推进" : readinessScore >= 68 ? "稳步执行" : "先修复底盘",
        nextCheckIn: sleepGap > 0.5 ? "今晚 22:30 前回看" : "明天午前复盘",
        quickQuestions: ["今晚吃多了怎么办？", "明天训练怎么安排更稳？", "最近体重不降我先查什么？"],
        metrics: buildMetrics(input),
        priorities,
        insights: [
            {
                title: "当前最重要的不是更猛",
                detail: "你现在更需要一个能连续执行的节律，而不是再进一步压缩热量或拉高训练。",
                evidence: "体重、恢复和训练完成率的反馈更适合稳步推进。",
                tone: "neutral"
            },
            {
                title: "先把波动源找出来",
                detail: "夜间摄入、睡眠不足和记录漏项，往往比方案本身更容易制造平台感。",
                evidence: "这些变量会直接影响食欲、恢复和体重短期波动。",
                tone: "positive"
            }
        ],
        actions: [
            {
                title: "今晚先把晚餐和加餐收住",
                detail: "如果已经吃多了，就停止继续加餐，优先饮水、步行和按时睡觉。",
                impact: "减少体重和食欲的次日波动",
                difficulty: "低",
                timeline: "今天",
                tone: calorieOverflow > 120 ? "warning" : "neutral"
            },
            {
                title: "安排一次稳态训练",
                detail: "选择 25 到 40 分钟的中等强度训练，目标是补齐节奏，不是冲极限。",
                impact: "稳定训练频率和代谢刺激",
                difficulty: "中",
                timeline: "24 小时内",
                tone: "positive"
            }
        ],
        derivedContents: [
            {
                title: "聚餐次日修正方案",
                detail: "把第二天安排成高蛋白、足饮水、正常训练，不做极端节食补救。",
                reason: "你更需要把波动拉平，而不是制造更大的反扑。",
                category: "meal",
                cta: "让我按明天时间线帮你排一版。"
            },
            {
                title: "平台期排查顺序",
                detail: "优先排查晚间摄入、记录完整度、睡眠不足和训练完成率。",
                reason: "这些因素最容易制造“很努力但没变化”的感受。",
                category: "habit",
                cta: "让我带你逐项过一遍。"
            }
        ],
        reminders: ["晚饭后 15 分钟记录饮食", "睡前 1 小时避免高糖加餐", "周末复盘体重和训练完成率"],
        conversation: []
    };
}
function buildContextDigest(input) {
    const { profile, diet, exercise, trend } = input;
    return {
        profile: {
            age: profile.age,
            gender: profile.gender,
            heightCm: profile.heightCm,
            currentWeightKg: profile.currentWeightKg,
            bodyFatRate: profile.bodyFatRate,
            targetWeightKg: profile.targetWeightKg,
            sleepTargetHours: profile.sleepTargetHours,
            workStyle: profile.workStyle,
            stressLevel: profile.stressLevel,
            smokingStatus: profile.smokingStatus,
            drinkingFrequency: profile.drinkingFrequency,
            habitSleep: profile.habitSleep,
            habitDiet: profile.habitDiet,
            habitExercise: profile.habitExercise
        },
        diet: {
            todayCalories: diet.todayCalories,
            calorieTarget: diet.calorieTarget,
            remainingCalories: diet.remainingCalories,
            waterIntakeMl: diet.waterIntakeMl,
            waterTargetMl: diet.waterTargetMl,
            protein: diet.protein,
            proteinTarget: diet.proteinTarget,
            carbs: diet.carbs,
            fat: diet.fat,
            mealGroups: diet.mealGroups,
            insights: diet.insights
        },
        exercise: {
            weeklyGoalDays: exercise.weeklyGoalDays,
            completedDays: exercise.completedDays,
            totalMinutes: exercise.totalMinutes,
            totalCaloriesBurned: exercise.totalCaloriesBurned,
            completionRate: exercise.completionRate,
            streakDays: exercise.streakDays,
            todayMinutes: exercise.todayMinutes,
            categoryBreakdown: exercise.categoryBreakdown,
            insights: exercise.insights
        },
        trend: {
            latestWeight: trend.latestWeight,
            latestBodyFatRate: trend.latestBodyFatRate,
            latestWaistCm: trend.latestWaistCm,
            averageSleepHours: trend.averageSleepHours,
            averageSteps: trend.averageSteps,
            targetWeight: trend.targetWeight,
            averageTrainingMinutes: trend.averageTrainingMinutes,
            averageCalorieGap: trend.averageCalorieGap,
            completionRate: trend.completionRate,
            insights: trend.insights
        }
    };
}
function buildConversationPrompt(conversation, question) {
    const recent = conversation
        .slice(-8)
        .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}[${item.tag}]: ${item.content}`);
    if (question)
        recent.push(`User[latest]: ${question}`);
    return recent.join("\n");
}
async function callAgentApi(input) {
    const apiKey = getApiKey();
    if (!apiKey)
        throw new Error("未检测到 LIGHTBALANCE_GEMINI_API_KEY，无法通过 Agent API 发起对话。");
    const { endpoint } = buildChatEndpoint();
    const payload = {
        model: getModel(),
        temperature: input.mode === "reply" ? 0.85 : 0.7,
        top_p: 0.9,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: "You are Astra, a Chinese health rhythm agent. You are not a doctor and must not diagnose disease. Answer in Chinese. Be practical, concrete, empathetic, and execution-oriented. Output valid JSON only."
            },
            {
                role: "user",
                content: JSON.stringify({
                    task: input.mode === "reply"
                        ? "Respond to the latest user question and refresh the full assistant panel at the same time."
                        : "Refresh the daily assistant panel based on the latest health context.",
                    outputShape: {
                        title: "string",
                        summary: "string",
                        riskLabel: "string",
                        nextCheckIn: "string",
                        quickQuestions: ["string"],
                        priorities: [{ title: "string", detail: "string", score: 88, tone: "neutral|positive|warning" }],
                        insights: [{ title: "string", detail: "string", evidence: "string", tone: "neutral|positive|warning" }],
                        actions: [{ title: "string", detail: "string", impact: "string", difficulty: "low|medium|high", timeline: "string", tone: "neutral|positive|warning" }],
                        derivedContents: [{ title: "string", detail: "string", reason: "string", category: "habit|meal|training|recovery|mindset", cta: "string" }],
                        modalityIdeas: [{ title: "string", detail: "string", prompt: "string", inputType: "meal_photo|body_photo|sleep_screenshot|workout_screenshot|text_note", why: "string", captureTips: ["string"] }],
                        reminders: ["string"],
                        reply: { tag: "string", content: "string" }
                    },
                    focus: input.focus,
                    latestQuestion: input.question ?? null,
                    conversation: buildConversationPrompt(input.conversation, input.question ?? null),
                    userContext: buildContextDigest(input)
                }, null, 2)
            }
        ]
    };
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Agent API 请求失败: ${response.status} ${errorText}`);
    }
    const text = await parseChatCompletionResponse(response);
    return safeParseJson(extractJsonBlock(text), null);
}
function mergeModelPayload(basePlan, payload) {
    if (!payload)
        return { plan: basePlan, reply: null };
    const priorities = Array.isArray(payload.priorities)
        ? payload.priorities.slice(0, 4).map((item, index) => ({
            title: sanitizeString(item.title, basePlan.priorities[index]?.title ?? `优先项 ${index + 1}`),
            detail: sanitizeString(item.detail, basePlan.priorities[index]?.detail ?? "保持节律稳定。"),
            score: (0, shared_cjs_1.clamp)(Number(item.score) || basePlan.priorities[index]?.score || 80, 0, 100),
            tone: normalizeTone(item.tone, basePlan.priorities[index]?.tone ?? "neutral")
        }))
        : basePlan.priorities;
    const insights = Array.isArray(payload.insights)
        ? payload.insights.slice(0, 4).map((item, index) => ({
            title: sanitizeString(item.title, basePlan.insights[index]?.title ?? `洞察 ${index + 1}`),
            detail: sanitizeString(item.detail, basePlan.insights[index]?.detail ?? "保持观察。"),
            evidence: sanitizeString(item.evidence, basePlan.insights[index]?.evidence ?? `当前焦点：${basePlan.focus}`),
            tone: normalizeTone(item.tone, basePlan.insights[index]?.tone ?? "neutral")
        }))
        : basePlan.insights;
    const actions = Array.isArray(payload.actions)
        ? payload.actions.slice(0, 4).map((item, index) => ({
            title: sanitizeString(item.title, basePlan.actions[index]?.title ?? `行动 ${index + 1}`),
            detail: sanitizeString(item.detail, basePlan.actions[index]?.detail ?? "继续执行。"),
            impact: sanitizeString(item.impact, basePlan.actions[index]?.impact ?? "改善状态"),
            difficulty: sanitizeString(item.difficulty, basePlan.actions[index]?.difficulty ?? "中"),
            timeline: sanitizeString(item.timeline, basePlan.actions[index]?.timeline ?? "今天"),
            tone: normalizeTone(item.tone, basePlan.actions[index]?.tone ?? "neutral")
        }))
        : basePlan.actions;
    const derivedContents = Array.isArray(payload.derivedContents)
        ? payload.derivedContents.slice(0, 4).map((item, index) => ({
            title: sanitizeString(item.title, basePlan.derivedContents[index]?.title ?? `衍生内容 ${index + 1}`),
            detail: sanitizeString(item.detail, basePlan.derivedContents[index]?.detail ?? "围绕当前建议继续展开。"),
            reason: sanitizeString(item.reason, basePlan.derivedContents[index]?.reason ?? "和当前状态直接相关。"),
            category: normalizeDerivedCategory(item.category, basePlan.derivedContents[index]?.category ?? "habit"),
            cta: sanitizeString(item.cta, basePlan.derivedContents[index]?.cta ?? "继续追问我。")
        }))
        : basePlan.derivedContents;
    const modalityIdeas = Array.isArray(payload.modalityIdeas)
        ? payload.modalityIdeas.slice(0, 4).map((item, index) => ({
            title: sanitizeString(item.title, basePlan.modalityIdeas?.[index]?.title ?? `多模态建议 ${index + 1}`),
            detail: sanitizeString(item.detail, basePlan.modalityIdeas?.[index]?.detail ?? "补充更多上下文。"),
            prompt: sanitizeString(item.prompt, basePlan.modalityIdeas?.[index]?.prompt ?? "继续告诉我更多背景。"),
            inputType: normalizeInputType(item.inputType, basePlan.modalityIdeas?.[index]?.inputType ?? "text_note"),
            why: sanitizeString(item.why, basePlan.modalityIdeas?.[index]?.why ?? "这样能让我判断得更准。"),
            captureTips: sanitizeStringArray(item.captureTips, basePlan.modalityIdeas?.[index]?.captureTips ?? ["尽量把关键信息拍全"], 4)
        }))
        : basePlan.modalityIdeas ?? DEFAULT_MODALITY_IDEAS;
    return {
        plan: {
            ...basePlan,
            title: sanitizeString(payload.title, basePlan.title),
            summary: sanitizeString(payload.summary, basePlan.summary),
            riskLabel: sanitizeString(payload.riskLabel, basePlan.riskLabel),
            nextCheckIn: sanitizeString(payload.nextCheckIn, basePlan.nextCheckIn),
            quickQuestions: sanitizeStringArray(payload.quickQuestions, basePlan.quickQuestions, 5),
            priorities,
            insights,
            actions,
            derivedContents,
            modalityIdeas,
            reminders: sanitizeStringArray(payload.reminders, basePlan.reminders, 4)
        },
        reply: payload.reply?.content
            ? {
                tag: sanitizeString(payload.reply.tag, `${basePlan.focus}回复`),
                content: sanitizeString(payload.reply.content, payload.reply.content)
            }
            : null
    };
}
async function insertMessage(connection, userId, role, tag, content) {
    const messageId = await (0, shared_cjs_1.getNextTableId)(connection, "assistant_chat_message", "message_id", 130000);
    await connection.execute(`INSERT INTO assistant_chat_message (message_id, user_id, role, tag, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`, [messageId, userId, role, tag, content, new Date()]);
}
async function saveSnapshot(connection, userId, plan) {
    const snapshotId = await (0, shared_cjs_1.getNextTableId)(connection, "assistant_plan_snapshot", "snapshot_id", 120000);
    const generatedAt = new Date(plan.generatedAt);
    await connection.execute(`INSERT INTO assistant_plan_snapshot
      (snapshot_id, user_id, focus, title, summary, readiness_score, risk_label, next_check_in, quick_questions_json,
       metrics_json, priorities_json, insights_json, actions_json, derived_contents_json, modality_ideas_json,
       reminders_json, generated_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        snapshotId,
        userId,
        plan.focus,
        plan.title,
        plan.summary,
        plan.readinessScore,
        plan.riskLabel,
        plan.nextCheckIn,
        JSON.stringify(plan.quickQuestions),
        JSON.stringify(plan.metrics),
        JSON.stringify(plan.priorities),
        JSON.stringify(plan.insights),
        JSON.stringify(plan.actions),
        JSON.stringify(plan.derivedContents),
        JSON.stringify(plan.modalityIdeas ?? []),
        JSON.stringify(plan.reminders),
        generatedAt,
        generatedAt
    ]);
}
async function readConversation(connection, userId) {
    const [rows] = await connection.execute(`SELECT message_id, role, tag, content, created_at
     FROM assistant_chat_message
     WHERE user_id = ?
     ORDER BY created_at DESC, message_id DESC
     LIMIT 20`, [userId]);
    return rows
        .slice()
        .reverse()
        .map((row) => ({
        id: Number(row.message_id),
        role: row.role,
        tag: row.tag,
        content: row.content,
        createdAt: new Date(row.created_at).toISOString()
    }));
}
async function readLatestSnapshot(connection, userId) {
    const [rows] = await connection.execute(`SELECT snapshot_id, focus, title, summary, readiness_score, risk_label, next_check_in, quick_questions_json, metrics_json,
            priorities_json, insights_json, actions_json, derived_contents_json, modality_ideas_json, reminders_json, generated_at
     FROM assistant_plan_snapshot
     WHERE user_id = ?
     ORDER BY generated_at DESC, snapshot_id DESC
     LIMIT 1`, [userId]);
    return rows[0] ?? null;
}
function snapshotToPlan(snapshot, conversation) {
    return {
        generatedAt: new Date(snapshot.generated_at).toISOString(),
        title: snapshot.title,
        focus: snapshot.focus,
        summary: snapshot.summary,
        agentName: AGENT_NAME,
        modelLabel: getModel(),
        persona: AGENT_PERSONA,
        capabilities: AGENT_CAPABILITIES,
        modalityIdeas: safeParseJson(snapshot.modality_ideas_json, DEFAULT_MODALITY_IDEAS),
        readinessScore: Number(snapshot.readiness_score),
        riskLabel: snapshot.risk_label,
        nextCheckIn: snapshot.next_check_in,
        quickQuestions: safeParseJson(snapshot.quick_questions_json, []),
        metrics: safeParseJson(snapshot.metrics_json, []),
        priorities: safeParseJson(snapshot.priorities_json, []),
        insights: safeParseJson(snapshot.insights_json, []),
        actions: safeParseJson(snapshot.actions_json, []),
        derivedContents: safeParseJson(snapshot.derived_contents_json, []),
        reminders: safeParseJson(snapshot.reminders_json, []),
        conversation
    };
}
async function generatePlan(input) {
    const basePlan = buildBasePlan(input);
    try {
        return mergeModelPayload(basePlan, await callAgentApi({
            mode: input.question ? "reply" : "panel",
            focus: input.focus,
            question: input.question,
            profile: input.profile,
            diet: input.diet,
            exercise: input.exercise,
            trend: input.trend,
            conversation: input.conversation
        }));
    }
    catch (error) {
        if (input.question)
            throw error;
        return mergeModelPayload(basePlan, null);
    }
}
async function buildAndPersistPlan(connection, userId, focus = DEFAULT_FOCUS) {
    const conversation = await readConversation(connection, userId);
    const [profile, diet, exercise, trend] = await Promise.all([
        (0, body_cjs_1.getBodyProfile)(userId),
        (0, diet_cjs_1.getDietSummary)(userId),
        (0, exercise_cjs_1.getExerciseSummary)(userId),
        (0, trend_cjs_1.getTrendSummary)(userId)
    ]);
    const { plan } = await generatePlan({ focus, profile, diet, exercise, trend, conversation });
    await saveSnapshot(connection, userId, plan);
    return { ...plan, conversation: await readConversation(connection, userId) };
}
async function getAssistantPlan(userId) {
    if (!userId)
        throw new Error("用户信息无效");
    await (0, shared_cjs_1.ensureAnalyticsSchema)();
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await ensureAssistantSchema(connection);
        const conversation = await readConversation(connection, userId);
        const snapshot = await readLatestSnapshot(connection, userId);
        if (snapshot) {
            const generatedAt = new Date(snapshot.generated_at).getTime();
            if (Date.now() - generatedAt < SNAPSHOT_TTL_MS)
                return snapshotToPlan(snapshot, conversation);
        }
        if (!conversation.length) {
            await insertMessage(connection, userId, "assistant", "Agent 开场", "我会结合你的身体数据、饮食、训练和趋势，用实时对话的方式给你建议，也会告诉你什么时候适合补充图片和截图。");
        }
        return buildAndPersistPlan(connection, userId, DEFAULT_FOCUS);
    }
    finally {
        connection.release();
    }
}
async function askAssistant(input) {
    const userId = Number(input.userId);
    const question = String(input.question ?? "").trim();
    const focus = String(input.focus ?? "").trim() || DEFAULT_FOCUS;
    if (!userId)
        throw new Error("用户信息无效");
    if (!question)
        throw new Error("请输入你的问题");
    await (0, shared_cjs_1.ensureAnalyticsSchema)();
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await ensureAssistantSchema(connection);
        await insertMessage(connection, userId, "user", focus, question);
        const conversation = await readConversation(connection, userId);
        const [profile, diet, exercise, trend] = await Promise.all([
            (0, body_cjs_1.getBodyProfile)(userId),
            (0, diet_cjs_1.getDietSummary)(userId),
            (0, exercise_cjs_1.getExerciseSummary)(userId),
            (0, trend_cjs_1.getTrendSummary)(userId)
        ]);
        const { plan, reply } = await generatePlan({ focus, question, profile, diet, exercise, trend, conversation });
        const assistantReply = reply ?? { tag: `${focus}回复`, content: plan.summary };
        await insertMessage(connection, userId, "assistant", assistantReply.tag, assistantReply.content);
        await saveSnapshot(connection, userId, plan);
        return { ...plan, conversation: await readConversation(connection, userId) };
    }
    finally {
        connection.release();
    }
}
async function probeGeminiConnection() {
    const apiKey = getApiKey();
    const model = getModel();
    const { baseUrl, endpoint } = buildChatEndpoint();
    const startedAt = Date.now();
    if (!apiKey) {
        return {
            ok: false,
            provider: "OpenAI-compatible Gemini gateway",
            model,
            baseUrl,
            endpoint,
            keyStatus: "missing",
            status: null,
            latencyMs: 0,
            message: "未检测到 LIGHTBALANCE_GEMINI_API_KEY。",
            replyPreview: "",
            checkedAt: new Date().toISOString()
        };
    }
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                temperature: 0,
                max_tokens: 32,
                messages: [
                    { role: "system", content: "You are a connectivity probe. Reply with a short plain text status." },
                    { role: "user", content: "Return exactly: GEMINI_OK" }
                ]
            })
        });
        const latencyMs = Date.now() - startedAt;
        if (!response.ok) {
            const errorText = await response.text();
            return {
                ok: false,
                provider: "OpenAI-compatible Gemini gateway",
                model,
                baseUrl,
                endpoint,
                keyStatus: "present",
                status: response.status,
                latencyMs,
                message: `请求失败: HTTP ${response.status}`,
                replyPreview: errorText.slice(0, 300),
                checkedAt: new Date().toISOString()
            };
        }
        const text = await parseChatCompletionResponse(response);
        return {
            ok: text.includes("GEMINI_OK"),
            provider: "OpenAI-compatible Gemini gateway",
            model,
            baseUrl,
            endpoint,
            keyStatus: "present",
            status: response.status,
            latencyMs,
            message: text.includes("GEMINI_OK") ? "连通成功，已经拿到模型响应。" : "接口可达，但返回内容和预期不完全一致。",
            replyPreview: text.slice(0, 300),
            checkedAt: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            ok: false,
            provider: "OpenAI-compatible Gemini gateway",
            model,
            baseUrl,
            endpoint,
            keyStatus: "present",
            status: null,
            latencyMs: Date.now() - startedAt,
            message: error instanceof Error ? error.message : "请求过程中出现未知错误。",
            replyPreview: "",
            checkedAt: new Date().toISOString()
        };
    }
}
