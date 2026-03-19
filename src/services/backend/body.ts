import type { BodyProfile, UserProfileRecord } from "../types";
import { getBridge } from "./shared/bridge";
import { readSessionUserId, requestJson } from "./shared/http";

function buildHabitTags(profile: UserProfileRecord) {
  const tags: string[] = [];

  if (profile.workStyle) {
    tags.push(profile.workStyle);
  }

  if (profile.stressLevel) {
    tags.push(`压力${profile.stressLevel}`);
  }

  if (profile.habitSleep) {
    tags.push("已记录睡眠习惯");
  }

  if (profile.habitDiet) {
    tags.push("已记录饮食习惯");
  }

  if (profile.habitExercise) {
    tags.push("已记录运动习惯");
  }

  if (profile.smokingStatus && profile.smokingStatus !== "从不") {
    tags.push(profile.smokingStatus);
  }

  if (profile.drinkingFrequency && profile.drinkingFrequency !== "几乎不") {
    tags.push(`饮酒${profile.drinkingFrequency}`);
  }

  return tags.length > 0 ? tags : ["待补充生活习惯信息"];
}

function buildGoalSummary(profile: UserProfileRecord) {
  const bodyFatText = profile.targetBodyFatRate ? `，体脂率目标 ${profile.targetBodyFatRate}%` : "";
  return `当前以 ${profile.targetWeightKg} kg 为体重目标${bodyFatText}，每周训练 ${profile.weeklyWorkoutTarget} 次，日摄入目标 ${profile.dailyCalorieTarget} kcal。`;
}

function buildBodyProfile(profile: UserProfileRecord): BodyProfile {
  const weightGap = Number((profile.currentWeightKg - profile.targetWeightKg).toFixed(1));
  const bmiTone =
    profile.bmi === null ? "待完善" : profile.bmi < 18.5 ? "偏低" : profile.bmi < 24 ? "正常" : profile.bmi < 28 ? "偏高" : "较高";

  return {
    nickname: profile.nickname,
    age: profile.age,
    gender: profile.gender,
    heightCm: profile.heightCm,
    weightKg: profile.currentWeightKg,
    bodyFatRate: profile.bodyFatRate,
    bmi: profile.bmi,
    bmr: profile.bmr,
    sleepHours: profile.sleepTargetHours,
    targetWeightKg: profile.targetWeightKg,
    targetBodyFatRate: profile.targetBodyFatRate,
    weeklyWorkoutTarget: profile.weeklyWorkoutTarget,
    dailyCalorieTarget: profile.dailyCalorieTarget,
    sleepTargetHours: profile.sleepTargetHours,
    workStyle: profile.workStyle,
    stressLevel: profile.stressLevel,
    smokingStatus: profile.smokingStatus,
    drinkingFrequency: profile.drinkingFrequency,
    habitSleep: profile.habitSleep,
    habitDiet: profile.habitDiet,
    habitExercise: profile.habitExercise,
    goalSummary: buildGoalSummary(profile),
    healthSummary:
      weightGap > 0
        ? `距离阶段目标还差 ${weightGap.toFixed(1)} kg，目前 BMI ${profile.bmi ?? "--"}，适合继续采用稳态减脂策略。`
        : "当前体重已接近目标区间，重点应转向维持、恢复和体脂优化。",
    habits: buildHabitTags(profile),
    goalCards: [
      {
        label: "阶段目标体重",
        value: `${profile.targetWeightKg} kg`,
        description: weightGap > 0 ? `当前还差 ${weightGap.toFixed(1)} kg` : "已接近目标"
      },
      {
        label: "训练频率",
        value: `${profile.weeklyWorkoutTarget} 次/周`,
        description: "建议包含力量、有氧和恢复活动"
      },
      {
        label: "摄入目标",
        value: `${profile.dailyCalorieTarget} kcal`,
        description: "用于配合减脂或维持策略"
      }
    ],
    habitInsights: [
      {
        label: "BMI 状态",
        value: profile.bmi ? `${profile.bmi} · ${bmiTone}` : "待完善",
        tone: profile.bmi !== null && profile.bmi >= 24 ? "warning" : "positive"
      },
      {
        label: "作息目标",
        value: `${profile.sleepTargetHours} 小时/天`,
        tone: profile.sleepTargetHours >= 7.5 ? "positive" : "warning"
      },
      {
        label: "压力水平",
        value: profile.stressLevel || "待填写",
        tone: profile.stressLevel === "高" ? "warning" : "neutral"
      },
      {
        label: "工作方式",
        value: profile.workStyle || "待填写",
        tone: profile.workStyle.includes("久坐") ? "warning" : "neutral"
      }
    ]
  };
}

export async function getBodyProfile(): Promise<BodyProfile> {
  const bridge = getBridge();
  const userId = readSessionUserId();

  if (bridge?.getBodyProfile && userId !== null) {
    const profile = await bridge.getBodyProfile({ userId });
    return buildBodyProfile(profile);
  }

  return requestJson("/assessment/profile");
}
