CREATE TABLE `actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`situation_id` integer NOT NULL,
	`name` text NOT NULL,
	`action_type` text NOT NULL,
	`size_bb` real,
	`color_hex` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`situation_id`) REFERENCES `situations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `range_cells` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action_id` integer NOT NULL,
	`row_index` integer NOT NULL,
	`col_index` integer NOT NULL,
	`frequency` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session_hands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`situation_id` integer NOT NULL,
	`card1_rank` text NOT NULL,
	`card1_suit` text NOT NULL,
	`card2_rank` text NOT NULL,
	`card2_suit` text NOT NULL,
	`chosen_action_id` integer,
	`is_correct` integer NOT NULL,
	`response_ms` integer NOT NULL,
	`hand_index` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `training_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`situation_id`) REFERENCES `situations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chosen_action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `situations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`position` text NOT NULL,
	`description` text,
	`effective_stack` real DEFAULT 100 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `training_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`total_hands` integer NOT NULL,
	`timer_seconds` integer DEFAULT 0 NOT NULL,
	`feedback_mode` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);