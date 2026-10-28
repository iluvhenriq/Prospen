CREATE TABLE "buscas_vigiadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" text NOT NULL,
	"uf" text NOT NULL,
	"municipio_codigo" text DEFAULT '' NOT NULL,
	"municipio_nome" text,
	"atividade" text DEFAULT '' NOT NULL,
	"incluir_mei" boolean DEFAULT false NOT NULL,
	"criado_por_id" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buscas_vigiadas_uf_valida" CHECK ("buscas_vigiadas"."uf" ~ '^[A-Z]{2}$'),
	CONSTRAINT "buscas_vigiadas_municipio_valido" CHECK ("buscas_vigiadas"."municipio_codigo" ~ '^[0-9]{0,7}$'),
	CONSTRAINT "buscas_vigiadas_atividade_curta" CHECK (char_length("buscas_vigiadas"."atividade") <= 80),
	CONSTRAINT "buscas_vigiadas_tem_foco" CHECK ("buscas_vigiadas"."municipio_codigo" <> '' or "buscas_vigiadas"."atividade" <> '')
);
--> statement-breakpoint
ALTER TABLE "buscas_vigiadas" ADD CONSTRAINT "buscas_vigiadas_organizacao_id_organization_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buscas_vigiadas" ADD CONSTRAINT "buscas_vigiadas_criado_por_id_user_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "buscas_vigiadas_unica" ON "buscas_vigiadas" USING btree ("organizacao_id","uf","municipio_codigo","atividade","incluir_mei");