-- Etapa 4: funil de vendas e histórico de mudanças de etapa.
-- Os leads que já existem entram na etapa "novo". A data da etapa deles passa
-- a ser a data de cadastro (e não a hora desta migração), para o quadro ordenar
-- certo. O histórico começa vazio: só registra mudanças daqui em diante.
-- A chave estrangeira do histórico inclui a empresa (organizacao_id), como em notas.
CREATE TABLE "historico_etapas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" text NOT NULL,
	"lead_id" uuid NOT NULL,
	"etapa_anterior" text NOT NULL,
	"etapa_nova" text NOT NULL,
	"alterado_por_id" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historico_etapas_valores_validos" CHECK ("historico_etapas"."etapa_anterior" in ('novo', 'contatado', 'em_conversa', 'proposta', 'ganho', 'perdido') and "historico_etapas"."etapa_nova" in ('novo', 'contatado', 'em_conversa', 'proposta', 'ganho', 'perdido') and "historico_etapas"."etapa_anterior" <> "historico_etapas"."etapa_nova")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "etapa" text DEFAULT 'novo' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "etapa_atualizada_em" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "leads" SET "etapa_atualizada_em" = "criado_em";--> statement-breakpoint
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_alterado_por_id_user_id_fk" FOREIGN KEY ("alterado_por_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_lead_fk" FOREIGN KEY ("lead_id","organizacao_id") REFERENCES "public"."leads"("id","organizacao_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "historico_etapas_lead_idx" ON "historico_etapas" USING btree ("organizacao_id","lead_id","criado_em");--> statement-breakpoint
CREATE INDEX "leads_organizacao_etapa_idx" ON "leads" USING btree ("organizacao_id","etapa","etapa_atualizada_em");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_etapa_valida" CHECK ("leads"."etapa" in ('novo', 'contatado', 'em_conversa', 'proposta', 'ganho', 'perdido'));