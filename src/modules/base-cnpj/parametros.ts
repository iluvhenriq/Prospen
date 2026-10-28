import { cnpjValido, normalizarCnpj } from "@/modules/leads/cnpj";
import type { ParametrosDeUrl } from "@/modules/leads/parametros";
import type { Cursor } from "./repositorio";

// Lê os filtros da busca na base pública a partir do endereço da página
// (?uf=SP&cidade=7107&atividade=padaria&mei=1&depois=...). O endereço é
// digitável por qualquer pessoa: valor estranho é descartado, nunca causa erro.

export const RESULTADOS_POR_PAGINA = 50;
// "Recém-abertas": empresas abertas nos últimos N dias (filtro da busca e
// buscas vigiadas). A base da Receita sai uma vez por mês, então 90 dias
// cobrem as três últimas publicações.
export const DIAS_DE_RECENTES = 90;
const MAXIMO_DA_ATIVIDADE = 80;
const MAXIMO_DO_CNPJ = 20;

export type ParametrosBusca = {
  uf?: string;
  municipio?: string;
  atividade: string;
  // "Sem MEI" vem ligado. Só sai com ?mei=1.
  incluirMei: boolean;
  // Só as abertas nos últimos DIAS_DE_RECENTES dias (?recentes=1).
  recentes: boolean;
  // Último da página anterior (paginação sem "offset"). No endereço: "45-CNPJ".
  depoisDe?: Cursor;
  // CNPJ digitado como foi digitado (para mostrar de volta) e, se válido,
  // padronizado. Com CNPJ, os outros filtros são ignorados.
  cnpjDigitado: string;
  cnpj?: string;
};

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export function lerParametrosBusca(entrada: ParametrosDeUrl): ParametrosBusca {
  const uf = (primeiro(entrada.uf) ?? "").trim().toUpperCase();
  const municipio = (primeiro(entrada.cidade) ?? "").trim();
  const depoisDe = lerCursor(primeiro(entrada.depois));
  const cnpjDigitado = (primeiro(entrada.cnpj) ?? "").trim().slice(0, MAXIMO_DO_CNPJ);
  const cnpj = normalizarCnpj(cnpjDigitado);
  return {
    uf: /^[A-Z]{2}$/.test(uf) ? uf : undefined,
    municipio: /^\d{1,7}$/.test(municipio) ? municipio : undefined,
    atividade: (primeiro(entrada.atividade) ?? "").trim().slice(0, MAXIMO_DA_ATIVIDADE),
    incluirMei: primeiro(entrada.mei) === "1",
    recentes: primeiro(entrada.recentes) === "1",
    depoisDe,
    cnpjDigitado,
    cnpj: cnpj && cnpjValido(cnpj) ? cnpj : undefined,
  };
}

function lerCursor(valor: string | undefined): Cursor | undefined {
  const partes = /^(\d{1,3})-([0-9A-Z]{12}[0-9]{2})$/.exec((valor ?? "").trim().toUpperCase());
  if (!partes) return undefined;
  const pontos = Number(partes[1]);
  return pontos <= 100 ? { pontos, cnpj: partes[2] } : undefined;
}

// Endereço da busca com os mesmos filtros; "depoisDe" leva à página seguinte.
export function enderecoDaBusca(parametros: ParametrosBusca, depoisDe?: Cursor): string {
  const consulta = new URLSearchParams();
  if (parametros.uf) consulta.set("uf", parametros.uf);
  if (parametros.municipio) consulta.set("cidade", parametros.municipio);
  if (parametros.atividade) consulta.set("atividade", parametros.atividade);
  if (parametros.incluirMei) consulta.set("mei", "1");
  if (parametros.recentes) consulta.set("recentes", "1");
  if (parametros.cnpjDigitado) consulta.set("cnpj", parametros.cnpjDigitado);
  if (depoisDe) consulta.set("depois", `${depoisDe.pontos}-${depoisDe.cnpj}`);
  const texto = consulta.toString();
  return texto ? `/painel/busca?${texto}` : "/painel/busca";
}
