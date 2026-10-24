CREATE TABLE "registros_acesso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"ip" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "registros_acesso_criado_idx" ON "registros_acesso" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "registros_acesso_usuario_idx" ON "registros_acesso" USING btree ("usuario_id","criado_em");