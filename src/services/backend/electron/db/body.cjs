"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBodyProfile = getBodyProfile;
exports.updateBodyProfile = updateBodyProfile;
const shared_cjs_1 = require("./shared.cjs");
async function getBodyProfile(userId) {
    return (0, shared_cjs_1.getProfileRecordByUserId)(userId);
}
async function updateBodyProfile(input) {
    const userId = Number(input.userId);
    const nickname = String(input.nickname ?? "").trim();
    const age = Math.max(0, Math.round((0, shared_cjs_1.normalizeNumber)(input.age, 18) ?? 18));
    const gender = String(input.gender ?? shared_cjs_1.DEFAULT_GENDER).trim() || shared_cjs_1.DEFAULT_GENDER;
    const heightCm = (0, shared_cjs_1.normalizeNumber)(input.heightCm, 170) ?? 170;
    const currentWeightKg = (0, shared_cjs_1.normalizeNumber)(input.currentWeightKg, 60) ?? 60;
    const bodyFatRate = input.bodyFatRate === null || input.bodyFatRate === undefined ? null : (0, shared_cjs_1.normalizeNumber)(input.bodyFatRate, null);
    const targetWeightKg = (0, shared_cjs_1.normalizeNumber)(input.targetWeightKg, (0, shared_cjs_1.calculateTargetWeight)(heightCm, currentWeightKg)) ?? 57;
    const targetBodyFatRate = input.targetBodyFatRate === null || input.targetBodyFatRate === undefined ? null : (0, shared_cjs_1.normalizeNumber)(input.targetBodyFatRate, null);
    const habitExercise = String(input.habitExercise ?? "").trim();
    const weeklyWorkoutTarget = Math.max(0, Math.round((0, shared_cjs_1.normalizeNumber)(input.weeklyWorkoutTarget, (0, shared_cjs_1.estimateWeeklyWorkoutTarget)(habitExercise)) ?? 4));
    const dailyCalorieTarget = Math.max(1000, Math.round((0, shared_cjs_1.normalizeNumber)(input.dailyCalorieTarget, (0, shared_cjs_1.calculateDailyCalories)({
        gender,
        heightCm,
        currentWeightKg,
        age
    })) ?? 1600));
    const sleepTargetHours = (0, shared_cjs_1.normalizeNumber)(input.sleepTargetHours, 7.5) ?? 7.5;
    const workStyle = String(input.workStyle ?? "").trim();
    const stressLevel = String(input.stressLevel ?? shared_cjs_1.DEFAULT_STRESS_LEVEL).trim() || shared_cjs_1.DEFAULT_STRESS_LEVEL;
    const smokingStatus = String(input.smokingStatus ?? "从不").trim() || "从不";
    const drinkingFrequency = String(input.drinkingFrequency ?? shared_cjs_1.DEFAULT_DRINKING_FREQUENCY).trim() || shared_cjs_1.DEFAULT_DRINKING_FREQUENCY;
    const habitSleep = String(input.habitSleep ?? "").trim();
    const habitDiet = String(input.habitDiet ?? "").trim();
    if (!userId) {
        throw new Error(shared_cjs_1.PROFILE_NOT_FOUND_MESSAGE);
    }
    if (!nickname) {
        throw new Error("昵称不能为空");
    }
    await (0, shared_cjs_1.ensureAnalyticsSchema)();
    const bmi = (0, shared_cjs_1.calculateBmi)(heightCm, currentWeightKg);
    const bmr = (0, shared_cjs_1.calculateBmr)({ gender, heightCm, currentWeightKg, age });
    const now = new Date();
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await connection.beginTransaction();
        const user = await (0, shared_cjs_1.getUserById)(connection, userId);
        if (!user) {
            throw new Error(shared_cjs_1.PROFILE_NOT_FOUND_MESSAGE);
        }
        await connection.execute("UPDATE `user` SET nickname = ?, updated_at = ? WHERE user_id = ?", [nickname, now, userId]);
        await (0, shared_cjs_1.upsertUserProfile)(connection, { ...user, nickname }, {
            age,
            gender,
            heightCm,
            currentWeightKg,
            bodyFatRate,
            targetWeightKg,
            targetBodyFatRate,
            weeklyWorkoutTarget,
            dailyCalorieTarget,
            sleepTargetHours,
            workStyle,
            stressLevel,
            smokingStatus,
            drinkingFrequency,
            habitSleep,
            habitDiet,
            habitExercise,
            bmi,
            bmr,
            updatedAt: now
        });
        await connection.commit();
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
    return (0, shared_cjs_1.getProfileRecordByUserId)(userId);
}
