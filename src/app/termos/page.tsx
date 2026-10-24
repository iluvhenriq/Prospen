import type { Metadata } from "next";
import { DocumentoLegal } from "@/components/legal/documento-legal";
import { ptBR } from "@/lib/i18n/pt-BR";

export const metadata: Metadata = { title: ptBR.termos.titulo };

// Termos de uso. Públicos e estáticos; o texto fica em src/lib/i18n/pt-BR.ts.
// Também fazem o papel do contrato entre controlador (o cliente) e operador
// (o PROSPEN) exigido pela LGPD (art. 39). Rascunho a revisar com advogado.
export default function PaginaTermos() {
  const t = ptBR.termos;
  return <DocumentoLegal titulo={t.titulo} atualizadaEm={t.atualizadaEm} introducao={t.introducao} secoes={t.secoes} />;
}
