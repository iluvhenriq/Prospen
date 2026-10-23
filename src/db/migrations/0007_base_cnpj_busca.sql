CREATE TABLE "base_cnpj_cargas" (
	"uf" text PRIMARY KEY NOT NULL,
	"mes_referencia" text NOT NULL,
	"estabelecimentos" integer NOT NULL,
	"concluida_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_cnpj_cnaes" (
	"codigo" text PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_cnpj_exclusoes" (
	"cnpj" text PRIMARY KEY NOT NULL,
	"pedido_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "base_cnpj_exclusoes_cnpj_formato" CHECK ("base_cnpj_exclusoes"."cnpj" ~ '^[0-9A-Z]{12}[0-9]{2}$')
);
--> statement-breakpoint
CREATE TABLE "base_cnpj_municipios" (
	"codigo" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"uf" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "base_cnpj_municipios_uf_idx" ON "base_cnpj_municipios" USING btree ("uf","nome");