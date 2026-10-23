CREATE TABLE "campanha_leads" (
	"organizacao_id" text NOT NULL,
	"campanha_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"adicionado_por_id" text,
	"adicionado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campanha_leads_campanha_id_lead_id_pk" PRIMARY KEY("campanha_id","lead_id")
);
--> statement-breakpoint
CREATE TABLE "campanhas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" text NOT NULL,
	"nome" text NOT NULL,
	"objetivo" text,
	"responsavel_id" text,
	"inicio" date,
	"fim" date,
	"custo_centavos" bigint,
	"moeda_custo" text,
	"situacao" text DEFAULT 'ativa' NOT NULL,
	"criado_por_id" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campanhas_id_organizacao_unico" UNIQUE("id","organizacao_id"),
	CONSTRAINT "campanhas_nome_valido" CHECK (char_length(btrim("campanhas"."nome")) between 1 and 80),
	CONSTRAINT "campanhas_objetivo_valido" CHECK ("campanhas"."objetivo" is null or char_length("campanhas"."objetivo") <= 500),
	CONSTRAINT "campanhas_situacao_valida" CHECK ("campanhas"."situacao" in ('ativa', 'encerrada')),
	CONSTRAINT "campanhas_periodo_valido" CHECK ("campanhas"."inicio" is null or "campanhas"."fim" is null or "campanhas"."fim" >= "campanhas"."inicio"),
	CONSTRAINT "campanhas_custo_valido" CHECK ("campanhas"."custo_centavos" is null or ("campanhas"."custo_centavos" >= 0 and "campanhas"."moeda_custo" ~ '^[A-Z]{3}$'))
);
--> statement-breakpoint
ALTER TABLE "campanha_leads" ADD CONSTRAINT "campanha_leads_adicionado_por_id_user_id_fk" FOREIGN KEY ("adicionado_por_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campanha_leads" ADD CONSTRAINT "campanha_leads_campanha_fk" FOREIGN KEY ("campanha_id","organizacao_id") REFERENCES "public"."campanhas"("id","organizacao_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campanha_leads" ADD CONSTRAINT "campanha_leads_lead_fk" FOREIGN KEY ("lead_id","organizacao_id") REFERENCES "public"."leads"("id","organizacao_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_organizacao_id_organization_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_responsavel_id_user_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_criado_por_id_user_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campanha_leads_lead_idx" ON "campanha_leads" USING btree ("organizacao_id","lead_id");--> statement-breakpoint
CREATE INDEX "campanhas_organizacao_idx" ON "campanhas" USING btree ("organizacao_id","situacao","criado_em");