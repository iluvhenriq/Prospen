import { normalizarCnpj } from "@/modules/leads/cnpj";
import type { ParametrosDeUrl } from "@/modules/leads/parametros";

// Lê os filtros da busca na base pública a partir do endereço da página
// (?uf=SP&cidade=7107&atividade=padaria&mei=1&depois=...). O endereço é
// digitável por qualquer pessoa: valor estranho é descartado, nunca causa erro.

export const RESULTADOS_POR_PAGINA = 50;
const MAXIMO_DA_ATIVIDADE = 80;

export type ParametrosBusca = {
  uf?: string;
  municipio?: string;
  atividade: string;
  // "Sem MEI" vem ligado. Só sai com ?mei=1.
  incluirMei: boolean;
  // Último CNPJ da página anterior (paginação sem "offset").
  depoisDe?: string;
};

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export function lerParametrosBusca(entrada: ParametrosDeUrl): ParametrosBusca {
  const uf = (primeiro(entrada.uf) ?? "").trim().toUpperCase();
  const municipio = (primeiro(entrada.cidade) ?? "").trim();
  const depoisDe = normalizarCnpj(primeiro(entrada.depois));
  return {
    uf: /^[A-Z]{2}$/.test(uf) ? uf : undefined,
    municipio: /^\d{1,7}$/.test(municipio) ? municipio : undefined,
    atividade: (primeiro(entrada.atividade) ?? "").trim().slice(0, MAXIMO_DA_ATIVIDADE),
    incluirMei: primeiro(entrada.mei) === "1",
    depoisDe: depoisDe && /^[0-9A-Z]{12}[0-9]{2}$/.test(depoisDe) ? depoisDe : undefined,
  };
}

// Endereço da busca com os mesmos filtros; "depoisDe" leva à página seguinte.
export function enderecoDaBusca(parametros: ParametrosBusca, depoisDe?: string): string {
  const consulta = new URLSearchParams();
  if (parametros.uf) consulta.set("uf", parametros.uf);
  if (parametros.municipio) consulta.set("cidade", parametros.municipio);
  if (parametros.atividade) consulta.set("atividade", parametros.atividade);
  if (parametros.incluirMei) consulta.set("mei", "1");
  if (depoisDe) consulta.set("depois", depoisDe);
  const texto = consulta.toString();
  return texto ? `/painel/busca?${texto}` : "/painel/busca";
}
