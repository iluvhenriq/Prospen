"use client";

import { useActionState, useState } from "react";
import { ContaDaNota, NotaPontuacao } from "@/components/pontuacao/selo-pontuacao";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import { salvarClienteIdeal, type EstadoClienteIdeal } from "@/modules/pontuacao/acoes";
import {
  IDADES_DO_PERFIL,
  PORTES_DO_PERFIL,
  pontuar,
  type ClienteIdeal,
  type DadosParaPontuar,
  type IdadeDoPerfil,
  type PorteDoPerfil,
} from "@/modules/pontuacao/regras";

const inicial: EstadoClienteIdeal = {};

// Empresa de exemplo da prévia: pequeno porte, aberta há 5 anos, com contato.
// Fictícia, só para mostrar a conta; a data é relativa a hoje.
function exemplo(hoje: Date): DadosParaPontuar {
  const abertura = new Date(Date.UTC(hoje.getUTCFullYear() - 5, 0, 15)).toISOString().slice(0, 10);
  return { telefone: "1", email: "contato@empresa.com.br", dataAbertura: abertura, porte: "03", matriz: true, naturezaJuridica: "2062" };
}

const classeOpcao = cn(
  "flex cursor-pointer items-start gap-2 rounded-controle border border-borda-campo bg-superficie px-3 py-2 text-sm text-texto transition-colors",
  "hover:bg-musgo-50 has-[:checked]:border-acao has-[:checked]:bg-musgo-50",
);

export function FormularioClienteIdeal({ perfil, podeEditar }: { perfil: ClienteIdeal | null; podeEditar: boolean }) {
  const [estado, executar, pendente] = useActionState(salvarClienteIdeal, inicial);
  const [portes, setPortes] = useState<PorteDoPerfil[]>(perfil?.portes ?? []);
  const [idade, setIdade] = useState<IdadeDoPerfil>(perfil?.idade ?? "novas");
  const [aceitaMei, setAceitaMei] = useState(perfil?.aceitaMei ?? false);
  const t = ptBR.clienteIdeal;

  const hoje = new Date();
  const previa = pontuar(exemplo(hoje), hoje, { portes, idade, aceitaMei });
  const geral = pontuar(exemplo(hoje), hoje);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
      <form action={executar} className="flex flex-col gap-6">
        <fieldset disabled={!podeEditar} className="flex flex-col gap-2">
          <legend className="pb-1 text-sm font-bold text-texto">{t.portes}</legend>
          {PORTES_DO_PERFIL.map((porte) => (
            <label key={porte} className={classeOpcao}>
              <input
                type="checkbox"
                name="porte"
                value={porte}
                checked={portes.includes(porte)}
                onChange={(evento) =>
                  setPortes((atual) =>
                    evento.target.checked ? [...atual, porte] : atual.filter((item) => item !== porte),
                  )
                }
                className="mt-0.5 size-4 accent-musgo-700"
              />
              {t.nomesPortes[porte]}
            </label>
          ))}
          <p className="text-xs text-texto-suave">{t.portesAjuda}</p>
        </fieldset>

        <fieldset disabled={!podeEditar} className="flex flex-col gap-2">
          <legend className="pb-1 text-sm font-bold text-texto">{t.idade}</legend>
          {IDADES_DO_PERFIL.map((opcao) => (
            <label key={opcao} className={classeOpcao}>
              <input
                type="radio"
                name="idade"
                value={opcao}
                checked={idade === opcao}
                onChange={() => setIdade(opcao)}
                className="mt-0.5 size-4 accent-musgo-700"
              />
              {t.idades[opcao]}
            </label>
          ))}
        </fieldset>

        <fieldset disabled={!podeEditar} className="flex flex-col gap-2">
          <label className={classeOpcao}>
            <input
              type="checkbox"
              name="aceitaMei"
              value="1"
              checked={aceitaMei}
              onChange={(evento) => setAceitaMei(evento.target.checked)}
              className="mt-0.5 size-4 accent-musgo-700"
            />
            {t.mei}
          </label>
          <p className="text-xs text-texto-suave">{t.meiAjuda}</p>
        </fieldset>

        {estado.mensagem ? (
          <Alerta variante={estado.sucesso ? "sucesso" : "erro"}>
            {estado.mensagem}
          </Alerta>
        ) : null}

        {podeEditar ? (
          <div>
            <Botao type="submit" carregando={pendente}>
              {t.salvar}
            </Botao>
          </div>
        ) : null}
      </form>

      <section aria-labelledby="previa-titulo" className="flex flex-col gap-3 rounded-painel border border-borda bg-superficie px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="previa-titulo" className="text-base font-bold text-texto">
              {t.comoFica}
            </h2>
            <p className="text-sm text-texto-suave">{t.exemplo}</p>
          </div>
          <NotaPontuacao {...previa} />
        </div>
        <ContaDaNota pontos={previa.pontos} motivos={previa.motivos} />
        <p className="text-xs text-texto-suave">
          {ptBR.pontuacao.geral} {ptBR.pontuacao.pontos(geral.pontos)}.
        </p>
      </section>
    </div>
  );
}
