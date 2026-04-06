const fs = require('fs');

let payload = fs.readFileSync('src/services/backend/electron/db/trend.cjs', 'utf-8');

payload = payload.replace(
  'exports.getTrendSummary = getTrendSummary;', 
  'exports.getTrendSummary = getTrendSummary;\nexports.updateTrendSleep = updateTrendSleep;'
);

payload = payload.replace(
  'CREATE TABLE IF NOT EXISTS trend_daily_snapshot (\n', 
  'CREATE TABLE IF NOT EXISTS trend_daily_snapshot (\n      is_manual_sleep TINYINT(1) NOT NULL DEFAULT 0,\n'
);

payload = payload.replace(
  /async function upsertSnapshot[\s\S]*?return;\s*\}/, 
  `async function upsertSnapshot(connection, userId, dateString, draft) {
    const [rows] = await connection.execute("SELECT snapshot_id, is_manual_sleep FROM trend_daily_snapshot WHERE user_id = ? AND snapshot_date = ? LIMIT 1", [userId, dateString]);
    const now = new Date();
    if (rows[0]) {
        const isManual = Boolean(rows[0].is_manual_sleep);
        if (isManual) {
            await connection.execute(\`UPDATE trend_daily_snapshot
           SET weight_kg = ?, body_fat_rate = ?, waist_cm = ?, steps = ?, calorie_intake = ?, calorie_burned = ?,
               training_minutes = ?, updated_at = ?
           WHERE snapshot_id = ?\`, [
                draft.weightKg, draft.bodyFatRate, draft.waistCm, draft.steps, draft.calorieIntake, draft.calorieBurned, draft.trainingMinutes, now, Number(rows[0].snapshot_id)
            ]);
        } else {
            await connection.execute(\`UPDATE trend_daily_snapshot
           SET weight_kg = ?, body_fat_rate = ?, waist_cm = ?, sleep_hours = ?, steps = ?, calorie_intake = ?, calorie_burned = ?,
               training_minutes = ?, updated_at = ?
           WHERE snapshot_id = ?\`, [
                draft.weightKg, draft.bodyFatRate, draft.waistCm, draft.sleepHours, draft.steps, draft.calorieIntake, draft.calorieBurned, draft.trainingMinutes, now, Number(rows[0].snapshot_id)
            ]);
        }
        return;
    }`
);

payload += `
async function updateTrendSleep(input) {
    const userId = Number(input.userId);
    const dateString = String(input.recordDate).trim();
    const sleepHours = Number(input.sleepHours);
    if (!userId || !dateString) throw new Error("Missing parameters");
    const shared = require('./shared.cjs');
    const connection = await shared.getPool().getConnection();
    try {
        await ensureTrendSchema(connection);
        try {
            await connection.execute("ALTER TABLE trend_daily_snapshot ADD COLUMN is_manual_sleep TINYINT(1) NOT NULL DEFAULT 0");
        } catch (e) {}
        await ensureTrendSnapshots(connection, userId);

        await connection.beginTransaction();
        await connection.execute(
            "UPDATE trend_daily_snapshot SET sleep_hours = ?, is_manual_sleep = 1, updated_at = ? WHERE user_id = ? AND snapshot_date = ?",
            [sleepHours, new Date(), userId, dateString]
        );
        await connection.commit();
    } catch (e) {
        await connection.rollback();
        throw e;
    } finally {
        connection.release();
    }
}
`;

fs.writeFileSync('src/services/backend/electron/db/trend.cjs', payload);
console.log('trend.cjs patched!');
