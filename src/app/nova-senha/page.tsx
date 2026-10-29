import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CartaoAcesso, classeLinkTexto } from "@/components/conta/cartao-acesso";
import { FormularioNovaSenha } from "@/components/conta/formulario-nova-senha";
import { Alerta } from "@/components/ui/alerta";
import { Esqueleto } from "@/components/ui/carregando";
import { ptBR } from "@/lib/i18n/pt-BR";

export const metadata: Metadata = { title: ptBR.acesso.novaSenha.titulo };

type Busca = PageProps<"/nova-senha">["searchParams"];

async function Formulario({ searchParams }: { searchParams: Busca }) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    return <Alerta variante="erro">{ptBR.acesso.novaSenha.semLink}</Alerta>;
  }
  return <FormularioNovaSenha token={token} />;
}

// Destino do link do e-mail de senha nova (src/modules/contas/emails.ts).
export default function PaginaNovaSenha(props: PageProps<"/nova-senha">) {
  return (
    <CartaoAcesso
      titulo={ptBR.acesso.novaSenha.titulo}
      descricao={ptBR.acesso.novaSenha.descricao}
      rodape={
        <Link href="/esqueci-senha" className={classeLinkTexto}>
          {ptBR.acesso.novaSenha.pedirOutro}
        </Link>
      }
    >
      <Suspense fallback={<Esqueleto className="h-32 w-full" />}>
        <Formulario searchParams={props.searchParams} />
      </Suspense>
    </CartaoAcesso>
  );
}
