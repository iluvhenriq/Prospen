import type { Metadata } from "next";
import { Suspense } from "react";
import { CartaoAcesso, conviteDoEndereco } from "@/components/conta/cartao-acesso";
import { FormularioConfirmar } from "@/components/conta/formulario-confirmar";
import { Alerta } from "@/components/ui/alerta";
import { Esqueleto } from "@/components/ui/carregando";
import { ptBR } from "@/lib/i18n/pt-BR";

export const metadata: Metadata = { title: ptBR.acesso.confirmar.titulo };

type Busca = PageProps<"/confirmar-email">["searchParams"];

async function Confirmacao({ searchParams }: { searchParams: Busca }) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    return <Alerta variante="erro">{ptBR.acesso.confirmar.semLink}</Alerta>;
  }
  return <FormularioConfirmar token={token} convite={await conviteDoEndereco(searchParams)} />;
}

// Destino do link do e-mail de confirmação (src/modules/contas/emails.ts).
export default function PaginaConfirmarEmail(props: PageProps<"/confirmar-email">) {
  return (
    <CartaoAcesso titulo={ptBR.acesso.confirmar.titulo} descricao={ptBR.acesso.confirmar.descricao}>
      <Suspense fallback={<Esqueleto className="h-11 w-full" />}>
        <Confirmacao searchParams={props.searchParams} />
      </Suspense>
    </CartaoAcesso>
  );
}
