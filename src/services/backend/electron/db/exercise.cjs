"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExerciseSummary = getExerciseSummary;
exports.addExerciseEntry = addExerciseEntry;
exports.updateExerciseEntry = updateExerciseEntry;
exports.deleteExerciseEntry = deleteExerciseEntry;
const shared_cjs_1 = require("./shared.cjs");
const body_cjs_1 = require("./body.cjs");
const DEFAULT_STATUS = "已完成";
const DEFAULT_CATEGORY = "综合训练";
const DEFAULT_INTENSITY = "中等";
function normalizePositiveNumber(value, fallback, min = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.max(min, Math.round(parsed));
}
function getWeekDates() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return {
        start,
        end,
        startDate: (0, shared_cjs_1.formatDateKey)(start),
        endDate: (0, shared_cjs_1.formatDateKey)(end),
        todayDate: (0, shared_cjs_1.formatDateKey)(now)
    };
}
async function ensureExerciseSchema(connection) {
    await connection.execute(`
    CREATE TABLE IF NOT EXISTS exercise_session_log (
      session_id INT NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      performed_on DATE NOT NULL,
      performed_at DATETIME NOT NULL,
      name VARCHAR(120) NOT NULL,
      category VARCHAR(40) NOT NULL DEFAULT '综合训练',
      duration_minutes INT NOT NULL DEFAULT 0,
      calories_burned INT NOT NULL DEFAULT 0,
      intensity VARCHAR(30) NOT NULL DEFAULT '中等',
      status VARCHAR(30) NOT NULL DEFAULT '已完成',
      notes VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      KEY idx_exercise_user_date (user_id, performed_on),
      KEY idx_exercise_user_performed_at (user_id, performed_at)
    )
  `);
}
async function createSeedSession(connection, userId, date, seed) {
    const sessionId = await (0, shared_cjs_1.getNextTableId)(connection, "exercise_session_log", "session_id", 90000);
    const performedAt = new Date(date);
    performedAt.setHours(19, 0, 0, 0);
    const now = new Date();
    await connection.execute(`INSERT INTO exercise_session_log
      (session_id, user_id, performed_on, performed_at, name, category, duration_minutes, calories_burned, intensity, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        sessionId,
        userId,
        (0, shared_cjs_1.formatDateKey)(date),
        performedAt,
        seed.name,
        seed.category,
        seed.durationMinutes,
        seed.caloriesBurned,
        seed.intensity,
        DEFAULT_STATUS,
        seed.notes,
        now,
        now
    ]);
}
async function ensureSeedSessions(connection, userId) {
    const [allRows] = await connection.execute("SELECT COUNT(*) AS total FROM exercise_session_log WHERE user_id = ?", [userId]);
    if (Number(allRows[0]?.total ?? 0) > 0) {
        return;
    }
    const { start } = getWeekDates();
    const monday = new Date(start);
    const wednesday = new Date(start);
    const friday = new Date(start);
    wednesday.setDate(wednesday.getDate() + 2);
    friday.setDate(friday.getDate() + 4);
    await createSeedSession(connection, userId, monday, {
        name: "上肢力量训练",
        category: "力量",
        durationMinutes: 45,
        caloriesBurned: 320,
        intensity: "中高强度",
        notes: "以推拉动作为主，兼顾肩背稳定。"
    });
    await createSeedSession(connection, userId, wednesday, {
        name: "快走恢复",
        category: "有氧",
        durationMinutes: 35,
        caloriesBurned: 220,
        intensity: "中等",
        notes: "控制心率，作为工作日恢复训练。"
    });
    await createSeedSession(connection, userId, friday, {
        name: "核心稳定训练",
        category: "功能",
        durationMinutes: 28,
        caloriesBurned: 160,
        intensity: "中等",
        notes: "重点激活核心与髋部稳定。"
    });
}
function calculateStreak(rows, todayDate) {
    const completedDates = new Set(rows.filter((row) => row.status === DEFAULT_STATUS).map((row) => String(row.performed_on).slice(0, 10)));
    let streak = 0;
    const cursor = new Date(todayDate);
    while (completedDates.has((0, shared_cjs_1.formatDateKey)(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}
function buildInsights(summary) {
    const remainingDays = Math.max(summary.weeklyGoalDays - summary.completedDays, 0);
    const topCategory = [...summary.categoryBreakdown].sort((left, right) => right.totalMinutes - left.totalMinutes)[0];
    return [
        remainingDays === 0
            ? {
                title: "本周训练目标已达成",
                detail: "训练频次已经满足目标，可以把重点放在恢复、拉伸和睡眠上。",
                tone: "positive"
            }
            : {
                title: `还差 ${remainingDays} 天完成周目标`,
                detail: "可以把下一次训练控制在 25 到 40 分钟，优先保证节奏不断。",
                tone: remainingDays >= 3 ? "warning" : "neutral"
            },
        summary.todayMinutes >= 30
            ? {
                title: "今天已有有效训练",
                detail: "今天的活动量已经起步，晚些时候更适合做恢复和轻拉伸。",
                tone: "positive"
            }
            : {
                title: "今天还可以安排一段短训练",
                detail: "如果时间有限，做一组 20 分钟快走、骑行或核心训练也很有效。",
                tone: "neutral"
            },
        topCategory
            ? {
                title: `${topCategory.category}训练占比最高`,
                detail: `${topCategory.category}本周累计 ${topCategory.totalMinutes} 分钟，下一次可以和其他训练类型穿插安排。`,
                tone: topCategory.sessions >= 3 ? "warning" : "neutral"
            }
            : {
                title: "等待第一条训练记录",
                detail: "记录一场训练后，这里会开始生成你的训练结构反馈。",
                tone: "neutral"
            }
    ];
}
async function readExerciseSummary(userId) {
    await (0, shared_cjs_1.ensureAnalyticsSchema)();
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await ensureExerciseSchema(connection);
        const profile = await (0, body_cjs_1.getBodyProfile)(userId);
        if (!profile) {
            throw new Error("用户档案不存在");
        }
        await ensureSeedSessions(connection, userId);
        const { startDate, endDate, todayDate } = getWeekDates();
        const [rows] = await connection.execute(`SELECT session_id, user_id, performed_on, performed_at, name, category, duration_minutes, calories_burned, intensity, status, notes
       FROM exercise_session_log
       WHERE user_id = ? AND performed_on BETWEEN ? AND ?
       ORDER BY performed_at DESC, session_id DESC`, [userId, startDate, endDate]);
        const completedRows = rows.filter((row) => row.status === DEFAULT_STATUS);
        const completedDates = new Set(completedRows.map((row) => String(row.performed_on).slice(0, 10)));
        const totalMinutes = completedRows.reduce((sum, row) => sum + Number(row.duration_minutes), 0);
        const totalCaloriesBurned = completedRows.reduce((sum, row) => sum + Number(row.calories_burned), 0);
        const todayMinutes = completedRows
            .filter((row) => String(row.performed_on).slice(0, 10) === todayDate)
            .reduce((sum, row) => sum + Number(row.duration_minutes), 0);
        const categoryMap = new Map();
        for (const row of completedRows) {
            const category = row.category || DEFAULT_CATEGORY;
            const bucket = categoryMap.get(category) ?? {
                category,
                sessions: 0,
                totalMinutes: 0,
                totalCaloriesBurned: 0
            };
            bucket.sessions += 1;
            bucket.totalMinutes += Number(row.duration_minutes);
            bucket.totalCaloriesBurned += Number(row.calories_burned);
            categoryMap.set(category, bucket);
        }
        const weeklyGoalDays = Math.max(profile.weeklyWorkoutTarget, 1);
        const completedDays = completedDates.size;
        const completionRate = (0, shared_cjs_1.clamp)(Math.round((completedDays / weeklyGoalDays) * 100), 0, 100);
        const averageMinutes = completedRows.length > 0 ? Math.round(totalMinutes / completedRows.length) : 0;
        const categoryBreakdown = [...categoryMap.values()].sort((left, right) => right.totalMinutes - left.totalMinutes);
        return {
            weeklyGoalDays,
            completedDays,
            totalMinutes,
            totalCaloriesBurned,
            todayMinutes,
            averageMinutes,
            completionRate,
            streakDays: calculateStreak(rows, todayDate),
            workouts: rows.map((row) => ({
                id: Number(row.session_id),
                name: row.name,
                category: row.category,
                durationMinutes: Number(row.duration_minutes),
                caloriesBurned: Number(row.calories_burned),
                intensity: row.intensity,
                status: row.status,
                notes: row.notes ?? "",
                performedAt: new Date(row.performed_at).toISOString()
            })),
            categoryBreakdown,
            insights: buildInsights({
                weeklyGoalDays,
                completedDays,
                totalMinutes,
                todayMinutes,
                categoryBreakdown
            })
        };
    }
    finally {
        connection.release();
    }
}
function normalizeExerciseInput(input) {
    const name = String(input.name ?? "").trim();
    return {
        name,
        category: String(input.category ?? "").trim() || DEFAULT_CATEGORY,
        intensity: String(input.intensity ?? "").trim() || DEFAULT_INTENSITY,
        status: String(input.status ?? "").trim() || DEFAULT_STATUS,
        notes: String(input.notes ?? "").trim(),
        durationMinutes: normalizePositiveNumber(input.durationMinutes, 0, 10),
        caloriesBurned: normalizePositiveNumber(input.caloriesBurned, 0, 20)
    };
}
async function getExerciseSummary(userId) {
    return readExerciseSummary(userId);
}
async function addExerciseEntry(input) {
    const userId = Number(input.userId);
    if (!userId) {
        throw new Error("用户信息无效");
    }
    const normalized = normalizeExerciseInput(input);
    if (!normalized.name) {
        throw new Error("请输入训练名称");
    }
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await (0, shared_cjs_1.ensureAnalyticsSchema)();
        await ensureExerciseSchema(connection);
        const sessionId = await (0, shared_cjs_1.getNextTableId)(connection, "exercise_session_log", "session_id", 90000);
        const now = new Date();
        await connection.execute(`INSERT INTO exercise_session_log
        (session_id, user_id, performed_on, performed_at, name, category, duration_minutes, calories_burned, intensity, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            sessionId,
            userId,
            (0, shared_cjs_1.formatDateKey)(now),
            now,
            normalized.name,
            normalized.category,
            normalized.durationMinutes,
            normalized.caloriesBurned,
            normalized.intensity,
            normalized.status,
            normalized.notes,
            now,
            now
        ]);
    }
    finally {
        connection.release();
    }
    return readExerciseSummary(userId);
}
async function updateExerciseEntry(input) {
    const userId = Number(input.userId);
    const id = Number(input.id);
    if (!userId || !id) {
        throw new Error("训练记录信息无效");
    }
    const normalized = normalizeExerciseInput(input);
    if (!normalized.name) {
        throw new Error("请输入训练名称");
    }
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await (0, shared_cjs_1.ensureAnalyticsSchema)();
        await ensureExerciseSchema(connection);
        await connection.execute(`UPDATE exercise_session_log
       SET name = ?, category = ?, duration_minutes = ?, calories_burned = ?, intensity = ?, status = ?, notes = ?, updated_at = ?
       WHERE session_id = ? AND user_id = ?`, [
            normalized.name,
            normalized.category,
            normalized.durationMinutes,
            normalized.caloriesBurned,
            normalized.intensity,
            normalized.status,
            normalized.notes,
            new Date(),
            id,
            userId
        ]);
    }
    finally {
        connection.release();
    }
    return readExerciseSummary(userId);
}
async function deleteExerciseEntry(input) {
    const userId = Number(input.userId);
    const id = Number(input.id);
    if (!userId || !id) {
        throw new Error("训练记录信息无效");
    }
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await (0, shared_cjs_1.ensureAnalyticsSchema)();
        await ensureExerciseSchema(connection);
        await connection.execute("DELETE FROM exercise_session_log WHERE session_id = ? AND user_id = ?", [id, userId]);
    }
    finally {
        connection.release();
    }
    return readExerciseSummary(userId);
}
