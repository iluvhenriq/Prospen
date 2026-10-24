import type { Metadata } from "next";
import { DocumentoLegal, EmailDePrivacidade } from "@/components/legal/documento-legal";
import { ptBR } from "@/lib/i18n/pt-BR";
import { RESPONSAVEL } from "@/lib/responsavel";

export const metadata: Metadata = { title: ptBR.privacidade.titulo };

// Política de privacidade (LGPD). Pública e estática. O texto fica em
// src/lib/i18n/pt-BR.ts; o responsável e o e-mail, em src/lib/responsavel.ts.
// Rascunho a revisar com advogado antes de cobrar clientes. Documentos de
// apoio (teste de legítimo interesse, registro das operações) em docs/lgpd/.
export default function PaginaPrivacidade() {
  const t = ptBR.privacidade;
  return (
    <DocumentoLegal
      titulo={t.titulo}
      atualizadaEm={t.atualizadaEm}
      introducao={t.introducao}
      secoes={t.secoes}
      antes={
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-texto">{t.responsavelTitulo}</h2>
          <p className="text-texto">
            {t.responsavel(RESPONSAVEL.nome)} <EmailDePrivacidade />
          </p>
        </section>
      }
    />
  );
}
