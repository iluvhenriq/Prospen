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
      {/* Aceite dos termos e ciência da política, antes de criar a conta (LGPD, art. 9º). */}
      <p className="text-xs text-texto-suave">
        {ptBR.termos.aceiteInicio}{" "}
        <Link href="/termos" className={classeLinkTexto}>
          {ptBR.termos.link.toLowerCase()}
        </Link>{" "}
        {ptBR.termos.aceiteMeio}{" "}
        <Link href="/privacidade" className={classeLinkTexto}>
          {ptBR.privacidade.link.toLowerCase()}
        </Link>
        .
      </p>
    </CartaoAcesso>
  );
}
