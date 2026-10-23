ALTER TABLE "leads" ADD COLUMN "motivo_perda" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "valor_venda_centavos" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "moeda_venda" text;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_motivo_perda_valido" CHECK ("leads"."motivo_perda" is null or ("leads"."etapa" = 'perdido' and "leads"."motivo_perda" in ('preco', 'concorrente', 'sem_resposta', 'sem_interesse', 'sem_orcamento', 'momento', 'outro')));--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_valor_venda_valido" CHECK ("leads"."valor_venda_centavos" is null or ("leads"."etapa" = 'ganho' and "leads"."valor_venda_centavos" >= 0 and "leads"."moeda_venda" ~ '^[A-Z]{3}$'));