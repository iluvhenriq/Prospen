CREATE TABLE "organizacao_config" (
	"organizacao_id" text PRIMARY KEY NOT NULL,
	"pais" text DEFAULT 'BR' NOT NULL,
	"moeda" text DEFAULT 'BRL' NOT NULL,
	"fuso_horario" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"idioma" text DEFAULT 'pt-BR' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizacao_config_pais_valido" CHECK ("organizacao_config"."pais" ~ '^[A-Z]{2}$'),
	CONSTRAINT "organizacao_config_moeda_valida" CHECK ("organizacao_config"."moeda" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "organizacao_config" ADD CONSTRAINT "organizacao_config_organizacao_id_organization_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;