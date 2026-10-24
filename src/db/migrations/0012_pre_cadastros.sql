CREATE TABLE "pre_cadastros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"empresa" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pre_cadastros_nome_valido" CHECK (char_length(btrim("pre_cadastros"."nome")) between 1 and 80),
	CONSTRAINT "pre_cadastros_email_minusculo" CHECK ("pre_cadastros"."email" = lower("pre_cadastros"."email") and char_length("pre_cadastros"."email") <= 254),
	CONSTRAINT "pre_cadastros_empresa_valida" CHECK ("pre_cadastros"."empresa" is null or char_length("pre_cadastros"."empresa") <= 120)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pre_cadastros_email_unico" ON "pre_cadastros" USING btree ("email");