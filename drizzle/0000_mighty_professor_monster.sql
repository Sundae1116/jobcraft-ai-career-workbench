CREATE TABLE `application` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`target_role_id` text NOT NULL,
	`status` text NOT NULL,
	`fit_score` integer,
	`decision_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_role_id`) REFERENCES `target_role`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `application_event` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`source` text NOT NULL,
	`note` text,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `candidate` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`headline` text,
	`profile_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`claim` text NOT NULL,
	`source` text,
	`confidence` text NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`external_id` text,
	`source_url` text NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`location` text,
	`description` text NOT NULL,
	`content_hash` text NOT NULL,
	`discovered_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_job_source_external` ON `job` (`source`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_job_content_hash` ON `job` (`content_hash`);--> statement-breakpoint
CREATE TABLE `resume_version` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_markdown` text NOT NULL,
	`evidence_map_json` text NOT NULL,
	`review_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_resume_application_version` ON `resume_version` (`application_id`,`version`);--> statement-breakpoint
CREATE TABLE `target_role` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`title` text NOT NULL,
	`narrative` text NOT NULL,
	`criteria_json` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE no action
);
