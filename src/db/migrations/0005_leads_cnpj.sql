DROP INDEX "leads_organizacao_email_unico";--> statement-breakpoint
DROP INDEX "leads_organizacao_telefone_unico";--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "cnpj" text;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_organizacao_cnpj_unico" ON "leads" USING btree ("organizacao_id","cnpj") WHERE "leads"."cnpj" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_organizacao_email_unico" ON "leads" USING btree ("organizacao_id","email_normalizado") WHERE "leads"."email_normalizado" is not null and "leads"."cnpj" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_organizacao_telefone_unico" ON "leads" USING btree ("organizacao_id","telefone_normalizado") WHERE "leads"."telefone_normalizado" is not null and "leads"."cnpj" is null;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_cnpj_formato" CHECK ("leads"."cnpj" ~ '^[0-9A-Z]{12}[0-9]{2}$');