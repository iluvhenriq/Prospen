import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRemocao } from "@/components/remocao/formulario-remocao";
import { Cartao, CartaoConteudo } from "@/components/ui/cartao";
import { ptBR } from "@/lib/i18n/pt-BR";

export const metadata: Metadata = { title: ptBR.remocao.titulo };

// Página pública (LGPD): quem é responsável por uma empresa tira o CNPJ da
// busca, sem precisar de conta. Fora de /painel, então o proxy não pede login.
export default function PaginaRemocao() {
  const t = ptBR.remocao;
  return (
    <main id="conteudo" className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
      <Link href="/" className="text-2xl font-semibold tracking-tight text-musgo-800">
        {ptBR.app.nome}
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-musgo-800">{t.titulo}</h1>
        <p className="text-texto-suave">{t.descricao}</p>
      </header>
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-texto">{t.comoFunciona}</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-texto-suave">
          {t.itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <Cartao>
        <CartaoConteudo className="pt-6">
          <FormularioRemocao />
        </CartaoConteudo>
      </Cartao>
      <p className="text-xs text-texto-suave">
        {t.fonte}{" "}
        <Link href="/privacidade" className="font-medium text-roxo-700 underline underline-offset-4">
          {ptBR.privacidade.link}
        </Link>
      </p>
    </main>
  );
}
