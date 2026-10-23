import Link from "next/link";
import type { ReactNode } from "react";
import { Cartao, CartaoConteudo, CartaoDescricao, CartaoCabecalho } from "@/components/ui/cartao";
import { ptBR } from "@/lib/i18n/pt-BR";

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
      <Link href="/" className="text-2xl font-semibold tracking-tight text-musgo-800">
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
  "font-medium text-roxo-700 underline-offset-4 hover:underline";
