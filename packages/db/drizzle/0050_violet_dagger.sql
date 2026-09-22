ALTER TABLE "mail_conversation" ADD COLUMN "triage_queue" text;--> statement-breakpoint
ALTER TABLE "mail_conversation" ADD COLUMN "triage_urgency" integer;--> statement-breakpoint
ALTER TABLE "mail_conversation" ADD COLUMN "triaged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mail_conversation" ADD COLUMN "quarantined" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_conversation" ADD COLUMN "quarantine_reason" text;