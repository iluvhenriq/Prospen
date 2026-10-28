CREATE TABLE "base_cnpj_sinais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cnpj" text NOT NULL,
	"cnpj_basico" text NOT NULL,
	"uf" text NOT NULL,
	"tipo" text NOT NULL,
	"antes" text,
	"depois" text,
	"mes_referencia" text NOT NULL,
	"detectado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "base_cnpj_sinais_tipo_valido" CHECK ("base_cnpj_sinais"."tipo" in ('nova_unidade', 'mudou_cidade', 'mudou_atividade', 'deixou_ativa'))
);
--> statement-breakpoint
CREATE INDEX "base_cnpj_sinais_cnpj_idx" ON "base_cnpj_sinais" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX "base_cnpj_sinais_basico_idx" ON "base_cnpj_sinais" USING btree ("cnpj_basico");--> statement-breakpoint
CREATE INDEX "base_cnpj_sinais_mes_idx" ON "base_cnpj_sinais" USING btree ("mes_referencia");--> statement-breakpoint
CREATE UNIQUE INDEX "base_cnpj_sinais_unico" ON "base_cnpj_sinais" USING btree ("cnpj","tipo","mes_referencia");