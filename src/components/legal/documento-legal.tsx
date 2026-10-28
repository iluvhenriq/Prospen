import Link from "next/link";
import type { ReactNode } from "react";
import { ptBR } from "@/lib/i18n/pt-BR";
import { RESPONSAVEL } from "@/lib/responsavel";

export const classeLinkLegal = "font-medium text-musgo-700 underline underline-offset-4 hover:text-musgo-900";

type Secao = { titulo: string; paragrafos: readonly string[] };

// Moldura dos documentos públicos (política de privacidade, termos de uso):
// título, data, introdução, seções e os atalhos para os outros documentos.
export function DocumentoLegal({
  titulo,
  atualizadaEm,
  introducao,
  antes,
  secoes,
}: {
  titulo: string;
  atualizadaEm: string;
  introducao: string;
  // Conteúdo próprio antes das seções (por exemplo, o responsável).
  antes?: ReactNode;
  secoes: readonly Secao[];
}) {
  return (
    <main id="conteudo" className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <Link href="/" className="text-2xl font-extrabold tracking-[-0.03em] text-musgo-900">
        {ptBR.app.nome}
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-musgo-900">{titulo}</h1>
        <p className="text-sm text-texto-suave">{atualizadaEm}</p>
        <p className="text-texto">{introducao}</p>
      </header>

      {antes}

      {secoes.map((secao) => (
        <section key={secao.titulo} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-texto">{secao.titulo}</h2>
          {secao.paragrafos.map((paragrafo) => (
            <p key={paragrafo} className="text-texto">
              {paragrafo}
            </p>
          ))}
        </section>
      ))}

      <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/privacidade" className={classeLinkLegal}>
          {ptBR.privacidade.link}
        </Link>
        <Link href="/termos" className={classeLinkLegal}>
          {ptBR.termos.link}
        </Link>
        <Link href="/remover-meus-dados" className={classeLinkLegal}>
          {ptBR.remocao.link}
        </Link>
        <EmailDePrivacidade />
      </p>
    </main>
  );
}

// className troca a cor do link quando o fundo é escuro (rodapé da apresentação).
export function EmailDePrivacidade({ className }: { className?: string } = {}) {
  return (
    <a href={`mailto:${RESPONSAVEL.emailPrivacidade}`} className={className ?? classeLinkLegal}>
      {RESPONSAVEL.emailPrivacidade}
    </a>
  );
}
