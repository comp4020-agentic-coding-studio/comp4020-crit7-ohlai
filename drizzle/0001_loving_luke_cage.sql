CREATE TABLE `auto_enrol` (
	`student_id` integer NOT NULL,
	`term_id` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`processed_at` text,
	PRIMARY KEY(`student_id`, `term_id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`units` integer NOT NULL,
	`offered_s1` integer NOT NULL,
	`offered_s2` integer NOT NULL,
	`prereq` text,
	`prereq_text` text,
	`repeatable` integer DEFAULT false NOT NULL,
	`source_url` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `enrolment_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`term_id` text NOT NULL,
	`course_code` text,
	`outcome` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `enrolments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`term_id` text NOT NULL,
	`course_code` text NOT NULL,
	`status` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrolments_student_term_course` ON `enrolments` (`student_id`,`term_id`,`course_code`);--> statement-breakpoint
CREATE TABLE `plan_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`term_id` text NOT NULL,
	`course_code` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_entries_student_term_course` ON `plan_entries` (`student_id`,`term_id`,`course_code`);--> statement-breakpoint
CREATE TABLE `requirements` (
	`id` integer PRIMARY KEY NOT NULL,
	`program_code` text NOT NULL,
	`position` integer NOT NULL,
	`label` text NOT NULL,
	`rule` text NOT NULL,
	`source_url` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`uni_id` text NOT NULL,
	`program_code` text NOT NULL,
	`specialisation` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `terms` (
	`id` text PRIMARY KEY NOT NULL,
	`year` integer NOT NULL,
	`half` integer NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text NOT NULL,
	`enrolment_opens_at` text NOT NULL,
	`enrolment_closes_at` text NOT NULL,
	`seeded_opens_at` text NOT NULL
);
