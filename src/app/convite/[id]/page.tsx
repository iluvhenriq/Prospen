import type { Metadata } from "next";
import { Suspense } from "react";
import { CartaoAcesso } from "@/components/conta/cartao-acesso";
import { FormularioAceite } from "@/components/equipe/formulario-aceite";
import { Alerta } from "@/components/ui/alerta";
import { Botao, BotaoLink } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import { ptBR } from "@/lib/i18n/pt-BR";
import { sair } from "@/modules/contas/acoes";
import { obterConvite } from "@/modules/organizacoes/consultas-equipe";
import { obterSessao } from "@/modules/organizacoes/contexto";
import { conviteIdValido } from "@/modules/organizacoes/equipe";

export const metadata: Metadata = { title: ptBR.equipe.convite.titulo, robots: { index: false } };

// Quem recebe o link de convite cai aqui. Sem login: entra ou cria a conta
// (com o mesmo e-mail) e volta para cá. Com login: aceita e vai ao painel.
async function ConteudoConvite({ params }: { params: PageProps<"/convite/[id]">["params"] }) {
  const { id } = await params;
  const t = ptBR.equipe.convite;
  const convite = conviteIdValido(id) ? await obterConvite(id) : null;
  if (!convite) return <Alerta variante="aviso">{t.invalido}</Alerta>;

  const sessao = await obterSessao();
  const volta = `?convite=${encodeURIComponent(convite.id)}`;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-texto">{t.para(convite.empresa)}</p>
      <p className="text-sm text-texto-suave">{t.paraEmail(convite.email)}</p>
      {!sessao ? (
        <>
          <p className="text-sm text-texto-suave">{t.entrarPrimeiro}</p>
          <div className="flex flex-wrap gap-3">
            <BotaoLink href={`/cadastrar${volta}`}>{t.criarConta}</BotaoLink>
            <BotaoLink href={`/entrar${volta}`} variante="contorno">
              {t.entrar}
            </BotaoLink>
          </div>
        </>
      ) : sessao.user.email.toLowerCase() !== convite.email.toLowerCase() ? (
        <>
          <Alerta variante="aviso">{t.outroEmail(convite.email)}</Alerta>
          <form action={sair}>
            <Botao type="submit" variante="contorno">
              {ptBR.navegacao.sair}
            </Botao>
          </form>
        </>
      ) : (
        <FormularioAceite conviteId={convite.id} />
      )}
    </div>
  );
}

export default function PaginaConvite(props: PageProps<"/convite/[id]">) {
  return (
    <CartaoAcesso titulo={ptBR.equipe.convite.titulo}>
      <Suspense fallback={<Esqueleto className="h-32 w-full" />}>
        <ConteudoConvite params={props.params} />
      </Suspense>
    </CartaoAcesso>
  );
}
