-- LightBalance database export

-- Database: lightbalance

-- Generated at: 2026-06-01T06:42:03.556Z

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `lightbalance` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `lightbalance`;

-- Table structure for advice_record

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

-- Table structure for assistant_chat_message

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

-- Table structure for assistant_plan_snapshot

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

-- Table structure for body_metric_record

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

-- Table structure for diet_daily_log

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

-- Table structure for diet_meal_entry

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

-- Table structure for diet_record

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

-- Table structure for exercise_record

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

-- Table structure for exercise_session_log

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

-- Table structure for feedback

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

-- Table structure for food_item

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

-- Table structure for health_goal

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

-- Table structure for reminder

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

-- Table structure for trend_daily_snapshot

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
  `is_manual_sleep` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`snapshot_id`),
  UNIQUE KEY `uniq_trend_snapshot_user_date` (`user_id`,`snapshot_date`),
  KEY `idx_trend_snapshot_user_date` (`user_id`,`snapshot_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for user

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

-- Table structure for user_daily_snapshot

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

-- Table structure for user_profile

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

-- Table structure for user_workout_session

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

-- Table structure for water_record

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

SET FOREIGN_KEY_CHECKS = 1;
