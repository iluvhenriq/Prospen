import { ptBR } from "@/lib/i18n/pt-BR";
import { VAGAS_DE_FUNDADOR } from "@/modules/planos/planos";
import { vagasDeFundadorRestantes } from "@/modules/planos/vagas";

// Texto das vagas de fundador com quantas restam. Fica dentro de <Suspense>
// na página inicial; enquanto carrega, aparece o texto fixo das vagas.
export async function VagasDeFundador() {
  return <>{ptBR.planos.pagina.vagasRestantes(await vagasDeFundadorRestantes(), VAGAS_DE_FUNDADOR)}</>;
}
