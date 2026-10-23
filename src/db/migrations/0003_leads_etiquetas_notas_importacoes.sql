-- Etapa 3: etiquetas, notas, importações e a detecção de duplicados em leads.
-- Até esta migração nenhuma tela criava leads, então não há leads antigos para
-- converter: as colunas normalizadas novas começam vazias e são preenchidas
-- pelo repositório a cada cadastro ou alteração.
-- As chaves estrangeiras das tabelas filhas incluem a empresa (organizacao_id),
-- o que impede, no próprio banco, ligar dados de empresas diferentes.
CREATE TABLE "etiquetas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" text NOT NULL,
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	"cor" text DEFAULT 'neutra' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "etiquetas_id_organizacao_unico" UNIQUE("id","organizacao_id"),
	CONSTRAINT "etiquetas_cor_valida" CHECK ("etiquetas"."cor" in ('neutra', 'roxo', 'musgo', 'aviso', 'erro')),
	CONSTRAINT "etiquetas_nome_valido" CHECK (char_length(btrim("etiquetas"."nome")) between 1 and 40)
);
--> statement-breakpoint
CREATE TABLE "lead_etiquetas" (
	"organizacao_id" text NOT NULL,
	"lead_id" uuid NOT NULL,
	"etiqueta_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_etiquetas_lead_id_etiqueta_id_pk" PRIMARY KEY("lead_id","etiqueta_id")
);
--> statement-breakpoint
CREATE TABLE "notas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" text NOT NULL,
	"lead_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"autor_id" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notas_texto_valido" CHECK (char_length(btrim("notas"."texto")) between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "importacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" text NOT NULL,
	"criada_por_id" text,
	"nome_arquivo" text NOT NULL,
	"total_linhas" integer NOT NULL,
	"aceitas" integer NOT NULL,
	"duplicadas" integer NOT NULL,
	"rejeitadas" integer NOT NULL,
	"ocorrencias" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "importacoes_contagens_validas" CHECK ("importacoes"."aceitas" >= 0 and "importacoes"."duplicadas" >= 0 and "importacoes"."rejeitadas" >= 0 and "importacoes"."aceitas" + "importacoes"."duplicadas" + "importacoes"."rejeitadas" = "importacoes"."total_linhas")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "email_normalizado" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "telefone_normalizado" text;--> statement-breakpoint
-- Esta regra de unicidade PRECISA vir antes das chaves estrangeiras abaixo, que
-- apontam para (id, organizacao_id) de leads. O gerador a colocava no fim, e o
-- PostgreSQL recusa uma chave estrangeira sem a regra correspondente. Se esta
-- migração for gerada de novo, mantenha esta ordem.
ALTER TABLE "leads" ADD CONSTRAINT "leads_id_organizacao_unico" UNIQUE("id","organizacao_id");--> statement-breakpoint
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_organizacao_id_organization_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_etiquetas" ADD CONSTRAINT "lead_etiquetas_lead_fk" FOREIGN KEY ("lead_id","organizacao_id") REFERENCES "public"."leads"("id","organizacao_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_etiquetas" ADD CONSTRAINT "lead_etiquetas_etiqueta_fk" FOREIGN KEY ("etiqueta_id","organizacao_id") REFERENCES "public"."etiquetas"("id","organizacao_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_autor_id_user_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_lead_fk" FOREIGN KEY ("lead_id","organizacao_id") REFERENCES "public"."leads"("id","organizacao_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_organizacao_id_organization_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_criada_por_id_user_id_fk" FOREIGN KEY ("criada_por_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "etiquetas_organizacao_nome_unico" ON "etiquetas" USING btree ("organizacao_id","nome_normalizado");--> statement-breakpoint
CREATE INDEX "lead_etiquetas_etiqueta_idx" ON "lead_etiquetas" USING btree ("organizacao_id","etiqueta_id");--> statement-breakpoint
CREATE INDEX "notas_lead_idx" ON "notas" USING btree ("organizacao_id","lead_id","criado_em");--> statement-breakpoint
CREATE INDEX "importacoes_organizacao_criado_idx" ON "importacoes" USING btree ("organizacao_id","criado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_organizacao_email_unico" ON "leads" USING btree ("organizacao_id","email_normalizado") WHERE "leads"."email_normalizado" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_organizacao_telefone_unico" ON "leads" USING btree ("organizacao_id","telefone_normalizado") WHERE "leads"."telefone_normalizado" is not null;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_nome_nao_vazio" CHECK (char_length(btrim("leads"."nome")) > 0);