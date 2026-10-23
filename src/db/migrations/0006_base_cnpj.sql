CREATE TABLE "base_cnpj_empresas" (
	"cnpj_basico" text PRIMARY KEY NOT NULL,
	"razao_social" text NOT NULL,
	"natureza_juridica" text,
	"porte" text,
	"mes_referencia" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_cnpj_estabelecimentos" (
	"cnpj" text PRIMARY KEY NOT NULL,
	"cnpj_basico" text NOT NULL,
	"matriz" boolean NOT NULL,
	"nome_fantasia" text,
	"data_inicio_atividade" date,
	"cnae_principal" text NOT NULL,
	"cnaes_secundarios" text[] DEFAULT '{}' NOT NULL,
	"tipo_logradouro" text,
	"logradouro" text,
	"numero" text,
	"complemento" text,
	"bairro" text,
	"cep" text,
	"uf" text NOT NULL,
	"municipio_codigo" text NOT NULL,
	"municipio_nome" text,
	"telefone_1" text,
	"telefone_2" text,
	"email" text,
	"mes_referencia" text NOT NULL,
	CONSTRAINT "base_cnpj_estab_cnpj_formato" CHECK ("base_cnpj_estabelecimentos"."cnpj" ~ '^[0-9A-Z]{12}[0-9]{2}$'),
	CONSTRAINT "base_cnpj_estab_uf_formato" CHECK ("base_cnpj_estabelecimentos"."uf" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE INDEX "base_cnpj_estab_uf_municipio_idx" ON "base_cnpj_estabelecimentos" USING btree ("uf","municipio_codigo");--> statement-breakpoint
CREATE INDEX "base_cnpj_estab_cnae_idx" ON "base_cnpj_estabelecimentos" USING btree ("cnae_principal","uf");--> statement-breakpoint
CREATE INDEX "base_cnpj_estab_basico_idx" ON "base_cnpj_estabelecimentos" USING btree ("cnpj_basico");