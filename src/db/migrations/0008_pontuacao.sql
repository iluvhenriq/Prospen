DROP INDEX IF EXISTS "base_cnpj_estab_uf_municipio_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "base_cnpj_estab_cnae_idx";--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "porte" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "natureza_juridica" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "data_abertura" date;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "matriz" boolean;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "cnae_principal" text;--> statement-breakpoint
ALTER TABLE "base_cnpj_estabelecimentos" ADD COLUMN "pontuacao" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "base_cnpj_estab_uf_pontuacao_idx" ON "base_cnpj_estabelecimentos" USING btree ("uf","pontuacao" DESC NULLS LAST,"cnpj");--> statement-breakpoint
CREATE INDEX "base_cnpj_estab_uf_municipio_idx" ON "base_cnpj_estabelecimentos" USING btree ("uf","municipio_codigo","pontuacao" DESC NULLS LAST,"cnpj");--> statement-breakpoint
CREATE INDEX "base_cnpj_estab_cnae_idx" ON "base_cnpj_estabelecimentos" USING btree ("cnae_principal","uf","pontuacao" DESC NULLS LAST,"cnpj");