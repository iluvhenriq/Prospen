import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CartaoAcesso, classeLinkTexto } from "@/components/conta/cartao-acesso";
import { FormularioCadastro } from "@/components/conta/formulario-cadastro";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterSessao } from "@/modules/organizacoes/contexto";

export const metadata: Metadata = { title: ptBR.acesso.cadastro.titulo };

async function RedirecionarSeLogado() {
  if (await obterSessao()) redirect("/painel");
  return null;
}

export default function PaginaCadastro() {
  return (
    <CartaoAcesso
      titulo={ptBR.acesso.cadastro.titulo}
      descricao={ptBR.acesso.cadastro.descricao}
      rodape={
        <>
          {ptBR.acesso.cadastro.temConta}{" "}
          <Link href="/entrar" className={classeLinkTexto}>
            {ptBR.acesso.cadastro.linkEntrar}
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <RedirecionarSeLogado />
      </Suspense>
      <FormularioCadastro />
    </CartaoAcesso>
  );
}
