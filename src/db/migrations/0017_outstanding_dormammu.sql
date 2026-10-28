CREATE TABLE "cliente_ideal" (
	"organizacao_id" text PRIMARY KEY NOT NULL,
	"portes" text[] DEFAULT '{}'::text[] NOT NULL,
	"idade" text DEFAULT 'novas' NOT NULL,
	"aceita_mei" boolean DEFAULT false NOT NULL,
	"atualizado_por_id" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cliente_ideal_idade_valida" CHECK ("cliente_ideal"."idade" in ('novas', 'estabelecidas', 'tanto_faz')),
	CONSTRAINT "cliente_ideal_portes_validos" CHECK ("cliente_ideal"."portes" <@ array['01', '03', '05']::text[])
);
--> statement-breakpoint
ALTER TABLE "cliente_ideal" ADD CONSTRAINT "cliente_ideal_organizacao_id_organization_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_ideal" ADD CONSTRAINT "cliente_ideal_atualizado_por_id_user_id_fk" FOREIGN KEY ("atualizado_por_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;