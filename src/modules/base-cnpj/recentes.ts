import "server-only";
import { cacheLife } from "next/cache";
import { getDb } from "@/db/client";
import { repositorioBaseCnpj } from "./repositorio";

// Empresas abertas desde uma data que casam com os filtros de uma busca
// vigiada (etapa 9e). Medido na base de SP em 27/10/2026: até 37 s com o banco
// "frio" (lê do disco milhares de empresas só para conferir a data) e menos de
// 1 s depois. Como a base é pública, igual para todas as empresas, e só muda
// uma vez por mês, o resultado fica guardado ("use cache") e serve a todas.
// A data entra na chave: muda uma vez por dia, e aí recalcula.
// Nada aqui é da empresa cliente: quem chama tira os que já são leads dela.
export async function cnpjsRecentesDaBase(
  uf: string,
  municipio: string,
  atividade: string,
  incluirMei: boolean,
  desde: string,
  limite: number,
): Promise<string[]> {
  "use cache";
  cacheLife("days");

  const base = repositorioBaseCnpj(getDb());
  const atividades = atividade ? await base.atividadesPorPalavras(atividade) : null;
  return base.cnpjsAbertosDesde(
    {
      uf,
      municipio: municipio || undefined,
      atividades: atividades?.map((item) => item.codigo),
      semMei: !incluirMei,
    },
    desde,
    limite,
  );
}
