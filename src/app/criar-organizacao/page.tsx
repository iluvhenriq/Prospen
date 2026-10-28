import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CartaoAcesso } from "@/components/conta/cartao-acesso";
import { FormularioOrganizacao } from "@/components/conta/formulario-organizacao";
import { Esqueleto } from "@/components/ui/carregando";
import { ptBR } from "@/lib/i18n/pt-BR";
import {
  exigirUsuario,
  obterContextoOpcional,
} from "@/modules/organizacoes/contexto";

export const metadata: Metadata = { title: ptBR.acesso.organizacao.titulo };

// Segundo passo do cadastro. Sem login volta para a entrada; quem já tem
// empresa vai direto ao painel. Lê a sessão, então fica dentro de <Suspense>.
async function ConteudoOrganizacao() {
  const sessao = await exigirUsuario();
  if (await obterContextoOpcional()) redirect("/painel");

  return (
    <>
      <p className="text-sm text-texto-suave">
        {ptBR.acesso.organizacao.saudacao(sessao.user.name)}
      </p>
      <FormularioOrganizacao />
    </>
  );
}

function CarregandoOrganizacao() {
  return (
    <div className="flex flex-col gap-4">
      <Esqueleto className="h-4 w-1/3" />
      <Esqueleto className="h-10 w-full" />
      <Esqueleto className="h-10 w-full" />
    </div>
  );
}

export default function PaginaCriarOrganizacao() {
  return (
    <CartaoAcesso
      titulo={ptBR.acesso.organizacao.titulo}
      descricao={ptBR.acesso.organizacao.descricao}
    >
      <Suspense fallback={<CarregandoOrganizacao />}>
        <ConteudoOrganizacao />
      </Suspense>
      {/* Quem foi convidado e chegou aqui sem o link criaria uma empresa à parte
          e não entraria mais na equipe (cada conta participa de uma empresa só). */}
      <p className="text-xs text-texto-suave">{ptBR.acesso.organizacao.temConvite}</p>
    </CartaoAcesso>
  );
}
