CREATE TABLE `resume_review` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`role_key` text NOT NULL,
	`version` integer NOT NULL,
	`strategy` text NOT NULL,
	`feedback` text,
	`actions_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_resume_review_candidate_role_version` ON `resume_review` (`candidate_id`,`role_key`,`version`);