import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Cartao, CartaoConteudo, CartaoDescricao, CartaoCabecalho } from "@/components/ui/cartao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { conviteIdValido } from "@/modules/organizacoes/equipe";

type CartaoAcessoProps = {
  titulo: string;
  descricao?: string;
  children: ReactNode;
  // Link para a tela irmã (por exemplo, "Já tem conta? Entrar").
  rodape?: ReactNode;
};

// Moldura das telas de cadastro, entrada e criação da empresa.
export function CartaoAcesso({ titulo, descricao, children, rodape }: CartaoAcessoProps) {
  return (
    <main
      id="conteudo"
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10"
    >
      <Link href="/" className="text-2xl font-extrabold tracking-[-0.03em] text-musgo-900">
        {ptBR.app.nome}
      </Link>
      <Cartao className="w-full max-w-sm">
        <CartaoCabecalho>
          <h1 className="text-xl font-semibold text-texto">{titulo}</h1>
          {descricao ? <CartaoDescricao>{descricao}</CartaoDescricao> : null}
        </CartaoCabecalho>
        <CartaoConteudo className="flex flex-col gap-4">{children}</CartaoConteudo>
      </Cartao>
      {rodape ? <p className="text-sm text-texto-suave">{rodape}</p> : null}
    </main>
  );
}

// Link de texto usado nos rodapés das telas de acesso.
export const classeLinkTexto =
  "font-medium text-musgo-700 underline-offset-4 hover:underline";

type BuscaDaPagina = Promise<Record<string, string | string[] | undefined>>;

// Convite que veio no endereço (?convite=...), só se tiver o formato certo.
export async function conviteDoEndereco(searchParams: BuscaDaPagina): Promise<string | undefined> {
  const { convite } = await searchParams;
  return conviteIdValido(convite) ? convite : undefined;
}

async function LinkComConvite({ href, searchParams, children }: { href: string; searchParams: BuscaDaPagina; children: ReactNode }) {
  const convite = await conviteDoEndereco(searchParams);
  return (
    <Link href={convite ? `${href}?convite=${convite}` : href} className={classeLinkTexto}>
      {children}
    </Link>
  );
}

// Link para a tela irmã que leva o convite junto. Sem isso, quem trocava de
// "Criar conta" para "Entrar" (ou o contrário) perdia o convite, caía na
// criação de empresa e, se criasse uma, não conseguia mais entrar na equipe.
export function LinkDaTelaIrma({ href, searchParams, children }: { href: string; searchParams: BuscaDaPagina; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <Link href={href} className={classeLinkTexto}>
          {children}
        </Link>
      }
    >
      <LinkComConvite href={href} searchParams={searchParams}>
        {children}
      </LinkComConvite>
    </Suspense>
  );
}
