"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDietSummary = getDietSummary;
exports.addDietEntry = addDietEntry;
exports.updateDietEntry = updateDietEntry;
exports.deleteDietEntry = deleteDietEntry;
exports.addWaterIntake = addWaterIntake;
const shared_cjs_1 = require("./shared.cjs");
const body_cjs_1 = require("./body.cjs");
const MEAL_ORDER = ["早餐", "午餐", "晚餐", "加餐"];
const DEFAULT_MEAL_TYPE = "加餐";
const DEFAULT_PORTION_LABEL = "1 份";
function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function round(value) {
    return Math.round(value);
}
function normalizePositiveNumber(value, fallback, min = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.max(min, Math.round(parsed));
}
function normalizeDietInput(input) {
    return {
        mealType: String(input.mealType ?? "").trim() || DEFAULT_MEAL_TYPE,
        foodName: String(input.foodName ?? "").trim(),
        portionLabel: String(input.portionLabel ?? "").trim() || DEFAULT_PORTION_LABEL,
        calories: normalizePositiveNumber(input.calories, 0, 1),
        protein: normalizePositiveNumber(input.protein, 0),
        carbs: normalizePositiveNumber(input.carbs, 0),
        fat: normalizePositiveNumber(input.fat, 0)
    };
}
function getWaterTargetMl(weightKg) {
    return clamp(round(weightKg * 32), 1800, 3200);
}
function buildDefaultMeals(calorieTarget) {
    return [
        {
            mealType: "早餐",
            foodName: "燕麦酸奶水果杯",
            portionLabel: "1 碗",
            calories: round(calorieTarget * 0.24),
            protein: 18,
            carbs: 34,
            fat: 8
        },
        {
            mealType: "午餐",
            foodName: "鸡胸藜麦能量碗",
            portionLabel: "1 份",
            calories: round(calorieTarget * 0.38),
            protein: 42,
            carbs: 46,
            fat: 14
        },
        {
            mealType: "晚餐",
            foodName: "三文鱼时蔬拼盘",
            portionLabel: "1 盘",
            calories: round(calorieTarget * 0.32),
            protein: 34,
            carbs: 32,
            fat: 16
        },
        {
            mealType: "加餐",
            foodName: "坚果豆乳",
            portionLabel: "1 杯",
            calories: round(calorieTarget * 0.06),
            protein: 8,
            carbs: 12,
            fat: 6
        }
    ];
}
async function ensureDietSchema(connection) {
    await connection.execute(`
    CREATE TABLE IF NOT EXISTS diet_daily_log (
      daily_id INT NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      log_date DATE NOT NULL,
      water_intake_ml INT NOT NULL DEFAULT 0,
      water_target_ml INT NOT NULL DEFAULT 2000,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      UNIQUE KEY uniq_diet_daily_user_date (user_id, log_date)
    )
  `);
    await connection.execute(`
    CREATE TABLE IF NOT EXISTS diet_meal_entry (
      entry_id INT NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      log_date DATE NOT NULL,
      meal_type VARCHAR(30) NOT NULL,
      food_name VARCHAR(120) NOT NULL,
      portion_label VARCHAR(40) NOT NULL DEFAULT '',
      calories INT NOT NULL DEFAULT 0,
      protein_g INT NOT NULL DEFAULT 0,
      carbs_g INT NOT NULL DEFAULT 0,
      fat_g INT NOT NULL DEFAULT 0,
      recorded_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      KEY idx_diet_meal_user_date (user_id, log_date),
      KEY idx_diet_meal_recorded_at (recorded_at)
    )
  `);
}
async function ensureTodayDailyLog(connection, userId, logDate, waterTargetMl) {
    const [rows] = await connection.execute("SELECT daily_id, water_intake_ml, water_target_ml FROM diet_daily_log WHERE user_id = ? AND log_date = ? LIMIT 1", [userId, logDate]);
    if (rows[0]) {
        if (Number(rows[0].water_target_ml) !== waterTargetMl) {
            await connection.execute("UPDATE diet_daily_log SET water_target_ml = ?, updated_at = ? WHERE daily_id = ?", [waterTargetMl, new Date(), Number(rows[0].daily_id)]);
        }
        return rows[0];
    }
    const now = new Date();
    const nextDailyId = await (0, shared_cjs_1.getNextTableId)(connection, "diet_daily_log", "daily_id", 50000);
    await connection.execute(`INSERT INTO diet_daily_log
      (daily_id, user_id, log_date, water_intake_ml, water_target_ml, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [nextDailyId, userId, logDate, 0, waterTargetMl, now, now]);
    return {
        daily_id: nextDailyId,
        water_intake_ml: 0,
        water_target_ml: waterTargetMl
    };
}
async function ensureSeedMeals(connection, userId, logDate, calorieTarget) {
    const [rows] = await connection.execute("SELECT COUNT(*) AS total FROM diet_meal_entry WHERE user_id = ? AND log_date = ?", [userId, logDate]);
    if (Number(rows[0]?.total ?? 0) > 0) {
        return;
    }
    const now = new Date();
    const defaultMeals = buildDefaultMeals(calorieTarget);
    for (const meal of defaultMeals) {
        const entryId = await (0, shared_cjs_1.getNextTableId)(connection, "diet_meal_entry", "entry_id", 70000);
        await connection.execute(`INSERT INTO diet_meal_entry
        (entry_id, user_id, log_date, meal_type, food_name, portion_label, calories, protein_g, carbs_g, fat_g, recorded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            entryId,
            userId,
            logDate,
            meal.mealType,
            meal.foodName,
            meal.portionLabel,
            meal.calories,
            meal.protein,
            meal.carbs,
            meal.fat,
            now,
            now,
            now
        ]);
    }
}
function buildInsights(summary) {
    const hydrationRatio = summary.waterTargetMl > 0 ? summary.waterIntakeMl / summary.waterTargetMl : 0;
    const proteinGap = summary.proteinTarget - summary.protein;
    const topMeal = [...summary.mealGroups].sort((left, right) => right.calories - left.calories)[0];
    return [
        proteinGap <= 0
            ? { title: "蛋白质已达标", detail: "今天的恢复与饱腹感基础已经打稳。", tone: "positive" }
            : {
                title: "蛋白质还有余量",
                detail: `距离目标还差 ${proteinGap} g，可以补牛奶、豆腐或鸡蛋。`,
                tone: "neutral"
            },
        hydrationRatio >= 1
            ? { title: "饮水已完成", detail: "今天的补水目标已经完成，继续少量分次即可。", tone: "positive" }
            : {
                title: "饮水还需补充",
                detail: `还差 ${Math.max(summary.waterTargetMl - summary.waterIntakeMl, 0)} ml，建议分 2 到 3 次喝完。`,
                tone: hydrationRatio < 0.55 ? "warning" : "neutral"
            },
        topMeal
            ? {
                title: `${topMeal.mealType}摄入最高`,
                detail: `${topMeal.mealType}累计 ${topMeal.calories} kcal，明天可以继续观察餐次分配是否均衡。`,
                tone: topMeal.calories > Math.max(420, summary.remainingCalories + 300) ? "warning" : "neutral"
            }
            : { title: "等待记录", detail: "先添加一餐，系统就能开始给出分布建议。", tone: "neutral" }
    ];
}
async function readDietSummary(userId) {
    await (0, shared_cjs_1.ensureAnalyticsSchema)();
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await ensureDietSchema(connection);
        const profile = await (0, body_cjs_1.getBodyProfile)(userId);
        if (!profile) {
            throw new Error("用户档案不存在");
        }
        const logDate = getTodayDateString();
        const calorieTarget = profile.dailyCalorieTarget || (0, shared_cjs_1.calculateDailyCalories)(profile);
        const proteinTarget = Math.max(70, round(profile.currentWeightKg * 1.6));
        const fatTarget = Math.max(35, round((calorieTarget * 0.25) / 9));
        const carbsTarget = Math.max(100, round((calorieTarget - proteinTarget * 4 - fatTarget * 9) / 4));
        const waterTargetMl = getWaterTargetMl(profile.currentWeightKg);
        await ensureTodayDailyLog(connection, userId, logDate, waterTargetMl);
        await ensureSeedMeals(connection, userId, logDate, calorieTarget);
        const [dailyRows] = await connection.execute("SELECT daily_id, water_intake_ml, water_target_ml FROM diet_daily_log WHERE user_id = ? AND log_date = ? LIMIT 1", [userId, logDate]);
        const [mealRows] = await connection.execute(`SELECT entry_id, meal_type, food_name, portion_label, calories, protein_g, carbs_g, fat_g, recorded_at
       FROM diet_meal_entry
       WHERE user_id = ? AND log_date = ?
       ORDER BY recorded_at DESC, entry_id DESC`, [userId, logDate]);
        const totals = mealRows.reduce((accumulator, row) => {
            accumulator.calories += Number(row.calories);
            accumulator.protein += Number(row.protein_g);
            accumulator.carbs += Number(row.carbs_g);
            accumulator.fat += Number(row.fat_g);
            return accumulator;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
        const mealGroups = MEAL_ORDER.map((mealType) => {
            const matchingRows = mealRows.filter((row) => row.meal_type === mealType);
            return {
                mealType,
                calories: matchingRows.reduce((sum, row) => sum + Number(row.calories), 0),
                count: matchingRows.length
            };
        }).filter((group) => group.count > 0);
        const remainingCalories = calorieTarget - totals.calories;
        const waterIntakeMl = Number(dailyRows[0]?.water_intake_ml ?? 0);
        const resolvedWaterTarget = Number(dailyRows[0]?.water_target_ml ?? waterTargetMl);
        return {
            dateLabel: "今天",
            todayCalories: totals.calories,
            calorieTarget,
            remainingCalories,
            waterIntakeMl,
            waterTargetMl: resolvedWaterTarget,
            protein: totals.protein,
            proteinTarget,
            carbs: totals.carbs,
            carbsTarget,
            fat: totals.fat,
            fatTarget,
            meals: mealRows.map((row) => ({
                id: Number(row.entry_id),
                mealType: row.meal_type,
                foodName: row.food_name,
                portionLabel: row.portion_label || DEFAULT_PORTION_LABEL,
                calories: Number(row.calories),
                protein: Number(row.protein_g),
                carbs: Number(row.carbs_g),
                fat: Number(row.fat_g),
                recordedAt: new Date(row.recorded_at).toISOString()
            })),
            mealGroups,
            insights: buildInsights({
                remainingCalories,
                waterIntakeMl,
                waterTargetMl: resolvedWaterTarget,
                protein: totals.protein,
                proteinTarget,
                mealGroups
            })
        };
    }
    finally {
        connection.release();
    }
}
async function getDietSummary(userId) {
    return readDietSummary(userId);
}
async function addDietEntry(input) {
    const userId = Number(input.userId);
    if (!userId) {
        throw new Error("用户信息无效");
    }
    const normalized = normalizeDietInput(input);
    if (!normalized.foodName) {
        throw new Error("请输入食物名称");
    }
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await (0, shared_cjs_1.ensureAnalyticsSchema)();
        await ensureDietSchema(connection);
        const entryId = await (0, shared_cjs_1.getNextTableId)(connection, "diet_meal_entry", "entry_id", 70000);
        const now = new Date();
        const logDate = getTodayDateString();
        await connection.execute(`INSERT INTO diet_meal_entry
        (entry_id, user_id, log_date, meal_type, food_name, portion_label, calories, protein_g, carbs_g, fat_g, recorded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            entryId,
            userId,
            logDate,
            normalized.mealType,
            normalized.foodName,
            normalized.portionLabel,
            normalized.calories,
            normalized.protein,
            normalized.carbs,
            normalized.fat,
            now,
            now,
            now
        ]);
    }
    finally {
        connection.release();
    }
    return readDietSummary(userId);
}
async function updateDietEntry(input) {
    const userId = Number(input.userId);
    const id = Number(input.id);
    if (!userId || !id) {
        throw new Error("饮食记录信息无效");
    }
    const normalized = normalizeDietInput(input);
    if (!normalized.foodName) {
        throw new Error("请输入食物名称");
    }
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await (0, shared_cjs_1.ensureAnalyticsSchema)();
        await ensureDietSchema(connection);
        await connection.execute(`UPDATE diet_meal_entry
       SET meal_type = ?, food_name = ?, portion_label = ?, calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, updated_at = ?
       WHERE entry_id = ? AND user_id = ?`, [
            normalized.mealType,
            normalized.foodName,
            normalized.portionLabel,
            normalized.calories,
            normalized.protein,
            normalized.carbs,
            normalized.fat,
            new Date(),
            id,
            userId
        ]);
    }
    finally {
        connection.release();
    }
    return readDietSummary(userId);
}
async function deleteDietEntry(input) {
    const userId = Number(input.userId);
    const id = Number(input.id);
    if (!userId || !id) {
        throw new Error("饮食记录信息无效");
    }
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await (0, shared_cjs_1.ensureAnalyticsSchema)();
        await ensureDietSchema(connection);
        await connection.execute("DELETE FROM diet_meal_entry WHERE entry_id = ? AND user_id = ?", [id, userId]);
    }
    finally {
        connection.release();
    }
    return readDietSummary(userId);
}
async function addWaterIntake(input) {
    const userId = Number(input.userId);
    if (!userId) {
        throw new Error("用户信息无效");
    }
    const amountMl = normalizePositiveNumber(input.amountMl, 0, 1);
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await (0, shared_cjs_1.ensureAnalyticsSchema)();
        await ensureDietSchema(connection);
        const profile = await (0, body_cjs_1.getBodyProfile)(userId);
        const logDate = getTodayDateString();
        const waterTargetMl = getWaterTargetMl(profile.currentWeightKg);
        const daily = await ensureTodayDailyLog(connection, userId, logDate, waterTargetMl);
        const nextWaterIntake = Number(daily.water_intake_ml) + amountMl;
        await connection.execute("UPDATE diet_daily_log SET water_intake_ml = ?, updated_at = ? WHERE daily_id = ?", [
            nextWaterIntake,
            new Date(),
            Number(daily.daily_id)
        ]);
    }
    finally {
        connection.release();
    }
    return readDietSummary(userId);
}
