import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const candidate = sqliteTable("candidate", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  headline: text("headline"),
  profileJson: text("profile_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const candidateFile = sqliteTable("candidate_file", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull().references(() => candidate.id),
  kind: text("kind", { enum: ["source_resume", "generated_resume", "profile_photo"] }).notNull(),
  filename: text("filename").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  status: text("status", { enum: ["uploaded", "parsed", "failed"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull().references(() => candidate.id),
  claim: text("claim").notNull(),
  source: text("source"),
  confidence: text("confidence", { enum: ["verified", "self_reported", "unverified"] }).notNull(),
  tagsJson: text("tags_json").notNull().default("[]"),
});

export const resumeReview = sqliteTable("resume_review", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull().references(() => candidate.id),
  roleKey: text("role_key").notNull(),
  version: integer("version").notNull(),
  strategy: text("strategy", { enum: ["balanced", "transition", "both"] }).notNull(),
  template: text("template", { enum: ["ats", "product", "portfolio"] }).notNull().default("ats"),
  feedback: text("feedback"),
  actionsJson: text("actions_json").notNull(),
  contentJson: text("content_json"),
  evidenceMapJson: text("evidence_map_json"),
  status: text("status", { enum: ["draft", "confirmed"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("idx_resume_review_candidate_role_version").on(table.candidateId, table.roleKey, table.version)]);

export const targetRole = sqliteTable("target_role", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull().references(() => candidate.id),
  title: text("title").notNull(),
  narrative: text("narrative").notNull(),
  criteriaJson: text("criteria_json").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const job = sqliteTable("job", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  externalId: text("external_id"),
  sourceUrl: text("source_url").notNull(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  location: text("location"),
  description: text("description").notNull(),
  contentHash: text("content_hash").notNull(),
  discoveredAt: integer("discovered_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("idx_job_source_external").on(table.source, table.externalId),
  uniqueIndex("idx_job_content_hash").on(table.contentHash),
]);

export const application = sqliteTable("application", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => job.id),
  targetRoleId: text("target_role_id").notNull().references(() => targetRole.id),
  status: text("status").notNull(),
  fitScore: integer("fit_score"),
  decisionJson: text("decision_json"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const resumeVersion = sqliteTable("resume_version", {
  id: text("id").primaryKey(),
  applicationId: text("application_id").notNull().references(() => application.id),
  version: integer("version").notNull(),
  contentMarkdown: text("content_markdown").notNull(),
  evidenceMapJson: text("evidence_map_json").notNull(),
  reviewJson: text("review_json"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("idx_resume_application_version").on(table.applicationId, table.version)]);

export const applicationEvent = sqliteTable("application_event", {
  id: text("id").primaryKey(),
  applicationId: text("application_id").notNull().references(() => application.id),
  eventType: text("event_type").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  source: text("source").notNull(),
  note: text("note"),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
});
