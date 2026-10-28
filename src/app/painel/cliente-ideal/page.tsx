import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioClienteIdeal } from "@/components/pontuacao/formulario-cliente-ideal";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import { ptBR } from "@/lib/i18n/pt-BR";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { papelPode } from "@/modules/organizacoes/membros";
import { voltarNotaGeral } from "@/modules/pontuacao/acoes";
import { obterClienteIdeal } from "@/modules/pontuacao/cliente-ideal";

export const metadata: Metadata = { title: ptBR.clienteIdeal.titulo };

async function ConteudoClienteIdeal() {
  const contexto = await exigirContexto();
  const perfil = await obterClienteIdeal(contexto);
  const podeEditar = papelPode(contexto.papel, "definirClienteIdeal");
  const t = ptBR.clienteIdeal;

  return (
    <div className="flex flex-col gap-6">
      {podeEditar ? null : <Alerta variante="info">{t.semPermissao}</Alerta>}
      <FormularioClienteIdeal perfil={perfil} podeEditar={podeEditar} />
      {perfil && podeEditar ? (
        <form action={voltarNotaGeral} className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
          <Botao type="submit" variante="fantasma" tamanho="pequeno">
            {t.voltar}
          </Botao>
          <span className="text-xs text-texto-suave">{t.voltarAjuda}</span>
        </form>
      ) : null}
    </div>
  );
}

export default function PaginaClienteIdeal() {
  const t = ptBR.clienteIdeal;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-2xl flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-texto">{t.titulo}</h1>
        <p className="text-texto-suave">{t.descricao}</p>
      </header>
      <Suspense fallback={<Esqueleto className="h-96 w-full" />}>
        <ConteudoClienteIdeal />
      </Suspense>
    </div>
  );
}
