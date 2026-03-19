"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverviewSummary = getOverviewSummary;
const diet_cjs_1 = require("./diet.cjs");
const exercise_cjs_1 = require("./exercise.cjs");
const shared_cjs_1 = require("./shared.cjs");
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function formatDateLabel(date) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}
function formatShortDateLabel(value) {
    const date = new Date(value);
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${month}-${day}`;
}
function getWeekStart(date) {
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + mondayOffset);
    return start;
}
function createTodayPlanItem(period, title, detail, tag) {
    return {
        period,
        title,
        detail,
        tag
    };
}
async function getOverviewSummary(userId) {
    const [profile, dietSummary, exerciseSummary] = await Promise.all([
        (0, shared_cjs_1.getProfileRecordByUserId)(userId),
        (0, diet_cjs_1.getDietSummary)(userId),
        (0, exercise_cjs_1.getExerciseSummary)(userId)
    ]);
    const now = new Date();
    const todayKey = formatDateKey(now);
    const targetWeight = profile.targetWeightKg || (0, shared_cjs_1.calculateTargetWeight)(profile.heightCm, profile.currentWeightKg);
    const dailyCalories = profile.dailyCalorieTarget || (0, shared_cjs_1.calculateDailyCalories)(profile);
    const weightDelta = Number((profile.currentWeightKg - targetWeight).toFixed(1));
    const exerciseTargetMinutes = 30;
    const todayMealsCount = dietSummary.meals.length;
    const todayWaterCompletion = dietSummary.waterTargetMl > 0 ? dietSummary.waterIntakeMl / dietSummary.waterTargetMl : 0;
    const todayExerciseCompletion = clamp(Math.round((exerciseSummary.todayMinutes / exerciseTargetMinutes) * 100), 0, 100);
    const todayDietCompletion = clamp(Math.round((dietSummary.todayCalories / dailyCalories) * 100), 0, 100);
    const todayWaterProgress = clamp(Math.round(todayWaterCompletion * 100), 0, 100);
    const weeklyConsistency = clamp(exerciseSummary.completionRate, 0, 100);
    const profileCompletion = profile.updatedAt ? 100 : 60;
    const completionRate = Math.round((todayExerciseCompletion + Math.min(todayDietCompletion, 100) + todayWaterProgress + weeklyConsistency + profileCompletion) / 5);
    const completedToday = [];
    if (exerciseSummary.todayMinutes > 0) {
        completedToday.push({
            title: `已完成 ${exerciseSummary.todayMinutes} 分钟训练`,
            detail: `今天已经产生训练消耗 ${exerciseSummary.totalCaloriesBurned} kcal，节奏已经被带起来。`,
            meta: exerciseSummary.todayMinutes >= exerciseTargetMinutes ? "今日运动目标已达标" : "继续补足到 30 分钟会更稳",
            tone: exerciseSummary.todayMinutes >= exerciseTargetMinutes ? "positive" : "neutral"
        });
    }
    if (todayMealsCount > 0) {
        completedToday.push({
            title: `已记录 ${todayMealsCount} 条饮食`,
            detail: `当前累计摄入 ${dietSummary.todayCalories} kcal，蛋白质 ${dietSummary.protein} g。`,
            meta: dietSummary.remainingCalories >= 0 ? `还可弹性安排 ${dietSummary.remainingCalories} kcal` : `当前已超出 ${Math.abs(dietSummary.remainingCalories)} kcal`,
            tone: dietSummary.remainingCalories >= 0 ? "positive" : "warning"
        });
    }
    if (dietSummary.waterIntakeMl > 0) {
        completedToday.push({
            title: `已喝水 ${dietSummary.waterIntakeMl} ml`,
            detail: `补水进度 ${todayWaterProgress}% ，继续分次喝完更轻松。`,
            meta: dietSummary.waterIntakeMl >= dietSummary.waterTargetMl ? "今日补水目标已完成" : `距离目标还差 ${Math.max(dietSummary.waterTargetMl - dietSummary.waterIntakeMl, 0)} ml`,
            tone: dietSummary.waterIntakeMl >= dietSummary.waterTargetMl ? "positive" : "neutral"
        });
    }
    if (profile.updatedAt && String(profile.updatedAt).slice(0, 10) === todayKey) {
        completedToday.push({
            title: "今日已更新身体档案",
            detail: "目标体重、习惯和基础信息已经同步到当前概览。",
            meta: "后续建议会基于最新档案生成",
            tone: "positive"
        });
    }
    if (completedToday.length === 0) {
        completedToday.push({
            title: "今天还没有留下记录",
            detail: "先记录一餐、一次训练或一杯水，今日概览就会开始变得有参考价值。",
            meta: "从一条最容易完成的动作开始",
            tone: "warning"
        });
    }
    const pendingToday = [];
    if (exerciseSummary.todayMinutes < exerciseTargetMinutes) {
        pendingToday.push({
            title: `还差 ${exerciseTargetMinutes - exerciseSummary.todayMinutes} 分钟活动`,
            detail: "补一段快走、骑行或核心训练，就能把今天的运动闭环收住。",
            meta: "建议拆成 15 到 20 分钟的小段完成",
            tone: exerciseSummary.todayMinutes === 0 ? "warning" : "neutral"
        });
    }
    if (dietSummary.protein < dietSummary.proteinTarget) {
        pendingToday.push({
            title: `蛋白质还差 ${dietSummary.proteinTarget - dietSummary.protein} g`,
            detail: "下一餐优先补鸡蛋、牛奶、豆腐或瘦肉，恢复感会更稳定。",
            meta: `当前 ${dietSummary.protein} / ${dietSummary.proteinTarget} g`,
            tone: "neutral"
        });
    }
    if (dietSummary.waterIntakeMl < dietSummary.waterTargetMl) {
        pendingToday.push({
            title: `补水还差 ${dietSummary.waterTargetMl - dietSummary.waterIntakeMl} ml`,
            detail: "建议分 2 到 3 次补完，避免临睡前集中喝太多。",
            meta: `当前 ${dietSummary.waterIntakeMl} / ${dietSummary.waterTargetMl} ml`,
            tone: todayWaterCompletion < 0.5 ? "warning" : "neutral"
        });
    }
    pendingToday.push({
        title: `今晚争取睡满 ${profile.sleepTargetHours} 小时`,
        detail: "把恢复质量守住，明天的训练执行力和食欲控制都会更好。",
        meta: "睡眠是今天最后一项关键任务",
        tone: "neutral"
    });
    const plannedToday = [
        createTodayPlanItem("接下来", exerciseSummary.todayMinutes >= exerciseTargetMinutes ? "安排一段轻恢复" : "补一段短训练", exerciseSummary.todayMinutes >= exerciseTargetMinutes
            ? "做 10 分钟拉伸或散步，把身体从工作状态慢慢带回恢复状态。"
            : "优先做 15 到 20 分钟快走、骑行或徒手循环，先把运动时长补上。", exerciseSummary.todayMinutes >= exerciseTargetMinutes ? "恢复" : "训练"),
        createTodayPlanItem("下一餐", dietSummary.protein >= dietSummary.proteinTarget ? "保持清爽收口" : "把蛋白质补齐", dietSummary.protein >= dietSummary.proteinTarget
            ? "控制油脂和精制碳水，保持今天已经建立起来的饮食节奏。"
            : "主菜优先鸡胸、鱼、豆腐或鸡蛋，同时把蔬菜占比拉上来。", "饮食"),
        createTodayPlanItem("今晚", "把恢复节律收好", `在睡前完成剩余补水，尽量给自己留出 ${profile.sleepTargetHours} 小时睡眠窗口。`, "睡眠")
    ];
    const todayCompletedCount = completedToday.filter((item) => item.tone !== "warning").length;
    const todayPendingCount = pendingToday.length;
    const todayScore = clamp(Math.round((Math.min(completedToday.length, 4) / (Math.min(completedToday.length, 4) + Math.min(todayPendingCount, 4))) * 100), 35, 96);
    const headline = todayScore >= 80
        ? "今天的节奏已经比较稳，接下来重点是把晚间恢复收好。"
        : todayScore >= 60
            ? "今天已经有起色，再把运动、补水和晚间节律补齐会更完整。"
            : "今日记录还不够饱满，先完成一两件关键动作，概览会立刻清晰很多。";
    const subheadline = `已完成 ${completedToday.length} 项关键动作，当前最值得继续推进的是 ${pendingToday[0]?.title ?? "保持当下节奏"}。`;
    const momentumLabel = todayScore >= 80 ? "今日状态在线" : todayScore >= 60 ? "节奏正在建立" : "需要一点启动";
    const todaySummary = `运动 ${exerciseSummary.todayMinutes} 分钟，摄入 ${dietSummary.todayCalories} kcal，补水 ${dietSummary.waterIntakeMl} ml。`;
    const weeklyLoad = (() => {
        const labels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
        const start = getWeekStart(now);
        const buckets = new Map();
        for (const workout of exerciseSummary.workouts.filter((item) => item.status === "已完成")) {
            const dateKey = String(workout.performedAt).slice(0, 10);
            const bucket = buckets.get(dateKey) ?? { durationMinutes: 0, caloriesBurned: 0 };
            bucket.durationMinutes += workout.durationMinutes;
            bucket.caloriesBurned += workout.caloriesBurned;
            buckets.set(dateKey, bucket);
        }
        return labels.map((label, index) => {
            const current = new Date(start);
            current.setDate(start.getDate() + index);
            const key = formatDateKey(current);
            const bucket = buckets.get(key) ?? { durationMinutes: 0, caloriesBurned: 0 };
            return {
                label,
                durationMinutes: bucket.durationMinutes,
                caloriesBurned: bucket.caloriesBurned,
                steps: bucket.durationMinutes > 0 ? 5000 + bucket.durationMinutes * 90 : 3200
            };
        });
    })();
    return {
        dateLabel: formatDateLabel(now),
        userName: profile.nickname,
        headline,
        subheadline,
        profileUpdatedAt: profile.updatedAt,
        nextReminder: plannedToday[0].title,
        momentumLabel,
        todayScore,
        todaySummary,
        todayCompletedCount,
        todayPendingCount,
        completionRate,
        weeklyConsistency,
        currentWeight: profile.currentWeightKg,
        targetWeight,
        weightDelta,
        completedToday,
        pendingToday,
        plannedToday,
        metrics: [
            {
                label: "今日训练",
                value: `${exerciseSummary.todayMinutes} 分钟`,
                note: exerciseSummary.todayMinutes >= exerciseTargetMinutes ? "已经达到建议活动时长" : `距离建议目标还差 ${exerciseTargetMinutes - exerciseSummary.todayMinutes} 分钟`,
                tone: exerciseSummary.todayMinutes >= exerciseTargetMinutes ? "positive" : "warning"
            },
            {
                label: "今日摄入",
                value: `${dietSummary.todayCalories} kcal`,
                note: dietSummary.remainingCalories >= 0 ? `剩余预算 ${dietSummary.remainingCalories} kcal` : `已超出 ${Math.abs(dietSummary.remainingCalories)} kcal`,
                tone: dietSummary.remainingCalories >= 0 ? "positive" : "warning"
            },
            {
                label: "饮水进度",
                value: `${dietSummary.waterIntakeMl} / ${dietSummary.waterTargetMl} ml`,
                note: todayWaterProgress >= 100 ? "补水目标已完成" : `完成 ${todayWaterProgress}%`,
                tone: todayWaterProgress >= 70 ? "positive" : "neutral"
            },
            {
                label: "本周完成",
                value: `${exerciseSummary.completedDays}/${exerciseSummary.weeklyGoalDays} 天`,
                note: `本周一致性 ${weeklyConsistency}%`,
                tone: weeklyConsistency >= 80 ? "positive" : "neutral"
            }
        ],
        moduleStats: [
            {
                title: "运动执行",
                value: `${exerciseSummary.todayMinutes} 分钟`,
                subtitle: exerciseSummary.todayMinutes >= exerciseTargetMinutes ? "今天已经动起来了" : "建议再补一段短训练",
                progress: todayExerciseCompletion,
                tone: exerciseSummary.todayMinutes >= exerciseTargetMinutes ? "positive" : "warning"
            },
            {
                title: "饮食记录",
                value: `${todayMealsCount} 条`,
                subtitle: dietSummary.remainingCalories >= 0 ? "当前摄入仍在预算内" : "今天摄入略高，下一餐尽量清爽",
                progress: clamp(todayDietCompletion, 0, 100),
                tone: dietSummary.remainingCalories >= 0 ? "positive" : "warning"
            },
            {
                title: "补水进度",
                value: `${dietSummary.waterIntakeMl} ml`,
                subtitle: dietSummary.waterIntakeMl >= dietSummary.waterTargetMl ? "补水目标已完成" : `距离目标还差 ${dietSummary.waterTargetMl - dietSummary.waterIntakeMl} ml`,
                progress: todayWaterProgress,
                tone: todayWaterProgress >= 70 ? "positive" : "warning"
            },
            {
                title: "恢复准备",
                value: `${profile.sleepTargetHours} 小时`,
                subtitle: "今晚把睡眠窗口预留出来，恢复质量会直接影响明天状态",
                progress: clamp(Math.round((completionRate + weeklyConsistency) / 2), 40, 100),
                tone: "neutral"
            }
        ],
        weeklyLoad,
        recentWorkouts: exerciseSummary.workouts.slice(0, 4).map((row) => ({
            date: formatShortDateLabel(row.performedAt),
            name: row.name,
            category: row.category,
            durationMinutes: row.durationMinutes,
            caloriesBurned: row.caloriesBurned,
            intensity: row.intensity,
            status: row.status
        })),
        complianceTable: [
            {
                module: "今日运动",
                target: `${exerciseTargetMinutes} 分钟`,
                actual: `${exerciseSummary.todayMinutes} 分钟`,
                completion: todayExerciseCompletion,
                note: "用短时训练也可以完成今天的活动闭环"
            },
            {
                module: "今日蛋白质",
                target: `${dietSummary.proteinTarget} g`,
                actual: `${dietSummary.protein} g`,
                completion: clamp(Math.round((dietSummary.protein / Math.max(dietSummary.proteinTarget, 1)) * 100), 0, 100),
                note: "优先通过下一餐把恢复所需的蛋白质补齐"
            },
            {
                module: "今日补水",
                target: `${dietSummary.waterTargetMl} ml`,
                actual: `${dietSummary.waterIntakeMl} ml`,
                completion: todayWaterProgress,
                note: "分次补水，比一次性猛喝更容易坚持"
            },
            {
                module: "本周训练",
                target: `${exerciseSummary.weeklyGoalDays} 天`,
                actual: `${exerciseSummary.completedDays} 天`,
                completion: weeklyConsistency,
                note: "周节奏稳下来，减重和恢复才更可持续"
            }
        ],
        focusModules: pendingToday.slice(0, 3).map((item) => item.title)
    };
}
