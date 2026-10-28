CREATE TABLE "contatos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" text NOT NULL,
	"lead_id" uuid NOT NULL,
	"canal" text NOT NULL,
	"resultado" text NOT NULL,
	"autor_id" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contatos_canal_valido" CHECK ("contatos"."canal" in ('ligacao', 'whatsapp', 'email', 'visita')),
	CONSTRAINT "contatos_resultado_valido" CHECK ("contatos"."resultado" in ('conversou', 'nao_atendeu', 'pediu_retorno', 'pediu_proposta', 'sem_interesse', 'contato_errado'))
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "proxima_acao_em" date;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "proxima_acao" text;--> statement-breakpoint
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_autor_id_user_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_lead_fk" FOREIGN KEY ("lead_id","organizacao_id") REFERENCES "public"."leads"("id","organizacao_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contatos_lead_idx" ON "contatos" USING btree ("organizacao_id","lead_id","criado_em");--> statement-breakpoint
CREATE INDEX "leads_organizacao_proxima_acao_idx" ON "leads" USING btree ("organizacao_id","proxima_acao_em") WHERE "leads"."proxima_acao_em" is not null;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_proxima_acao_valida" CHECK ("leads"."proxima_acao" is null or ("leads"."proxima_acao_em" is not null and char_length(btrim("leads"."proxima_acao")) between 1 and 200));