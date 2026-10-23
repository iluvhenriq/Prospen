import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CartaoAcesso, classeLinkTexto } from "@/components/conta/cartao-acesso";
import { FormularioEntrar } from "@/components/conta/formulario-entrar";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterSessao } from "@/modules/organizacoes/contexto";

export const metadata: Metadata = { title: ptBR.acesso.entrar.titulo };

// Quem já está logado não precisa ver a tela de entrada. A leitura da sessão
// fica dentro de <Suspense>, então o formulário aparece sem esperar por ela.
async function RedirecionarSeLogado() {
  if (await obterSessao()) redirect("/painel");
  return null;
}

export default function PaginaEntrar() {
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
        <RedirecionarSeLogado />
      </Suspense>
      <FormularioEntrar />
    </CartaoAcesso>
  );
}
