"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = loginUser;
exports.registerUser = registerUser;
exports.updateAccountSettings = updateAccountSettings;
exports.migrateLegacyPasswords = migrateLegacyPasswords;
const shared_cjs_1 = require("./shared.cjs");
async function loginUser(username, password) {
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();
    if (!normalizedUsername || !normalizedPassword) {
        throw new Error("请填写账号和密码");
    }
    const [rows] = await (0, shared_cjs_1.getPool)().execute("SELECT user_id, username, email, nickname, password_hash FROM `user` WHERE username = ? LIMIT 1", [normalizedUsername]);
    const account = rows[0];
    if (!account || !(await (0, shared_cjs_1.verifyPassword)(normalizedPassword, account.password_hash))) {
        throw new Error("账号或密码错误");
    }
    return (0, shared_cjs_1.toSessionUser)(account);
}
async function registerUser(input) {
    const normalizedUsername = String(input.username ?? "").trim();
    const normalizedPassword = String(input.password ?? "").trim();
    const normalizedEmail = String(input.email ?? "").trim().toLowerCase();
    const normalizedNickname = String(input.nickname ?? "").trim() || normalizedUsername;
    if (!normalizedUsername || !normalizedPassword || !normalizedEmail) {
        throw new Error("请完整填写账号、邮箱和密码");
    }
    await (0, shared_cjs_1.ensureAnalyticsSchema)();
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await connection.beginTransaction();
        const [existingRows] = await connection.execute("SELECT username, email FROM `user` WHERE username = ? OR email = ? LIMIT 1", [normalizedUsername, normalizedEmail]);
        const existingUser = existingRows[0];
        if (existingUser) {
            if (existingUser.username === normalizedUsername) {
                throw new Error("该账号已存在");
            }
            throw new Error("该邮箱已被使用");
        }
        const nextUserId = await (0, shared_cjs_1.getNextTableId)(connection, "user", "user_id", 10000);
        const now = new Date();
        await connection.execute("INSERT INTO `user` (user_id, username, email, nickname, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [nextUserId, normalizedUsername, normalizedEmail, normalizedNickname, await (0, shared_cjs_1.hashPassword)(normalizedPassword), 1, now, now]);
        const defaultProfile = (0, shared_cjs_1.buildDefaultProfile)({
            user_id: nextUserId,
            username: normalizedUsername,
            email: normalizedEmail,
            nickname: normalizedNickname
        });
        await (0, shared_cjs_1.upsertUserProfile)(connection, {
            user_id: nextUserId,
            username: normalizedUsername,
            email: normalizedEmail,
            nickname: normalizedNickname
        }, {
            age: defaultProfile.age,
            gender: defaultProfile.gender,
            heightCm: defaultProfile.heightCm,
            currentWeightKg: defaultProfile.currentWeightKg,
            bodyFatRate: defaultProfile.bodyFatRate,
            targetWeightKg: defaultProfile.targetWeightKg,
            targetBodyFatRate: defaultProfile.targetBodyFatRate,
            weeklyWorkoutTarget: defaultProfile.weeklyWorkoutTarget,
            dailyCalorieTarget: defaultProfile.dailyCalorieTarget,
            sleepTargetHours: defaultProfile.sleepTargetHours,
            workStyle: defaultProfile.workStyle,
            stressLevel: defaultProfile.stressLevel,
            smokingStatus: defaultProfile.smokingStatus,
            drinkingFrequency: defaultProfile.drinkingFrequency,
            habitSleep: defaultProfile.habitSleep,
            habitDiet: defaultProfile.habitDiet,
            habitExercise: defaultProfile.habitExercise,
            bmi: defaultProfile.bmi,
            bmr: defaultProfile.bmr,
            updatedAt: now
        });
        await connection.commit();
        return (0, shared_cjs_1.getProfileRecordByUserId)(nextUserId);
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
async function updateAccountSettings(input) {
    const userId = Number(input.userId);
    const email = String(input.email ?? "").trim().toLowerCase();
    const currentPassword = String(input.currentPassword ?? "").trim();
    const newPassword = String(input.newPassword ?? "").trim();
    if (!userId || !email) {
        throw new Error("邮箱不能为空");
    }
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        await connection.beginTransaction();
        const [userRows] = await connection.execute("SELECT user_id, username, email, nickname, password_hash FROM `user` WHERE user_id = ? LIMIT 1", [userId]);
        const user = userRows[0];
        if (!user) {
            throw new Error(shared_cjs_1.PROFILE_NOT_FOUND_MESSAGE);
        }
        const [emailRows] = await connection.execute("SELECT user_id FROM `user` WHERE email = ? AND user_id <> ? LIMIT 1", [email, userId]);
        if (emailRows[0]) {
            throw new Error("该邮箱已被使用");
        }
        const updates = ["email = ?", "updated_at = ?"];
        const values = [email, new Date()];
        if (newPassword) {
            if (!currentPassword) {
                throw new Error("修改密码时请先输入当前密码");
            }
            const passwordValid = await (0, shared_cjs_1.verifyPassword)(currentPassword, user.password_hash);
            if (!passwordValid) {
                throw new Error("当前密码不正确");
            }
            if (newPassword.length < 6) {
                throw new Error("新密码至少需要 6 位");
            }
            updates.push("password_hash = ?");
            values.push(await (0, shared_cjs_1.hashPassword)(newPassword));
        }
        values.push(userId);
        await connection.execute(`UPDATE \`user\` SET ${updates.join(", ")} WHERE user_id = ?`, values);
        await connection.commit();
        return {
            ...(0, shared_cjs_1.toSessionUser)(user),
            email
        };
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
async function migrateLegacyPasswords() {
    const connection = await (0, shared_cjs_1.getPool)().getConnection();
    try {
        const [rows] = await connection.execute("SELECT user_id, password_hash FROM `user` WHERE password_hash IS NOT NULL");
        let migratedCount = 0;
        for (const row of rows) {
            if (typeof row.password_hash === "string" && row.password_hash.startsWith("scrypt:")) {
                continue;
            }
            const hashedValue = await (0, shared_cjs_1.hashPassword)(String(row.password_hash));
            await connection.execute("UPDATE `user` SET password_hash = ?, updated_at = ? WHERE user_id = ?", [
                hashedValue,
                new Date(),
                row.user_id
            ]);
            migratedCount += 1;
        }
        return { migratedCount };
    }
    finally {
        connection.release();
    }
}
