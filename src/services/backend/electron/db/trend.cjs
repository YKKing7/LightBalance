"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrendSummary = getTrendSummary;
const shared_cjs_1 = require("./shared.cjs");
const body_cjs_1 = require("./body.cjs");
const WINDOW_DAYS = 21;
function getWindowDates(days) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: days }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (days - index - 1));
        return date;
    });
}
function formatLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);
}
function normalizeSnapshotDate(value) {
    if (value instanceof Date) {
        return (0, shared_cjs_1.formatDateKey)(value);
    }
    const raw = String(value).trim();
    const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
        return isoMatch[1];
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return (0, shared_cjs_1.formatDateKey)(parsed);
    }
    throw new Error(`Invalid snapshot_date value: ${raw}`);
}
function computeTargetWaist(heightCm, currentWeightKg, targetWeightKg) {
    const baseWaist = heightCm * 0.45;
    const weightGap = Math.max(currentWeightKg - targetWeightKg, 0);
    return (0, shared_cjs_1.round)(baseWaist + weightGap * 0.55, 1);
}
async function ensureTrendSchema(connection) {
    await connection.execute(`
    CREATE TABLE IF NOT EXISTS trend_daily_snapshot (
      snapshot_id INT NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      snapshot_date DATE NOT NULL,
      weight_kg DECIMAL(6,2) NOT NULL,
      body_fat_rate DECIMAL(5,2) NULL,
      waist_cm DECIMAL(6,2) NOT NULL,
      sleep_hours DECIMAL(4,1) NOT NULL DEFAULT 0,
      steps INT NOT NULL DEFAULT 0,
      calorie_intake INT NOT NULL DEFAULT 0,
      calorie_burned INT NOT NULL DEFAULT 0,
      training_minutes INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      UNIQUE KEY uniq_trend_snapshot_user_date (user_id, snapshot_date),
      KEY idx_trend_snapshot_user_date (user_id, snapshot_date)
    )
  `);
}
async function getExistingTables(connection) {
    const [rows] = await connection.execute(`SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()`);
    return new Set(rows.map((row) => String(row.TABLE_NAME)));
}
async function getDietAggregates(connection, userId, startDate, endDate, tableNames) {
    if (!tableNames.has("diet_meal_entry")) {
        return new Map();
    }
    const [rows] = await connection.execute(`SELECT log_date, SUM(calories) AS calorie_intake
     FROM diet_meal_entry
     WHERE user_id = ? AND log_date BETWEEN ? AND ?
     GROUP BY log_date`, [userId, startDate, endDate]);
    return new Map(rows.map((row) => [String(row.log_date).slice(0, 10), Number(row.calorie_intake ?? 0)]));
}
async function getExerciseAggregates(connection, userId, startDate, endDate, tableNames) {
    if (!tableNames.has("exercise_session_log")) {
        return new Map();
    }
    const [rows] = await connection.execute(`SELECT performed_on, SUM(calories_burned) AS calorie_burned, SUM(duration_minutes) AS training_minutes
     FROM exercise_session_log
     WHERE user_id = ? AND performed_on BETWEEN ? AND ?
     GROUP BY performed_on`, [userId, startDate, endDate]);
    return new Map(rows.map((row) => [
        String(row.performed_on).slice(0, 10),
        {
            calorieBurned: Number(row.calorie_burned ?? 0),
            trainingMinutes: Number(row.training_minutes ?? 0)
        }
    ]));
}
function buildDraftForDate(input) {
    const { profile, index, total, dietIntake, exercise } = input;
    const reverseProgress = (total - index - 1) / Math.max(total - 1, 1);
    const wave = Math.sin(index * 0.7) * 0.18;
    const weightKg = index === total - 1 ? profile.currentWeightKg : (0, shared_cjs_1.round)(profile.currentWeightKg + reverseProgress * 1.8 + wave, 1);
    const baseBodyFat = profile.bodyFatRate ?? (0, shared_cjs_1.clamp)(18 + reverseProgress * 1.6, 16, 28);
    const bodyFatRate = index === total - 1 && profile.bodyFatRate !== null ? (0, shared_cjs_1.round)(profile.bodyFatRate, 1) : (0, shared_cjs_1.round)(baseBodyFat + wave * 1.2, 1);
    const waistBase = computeTargetWaist(profile.heightCm, profile.currentWeightKg, profile.targetWeightKg);
    const waistCm = (0, shared_cjs_1.round)(waistBase + reverseProgress * 1.4 + Math.cos(index * 0.55) * 0.25, 1);
    const trainingMinutes = exercise?.trainingMinutes ?? (index % 3 === 0 ? 42 : index % 2 === 0 ? 26 : 0);
    const calorieBurned = exercise?.calorieBurned ?? trainingMinutes * 7;
    const sleepHours = (0, shared_cjs_1.round)((0, shared_cjs_1.clamp)(profile.sleepTargetHours - 0.4 + Math.cos(index * 0.8) * 0.55, 5.6, 9), 1);
    const stepsBase = profile.workStyle.includes("久坐") ? 7000 : 9200;
    const steps = Math.round((0, shared_cjs_1.clamp)(stepsBase + trainingMinutes * 55 + Math.sin(index * 0.65) * 900, 4200, 18000));
    const calorieIntake = Math.round(dietIntake ?? (0, shared_cjs_1.clamp)(profile.dailyCalorieTarget - 120 + Math.cos(index * 0.45) * 180 + trainingMinutes * 3, 1100, 2800));
    return {
        weightKg,
        bodyFatRate,
        waistCm,
        sleepHours,
        steps,
        calorieIntake,
        calorieBurned,
        trainingMinutes
    };
}
async function upsertSnapshot(connection, userId, dateString, draft) {
    const [rows] = await connection.execute("SELECT snapshot_id FROM trend_daily_snapshot WHERE user_id = ? AND snapshot_date = ? LIMIT 1", [userId, dateString]);
    const now = new Date();
    if (rows[0]) {
        await connection.execute(`UPDATE trend_daily_snapshot
       SET weight_kg = ?, body_fat_rate = ?, waist_cm = ?, sleep_hours = ?, steps = ?, calorie_intake = ?, calorie_burned = ?,
           training_minutes = ?, updated_at = ?
       WHERE snapshot_id = ?`, [
            draft.weightKg,
            draft.bodyFatRate,
            draft.waistCm,
            draft.sleepHours,
            draft.steps,
            draft.calorieIntake,
            draft.calorieBurned,
            draft.trainingMinutes,
            now,
            Number(rows[0].snapshot_id)
        ]);
        return;
    }
    const snapshotId = await (0, shared_cjs_1.getNextTableId)(connection, "trend_daily_snapshot", "snapshot_id", 110000);
    await connection.execute(`INSERT INTO trend_daily_snapshot
      (snapshot_id, user_id, snapshot_date, weight_kg, body_fat_rate, waist_cm, sleep_hours, steps, calorie_intake, calorie_burned,
       training_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        snapshotId,
        userId,
        dateString,
        draft.weightKg,
        draft.bodyFatRate,
        draft.waistCm,
        draft.sleepHours,
        draft.steps,
        draft.calorieIntake,
        draft.calorieBurned,
        draft.trainingMinutes,
        now,
        now
    ]);
}
async function ensureTrendSnapshots(connection, userId) {
    const profile = await (0, body_cjs_1.getBodyProfile)(userId);
    if (!profile) {
        throw new Error("用户档案不存在");
    }
    const dates = getWindowDates(WINDOW_DAYS);
    const startDate = (0, shared_cjs_1.formatDateKey)(dates[0]);
    const endDate = (0, shared_cjs_1.formatDateKey)(dates[dates.length - 1]);
    const tables = await getExistingTables(connection);
    const dietMap = await getDietAggregates(connection, userId, startDate, endDate, tables);
    const exerciseMap = await getExerciseAggregates(connection, userId, startDate, endDate, tables);
    for (const [index, date] of dates.entries()) {
        const dateString = (0, shared_cjs_1.formatDateKey)(date);
        const draft = buildDraftForDate({
            profile,
            index,
            total: dates.length,
            dietIntake: dietMap.get(dateString),
            exercise: exerciseMap.get(dateString)
        });
        await upsertSnapshot(connection, userId, dateString, draft);
    }
}
function buildMetricCards(rows, targetWeight) {
    const latest = rows[rows.length - 1];
    const earliest = rows[0];
    const weightDelta = (0, shared_cjs_1.round)(Number(latest.weight_kg) - Number(earliest.weight_kg), 1);
    const bodyFatDelta = (0, shared_cjs_1.round)(Number(latest.body_fat_rate ?? 0) - Number(earliest.body_fat_rate ?? 0), 1);
    const avgSleep = (0, shared_cjs_1.round)(rows.reduce((sum, row) => sum + Number(row.sleep_hours), 0) / Math.max(rows.length, 1), 1);
    const avgSteps = Math.round(rows.reduce((sum, row) => sum + Number(row.steps), 0) / Math.max(rows.length, 1));
    const avgTraining = Math.round(rows.reduce((sum, row) => sum + Number(row.training_minutes), 0) / Math.max(rows.length, 1));
    return [
        {
            label: "体重收口",
            value: `${Number(latest.weight_kg).toFixed(1)} kg`,
            change: `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg / 21天`,
            note: `距离目标体重 ${(Number(latest.weight_kg) - targetWeight).toFixed(1)} kg`,
            tone: weightDelta <= 0 ? "positive" : "warning"
        },
        {
            label: "体脂变化",
            value: `${Number(latest.body_fat_rate ?? 0).toFixed(1)}%`,
            change: `${bodyFatDelta > 0 ? "+" : ""}${bodyFatDelta.toFixed(1)}%`,
            note: "观察减脂质量，而不仅是体重变化",
            tone: bodyFatDelta <= 0 ? "positive" : "neutral"
        },
        {
            label: "恢复节律",
            value: `${avgSleep.toFixed(1)} h`,
            change: `${avgTraining} 分钟/日`,
            note: "睡眠与训练量共同影响恢复速度",
            tone: avgSleep >= 7 ? "positive" : "warning"
        },
        {
            label: "活动基础",
            value: `${avgSteps}`,
            change: "日均步数",
            note: "把低强度活动维持在稳定区间",
            tone: avgSteps >= 8000 ? "positive" : "neutral"
        }
    ];
}
function buildRecoveryBreakdown(rows, sleepTargetHours) {
    const sleepQualifiedDays = rows.filter((row) => Number(row.sleep_hours) >= sleepTargetHours - 0.2).length;
    const stepQualifiedDays = rows.filter((row) => Number(row.steps) >= 8000).length;
    const trainingDays = rows.filter((row) => Number(row.training_minutes) >= 20).length;
    return [
        {
            label: "睡眠达标天数",
            value: sleepQualifiedDays,
            unit: `/${rows.length} 天`,
            tone: sleepQualifiedDays >= Math.round(rows.length * 0.65) ? "positive" : "warning"
        },
        {
            label: "步数达标天数",
            value: stepQualifiedDays,
            unit: `/${rows.length} 天`,
            tone: stepQualifiedDays >= Math.round(rows.length * 0.6) ? "positive" : "neutral"
        },
        {
            label: "训练活跃天数",
            value: trainingDays,
            unit: `/${rows.length} 天`,
            tone: trainingDays >= 6 ? "positive" : "neutral"
        }
    ];
}
function buildBehaviorBreakdown(rows) {
    const avgIntake = Math.round(rows.reduce((sum, row) => sum + Number(row.calorie_intake), 0) / Math.max(rows.length, 1));
    const avgBurned = Math.round(rows.reduce((sum, row) => sum + Number(row.calorie_burned), 0) / Math.max(rows.length, 1));
    const avgGap = Math.round(rows.reduce((sum, row) => sum + (Number(row.calorie_intake) - Number(row.calorie_burned)), 0) / Math.max(rows.length, 1));
    return [
        {
            label: "平均摄入",
            value: avgIntake,
            unit: "kcal",
            tone: "neutral"
        },
        {
            label: "平均训练消耗",
            value: avgBurned,
            unit: "kcal",
            tone: avgBurned >= 180 ? "positive" : "neutral"
        },
        {
            label: "平均热量差",
            value: avgGap,
            unit: "kcal",
            tone: avgGap <= 1700 ? "positive" : "warning"
        }
    ];
}
function buildInsights(rows, profile) {
    const latest = rows[rows.length - 1];
    const earliest = rows[0];
    const weightDelta = (0, shared_cjs_1.round)(Number(latest.weight_kg) - Number(earliest.weight_kg), 1);
    const sleepLowDays = rows.filter((row) => Number(row.sleep_hours) < profile.sleepTargetHours - 0.5).length;
    const strongTrainingDays = rows.filter((row) => Number(row.training_minutes) >= 35).length;
    const consistentStepDays = rows.filter((row) => Number(row.steps) >= 8000).length;
    return [
        weightDelta <= 0
            ? {
                title: "体重趋势在向目标靠近",
                detail: `过去 ${rows.length} 天累计变化 ${weightDelta.toFixed(1)} kg，当前节奏适合继续稳态推进。`,
                tone: "positive"
            }
            : {
                title: "体重波动偏大",
                detail: "最近阶段体重没有继续收口，建议优先检查晚间进食和睡眠是否连续失衡。",
                tone: "warning"
            },
        sleepLowDays >= 6
            ? {
                title: "恢复端是当前短板",
                detail: `有 ${sleepLowDays} 天睡眠低于目标，训练效果可能被恢复不足抵消。`,
                tone: "warning"
            }
            : {
                title: "恢复质量较稳定",
                detail: "睡眠时长大体保持在可接受区间，适合继续叠加轻中强度训练。",
                tone: "positive"
            },
        strongTrainingDays >= 5 && consistentStepDays >= 10
            ? {
                title: "活动量基础很扎实",
                detail: `高质量训练日 ${strongTrainingDays} 天，步数达标 ${consistentStepDays} 天，说明你的执行节律已经建立起来。`,
                tone: "positive"
            }
            : {
                title: "日常活动还能再抬一档",
                detail: "如果把步数和训练日分布做得更均匀，趋势曲线会更平稳，也更容易维持。",
                tone: "neutral"
            }
    ];
}
function buildRecords(rows, targetWeight) {
    return [...rows]
        .slice()
        .reverse()
        .map((row) => {
        const normalizedDate = normalizeSnapshotDate(row.snapshot_date);
        const calorieGap = Number(row.calorie_intake) - Number(row.calorie_burned);
        const weightGap = Number(row.weight_kg) - targetWeight;
        const status = Number(row.sleep_hours) >= 7.2 && Number(row.steps) >= 8500
            ? "恢复优"
            : calorieGap > 1900 || weightGap > 2.5
                ? "需校准"
                : Number(row.training_minutes) >= 25
                    ? "训练日"
                    : "平衡日";
        return {
            date: normalizedDate,
            weightKg: (0, shared_cjs_1.round)(Number(row.weight_kg), 1),
            bodyFatRate: (0, shared_cjs_1.round)(Number(row.body_fat_rate ?? 0), 1),
            waistCm: (0, shared_cjs_1.round)(Number(row.waist_cm), 1),
            sleepHours: (0, shared_cjs_1.round)(Number(row.sleep_hours), 1),
            steps: Number(row.steps),
            trainingMinutes: Number(row.training_minutes),
            calorieGap,
            status
        };
    });
}
async function getTrendSummary(userId) {
    await (0, shared_cjs_1.ensureAnalyticsSchema)();
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await ensureTrendSchema(connection);
        await ensureTrendSnapshots(connection, userId);
        const profile = await (0, body_cjs_1.getBodyProfile)(userId);
        if (!profile) {
            throw new Error("用户档案不存在");
        }
        const dates = getWindowDates(WINDOW_DAYS);
        const startDate = (0, shared_cjs_1.formatDateKey)(dates[0]);
        const endDate = (0, shared_cjs_1.formatDateKey)(dates[dates.length - 1]);
        const [rows] = await connection.execute(`SELECT snapshot_id, user_id, snapshot_date, weight_kg, body_fat_rate, waist_cm, sleep_hours, steps,
              calorie_intake, calorie_burned, training_minutes
       FROM trend_daily_snapshot
       WHERE user_id = ? AND snapshot_date BETWEEN ? AND ?
       ORDER BY snapshot_date ASC`, [userId, startDate, endDate]);
        if (!rows.length) {
            throw new Error("趋势数据暂不可用");
        }
        const latest = rows[rows.length - 1];
        const averageSleepHours = (0, shared_cjs_1.round)(rows.reduce((sum, row) => sum + Number(row.sleep_hours), 0) / rows.length, 1);
        const averageSteps = Math.round(rows.reduce((sum, row) => sum + Number(row.steps), 0) / rows.length);
        const averageTrainingMinutes = Math.round(rows.reduce((sum, row) => sum + Number(row.training_minutes), 0) / rows.length);
        const averageCalorieGap = Math.round(rows.reduce((sum, row) => sum + (Number(row.calorie_intake) - Number(row.calorie_burned)), 0) / rows.length);
        const completionRate = Math.round((rows.reduce((sum, row) => {
            const sleepScore = Number(row.sleep_hours) >= profile.sleepTargetHours - 0.3 ? 1 : 0;
            const stepScore = Number(row.steps) >= 8000 ? 1 : 0;
            const calorieScore = Number(row.calorie_intake) - Number(row.calorie_burned) <= 1750 ? 1 : 0;
            return sum + sleepScore + stepScore + calorieScore;
        }, 0) /
            (rows.length * 3)) *
            100);
        return {
            latestWeight: (0, shared_cjs_1.round)(Number(latest.weight_kg), 1),
            latestBodyFatRate: (0, shared_cjs_1.round)(Number(latest.body_fat_rate ?? 0), 1),
            latestWaistCm: (0, shared_cjs_1.round)(Number(latest.waist_cm), 1),
            averageSleepHours,
            averageSteps,
            targetWeight: (0, shared_cjs_1.round)(profile.targetWeightKg, 1),
            averageTrainingMinutes,
            averageCalorieGap,
            completionRate,
            weightTrend: rows.map((row) => ({
                label: formatLabel(normalizeSnapshotDate(row.snapshot_date)),
                value: (0, shared_cjs_1.round)(Number(row.weight_kg), 1)
            })),
            metricCards: buildMetricCards(rows, profile.targetWeightKg),
            series: rows.map((row) => ({
                date: normalizeSnapshotDate(row.snapshot_date),
                label: formatLabel(normalizeSnapshotDate(row.snapshot_date)),
                weightKg: (0, shared_cjs_1.round)(Number(row.weight_kg), 1),
                bodyFatRate: (0, shared_cjs_1.round)(Number(row.body_fat_rate ?? 0), 1),
                waistCm: (0, shared_cjs_1.round)(Number(row.waist_cm), 1),
                sleepHours: (0, shared_cjs_1.round)(Number(row.sleep_hours), 1),
                steps: Number(row.steps),
                trainingMinutes: Number(row.training_minutes),
                calorieIntake: Number(row.calorie_intake),
                calorieBurned: Number(row.calorie_burned),
                calorieGap: Number(row.calorie_intake) - Number(row.calorie_burned)
            })),
            recoveryBreakdown: buildRecoveryBreakdown(rows, profile.sleepTargetHours),
            behaviorBreakdown: buildBehaviorBreakdown(rows),
            insights: buildInsights(rows, profile),
            records: buildRecords(rows, profile.targetWeightKg)
        };
    }
    finally {
        connection.release();
    }
}
