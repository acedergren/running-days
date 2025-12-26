CREATE TABLE `daily_stats` (
	`date` text PRIMARY KEY NOT NULL,
	`year` integer NOT NULL,
	`run_count` integer DEFAULT 1 NOT NULL,
	`total_distance_meters` real NOT NULL,
	`total_duration_seconds` integer NOT NULL,
	`avg_pace_seconds_per_km` real,
	`longest_run_meters` real,
	`fastest_pace_seconds_per_km` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`target_days` integer DEFAULT 300 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goals_year_unique` ON `goals` (`year`);--> statement-breakpoint
CREATE TABLE `webhook_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_used_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_tokens_token_unique` ON `webhook_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`distance_meters` real NOT NULL,
	`energy_burned_kcal` real,
	`avg_heart_rate` integer,
	`max_heart_rate` integer,
	`avg_pace_seconds_per_km` real,
	`elevation_gain_meters` real,
	`weather_temp` real,
	`weather_condition` text,
	`source` text DEFAULT 'health_auto_export',
	`raw_payload` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
