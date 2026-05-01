CREATE TABLE `situation_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_groups_user_name` ON `situation_groups` (`user_id`,`name`);--> statement-breakpoint
ALTER TABLE `situations` ADD `group_id` integer NOT NULL REFERENCES situation_groups(id);--> statement-breakpoint
ALTER TABLE `training_sessions` ADD `group_id` integer REFERENCES situation_groups(id);