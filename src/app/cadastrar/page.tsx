import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CartaoAcesso, classeLinkTexto, conviteDoEndereco, LinkDaTelaIrma } from "@/components/conta/cartao-acesso";
import { FormularioCadastro } from "@/components/conta/formulario-cadastro";
import { Esqueleto } from "@/components/ui/carregando";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterSessao } from "@/modules/organizacoes/contexto";

export const metadata: Metadata = { title: ptBR.acesso.cadastro.titulo };

type Busca = PageProps<"/cadastrar">["searchParams"];

// Quem veio de um link de convite volta para ele.
async function RedirecionarSeLogado({ searchParams }: { searchParams: Busca }) {
  const convite = await conviteDoEndereco(searchParams);
  if (await obterSessao()) redirect(convite ? `/convite/${convite}` : "/painel");
  return null;
}

async function FormularioComConvite({ searchParams }: { searchParams: Busca }) {
  return <FormularioCadastro convite={await conviteDoEndereco(searchParams)} />;
}

export default function PaginaCadastro(props: PageProps<"/cadastrar">) {
  return (
    <CartaoAcesso
      titulo={ptBR.acesso.cadastro.titulo}
      descricao={ptBR.acesso.cadastro.descricao}
      rodape={
        <>
          {ptBR.acesso.cadastro.temConta}{" "}
          <LinkDaTelaIrma href="/entrar" searchParams={props.searchParams}>
            {ptBR.acesso.cadastro.linkEntrar}
          </LinkDaTelaIrma>
        </>
      }
    >
      <Suspense fallback={null}>
        <RedirecionarSeLogado searchParams={props.searchParams} />
      </Suspense>
      {/* A espera não é o formulário: trocar um pelo outro apagava o que já tinha sido digitado. */}
      <Suspense fallback={<Esqueleto className="h-48 w-full" />}>
        <FormularioComConvite searchParams={props.searchParams} />
      </Suspense>
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
