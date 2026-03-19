"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROFILE_NOT_FOUND_MESSAGE = exports.DEFAULT_DRINKING_FREQUENCY = exports.DEFAULT_SMOKING_STATUS = exports.DEFAULT_STRESS_LEVEL = exports.DEFAULT_GENDER = void 0;
exports.loadEnvFile = loadEnvFile;
exports.getPool = getPool;
exports.closePool = closePool;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.normalizeNumber = normalizeNumber;
exports.clamp = clamp;
exports.round = round;
exports.formatDateKey = formatDateKey;
exports.calculateBmi = calculateBmi;
exports.calculateBmr = calculateBmr;
exports.calculateTargetWeight = calculateTargetWeight;
exports.calculateDailyCalories = calculateDailyCalories;
exports.estimateWeeklyWorkoutTarget = estimateWeeklyWorkoutTarget;
exports.toSessionUser = toSessionUser;
exports.buildDefaultProfile = buildDefaultProfile;
exports.toProfileRecord = toProfileRecord;
exports.getUserById = getUserById;
exports.getNextTableId = getNextTableId;
exports.getProfileRowByUserId = getProfileRowByUserId;
exports.getProfileRecordByUserId = getProfileRecordByUserId;
exports.upsertUserProfile = upsertUserProfile;
exports.ensureAnalyticsSchema = ensureAnalyticsSchema;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const promise_1 = __importDefault(require("mysql2/promise"));
exports.DEFAULT_GENDER = "未设置";
exports.DEFAULT_STRESS_LEVEL = "中";
exports.DEFAULT_SMOKING_STATUS = "从不";
exports.DEFAULT_DRINKING_FREQUENCY = "几乎不";
exports.PROFILE_NOT_FOUND_MESSAGE = "用户不存在";
const PROFILE_SELECT_FIELDS = `SELECT
  u.user_id,
  u.username,
  u.email,
  u.nickname,
  p.age,
  p.gender,
  p.height_cm,
  p.current_weight_kg,
  p.body_fat_rate,
  p.target_weight_kg,
  p.target_body_fat_rate,
  p.weekly_workout_target,
  p.daily_calorie_target,
  p.sleep_target_hours,
  p.work_style,
  p.stress_level,
  p.smoking_status,
  p.drinking_frequency,
  p.habit_sleep,
  p.habit_diet,
  p.habit_exercise,
  p.bmi,
  p.bmr,
  p.updated_at
FROM \`user\` u
LEFT JOIN user_profile p ON p.user_id = u.user_id`;
const UPSERT_PROFILE_FIELDS = [
    "age",
    "gender",
    "height_cm",
    "current_weight_kg",
    "body_fat_rate",
    "target_weight_kg",
    "target_body_fat_rate",
    "weekly_workout_target",
    "daily_calorie_target",
    "sleep_target_hours",
    "work_style",
    "stress_level",
    "smoking_status",
    "drinking_frequency",
    "habit_sleep",
    "habit_diet",
    "habit_exercise",
    "bmi",
    "bmr",
    "updated_at"
];
const DEFAULT_DB_HOST = "127.0.0.1";
const DEFAULT_DB_PORT = 3306;
const DEFAULT_DB_NAME = "lightbalance";
const DEFAULT_DB_CONNECTION_LIMIT = 10;
const DEFAULT_DB_QUEUE_LIMIT = 0;
let pool = null;
let schemaEnsured = false;
let envLoaded = false;
function loadEnvFile(filePath) {
    if (!node_fs_1.default.existsSync(filePath))
        return;
    const raw = node_fs_1.default.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex <= 0)
            continue;
        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
        if (key && process.env[key] === undefined)
            process.env[key] = value;
    }
}
function loadDatabaseEnv() {
    if (envLoaded) {
        return;
    }
    loadEnvFile(node_path_1.default.resolve(process.cwd(), ".env"));
    envLoaded = true;
}
function readRequiredEnv(name) {
    loadDatabaseEnv();
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`未检测到 ${name}，无法连接数据库。`);
    }
    return value;
}
function readNumberEnv(name, fallback) {
    loadDatabaseEnv();
    const raw = process.env[name]?.trim();
    if (!raw) {
        return fallback;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
}
function getDbConfig() {
    loadDatabaseEnv();
    return {
        host: process.env.LIGHTBALANCE_DB_HOST?.trim() || DEFAULT_DB_HOST,
        port: readNumberEnv("LIGHTBALANCE_DB_PORT", DEFAULT_DB_PORT),
        user: readRequiredEnv("LIGHTBALANCE_DB_USER"),
        password: readRequiredEnv("LIGHTBALANCE_DB_PASSWORD"),
        database: process.env.LIGHTBALANCE_DB_NAME?.trim() || DEFAULT_DB_NAME,
        waitForConnections: true,
        connectionLimit: DEFAULT_DB_CONNECTION_LIMIT,
        queueLimit: DEFAULT_DB_QUEUE_LIMIT
    };
}
function deriveScryptKey(password, salt) {
    return new Promise((resolve, reject) => {
        node_crypto_1.default.scrypt(password, salt, 64, (error, derivedKey) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(derivedKey);
        });
    });
}
function toProfileValues(input) {
    return [
        input.age,
        input.gender,
        input.heightCm,
        input.currentWeightKg,
        input.bodyFatRate,
        input.targetWeightKg,
        input.targetBodyFatRate,
        input.weeklyWorkoutTarget,
        input.dailyCalorieTarget,
        input.sleepTargetHours,
        input.workStyle,
        input.stressLevel,
        input.smokingStatus,
        input.drinkingFrequency,
        input.habitSleep,
        input.habitDiet,
        input.habitExercise,
        input.bmi,
        input.bmr,
        input.updatedAt
    ];
}
function getPool() {
    if (!pool) {
        pool = promise_1.default.createPool(getDbConfig());
    }
    return pool;
}
async function closePool() {
    if (!pool) {
        return;
    }
    await pool.end();
    pool = null;
    schemaEnsured = false;
}
async function hashPassword(password) {
    const salt = node_crypto_1.default.randomBytes(16).toString("hex");
    const derived = await deriveScryptKey(password, salt);
    return `scrypt:${salt}:${derived.toString("hex")}`;
}
async function verifyPassword(password, storedValue) {
    if (!storedValue) {
        return false;
    }
    if (storedValue.startsWith("scrypt:")) {
        const [, salt, expectedHash] = storedValue.split(":");
        const derived = await deriveScryptKey(password, salt);
        return node_crypto_1.default.timingSafeEqual(Buffer.from(expectedHash, "hex"), derived);
    }
    return storedValue === password;
}
function normalizeNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function round(value, digits = 1) {
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
}
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function calculateBmi(heightCm, weightKg) {
    const meters = heightCm / 100;
    if (!meters || !weightKg) {
        return null;
    }
    return Number((weightKg / (meters * meters)).toFixed(2));
}
function calculateBmr({ gender, heightCm, currentWeightKg, age }) {
    const base = 10 * currentWeightKg + 6.25 * heightCm - 5 * age;
    if (gender === "男") {
        return Number((base + 5).toFixed(2));
    }
    if (gender === "女") {
        return Number((base - 161).toFixed(2));
    }
    return Number((base - 78).toFixed(2));
}
function calculateTargetWeight(heightCm, currentWeightKg) {
    if (!heightCm || !currentWeightKg) {
        return currentWeightKg;
    }
    const meters = heightCm / 100;
    const healthyWeight = 22 * meters * meters;
    const moderatedGoal = currentWeightKg > healthyWeight ? Math.max(healthyWeight, currentWeightKg - 4) : currentWeightKg;
    return Number(moderatedGoal.toFixed(1));
}
function roundToNearest(value, step) {
    return Math.round(value / step) * step;
}
function calculateDailyCalories(profile) {
    const baseBmr = profile.bmr ?? calculateBmr(profile);
    const maintenanceCalories = baseBmr * 1.35;
    return Math.max(1200, roundToNearest(maintenanceCalories - 350, 50));
}
function estimateWeeklyWorkoutTarget(habitExercise) {
    const normalized = String(habitExercise ?? "").toLowerCase();
    const matchedTimes = normalized.match(/(\d+)\s*(?:次|x|times?)/i);
    if (matchedTimes) {
        return Math.min(Math.max(Number(matchedTimes[1]), 2), 7);
    }
    if (!normalized.trim()) {
        return 4;
    }
    if (normalized.includes("每天") || normalized.includes("daily")) {
        return 6;
    }
    if (normalized.includes("偶尔") || normalized.includes("很少")) {
        return 2;
    }
    return 4;
}
function toSessionUser(row) {
    if (!row) {
        return null;
    }
    return {
        userId: Number(row.user_id),
        username: row.username,
        nickname: row.nickname?.trim() || row.username,
        email: row.email
    };
}
function buildDefaultProfile(userRow) {
    return {
        userId: Number(userRow.user_id),
        username: userRow.username,
        email: userRow.email,
        nickname: userRow.nickname?.trim() || userRow.username,
        age: 18,
        gender: exports.DEFAULT_GENDER,
        heightCm: 170,
        currentWeightKg: 60,
        bodyFatRate: null,
        targetWeightKg: 57,
        targetBodyFatRate: null,
        weeklyWorkoutTarget: 4,
        dailyCalorieTarget: 1600,
        sleepTargetHours: 7.5,
        workStyle: "",
        stressLevel: exports.DEFAULT_STRESS_LEVEL,
        smokingStatus: exports.DEFAULT_SMOKING_STATUS,
        drinkingFrequency: exports.DEFAULT_DRINKING_FREQUENCY,
        habitSleep: "",
        habitDiet: "",
        habitExercise: "",
        bmi: Number((60 / Math.pow(1.7, 2)).toFixed(2)),
        bmr: 1437.5,
        updatedAt: null
    };
}
function toProfileRecord(row) {
    if (!row) {
        return null;
    }
    return {
        ...buildDefaultProfile(row),
        age: row.age !== null && row.age !== undefined ? Number(row.age) : 18,
        gender: row.gender ?? exports.DEFAULT_GENDER,
        heightCm: row.height_cm !== null && row.height_cm !== undefined ? Number(row.height_cm) : 170,
        currentWeightKg: row.current_weight_kg !== null && row.current_weight_kg !== undefined ? Number(row.current_weight_kg) : 60,
        bodyFatRate: row.body_fat_rate !== null && row.body_fat_rate !== undefined ? Number(row.body_fat_rate) : null,
        targetWeightKg: row.target_weight_kg !== null && row.target_weight_kg !== undefined ? Number(row.target_weight_kg) : 57,
        targetBodyFatRate: row.target_body_fat_rate !== null && row.target_body_fat_rate !== undefined ? Number(row.target_body_fat_rate) : null,
        weeklyWorkoutTarget: row.weekly_workout_target !== null && row.weekly_workout_target !== undefined ? Number(row.weekly_workout_target) : 4,
        dailyCalorieTarget: row.daily_calorie_target !== null && row.daily_calorie_target !== undefined ? Number(row.daily_calorie_target) : 1600,
        sleepTargetHours: row.sleep_target_hours !== null && row.sleep_target_hours !== undefined ? Number(row.sleep_target_hours) : 7.5,
        workStyle: row.work_style ?? "",
        stressLevel: row.stress_level ?? exports.DEFAULT_STRESS_LEVEL,
        smokingStatus: row.smoking_status ?? exports.DEFAULT_SMOKING_STATUS,
        drinkingFrequency: row.drinking_frequency ?? exports.DEFAULT_DRINKING_FREQUENCY,
        habitSleep: row.habit_sleep ?? "",
        habitDiet: row.habit_diet ?? "",
        habitExercise: row.habit_exercise ?? "",
        bmi: row.bmi !== null && row.bmi !== undefined ? Number(row.bmi) : null,
        bmr: row.bmr !== null && row.bmr !== undefined ? Number(row.bmr) : null,
        updatedAt: row.updated_at ?? null
    };
}
async function getUserById(connection, userId) {
    const [rows] = await connection.execute("SELECT user_id, username, email, nickname FROM `user` WHERE user_id = ? LIMIT 1", [userId]);
    return rows[0] ?? null;
}
async function getNextTableId(connection, tableName, columnName, floor) {
    const [rows] = await connection.execute(`SELECT COALESCE(MAX(${columnName}), ${floor}) + 1 AS nextId FROM ${tableName}`);
    return Number(rows[0]?.nextId);
}
async function getProfileRowByUserId(userId, executor = getPool()) {
    await ensureAnalyticsSchema();
    const [rows] = await executor.execute(`${PROFILE_SELECT_FIELDS}
     WHERE u.user_id = ?
     LIMIT 1`, [userId]);
    return rows[0] ?? null;
}
async function getProfileRecordByUserId(userId, executor = getPool()) {
    const profile = toProfileRecord(await getProfileRowByUserId(userId, executor));
    if (!profile) {
        throw new Error(exports.PROFILE_NOT_FOUND_MESSAGE);
    }
    return profile;
}
async function upsertUserProfile(connection, user, profile) {
    const profileValues = toProfileValues(profile);
    const [profileRows] = await connection.execute("SELECT profile_id FROM user_profile WHERE user_id = ? LIMIT 1", [user.user_id]);
    if (profileRows[0]) {
        const setClause = UPSERT_PROFILE_FIELDS.map((field) => `${field} = ?`).join(", ");
        await connection.execute(`UPDATE user_profile SET ${setClause} WHERE user_id = ?`, [...profileValues, user.user_id]);
        return;
    }
    const nextProfileId = await getNextTableId(connection, "user_profile", "profile_id", 30000);
    await connection.execute(`INSERT INTO user_profile
      (profile_id, user_id, ${UPSERT_PROFILE_FIELDS.join(", ")})
     VALUES (?, ?, ${UPSERT_PROFILE_FIELDS.map(() => "?").join(", ")})`, [nextProfileId, user.user_id, ...profileValues]);
}
async function ensureAnalyticsSchema() {
    if (schemaEnsured) {
        return;
    }
    const connection = await getPool().getConnection();
    try {
        const [existingColumns] = await connection.execute(`SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profile'`);
        const columnNames = new Set(existingColumns.map((row) => String(row.COLUMN_NAME)));
        const defs = [
            ["target_weight_kg", "DECIMAL(6,2) NOT NULL DEFAULT 57"],
            ["target_body_fat_rate", "DECIMAL(5,2) NULL"],
            ["weekly_workout_target", "INT NOT NULL DEFAULT 4"],
            ["daily_calorie_target", "INT NOT NULL DEFAULT 1600"],
            ["sleep_target_hours", "DECIMAL(4,1) NOT NULL DEFAULT 7.5"],
            ["work_style", "VARCHAR(60) NOT NULL DEFAULT ''"],
            ["stress_level", `VARCHAR(30) NOT NULL DEFAULT '${exports.DEFAULT_STRESS_LEVEL}'`],
            ["smoking_status", `VARCHAR(30) NOT NULL DEFAULT '${exports.DEFAULT_SMOKING_STATUS}'`],
            ["drinking_frequency", `VARCHAR(30) NOT NULL DEFAULT '${exports.DEFAULT_DRINKING_FREQUENCY}'`]
        ];
        for (const [name, definition] of defs) {
            if (!columnNames.has(name)) {
                await connection.execute(`ALTER TABLE user_profile ADD COLUMN ${name} ${definition}`);
            }
        }
        schemaEnsured = true;
    }
    finally {
        connection.release();
    }
}
