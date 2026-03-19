-- LightBalance database schema
-- Generated from the current Electron DB access layer.
-- Recommended for MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `lightbalance`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `lightbalance`;

-- Core account table
CREATE TABLE IF NOT EXISTS `user` (
  `user_id` INT NOT NULL PRIMARY KEY,
  `username` VARCHAR(60) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `nickname` VARCHAR(60) NULL,
  `password_hash` VARCHAR(255) NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `uniq_user_username` (`username`),
  UNIQUE KEY `uniq_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User profile table
CREATE TABLE IF NOT EXISTS `user_profile` (
  `profile_id` INT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `age` INT NOT NULL DEFAULT 18,
  `gender` VARCHAR(20) NOT NULL DEFAULT '',
  `height_cm` DECIMAL(6,2) NOT NULL DEFAULT 170,
  `current_weight_kg` DECIMAL(6,2) NOT NULL DEFAULT 60,
  `body_fat_rate` DECIMAL(5,2) NULL,
  `target_weight_kg` DECIMAL(6,2) NOT NULL DEFAULT 57,
  `target_body_fat_rate` DECIMAL(5,2) NULL,
  `weekly_workout_target` INT NOT NULL DEFAULT 4,
  `daily_calorie_target` INT NOT NULL DEFAULT 1600,
  `sleep_target_hours` DECIMAL(4,1) NOT NULL DEFAULT 7.5,
  `work_style` VARCHAR(60) NOT NULL DEFAULT '',
  `stress_level` VARCHAR(30) NOT NULL DEFAULT '中',
  `smoking_status` VARCHAR(30) NOT NULL DEFAULT '从不',
  `drinking_frequency` VARCHAR(30) NOT NULL DEFAULT '几乎不',
  `habit_sleep` TEXT NULL,
  `habit_diet` TEXT NULL,
  `habit_exercise` TEXT NULL,
  `bmi` DECIMAL(6,2) NULL,
  `bmr` DECIMAL(8,2) NULL,
  `updated_at` DATETIME NULL,
  UNIQUE KEY `uniq_user_profile_user_id` (`user_id`),
  CONSTRAINT `fk_user_profile_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Diet: daily log
CREATE TABLE IF NOT EXISTS `diet_daily_log` (
  `daily_id` INT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `log_date` DATE NOT NULL,
  `water_intake_ml` INT NOT NULL DEFAULT 0,
  `water_target_ml` INT NOT NULL DEFAULT 2000,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `uniq_diet_daily_user_date` (`user_id`, `log_date`),
  CONSTRAINT `fk_diet_daily_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Diet: meal entries
CREATE TABLE IF NOT EXISTS `diet_meal_entry` (
  `entry_id` INT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `log_date` DATE NOT NULL,
  `meal_type` VARCHAR(30) NOT NULL,
  `food_name` VARCHAR(120) NOT NULL,
  `portion_label` VARCHAR(40) NOT NULL DEFAULT '',
  `calories` INT NOT NULL DEFAULT 0,
  `protein_g` INT NOT NULL DEFAULT 0,
  `carbs_g` INT NOT NULL DEFAULT 0,
  `fat_g` INT NOT NULL DEFAULT 0,
  `recorded_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  KEY `idx_diet_meal_user_date` (`user_id`, `log_date`),
  KEY `idx_diet_meal_recorded_at` (`recorded_at`),
  CONSTRAINT `fk_diet_meal_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exercise sessions
CREATE TABLE IF NOT EXISTS `exercise_session_log` (
  `session_id` INT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `performed_on` DATE NOT NULL,
  `performed_at` DATETIME NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `category` VARCHAR(40) NOT NULL DEFAULT '综合训练',
  `duration_minutes` INT NOT NULL DEFAULT 0,
  `calories_burned` INT NOT NULL DEFAULT 0,
  `intensity` VARCHAR(30) NOT NULL DEFAULT '中等',
  `status` VARCHAR(30) NOT NULL DEFAULT '已完成',
  `notes` VARCHAR(255) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  KEY `idx_exercise_user_date` (`user_id`, `performed_on`),
  KEY `idx_exercise_user_performed_at` (`user_id`, `performed_at`),
  CONSTRAINT `fk_exercise_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trend snapshots
CREATE TABLE IF NOT EXISTS `trend_daily_snapshot` (
  `snapshot_id` INT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `snapshot_date` DATE NOT NULL,
  `weight_kg` DECIMAL(6,2) NOT NULL,
  `body_fat_rate` DECIMAL(5,2) NULL,
  `waist_cm` DECIMAL(6,2) NOT NULL,
  `sleep_hours` DECIMAL(4,1) NOT NULL DEFAULT 0,
  `steps` INT NOT NULL DEFAULT 0,
  `calorie_intake` INT NOT NULL DEFAULT 0,
  `calorie_burned` INT NOT NULL DEFAULT 0,
  `training_minutes` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `uniq_trend_snapshot_user_date` (`user_id`, `snapshot_date`),
  KEY `idx_trend_snapshot_user_date` (`user_id`, `snapshot_date`),
  CONSTRAINT `fk_trend_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Assistant panel snapshots
CREATE TABLE IF NOT EXISTS `assistant_plan_snapshot` (
  `snapshot_id` INT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `focus` VARCHAR(40) NOT NULL DEFAULT '综合平衡',
  `title` VARCHAR(120) NOT NULL,
  `summary` TEXT NOT NULL,
  `readiness_score` INT NOT NULL DEFAULT 0,
  `risk_label` VARCHAR(40) NOT NULL DEFAULT '待分析',
  `next_check_in` VARCHAR(40) NOT NULL DEFAULT '',
  `quick_questions_json` JSON NOT NULL,
  `metrics_json` JSON NOT NULL,
  `priorities_json` JSON NOT NULL,
  `insights_json` JSON NOT NULL,
  `actions_json` JSON NOT NULL,
  `derived_contents_json` JSON NOT NULL DEFAULT ('[]'),
  `modality_ideas_json` JSON NOT NULL DEFAULT ('[]'),
  `reminders_json` JSON NOT NULL,
  `generated_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL,
  KEY `idx_assistant_snapshot_user_generated` (`user_id`, `generated_at`),
  CONSTRAINT `fk_assistant_snapshot_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Assistant chat messages
CREATE TABLE IF NOT EXISTS `assistant_chat_message` (
  `message_id` INT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `role` VARCHAR(20) NOT NULL,
  `tag` VARCHAR(40) NOT NULL DEFAULT '',
  `content` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL,
  KEY `idx_assistant_message_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_assistant_message_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
