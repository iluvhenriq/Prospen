import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CartaoAcesso, classeLinkTexto } from "@/components/conta/cartao-acesso";
import { FormularioEntrar } from "@/components/conta/formulario-entrar";
import { Esqueleto } from "@/components/ui/carregando";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterSessao } from "@/modules/organizacoes/contexto";
import { conviteIdValido } from "@/modules/organizacoes/equipe";

export const metadata: Metadata = { title: ptBR.acesso.entrar.titulo };

// Quem já está logado não precisa ver a tela de entrada. A leitura da sessão
// fica dentro de <Suspense>, então o formulário aparece sem esperar por ela.
type Busca = PageProps<"/entrar">["searchParams"];

async function lerConvite(searchParams: Busca): Promise<string | undefined> {
  const { convite } = await searchParams;
  return conviteIdValido(convite) ? convite : undefined;
}

// Quem veio de um link de convite volta para ele.
async function RedirecionarSeLogado({ searchParams }: { searchParams: Busca }) {
  const convite = await lerConvite(searchParams);
  if (await obterSessao()) redirect(convite ? `/convite/${convite}` : "/painel");
  return null;
}

async function FormularioComConvite({ searchParams }: { searchParams: Busca }) {
  return <FormularioEntrar convite={await lerConvite(searchParams)} />;
}

export default function PaginaEntrar(props: PageProps<"/entrar">) {
  return (
    <CartaoAcesso
      titulo={ptBR.acesso.entrar.titulo}
      descricao={ptBR.acesso.entrar.descricao}
      rodape={
        <>
          {ptBR.acesso.entrar.semConta}{" "}
          <Link href="/cadastrar" className={classeLinkTexto}>
            {ptBR.acesso.entrar.linkCadastro}
          </Link>
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
    </CartaoAcesso>
  );
}
