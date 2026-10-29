import type { Metadata } from "next";
import { Suspense } from "react";
import { CopiarLink, FormularioConvite } from "@/components/equipe/formulario-convite";
import { ComoAssinar } from "@/components/planos/como-assinar";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoDescricao,
  CartaoTitulo,
} from "@/components/ui/cartao";
import { formatarData } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import { cancelarConvite, removerDaEquipe } from "@/modules/organizacoes/acoes-equipe";
import { obterTelaDeEquipe } from "@/modules/organizacoes/consultas-equipe";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { papelPode } from "@/modules/organizacoes/membros";
import { proximoPlano } from "@/modules/planos/planos";

export const metadata: Metadata = { title: ptBR.equipe.titulo };

async function ConteudoEquipe() {
  const contexto = await exigirContexto();
  const tela = await obterTelaDeEquipe(contexto);
  const gerencia = papelPode(contexto.papel, "gerenciarEquipe");
  const t = ptBR.equipe;
  const tp = ptBR.planos;
  const vagas = tela.pessoas.length + tela.convites.length;
  const proximo = proximoPlano(tela.plano);

  return (
    <div className="flex flex-col gap-6">
      {/* O plano: o que a empresa tem hoje. A troca é feita à mão, depois do pagamento. */}
      <div className="flex flex-col gap-1 rounded-painel border border-borda bg-superficie px-5 py-4">
        <p className="flex flex-wrap items-center gap-2 font-bold text-texto">
          {tp.seuPlano(tp.nomes[tela.plano])}
          {tela.fundador ? (
            <span className="rounded-[3px] bg-marca-texto px-1.5 text-xs font-bold text-tinta">{tp.fundador}</span>
          ) : null}
        </p>
        <p className="text-sm text-texto-suave">{tp.usoDoMes(tela.uso.usadas, tela.uso.limite)}</p>
        {tela.uso.semPagamento && tela.uso.limite !== null ? (
          <p className="text-sm text-texto-suave">{tp.semPagamento(tela.uso.limite)}</p>
        ) : null}
        <p className="text-sm text-texto-suave">{tp.usuariosDoPlano(tela.pessoas.length, tela.usuarios)}</p>
      </div>

      {/* Plano ainda não liberado: como pagar, enquanto o pagamento é manual. */}
      {tela.uso.semPagamento ? <ComoAssinar emailDaConta={contexto.usuario.email} /> : null}

      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>{t.titulo}</CartaoTitulo>
          <CartaoDescricao>{t.descricao}</CartaoDescricao>
        </CartaoCabecalho>
        <CartaoConteudo>
          <ul className="flex flex-col divide-y divide-borda">
            {tela.pessoas.map((pessoa) => (
              <li key={pessoa.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-texto">
                    {pessoa.nome}
                    {pessoa.usuarioId === contexto.usuario.id ? ` (${t.voce})` : ""}
                  </p>
                  <p className="truncate text-sm text-texto-suave">
                    {pessoa.email}, {ptBR.papeis[pessoa.papel].toLocaleLowerCase("pt-BR")}
                  </p>
                </div>
                {gerencia && pessoa.papel !== "owner" && pessoa.usuarioId !== contexto.usuario.id ? (
                  <form action={removerDaEquipe}>
                    <input type="hidden" name="id" value={pessoa.id} />
                    <Botao type="submit" variante="fantasma" tamanho="pequeno">
                      {t.remover}
                    </Botao>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </CartaoConteudo>
      </Cartao>

      {tela.convites.length > 0 ? (
        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>{t.convitesPendentes}</CartaoTitulo>
          </CartaoCabecalho>
          <CartaoConteudo>
            <ul className="flex flex-col divide-y divide-borda">
              {tela.convites.map((convite) => (
                <li key={convite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-texto">{convite.email}</p>
                    <p className="text-sm text-texto-suave">{t.expiraEm(formatarData(convite.expiraEm, tela.fuso))}</p>
                  </div>
                  {gerencia ? (
                    <div className="flex flex-wrap gap-2">
                      <CopiarLink caminho={`/convite/${convite.id}`} />
                      <form action={cancelarConvite}>
                        <input type="hidden" name="id" value={convite.id} />
                        <Botao type="submit" variante="fantasma" tamanho="pequeno">
                          {t.cancelar}
                        </Botao>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </CartaoConteudo>
        </Cartao>
      ) : null}

      {gerencia ? (
        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>{t.convidar}</CartaoTitulo>
          </CartaoCabecalho>
          <CartaoConteudo>
            <FormularioConvite
              cheio={vagas >= tela.usuarios ? t.limite(tela.usuarios, proximo ? tp.nomes[proximo] : null) : null}
            />
          </CartaoConteudo>
        </Cartao>
      ) : (
        <Alerta variante="info">{t.semPermissao}</Alerta>
      )}
    </div>
  );
}

export default function PaginaEquipe() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-texto">{ptBR.equipe.titulo}</h1>
      </header>
      <Suspense fallback={<Esqueleto className="h-96 w-full" />}>
        <ConteudoEquipe />
      </Suspense>
    </div>
  );
}
