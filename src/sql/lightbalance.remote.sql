-- LightBalance remote database export
-- Generated at 2026-03-18T19:34:46.592Z
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
CREATE DATABASE IF NOT EXISTS `lightbalance` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;
USE `lightbalance`;

-- Table: advice_record
DROP TABLE IF EXISTS `advice_record`;
CREATE TABLE `advice_record` (
  `advice_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `advice_type` varchar(30) NOT NULL,
  `advice_content` text NOT NULL,
  `advice_source` varchar(20) NOT NULL,
  `advice_date` date NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`advice_id`),
  KEY `idx_advice_record_user_id` (`user_id`),
  CONSTRAINT `fk_advice_record_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='建议记录表';

-- Table: assistant_chat_message
DROP TABLE IF EXISTS `assistant_chat_message`;
CREATE TABLE `assistant_chat_message` (
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` varchar(20) NOT NULL,
  `tag` varchar(40) NOT NULL DEFAULT '',
  `content` text NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`message_id`),
  KEY `idx_assistant_message_user_created` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: assistant_plan_snapshot
DROP TABLE IF EXISTS `assistant_plan_snapshot`;
CREATE TABLE `assistant_plan_snapshot` (
  `snapshot_id` int NOT NULL,
  `user_id` int NOT NULL,
  `focus` varchar(40) NOT NULL DEFAULT '综合平衡',
  `title` varchar(120) NOT NULL,
  `summary` text NOT NULL,
  `readiness_score` int NOT NULL DEFAULT '0',
  `risk_label` varchar(40) NOT NULL DEFAULT '待分析',
  `next_check_in` varchar(40) NOT NULL DEFAULT '',
  `quick_questions_json` json NOT NULL,
  `metrics_json` json NOT NULL,
  `priorities_json` json NOT NULL,
  `insights_json` json NOT NULL,
  `actions_json` json NOT NULL,
  `reminders_json` json NOT NULL,
  `generated_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `derived_contents_json` json NOT NULL DEFAULT (_utf8mb4'[]'),
  `modality_ideas_json` json NOT NULL DEFAULT (_utf8mb4'[]'),
  PRIMARY KEY (`snapshot_id`),
  KEY `idx_assistant_snapshot_user_generated` (`user_id`,`generated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: body_metric_record
DROP TABLE IF EXISTS `body_metric_record`;
CREATE TABLE `body_metric_record` (
  `metric_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `record_date` date NOT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `body_fat_rate` decimal(5,2) DEFAULT NULL,
  `waist_cm` decimal(5,2) DEFAULT NULL,
  `hip_cm` decimal(5,2) DEFAULT NULL,
  `chest_cm` decimal(5,2) DEFAULT NULL,
  `sleep_hours` decimal(4,2) DEFAULT NULL,
  `step_count` int DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`metric_id`),
  KEY `idx_body_metric_record_user_id` (`user_id`),
  CONSTRAINT `fk_body_metric_record_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='身体指标记录表';

-- Table: diet_daily_log
DROP TABLE IF EXISTS `diet_daily_log`;
CREATE TABLE `diet_daily_log` (
  `daily_id` int NOT NULL,
  `user_id` int NOT NULL,
  `log_date` date NOT NULL,
  `water_intake_ml` int NOT NULL DEFAULT '0',
  `water_target_ml` int NOT NULL DEFAULT '2000',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`daily_id`),
  UNIQUE KEY `uniq_diet_daily_user_date` (`user_id`,`log_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: diet_meal_entry
DROP TABLE IF EXISTS `diet_meal_entry`;
CREATE TABLE `diet_meal_entry` (
  `entry_id` int NOT NULL,
  `user_id` int NOT NULL,
  `log_date` date NOT NULL,
  `meal_type` varchar(30) NOT NULL,
  `food_name` varchar(120) NOT NULL,
  `portion_label` varchar(40) NOT NULL DEFAULT '',
  `calories` int NOT NULL DEFAULT '0',
  `protein_g` int NOT NULL DEFAULT '0',
  `carbs_g` int NOT NULL DEFAULT '0',
  `fat_g` int NOT NULL DEFAULT '0',
  `recorded_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`entry_id`),
  KEY `idx_diet_meal_user_date` (`user_id`,`log_date`),
  KEY `idx_diet_meal_recorded_at` (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: diet_record
DROP TABLE IF EXISTS `diet_record`;
CREATE TABLE `diet_record` (
  `diet_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `food_id` bigint NOT NULL,
  `record_date` date NOT NULL,
  `meal_type` varchar(20) NOT NULL,
  `intake_weight_g` decimal(6,2) NOT NULL,
  `total_calories` decimal(6,2) NOT NULL,
  `protein` decimal(6,2) DEFAULT NULL,
  `fat` decimal(6,2) DEFAULT NULL,
  `carb` decimal(6,2) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`diet_id`),
  KEY `idx_diet_record_user_id` (`user_id`),
  KEY `idx_diet_record_food_id` (`food_id`),
  CONSTRAINT `fk_diet_record_food` FOREIGN KEY (`food_id`) REFERENCES `food_item` (`food_id`),
  CONSTRAINT `fk_diet_record_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='饮食记录表';

-- Table: exercise_record
DROP TABLE IF EXISTS `exercise_record`;
CREATE TABLE `exercise_record` (
  `exercise_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `record_date` date NOT NULL,
  `exercise_type` varchar(50) NOT NULL,
  `duration_min` int NOT NULL,
  `intensity` varchar(20) DEFAULT NULL,
  `calories_burned` decimal(6,2) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`exercise_id`),
  KEY `idx_exercise_record_user_id` (`user_id`),
  CONSTRAINT `fk_exercise_record_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='运动记录表';

-- Table: exercise_session_log
DROP TABLE IF EXISTS `exercise_session_log`;
CREATE TABLE `exercise_session_log` (
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `performed_on` date NOT NULL,
  `performed_at` datetime NOT NULL,
  `name` varchar(120) NOT NULL,
  `category` varchar(40) NOT NULL DEFAULT '综合训练',
  `duration_minutes` int NOT NULL DEFAULT '0',
  `calories_burned` int NOT NULL DEFAULT '0',
  `intensity` varchar(30) NOT NULL DEFAULT '中等',
  `status` varchar(30) NOT NULL DEFAULT '已完成',
  `notes` varchar(255) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_exercise_user_date` (`user_id`,`performed_on`),
  KEY `idx_exercise_user_performed_at` (`user_id`,`performed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: feedback
DROP TABLE IF EXISTS `feedback`;
CREATE TABLE `feedback` (
  `feedback_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `feedback_type` varchar(30) NOT NULL,
  `feedback_content` text NOT NULL,
  `contact_info` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`feedback_id`),
  KEY `idx_feedback_user_id` (`user_id`),
  CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='反馈表';

-- Table: food_item
DROP TABLE IF EXISTS `food_item`;
CREATE TABLE `food_item` (
  `food_id` bigint NOT NULL,
  `food_name` varchar(100) NOT NULL,
  `unit_weight_g` decimal(6,2) DEFAULT NULL,
  `calories_per_100g` decimal(6,2) NOT NULL,
  `protein_per_100g` decimal(6,2) DEFAULT NULL,
  `fat_per_100g` decimal(6,2) DEFAULT NULL,
  `carb_per_100g` decimal(6,2) DEFAULT NULL,
  PRIMARY KEY (`food_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='食物基础表';

-- Table: health_goal
DROP TABLE IF EXISTS `health_goal`;
CREATE TABLE `health_goal` (
  `goal_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `target_weight_kg` decimal(5,2) DEFAULT NULL,
  `target_body_fat_rate` decimal(5,2) DEFAULT NULL,
  `target_period_days` int NOT NULL,
  `target_exercise_days_per_week` int DEFAULT NULL,
  `target_water_ml_per_day` decimal(8,2) DEFAULT NULL,
  `goal_status` varchar(20) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  PRIMARY KEY (`goal_id`),
  KEY `idx_health_goal_user_id` (`user_id`),
  CONSTRAINT `fk_health_goal_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='健康目标表';

-- Table: reminder
DROP TABLE IF EXISTS `reminder`;
CREATE TABLE `reminder` (
  `reminder_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `reminder_type` varchar(30) NOT NULL,
  `reminder_content` varchar(255) NOT NULL,
  `remind_time` datetime NOT NULL,
  `is_read` tinyint DEFAULT '0',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`reminder_id`),
  KEY `idx_reminder_user_id` (`user_id`),
  CONSTRAINT `fk_reminder_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提醒表';

-- Table: trend_daily_snapshot
DROP TABLE IF EXISTS `trend_daily_snapshot`;
CREATE TABLE `trend_daily_snapshot` (
  `snapshot_id` int NOT NULL,
  `user_id` int NOT NULL,
  `snapshot_date` date NOT NULL,
  `weight_kg` decimal(6,2) NOT NULL,
  `body_fat_rate` decimal(5,2) DEFAULT NULL,
  `waist_cm` decimal(6,2) NOT NULL,
  `sleep_hours` decimal(4,1) NOT NULL DEFAULT '0.0',
  `steps` int NOT NULL DEFAULT '0',
  `calorie_intake` int NOT NULL DEFAULT '0',
  `calorie_burned` int NOT NULL DEFAULT '0',
  `training_minutes` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`snapshot_id`),
  UNIQUE KEY `uniq_trend_snapshot_user_date` (`user_id`,`snapshot_date`),
  KEY `idx_trend_snapshot_user_date` (`user_id`,`snapshot_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: user
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `user_id` bigint NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `nickname` varchar(50) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status` tinyint DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_user_username` (`username`),
  UNIQUE KEY `uk_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户表';

-- Table: user_daily_snapshot
DROP TABLE IF EXISTS `user_daily_snapshot`;
CREATE TABLE `user_daily_snapshot` (
  `snapshot_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `snapshot_date` date NOT NULL,
  `calories_intake` int NOT NULL DEFAULT '0',
  `water_intake_ml` int NOT NULL DEFAULT '0',
  `steps` int NOT NULL DEFAULT '0',
  `sleep_hours` decimal(4,1) NOT NULL DEFAULT '0.0',
  `weight_kg` decimal(6,2) NOT NULL DEFAULT '0.00',
  `body_fat_rate` decimal(5,2) DEFAULT NULL,
  `waist_cm` decimal(5,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`snapshot_id`),
  UNIQUE KEY `uniq_user_snapshot_date` (`user_id`,`snapshot_date`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: user_profile
DROP TABLE IF EXISTS `user_profile`;
CREATE TABLE `user_profile` (
  `profile_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `age` int NOT NULL,
  `gender` varchar(10) NOT NULL,
  `height_cm` decimal(5,2) NOT NULL,
  `current_weight_kg` decimal(5,2) NOT NULL,
  `body_fat_rate` decimal(5,2) DEFAULT NULL,
  `habit_sleep` varchar(100) DEFAULT NULL,
  `habit_diet` varchar(100) DEFAULT NULL,
  `habit_exercise` varchar(100) DEFAULT NULL,
  `bmi` decimal(5,2) DEFAULT NULL,
  `bmr` decimal(6,2) DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  `target_weight_kg` decimal(6,2) NOT NULL DEFAULT '57.00',
  `target_body_fat_rate` decimal(5,2) DEFAULT NULL,
  `weekly_workout_target` int NOT NULL DEFAULT '4',
  `daily_calorie_target` int NOT NULL DEFAULT '1600',
  `sleep_target_hours` decimal(4,1) NOT NULL DEFAULT '7.5',
  `work_style` varchar(60) NOT NULL DEFAULT '',
  `stress_level` varchar(30) NOT NULL DEFAULT '中',
  `smoking_status` varchar(30) NOT NULL DEFAULT '从不',
  `drinking_frequency` varchar(30) NOT NULL DEFAULT '几乎不',
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uk_user_profile_user_id` (`user_id`),
  CONSTRAINT `fk_user_profile_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户档案表';

-- Table: user_workout_session
DROP TABLE IF EXISTS `user_workout_session`;
CREATE TABLE `user_workout_session` (
  `session_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `session_date` date NOT NULL,
  `session_name` varchar(120) NOT NULL,
  `category` varchar(40) NOT NULL,
  `duration_minutes` int NOT NULL DEFAULT '0',
  `calories_burned` int NOT NULL DEFAULT '0',
  `intensity` varchar(40) NOT NULL DEFAULT '中强度',
  `completion_status` varchar(40) NOT NULL DEFAULT '已完成',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  KEY `idx_user_workout_user_date` (`user_id`,`session_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: water_record
DROP TABLE IF EXISTS `water_record`;
CREATE TABLE `water_record` (
  `water_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `record_date` date NOT NULL,
  `intake_ml` int NOT NULL,
  `intake_times` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`water_id`),
  KEY `idx_water_record_user_id` (`user_id`),
  CONSTRAINT `fk_water_record_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='饮水记录表';

-- Data: advice_record
INSERT INTO `advice_record` (`advice_id`, `user_id`, `advice_type`, `advice_content`, `advice_source`, `advice_date`, `created_at`) VALUES (100001, 10001, '运动', '建议将有氧与力量训练结合，保持每周至少5天活动频率。', 'AI', '2026-03-17 00:00:00', '2026-03-17 09:30:00');
INSERT INTO `advice_record` (`advice_id`, `user_id`, `advice_type`, `advice_content`, `advice_source`, `advice_date`, `created_at`) VALUES (100002, 10001, '饮食', '晚餐主食可适当减少，优先补充优质蛋白和蔬菜。', '规则', '2026-03-17 00:00:00', '2026-03-17 09:40:00');
INSERT INTO `advice_record` (`advice_id`, `user_id`, `advice_type`, `advice_content`, `advice_source`, `advice_date`, `created_at`) VALUES (100003, 10002, '阶段分析', '目前体重维持较稳定，建议继续控制精制糖摄入并增加步行。', '混合', '2026-03-17 00:00:00', '2026-03-17 10:00:00');

-- Data: assistant_chat_message
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130001, 10003, 'assistant', '系统建议', '我已经根据你最近的身体、饮食、训练和趋势数据生成了首轮行动建议。', '2026-03-18 22:19:54');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130002, 10003, 'user', '训练安排', '今天怎么样', '2026-03-18 22:20:15');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130003, 10003, 'assistant', '训练安排问答', '现在的核心不是做得更猛，而是让饮食、训练和恢复保持同向。只要执行稳定，接下来一周通常就能看到更顺的反馈。', '2026-03-18 22:20:15');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130004, 10003, 'user', '饮食优化', '我是谁', '2026-03-18 23:47:20');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130005, 10003, 'assistant', '饮食优化问答', '现在的核心不是做得更猛，而是让饮食、训练和恢复保持同向。只要执行稳定，接下来一周通常就能看到更顺的反馈。', '2026-03-18 23:47:20');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130006, 10003, 'user', '饮食优化', '如果我给你一张晚餐照片，你希望我怎么拍？', '2026-03-18 23:47:33');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130007, 10003, 'assistant', '饮食问答', '今晚可以继续按目标推进。你距离当日目标还剩 1280 kcal，建议把额度留给蛋白质、蔬菜和易饱腹主食。', '2026-03-18 23:47:33');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130008, 10003, 'user', '饮食优化', '我今天不高兴了', '2026-03-18 23:54:33');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130009, 10003, 'assistant', '饮食优化建议', '你现在需要的不是更猛，而是让饮食、训练和恢复继续同向发力。只要节奏稳定，一周内通常就能看到更顺的执行反馈。', '2026-03-18 23:54:45');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130010, 10003, 'user', '饮食优化', '今晚吃多了，应该怎么收口比较稳？', '2026-03-18 23:54:55');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130011, 10003, 'assistant', '饮食优化建议', '今晚仍有约 1280 kcal 空间，建议把额度留给蛋白质、蔬菜和更稳妥的主食，而不是高糖高脂零食。', '2026-03-18 23:55:07');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130012, 10003, 'user', '饮食优化', '今天吃什么啊，我好纠结', '2026-03-19 00:28:37');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130013, 10003, 'assistant', '饮食优化建议', '恭喜小明老师，今天你已经按计划摄入了 1600 kcal，完成了当日热量目标。', '2026-03-19 00:28:55');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130014, 10003, 'user', '饮食优化', '你好', '2026-03-19 00:41:55');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130015, 10003, 'assistant', '饮食优化建议', '恭喜小明老师，你今天已经按计划摄入了 1600 kcal，完成了当日热量目标。这是饮食优化非常重要的一步。', '2026-03-19 00:42:24');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130016, 10003, 'user', '情绪与压力', '有哪些简单的方法增加饮水量？', '2026-03-19 00:43:47');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130017, 10003, 'assistant', '情绪与压力建议', '根据您的记录，今日饮水还需补充约 1920 ml。充足的水分是保持情绪稳定的基础之一。', '2026-03-19 00:44:02');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130018, 10003, 'user', '训练安排', '我不高兴了', '2026-03-19 01:16:25');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130019, 10003, 'assistant', '情绪与压力', '听到你现在不高兴，我感到有些担心。情绪也是我们整体健康节奏很重要的一部分。你愿意和我说说发生了什么吗？或者，你想试试一些能帮助改善心情的小活动吗？', '2026-03-19 01:16:54');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130020, 10003, 'user', '训练安排', '解释编译系统的基本原理', '2026-03-19 01:17:25');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130021, 10003, 'assistant', '训练安排', '小明老师，您好！关于编译系统的基本原理，这超出了我的健康节奏管理范围。我专注于帮助您管理健康生活方式。如果您有关于饮食、运动、睡眠或情绪方面的问题，我很乐意为您提供帮助！', '2026-03-19 01:17:50');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130022, 10003, 'user', '训练安排', '今天吃什么呀', '2026-03-19 01:18:17');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130023, 10003, 'assistant', '饮食建议', '小明老师，您今天已经按计划摄入了 1600 kcal，完成了当日热量目标。目前来看，您可以继续保持当前的饮食节奏。如果您还有饥饿感，可以考虑一些低热量的健康加餐，比如一份水果或少量坚果。', '2026-03-19 01:18:49');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130024, 10003, 'user', '综合平衡', '有哪些助眠小技巧？', '2026-03-19 01:24:49');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130025, 10003, 'assistant', '睡眠建议', '小明老师，您好！改善睡眠质量对您的整体健康非常重要。这里有一些助眠小技巧，您可以尝试一下：\n\n1.  **建立规律作息：** 每天尽量在同一时间上床睡觉和起床，即使是周末也要保持一致。这有助于您的身体建立稳定的生物钟。\n2.  **营造舒适环境：** 确保您的卧室黑暗、安静、凉爽。选择舒适的床垫和枕头也能大大提升睡眠质量。\n3.  **睡前放松：** 睡前一小时避免使用手机、电脑等电子产品，屏幕发出的蓝光会抑制褪黑素分泌。您可以尝试听轻柔的音乐、阅读纸质书、泡个温水澡或进行简单的冥想。\n4.  **避免刺激物：** 睡前几小时尽量不要摄入咖啡因（如咖啡、茶）和酒精，它们会干扰您的睡眠结构。\n5.  **白天适度运动：** 白天进行适量的体育锻炼有助于改善夜间睡眠，但请注意，睡前两三小时内应避免剧烈运动。\n\n这些小技巧贵在坚持，希望它们能帮助您拥有一个香甜的夜晚！', '2026-03-19 01:25:07');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130026, 10003, 'user', '综合平衡', '睡前可以吃什么小吃？', '2026-03-19 01:32:13');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130027, 10003, 'assistant', '睡眠建议', '小明老师，您好！我知道有时睡前会觉得有点饿。考虑到您今天已经达到了1600大卡的热量目标，如果非要加餐，建议选择非常少量且易消化的食物，以免影响您的体重管理目标和睡眠质量。\n\n您可以考虑：\n*   **一小杯温牛奶：** 含有色氨酸，有助于放松。\n*   **几颗杏仁（约5-6颗）：** 富含镁，对睡眠有益。\n*   **半根香蕉：** 提供碳水化合物和钾，但注意份量。\n\n请务必注意份量，并且尽量在睡前1小时左右食用。避免油腻、辛辣或高糖的食物，它们会刺激消化系统，影响睡眠。如果只是习惯性想吃东西，也可以尝试喝一杯温水或做些睡前拉伸来代替哦。', '2026-03-19 01:32:38');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130028, 10003, 'user', '综合平衡', '如何避免睡前饥饿？', '2026-03-19 01:34:06');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130029, 10003, 'assistant', '睡眠建议', '小明老师，您好！了解您想避免睡前饥饿的困扰。与其在睡前才想着如何应对饥饿感，不如从全天的饮食和生活习惯入手，提前做好预防，这样既能保持健康节奏，又能更好地管理体重目标。\n\n这里有一些建议，希望能帮助您有效避免睡前饥饿：\n\n1.  **均衡三餐，摄入足量蛋白质和纤维：** 确保您白天的三餐吃得营养均衡，尤其是蛋白质和膳食纤维要足够。蛋白质能提供更强的饱腹感，纤维则能稳定血糖，避免餐后血糖快速下降引起的饥饿感。比如，在晚餐中加入一份瘦肉、鱼肉或豆制品，搭配充足的蔬菜。\n2.  **晚餐时间合理安排：** 尽量在睡前3-4小时完成晚餐。如果晚餐吃得太早，到睡前可能又会感到饥饿。如果太晚，又可能影响消化和睡眠。找到最适合您的时间点。\n3.  **下午加餐要智慧：** 如果您午餐到晚餐间隔较长，可以在下午加餐一份健康的小食，比如酸奶、水果或一小把坚果。这能帮助您避免晚餐过量，也能减少睡前饥饿的几率。但请注意，加餐的热量也要计算在每日总热量内。\n4.  **充足饮水：** 有时身体会将口渴误认为是饥饿。全天保持充足的水分摄入非常重要。您今天的饮水目标是1920ml，目前还没有记录，记得要及时补充哦！\n5.  **区分生理性饥饿与习惯性饥饿：** 问问自己，这种饥饿感是真实的生理需求，还是仅仅因为无聊、压力或习惯性地想吃东西。如果是后者，可以尝试做一些放松活动，比如阅读、听音乐，或者喝一杯温水。\n6.  **管理压力：** 压力有时也会导致食欲增加，尤其是在晚上。学会一些放松技巧，如深呼吸、冥想等，有助于管理情绪性进食。\n\n希望这些方法能帮助您告别睡前饥饿，拥有更好的睡眠质量！', '2026-03-19 01:34:37');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130030, 10003, 'user', '综合平衡', '我要学机器学习', '2026-03-19 01:41:41');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130031, 10003, 'assistant', '健康建议', '小明老师，您好！您提到“我要学机器学习”，这确实是一个非常有趣且前沿的领域。不过，我作为您的健康节律管理助理，我的专长在于为您提供饮食、运动、睡眠以及整体健康节奏方面的建议。\n\n关于机器学习，很抱歉这超出了我的知识范围。但我很乐意继续帮助您管理和优化您的健康生活。如果您有任何关于健康、健身或作息方面的问题，请随时告诉我！', '2026-03-19 01:42:00');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130032, 10003, 'user', '综合平衡', '卧室照片', '2026-03-19 01:43:07');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130033, 10003, 'assistant', '睡眠环境', '小明老师，您提到“卧室照片”，这让我想到营造一个良好的卧室环境对于提升睡眠质量至关重要呢！虽然我无法直接查看照片，但我可以为您提供一些优化卧室环境的建议，帮助您拥有更香甜的睡眠。您想了解哪些方面，比如卧室的温度、光线、声音，还是其他布局上的建议呢？', '2026-03-19 01:43:34');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130034, 10003, 'user', '综合平衡', '今天我吃了苹果', '2026-03-19 01:51:10');
INSERT INTO `assistant_chat_message` (`message_id`, `user_id`, `role`, `tag`, `content`, `created_at`) VALUES (130035, 10003, 'assistant', '饮食记录', '小明老师，您好！收到您今天吃了苹果的记录。一个中等大小的苹果大约是95大卡。加上这95大卡，您今天的总摄入已经达到了1695大卡，略微超出了您1600大卡的目标。不过，苹果是健康的选择，富含膳食纤维和维生素！请您继续关注整体的能量平衡哦。', '2026-03-19 01:51:31');

-- Data: assistant_plan_snapshot
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120001, 10003, '综合平衡', '今日智能陪跑建议', '距离阶段目标还有 3 kg；最近恢复端偏弱，平均睡眠比目标少 0.4 小时；本周训练还差 2 天。当前更适合用“稳定执行”拿结果，而不是继续猛压。', 61, '训练需要补齐', '明早 08:30', '今晚吃多了怎么办？', '明天训练怎么安排？', '体重平台期先看什么？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '晚饭后 15 分钟内完成饮食记录', '训练前后补水，今天尽量接近饮水目标', '明早查看体重与精神状态再决定是否加量', '2026-03-18 22:19:55', '2026-03-18 22:19:55', , );
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120002, 10003, '训练安排', '根据你刚才的问题更新的建议', '距离阶段目标还有 3 kg；最近恢复端偏弱，平均睡眠比目标少 0.4 小时；本周训练还差 2 天。当前更适合用“稳定执行”拿结果，而不是继续猛压。', 61, '训练需要补齐', '明早 08:30', '今晚吃多了怎么办？', '明天训练怎么安排？', '体重平台期先看什么？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '晚饭后 15 分钟内完成饮食记录', '训练前后补水，今天尽量接近饮水目标', '明早查看体重与精神状态再决定是否加量', '2026-03-18 22:20:15', '2026-03-18 22:20:15', , );
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120003, 10003, '饮食优化', '根据你刚才的问题更新的建议', '距离阶段目标还有 3 kg；最近恢复端偏弱，平均睡眠比目标少 0.4 小时；本周训练还差 2 天。当前更适合用“稳定执行”拿结果，而不是继续猛压。', 61, '训练需要补齐', '明早 08:30', '今晚吃多了怎么办？', '明天训练怎么安排？', '体重平台期先看什么？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '晚饭后 15 分钟内完成饮食记录', '训练前后补水，今天尽量接近饮水目标', '明早查看体重与精神状态再决定是否加量', '2026-03-18 23:47:20', '2026-03-18 23:47:20', , );
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120004, 10003, '饮食优化', '根据你刚才的问题更新的建议', '距离阶段目标还有 3 kg；最近恢复端偏弱，平均睡眠比目标少 0.4 小时；本周训练还差 2 天。当前更适合用“稳定执行”拿结果，而不是继续猛压。', 61, '训练需要补齐', '明早 08:30', '今晚吃多了怎么办？', '明天训练怎么安排？', '体重平台期先看什么？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '晚饭后 15 分钟内完成饮食记录', '训练前后补水，今天尽量接近饮水目标', '明早查看体重与精神状态再决定是否加量', '2026-03-18 23:47:33', '2026-03-18 23:47:33', , );
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120005, 10003, '饮食优化', '你的专属 Agent 已根据新问题更新建议', '距离目标体重还有 3 kg，最近恢复端偏弱，平均睡眠仍少 0.4 小时，本周训练还差 2 次需要补齐', 58, '训练节奏待补齐', '明早 08:30', '今晚吃多了，应该怎么收口比较稳？', '明天适合安排什么训练？', '最近体重有点平台，我先看哪里？', '如果我给你晚餐照片，你希望我怎么拍？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '晚饭后 15 分钟内完成饮食记录', '训练前后记得补水，尽量接近今日饮水目标', '明早结合体重和精神状态再决定是否加量', '2026-03-18 23:54:35', '2026-03-18 23:54:35', , );
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120006, 10003, '饮食优化', '你的专属 Agent 已根据新问题更新建议', '距离目标体重还有 3 kg，最近恢复端偏弱，平均睡眠仍少 0.4 小时，本周训练还差 2 次需要补齐', 58, '训练节奏待补齐', '明早 08:30', '今晚吃多了，应该怎么收口比较稳？', '明天适合安排什么训练？', '最近体重有点平台，我先看哪里？', '如果我给你晚餐照片，你希望我怎么拍？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '晚饭后 15 分钟内完成饮食记录', '训练前后记得补水，尽量接近今日饮水目标', '明早结合体重和精神状态再决定是否加量', '2026-03-18 23:54:57', '2026-03-18 23:54:57', , );
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120007, 10003, '饮食优化', '今日热量已达标，关注情绪与明日规划', '小明老师，我理解你今天有些纠结。今天你的热量目标已达成，蛋白质也摄入充足。现在我们可以关注情绪管理，并为明天的饮食做好更稳妥的准备。别忘了补充水分！', 70, '饮食情绪风险：中度', '明天早上 08:00', '你现在最想吃什么？', '今天的“不高兴”是因为什么？', '想和我聊聊明天的饮食计划吗？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '💧 别忘了喝水！', '📝 留意你的情绪，它是身体给你的信号。', '🍎 明天会是全新的一天，从规划开始！', '2026-03-19 00:28:39', '2026-03-19 00:28:39', , );
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120008, 10003, '饮食优化', '小明老师，你好！今天的饮食节奏掌握得不错。', '你今天已按计划摄入1600大卡，蛋白质也已达标。但饮水还需要多加注意。整体趋势向好，继续保持！', 70, '关注饮水', '明日早餐后', '如何更好地分配三餐热量？', '有哪些简单的方法增加饮水量？', '如何平衡饮食与运动？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '别忘了喝水！', '今晚早点休息，为明天蓄能。', '明日饮食计划，提前安排更省心。', '2026-03-19 00:41:57', '2026-03-19 00:41:57', , );
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120009, 10003, '情绪与压力', '情绪与压力管理：饮水小妙招', '小明老师，补水对情绪和压力管理至关重要。充足的水分能帮助身体更好地应对压力，提升专注力。根据您的记录，今日饮水还需补充约 1920 ml。这里有一些简单实用的方法帮你轻松提高饮水量。', 70, '关注饮水', '明日早晨', '今天是否感到口渴？', '最近是否有头痛或疲劳感？', '尝试了哪些补水方法？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '别忘了你的水杯！', '每小时小口补水，轻松达成目标。', '睡前两小时减少大量饮水，避免影响睡眠。', '2026-03-19 00:43:49', '2026-03-19 00:43:49', , );
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120010, 10003, '训练安排', '今日健康节奏概览', '你今天在饮食上达成了热量目标，蛋白质摄入充足。但在饮水和睡眠恢复方面还有提升空间。当你感到不高兴时，小小的行动也能带来积极的变化。', 73, '中度关注', '明天早上 9:00', '今天想尝试哪种运动？', '最近睡眠质量怎么样？', '有没有什么想和我分享的心情？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '记得补充水分，保持身体良好状态。', '今晚早点休息，充足睡眠是情绪稳定的基石。', '即使不高兴，也别忘了给自己一点积极的信号，比如一个微笑或一段喜欢的音乐。', '2026-03-19 01:16:27', '2026-03-19 01:16:27', '[object Object]', '[object Object]', '[object Object]', '[object Object]');
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120011, 10003, '训练安排', '小明老师，你好！', '根据您的健康数据，体重管理进展良好，饮食热量已达标。但饮水和睡眠恢复仍是需要关注的重点。本周运动还需努力，争取完成目标。', 73, '中等关注', '明天上午 9:00', '如何有效增加饮水量？', '有哪些改善睡眠的小技巧？', '如何平衡不同类型的运动？', '今天的加餐可以吃什么？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '小明老师，别忘了补充水分哦！', '今晚尝试早点休息，保证充足睡眠，身体会感谢您的！', '2026-03-19 01:17:27', '2026-03-19 01:17:27', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]');
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120012, 10003, '训练安排', '小明老师，您好！', '您今天已按计划摄入热量，蛋白质达标。饮水和恢复是当前需要关注的重点。本周运动节奏保持良好，体重趋势积极。', 73, '中等风险', '明天早上 8:00', '如何增加饮水量？', '有哪些助眠小技巧？', '今天还可以做些什么运动？', '有没有健康的加餐推荐？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '睡前一小时避免电子屏幕，让眼睛和大脑得到充分放松。', '每小时起身活动 5 分钟，久坐不利于血液循环和新陈代谢。', '保持积极心态，情绪健康与身体健康同样重要。', '2026-03-19 01:18:18', '2026-03-19 01:18:18', '[object Object]', '[object Object]', '[object Object]', '[object Object]');
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120013, 10003, '综合平衡', '健康节奏助理', '保持规律作息，充足饮水，并留意睡眠质量，是提升整体健康的关键。', 73, '中', '明天上午', '如何改善睡眠环境？', '睡前可以吃什么小吃？', '有哪些放松身心的练习？', '我应该每天睡多久？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '晚上 9:00：准备睡前放松，避免电子产品。', '今天结束前：检查饮水是否充足。', '2026-03-19 01:24:51', '2026-03-19 01:24:51', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]');
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120014, 10003, '综合平衡', '健康节奏概览', '根据您的习惯和数据，当前您的健康节奏在体重管理方面表现良好，但睡眠恢复仍有提升空间。请继续保持，并关注睡前饮食和补水。', 73, '中等', '2024-07-28', '如何提高睡眠质量？', '我今天的运动计划是什么？', '如何避免睡前饥饿？', '有哪些减压小技巧？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '今晚：睡前1小时停止使用电子设备。', '今天：补充今日饮水目标 1920ml。', '明天：设定规律作息，争取在同一时间入睡和起床。', '2026-03-19 01:32:16', '2026-03-19 01:32:16', '[object Object]', '[object Object]', '[object Object]', '[object Object]');
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120015, 10003, '综合平衡', '健康节奏总览', '小明老师，睡前饥饿可以通过调整日间饮食和习惯来有效避免。请注意今日饮水目标，并安排后续运动计划。', 73, '需关注', '明日早晨 7:00', '今晚睡得怎么样？', '今天早餐吃了什么？', '最近压力大吗？', '想了解睡前放松的技巧吗？', '需要调整饮食计划吗？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '别忘了补充水分！', '晚上11点前上床睡觉，保证充足睡眠。', '今晚可以尝试睡前放松，如阅读或听轻音乐。', '2026-03-19 01:34:08', '2026-03-19 01:34:08', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]');
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120016, 10003, '综合平衡', '小明老师，我们聊聊健康吧！', '小明老师，您今天在饮食上热量已达标，但饮水还需补充。运动方面，本周已完成 2 天，力量训练占比较高。近期体重趋势良好，但恢复（睡眠）是您需要重点关注的方面哦。', 73, '恢复与饮水', '明天上午 09:00', '如何改善睡眠质量？', '今天如何补充水分？', '有什么适合办公室的拉伸运动吗？', '晚餐吃什么更健康？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '别忘了补充水分哦！', '晚上早点休息，保证充足睡眠。', '2026-03-19 01:41:42', '2026-03-19 01:41:42', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]');
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120017, 10003, '综合平衡', '小明老师的健康节律', '您的体重管理进展良好，但睡眠恢复仍是需要关注的重点。保持均衡饮食和适度运动，同时优化睡眠环境，将助您全面提升健康节律。', 73, '中风险：恢复不足', '明天上午', '卧室光线如何？', '您的睡眠时间稳定吗？', '今天运动了吗？', '您觉得今天水喝够了吗？', '分享您的晚餐？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '您今天还有 1920 ml 水需要补充哦！', '2026-03-19 01:43:08', '2026-03-19 01:43:08', '[object Object]', '[object Object]', '[object Object]', '[object Object]');
INSERT INTO `assistant_plan_snapshot` (`snapshot_id`, `user_id`, `focus`, `title`, `summary`, `readiness_score`, `risk_label`, `next_check_in`, `quick_questions_json`, `metrics_json`, `priorities_json`, `insights_json`, `actions_json`, `reminders_json`, `generated_at`, `created_at`, `derived_contents_json`, `modality_ideas_json`) VALUES (120018, 10003, '综合平衡', '今日健康节律概览', '小明老师，您今天摄入了1695大卡，已超出目标95大卡。蛋白质摄入良好，但饮水仍需补充。请注意后续的能量平衡，保持健康节奏。', 73, '热量超标', '明天早上8:00', '今天的运动计划是什么？', '如何改善睡眠质量？', '晚餐吃什么更健康？', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '[object Object]', '今日饮水目标1920ml，请及时补充。', '注意今日总热量已超标95大卡，避免额外摄入。', '2026-03-19 01:51:12', '2026-03-19 01:51:12', '[object Object]', '[object Object]', '[object Object]', '[object Object]');

-- Data: body_metric_record
INSERT INTO `body_metric_record` (`metric_id`, `user_id`, `record_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `hip_cm`, `chest_cm`, `sleep_hours`, `step_count`, `note`) VALUES (70001, 10001, '2026-03-14 00:00:00', '79.00', '22.80', '88.00', '98.00', '101.00', '7.20', 8560, '减脂初期');
INSERT INTO `body_metric_record` (`metric_id`, `user_id`, `record_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `hip_cm`, `chest_cm`, `sleep_hours`, `step_count`, `note`) VALUES (70002, 10001, '2026-03-16 00:00:00', '78.50', '22.40', '87.20', '97.80', '100.50', '7.80', 11230, '体重略有下降');
INSERT INTO `body_metric_record` (`metric_id`, `user_id`, `record_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `hip_cm`, `chest_cm`, `sleep_hours`, `step_count`, `note`) VALUES (70003, 10002, '2026-03-16 00:00:00', '54.00', '24.10', '68.00', '92.00', '84.00', '6.90', 9230, '状态良好');

-- Data: diet_daily_log
INSERT INTO `diet_daily_log` (`daily_id`, `user_id`, `log_date`, `water_intake_ml`, `water_target_ml`, `created_at`, `updated_at`) VALUES (50001, 10003, '2026-03-18 00:00:00', 3500, 1920, '2026-03-18 20:54:30', '2026-03-18 22:00:58');
INSERT INTO `diet_daily_log` (`daily_id`, `user_id`, `log_date`, `water_intake_ml`, `water_target_ml`, `created_at`, `updated_at`) VALUES (50002, 10003, '2026-03-19 00:00:00', 0, 1920, '2026-03-19 00:04:53', '2026-03-19 00:04:53');

-- Data: diet_meal_entry
INSERT INTO `diet_meal_entry` (`entry_id`, `user_id`, `log_date`, `meal_type`, `food_name`, `portion_label`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `recorded_at`, `created_at`, `updated_at`) VALUES (70001, 10003, '2026-03-18 00:00:00', '早餐', '高蛋白酸奶燕麦杯', '1 份', 320, 20, 36, 9, '2026-03-18 20:59:31', '2026-03-18 20:59:31', '2026-03-18 20:59:31');
INSERT INTO `diet_meal_entry` (`entry_id`, `user_id`, `log_date`, `meal_type`, `food_name`, `portion_label`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `recorded_at`, `created_at`, `updated_at`) VALUES (70002, 10003, '2026-03-19 00:00:00', '早餐', '燕麦酸奶水果杯', '1 碗', 384, 18, 34, 8, '2026-03-19 00:04:53', '2026-03-19 00:04:53', '2026-03-19 00:04:53');
INSERT INTO `diet_meal_entry` (`entry_id`, `user_id`, `log_date`, `meal_type`, `food_name`, `portion_label`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `recorded_at`, `created_at`, `updated_at`) VALUES (70003, 10003, '2026-03-19 00:00:00', '午餐', '鸡胸藜麦能量碗', '1 份', 608, 42, 46, 14, '2026-03-19 00:04:53', '2026-03-19 00:04:53', '2026-03-19 00:04:53');
INSERT INTO `diet_meal_entry` (`entry_id`, `user_id`, `log_date`, `meal_type`, `food_name`, `portion_label`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `recorded_at`, `created_at`, `updated_at`) VALUES (70004, 10003, '2026-03-19 00:00:00', '晚餐', '三文鱼时蔬拼盘', '1 盘', 512, 34, 32, 16, '2026-03-19 00:04:53', '2026-03-19 00:04:53', '2026-03-19 00:04:53');
INSERT INTO `diet_meal_entry` (`entry_id`, `user_id`, `log_date`, `meal_type`, `food_name`, `portion_label`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `recorded_at`, `created_at`, `updated_at`) VALUES (70005, 10003, '2026-03-19 00:00:00', '加餐', '坚果豆乳', '1 杯', 96, 8, 12, 6, '2026-03-19 00:04:53', '2026-03-19 00:04:53', '2026-03-19 00:04:53');

-- Data: exercise_record
INSERT INTO `exercise_record` (`exercise_id`, `user_id`, `record_date`, `exercise_type`, `duration_min`, `intensity`, `calories_burned`, `note`, `created_at`) VALUES (60001, 10001, '2026-03-15 00:00:00', '慢跑', 45, '中', '380.00', '晚间公园慢跑', '2026-03-15 20:10:00');
INSERT INTO `exercise_record` (`exercise_id`, `user_id`, `record_date`, `exercise_type`, `duration_min`, `intensity`, `calories_burned`, `note`, `created_at`) VALUES (60002, 10001, '2026-03-16 00:00:00', '力量训练', 50, '高', '420.00', '上肢训练', '2026-03-16 19:30:00');
INSERT INTO `exercise_record` (`exercise_id`, `user_id`, `record_date`, `exercise_type`, `duration_min`, `intensity`, `calories_burned`, `note`, `created_at`) VALUES (60003, 10002, '2026-03-16 00:00:00', '瑜伽', 40, '低', '160.00', '居家拉伸瑜伽', '2026-03-16 20:00:00');

-- Data: exercise_session_log
INSERT INTO `exercise_session_log` (`session_id`, `user_id`, `performed_on`, `performed_at`, `name`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `status`, `notes`, `created_at`, `updated_at`) VALUES (90001, 10003, '2026-03-16 00:00:00', '2026-03-16 19:00:00', '上肢力量训练', '力量', 45, 320, '中高强度', '已完成', '以推拉动作为主，兼顾肩背稳定。', '2026-03-18 21:18:49', '2026-03-18 21:18:49');
INSERT INTO `exercise_session_log` (`session_id`, `user_id`, `performed_on`, `performed_at`, `name`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `status`, `notes`, `created_at`, `updated_at`) VALUES (90002, 10003, '2026-03-18 00:00:00', '2026-03-18 19:00:00', '快走恢复', '有氧', 35, 220, '中等', '已完成', '控制心率，作为工作日恢复训练。', '2026-03-18 21:18:49', '2026-03-18 21:18:49');
INSERT INTO `exercise_session_log` (`session_id`, `user_id`, `performed_on`, `performed_at`, `name`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `status`, `notes`, `created_at`, `updated_at`) VALUES (90003, 10003, '2026-03-18 00:00:00', '2026-03-18 21:21:35', '上肢力量循环', '力量', 40, 280, '中高强度', '已完成', '适合下班后快速完成的推拉循环。', '2026-03-18 21:21:35', '2026-03-18 21:21:35');
INSERT INTO `exercise_session_log` (`session_id`, `user_id`, `performed_on`, `performed_at`, `name`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `status`, `notes`, `created_at`, `updated_at`) VALUES (90004, 10003, '2026-03-18 00:00:00', '2026-03-18 21:21:45', '拉伸舒展', '恢复', 18, 70, '低强度', '已完成', '睡前放松肩颈和下背。', '2026-03-18 21:21:45', '2026-03-18 21:21:45');
INSERT INTO `exercise_session_log` (`session_id`, `user_id`, `performed_on`, `performed_at`, `name`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `status`, `notes`, `created_at`, `updated_at`) VALUES (90005, 10003, '2026-03-18 00:00:00', '2026-03-18 21:22:58', '核心稳定组合', '功能', 25, 150, '中等', '已完成', '适合久坐后激活核心和臀部。', '2026-03-18 21:22:58', '2026-03-18 21:22:58');
INSERT INTO `exercise_session_log` (`session_id`, `user_id`, `performed_on`, `performed_at`, `name`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `status`, `notes`, `created_at`, `updated_at`) VALUES (90006, 10003, '2026-03-18 00:00:00', '2026-03-18 22:01:34', '上肢力量循环', '力量', 40, 280, '中高强度', '已完成', '适合下班后快速完成的推拉循环。', '2026-03-18 22:01:34', '2026-03-18 22:01:34');

-- Data: feedback
INSERT INTO `feedback` (`feedback_id`, `user_id`, `feedback_type`, `feedback_content`, `contact_info`, `created_at`) VALUES (110001, 10001, '功能建议', '希望首页增加近7天体重变化趋势图。', 'zhangsan@example.com', '2026-03-17 11:20:00');
INSERT INTO `feedback` (`feedback_id`, `user_id`, `feedback_type`, `feedback_content`, `contact_info`, `created_at`) VALUES (110002, 10002, '问题反馈', '饮食记录页面在手机端输入克重时偶尔会卡顿。', 'lisi@example.com', '2026-03-17 13:45:00');

-- Data: food_item
INSERT INTO `food_item` (`food_id`, `food_name`, `unit_weight_g`, `calories_per_100g`, `protein_per_100g`, `fat_per_100g`, `carb_per_100g`) VALUES (20001, '鸡胸肉', '100.00', '133.00', '24.00', '3.00', '0.00');
INSERT INTO `food_item` (`food_id`, `food_name`, `unit_weight_g`, `calories_per_100g`, `protein_per_100g`, `fat_per_100g`, `carb_per_100g`) VALUES (20002, '燕麦', '50.00', '389.00', '16.90', '6.90', '66.30');
INSERT INTO `food_item` (`food_id`, `food_name`, `unit_weight_g`, `calories_per_100g`, `protein_per_100g`, `fat_per_100g`, `carb_per_100g`) VALUES (20003, '西兰花', '100.00', '34.00', '2.80', '0.40', '6.60');
INSERT INTO `food_item` (`food_id`, `food_name`, `unit_weight_g`, `calories_per_100g`, `protein_per_100g`, `fat_per_100g`, `carb_per_100g`) VALUES (20004, '米饭', '100.00', '116.00', '2.60', '0.30', '25.90');
INSERT INTO `food_item` (`food_id`, `food_name`, `unit_weight_g`, `calories_per_100g`, `protein_per_100g`, `fat_per_100g`, `carb_per_100g`) VALUES (20005, '鸡蛋', '50.00', '144.00', '13.30', '8.80', '1.30');
INSERT INTO `food_item` (`food_id`, `food_name`, `unit_weight_g`, `calories_per_100g`, `protein_per_100g`, `fat_per_100g`, `carb_per_100g`) VALUES (20006, '香蕉', '100.00', '89.00', '1.10', '0.30', '22.80');

-- Data: health_goal
INSERT INTO `health_goal` (`goal_id`, `user_id`, `target_weight_kg`, `target_body_fat_rate`, `target_period_days`, `target_exercise_days_per_week`, `target_water_ml_per_day`, `goal_status`, `start_date`, `end_date`) VALUES (40001, 10001, '72.00', '18.00', 90, 5, '2500.00', '进行中', '2026-03-01 00:00:00', NULL);
INSERT INTO `health_goal` (`goal_id`, `user_id`, `target_weight_kg`, `target_body_fat_rate`, `target_period_days`, `target_exercise_days_per_week`, `target_water_ml_per_day`, `goal_status`, `start_date`, `end_date`) VALUES (40002, 10002, '52.00', '22.00', 60, 4, '2200.00', '进行中', '2026-03-05 00:00:00', NULL);

-- Data: reminder
INSERT INTO `reminder` (`reminder_id`, `user_id`, `reminder_type`, `reminder_content`, `remind_time`, `is_read`, `created_at`) VALUES (90001, 10001, '打卡', '今晚记得完成运动打卡', '2026-03-17 20:00:00', 0, '2026-03-17 08:00:00');
INSERT INTO `reminder` (`reminder_id`, `user_id`, `reminder_type`, `reminder_content`, `remind_time`, `is_read`, `created_at`) VALUES (90002, 10001, '目标', '本周还需完成2次训练', '2026-03-18 09:00:00', 0, '2026-03-17 08:05:00');
INSERT INTO `reminder` (`reminder_id`, `user_id`, `reminder_type`, `reminder_content`, `remind_time`, `is_read`, `created_at`) VALUES (90003, 10002, '建议', '今日饮水量距离目标还差300ml', '2026-03-17 16:00:00', 1, '2026-03-17 12:00:00');

-- Data: trend_daily_snapshot
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110001, 10003, '2026-02-26 00:00:00', '61.80', '19.60', '80.80', '7.7', 9310, 1786, 294, 42, '2026-03-18 21:45:22', '2026-03-18 23:54:55');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110002, 10003, '2026-02-27 00:00:00', '61.80', '19.60', '80.80', '7.7', 9310, 1786, 294, 42, '2026-03-18 21:45:22', '2026-03-19 03:29:05');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110003, 10003, '2026-02-28 00:00:00', '61.80', '19.70', '80.60', '7.5', 7545, 1642, 0, 0, '2026-03-18 21:45:22', '2026-03-19 03:29:05');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110004, 10003, '2026-03-01 00:00:00', '61.80', '19.70', '80.50', '7.1', 9297, 1670, 182, 26, '2026-03-18 21:45:22', '2026-03-19 03:29:05');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110005, 10003, '2026-03-02 00:00:00', '61.70', '19.50', '80.30', '6.7', 10146, 1645, 294, 42, '2026-03-18 21:45:22', '2026-03-19 03:29:05');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110006, 10003, '2026-03-03 00:00:00', '61.50', '19.40', '80.10', '6.6', 8894, 1517, 182, 26, '2026-03-18 21:45:22', '2026-03-19 03:29:05');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110007, 10003, '2026-03-04 00:00:00', '61.30', '19.10', '79.90', '6.7', 6903, 1367, 0, 0, '2026-03-18 21:45:22', '2026-03-19 03:29:05');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110008, 10003, '2026-03-05 00:00:00', '61.10', '18.90', '79.80', '7.1', 8691, 1443, 294, 42, '2026-03-18 21:45:22', '2026-03-19 03:29:05');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110009, 10003, '2026-03-06 00:00:00', '61.00', '18.80', '79.80', '7.5', 6112, 1300, 0, 0, '2026-03-18 21:45:22', '2026-03-19 03:29:05');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110010, 10003, '2026-03-07 00:00:00', '61.00', '18.80', '79.90', '7.6', 7635, 1397, 182, 26, '2026-03-18 21:45:22', '2026-03-19 03:29:05');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110011, 10003, '2026-03-08 00:00:00', '61.00', '18.90', '79.90', '7.4', 8932, 1495, 294, 42, '2026-03-18 21:45:23', '2026-03-19 03:29:05');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110012, 10003, '2026-03-09 00:00:00', '61.00', '18.90', '80.00', '7.0', 8624, 1520, 182, 26, '2026-03-18 21:45:23', '2026-03-19 03:29:06');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110013, 10003, '2026-03-10 00:00:00', '61.00', '18.90', '80.00', '6.7', 7686, 1522, 0, 0, '2026-03-18 21:45:23', '2026-03-19 03:29:06');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110014, 10003, '2026-03-11 00:00:00', '60.90', '18.80', '79.90', '6.6', 10209, 1720, 294, 42, '2026-03-18 21:45:23', '2026-03-19 03:29:06');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110015, 10003, '2026-03-12 00:00:00', '60.70', '18.60', '79.80', '6.8', 7745, 1643, 0, 0, '2026-03-18 21:45:23', '2026-03-19 03:29:06');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110016, 10003, '2026-03-13 00:00:00', '60.50', '18.40', '79.60', '7.2', 8717, 1738, 182, 26, '2026-03-18 21:45:23', '2026-03-19 03:29:06');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110017, 10003, '2026-03-14 00:00:00', '60.30', '18.20', '79.40', '7.6', 9022, 1767, 294, 42, '2026-03-18 21:45:23', '2026-03-19 03:29:06');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110018, 10003, '2026-03-15 00:00:00', '60.20', '18.10', '79.20', '7.6', 7685, 1668, 182, 26, '2026-03-18 21:45:23', '2026-03-19 03:29:06');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110019, 10003, '2026-03-16 00:00:00', '60.20', '18.10', '79.10', '7.4', 6101, 1516, 0, 0, '2026-03-18 21:45:23', '2026-03-19 03:29:06');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110020, 10003, '2026-03-17 00:00:00', '60.20', '18.20', '79.00', '7.0', 8624, 1562, 294, 42, '2026-03-18 21:45:23', '2026-03-19 03:29:06');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110021, 10003, '2026-03-18 00:00:00', '60.20', '18.20', '79.00', '6.6', 6807, 1365, 0, 0, '2026-03-18 21:45:23', '2026-03-19 03:29:06');
INSERT INTO `trend_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `weight_kg`, `body_fat_rate`, `waist_cm`, `sleep_hours`, `steps`, `calorie_intake`, `calorie_burned`, `training_minutes`, `created_at`, `updated_at`) VALUES (110022, 10003, '2026-03-19 00:00:00', '60.00', '18.20', '79.10', '6.6', 8808, 1394, 182, 26, '2026-03-19 00:04:54', '2026-03-19 03:29:06');

-- Data: user
INSERT INTO `user` (`user_id`, `username`, `email`, `nickname`, `password_hash`, `status`, `created_at`, `updated_at`) VALUES (10001, 'zhangsan', 'zhangsan@example.com', 'zhangsan', 'scrypt:0d0e37848892af91d4b018401986f18e:3a6c1f8a8e0e342ba72236cec1d92966052e05e2f5c07acba5d3240cc83c95b79951bcd2eb4fd298c9ee8e8bb5bf903d6fb3aae5e2e89defae9620195c85e2ee', 1, '2026-03-01 09:00:00', '2026-03-18 00:29:30');
INSERT INTO `user` (`user_id`, `username`, `email`, `nickname`, `password_hash`, `status`, `created_at`, `updated_at`) VALUES (10002, 'lisi', 'lisi@example.com', 'lisi', 'scrypt:ce623f41097901a9fa46aae866d35f50:67fa4254768d8251a8570faa2260e9609f3b33b9b873ec287e8dab817b32f48e1d704864030dca87341a6c2e8f68f346c810955963b04d5991023cf76f0a347e', 1, '2026-03-02 10:30:00', '2026-03-18 00:29:30');
INSERT INTO `user` (`user_id`, `username`, `email`, `nickname`, `password_hash`, `status`, `created_at`, `updated_at`) VALUES (10003, 'admin', '11', '小明老师', 'scrypt:4f452e833713437d8551e4ca08a91e1f:afaa0e0c3f83bf27d9df3d96b0f2b84ed335b687f9bbf8f3c9303cc804b83171602d84fe60bc1c8bad6221db429a632db141b3cf7cca597ff7b50a08b01662bc', 1, '2026-03-16 09:20:00', '2026-03-18 23:41:40');

-- Data: user_daily_snapshot
INSERT INTO `user_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `calories_intake`, `water_intake_ml`, `steps`, `sleep_hours`, `weight_kg`, `body_fat_rate`, `waist_cm`, `created_at`) VALUES (1, 10003, '2026-03-12 00:00:00', 1670, 1800, 7600, '6.7', '60.80', '22.50', '84.10', '2026-03-18 01:41:52');
INSERT INTO `user_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `calories_intake`, `water_intake_ml`, `steps`, `sleep_hours`, `weight_kg`, `body_fat_rate`, `waist_cm`, `created_at`) VALUES (2, 10003, '2026-03-13 00:00:00', 1510, 2100, 8200, '7.0', '60.60', '22.40', '83.80', '2026-03-18 01:41:52');
INSERT INTO `user_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `calories_intake`, `water_intake_ml`, `steps`, `sleep_hours`, `weight_kg`, `body_fat_rate`, `waist_cm`, `created_at`) VALUES (3, 10003, '2026-03-14 00:00:00', 1580, 2050, 9100, '7.2', '60.50', '22.30', '83.50', '2026-03-18 01:41:52');
INSERT INTO `user_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `calories_intake`, `water_intake_ml`, `steps`, `sleep_hours`, `weight_kg`, `body_fat_rate`, `waist_cm`, `created_at`) VALUES (4, 10003, '2026-03-15 00:00:00', 1470, 2300, 10200, '7.4', '60.30', '22.20', '83.10', '2026-03-18 01:41:52');
INSERT INTO `user_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `calories_intake`, `water_intake_ml`, `steps`, `sleep_hours`, `weight_kg`, `body_fat_rate`, `waist_cm`, `created_at`) VALUES (5, 10003, '2026-03-16 00:00:00', 1490, 2200, 8900, '7.1', '60.20', '22.10', '82.90', '2026-03-18 01:41:52');
INSERT INTO `user_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `calories_intake`, `water_intake_ml`, `steps`, `sleep_hours`, `weight_kg`, `body_fat_rate`, `waist_cm`, `created_at`) VALUES (6, 10003, '2026-03-17 00:00:00', 1570, 2000, 9400, '6.9', '60.10', '22.10', '82.70', '2026-03-18 01:41:52');
INSERT INTO `user_daily_snapshot` (`snapshot_id`, `user_id`, `snapshot_date`, `calories_intake`, `water_intake_ml`, `steps`, `sleep_hours`, `weight_kg`, `body_fat_rate`, `waist_cm`, `created_at`) VALUES (7, 10003, '2026-03-18 00:00:00', 1440, 2150, 9680, '7.3', '60.00', '22.00', '82.50', '2026-03-18 01:41:52');

-- Data: user_profile
INSERT INTO `user_profile` (`profile_id`, `user_id`, `age`, `gender`, `height_cm`, `current_weight_kg`, `body_fat_rate`, `habit_sleep`, `habit_diet`, `habit_exercise`, `bmi`, `bmr`, `updated_at`, `target_weight_kg`, `target_body_fat_rate`, `weekly_workout_target`, `daily_calorie_target`, `sleep_target_hours`, `work_style`, `stress_level`, `smoking_status`, `drinking_frequency`) VALUES (30001, 10001, 27, '男', '175.00', '78.50', '22.40', '23:30-07:00', '三餐规律，偶尔夜宵', '每周慢跑3次', '25.63', '1715.00', '2026-03-15 10:00:00', '57.00', NULL, 4, 1600, '7.5', '', '中', '从不', '几乎不');
INSERT INTO `user_profile` (`profile_id`, `user_id`, `age`, `gender`, `height_cm`, `current_weight_kg`, `body_fat_rate`, `habit_sleep`, `habit_diet`, `habit_exercise`, `bmi`, `bmr`, `updated_at`, `target_weight_kg`, `target_body_fat_rate`, `weekly_workout_target`, `daily_calorie_target`, `sleep_target_hours`, `work_style`, `stress_level`, `smoking_status`, `drinking_frequency`) VALUES (30002, 10002, 25, '女', '162.00', '54.00', '24.10', '23:00-06:30', '清淡饮食，控制甜食', '每周瑜伽2次', '20.58', '1288.00', '2026-03-16 09:20:00', '57.00', NULL, 4, 1600, '7.5', '', '中', '从不', '几乎不');
INSERT INTO `user_profile` (`profile_id`, `user_id`, `age`, `gender`, `height_cm`, `current_weight_kg`, `body_fat_rate`, `habit_sleep`, `habit_diet`, `habit_exercise`, `bmi`, `bmr`, `updated_at`, `target_weight_kg`, `target_body_fat_rate`, `weekly_workout_target`, `daily_calorie_target`, `sleep_target_hours`, `work_style`, `stress_level`, `smoking_status`, `drinking_frequency`) VALUES (30003, 10003, 18, '男', '172.00', '60.00', NULL, '111', '包括', '333', '20.28', '1590.00', '2026-03-18 23:41:40', '57.00', '0.50', 4, 1600, '7.5', '久坐办公', '中', '从不', '几乎不');

-- Data: user_workout_session
INSERT INTO `user_workout_session` (`session_id`, `user_id`, `session_date`, `session_name`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `completion_status`, `created_at`) VALUES (1, 10003, '2026-03-13 00:00:00', '上肢推拉训练', '力量', 55, 360, '高强度', '已完成', '2026-03-18 01:41:52');
INSERT INTO `user_workout_session` (`session_id`, `user_id`, `session_date`, `session_name`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `completion_status`, `created_at`) VALUES (2, 10003, '2026-03-15 00:00:00', '核心稳定训练', '功能', 25, 150, '中强度', '已完成', '2026-03-18 01:41:52');
INSERT INTO `user_workout_session` (`session_id`, `user_id`, `session_date`, `session_name`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `completion_status`, `created_at`) VALUES (3, 10003, '2026-03-17 00:00:00', '快走 + 拉伸', '有氧', 30, 190, '中强度', '已完成', '2026-03-18 01:41:52');
INSERT INTO `user_workout_session` (`session_id`, `user_id`, `session_date`, `session_name`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `completion_status`, `created_at`) VALUES (4, 10003, '2026-03-18 00:00:00', '下肢力量训练', '力量', 45, 310, '中高强度', '已完成', '2026-03-18 01:41:52');

SET FOREIGN_KEY_CHECKS = 1;