DROP INDEX "card_revision_card_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "card_revision_card_revision_uq" ON "card_revision" USING btree ("card_id","revision");