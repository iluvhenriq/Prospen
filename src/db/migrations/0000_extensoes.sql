-- Extensões usadas na busca de empresas (etapa 5):
-- unaccent ignora acentos ("sao paulo" encontra "São Paulo");
-- pg_trgm permite busca por parte do nome, mesmo com pequenos erros de digitação.
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
