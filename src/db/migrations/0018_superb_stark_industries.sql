CREATE TABLE "plano_empresa" (
	"organizacao_id" text PRIMARY KEY NOT NULL,
	"plano" text NOT NULL,
	"fundador" boolean DEFAULT false NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plano_empresa_plano_valido" CHECK ("plano_empresa"."plano" in ('pequeno', 'medio', 'grande'))
);
--> statement-breakpoint
CREATE TABLE "uso_mensal" (
	"organizacao_id" text NOT NULL,
	"mes" text NOT NULL,
	"empresas_salvas" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "uso_mensal_organizacao_id_mes_pk" PRIMARY KEY("organizacao_id","mes"),
	CONSTRAINT "uso_mensal_mes_valido" CHECK ("uso_mensal"."mes" ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "uso_mensal_empresas_positivo" CHECK ("uso_mensal"."empresas_salvas" >= 0)
);
--> statement-breakpoint
ALTER TABLE "plano_empresa" ADD CONSTRAINT "plano_empresa_organizacao_id_organization_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uso_mensal" ADD CONSTRAINT "uso_mensal_organizacao_id_organization_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;