import { ptBR } from "@/lib/i18n/pt-BR";
import { obterExportacaoDeLeads } from "@/modules/leads/consultas";
import { lerParametrosLista } from "@/modules/leads/parametros";
import { exigirPermissao } from "@/modules/organizacoes/contexto";
import { ErroSemPermissao } from "@/modules/organizacoes/membros";

// Download dos leads em CSV, com os filtros da lista (?q=&origem=&etapa=&etiqueta=).
// Empresa e papel vêm do banco (contexto), nunca do endereço.
export async function GET(requisicao: Request) {
  try {
    const contexto = await exigirPermissao("exportarLeads");
    const parametros = lerParametrosLista(Object.fromEntries(new URL(requisicao.url).searchParams));
    const { csv, nomeArquivo } = await obterExportacaoDeLeads(contexto, parametros);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
        // Dados pessoais: nada de guardar em cache no caminho.
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (erro) {
    if (erro instanceof ErroSemPermissao) {
      return new Response(ptBR.leads.exportar.semPermissao, {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    throw erro;
  }
}
