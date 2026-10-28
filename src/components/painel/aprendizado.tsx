import { ptBR } from "@/lib/i18n/pt-BR";
import type { Aprendizado, Fechamento } from "@/modules/painel/aprendizado";

const t = ptBR.painel.aprendizado;

function minuscula(texto: string) {
  return texto.toLocaleLowerCase("pt-BR");
}

// As frases: só as que os dados sustentam (a decisão fica em
// src/modules/painel/aprendizado.ts), cada uma com a amostra.
function frases(aprendizado: Aprendizado): string[] {
  const saida: string[] = [];

  if (aprendizado.nota) {
    const { alta, baixa, avaliacao } = aprendizado.nota;
    const julgamento = avaliacao === "separa" ? t.notaSepara : avaliacao === "nao_separa" ? t.notaNaoSepara : "";
    saida.push(`${t.nota(alta, baixa)} ${julgamento}`.trim());
  }

  if (aprendizado.melhorOrigem?.taxa != null) {
    saida.push(t.origem(minuscula(ptBR.leads.origens[aprendizado.melhorOrigem.chave]), aprendizado.melhorOrigem.taxa));
  }

  for (const item of aprendizado.motivoPorPorte) {
    const porte = t.portes[item.porte];
    if (!porte) continue;
    saida.push(t.motivoPorPorte(porte, minuscula(ptBR.funil.resultado.motivos[item.motivo]), item.vezes, item.perdas));
  }

  if (aprendizado.insistencia && aprendizado.insistencia.poucasTentativas > 0) {
    saida.push(t.insistencia(aprendizado.insistencia.poucasTentativas, aprendizado.insistencia.semResposta));
  }

  if (aprendizado.tentativasNosGanhos !== null) {
    saida.push(t.tentativasNosGanhos(aprendizado.tentativasNosGanhos.toLocaleString("pt-BR")));
  }

  return saida;
}

function Tabela<C extends string>({ titulo, grupos, rotulo }: { titulo: string; grupos: Fechamento<C>[]; rotulo: (chave: C) => string }) {
  return (
    <table className="w-full text-sm">
      <caption className="pb-2 text-left text-sm font-bold text-texto">{titulo}</caption>
      <thead>
        <tr className="border-b-2 border-texto text-left text-xs text-texto-suave">
          <th scope="col" className="py-1.5 pr-3 font-semibold">{t.colunas.grupo}</th>
          <th scope="col" className="py-1.5 pr-3 text-right font-semibold">{t.colunas.ganhos}</th>
          <th scope="col" className="py-1.5 pr-3 text-right font-semibold">{t.colunas.perdidos}</th>
          <th scope="col" className="py-1.5 text-right font-semibold">{t.colunas.taxa}</th>
        </tr>
      </thead>
      <tbody className="numeros">
        {grupos.map((grupo) => (
          <tr key={grupo.chave} className="border-b border-borda">
            <th scope="row" className="py-2 pr-3 text-left font-normal text-texto">{rotulo(grupo.chave)}</th>
            <td className="py-2 pr-3 text-right text-texto">{grupo.ganhos}</td>
            <td className="py-2 pr-3 text-right text-texto">{grupo.perdidos}</td>
            <td className="py-2 text-right font-semibold text-texto">
              {grupo.taxa === null ? <span className="text-xs font-normal text-texto-suave">{t.poucosCasos}</span> : `${grupo.taxa}%`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// "O que os seus resultados ensinam", no painel. Com pouco dado, diz quanto falta.
export function AprendizadoDoPainel({ aprendizado }: { aprendizado: Aprendizado }) {
  const lista = frases(aprendizado);

  return (
    <section className="flex flex-col gap-4 rounded-painel border border-borda bg-superficie px-5 py-5">
      <div>
        <h2 className="text-base font-bold text-texto">{t.titulo}</h2>
        <p className="text-sm text-texto-suave">{t.descricao}</p>
      </div>

      {aprendizado.faltam > 0 ? (
        <p className="text-sm text-texto">{t.poucoDado(aprendizado.encerrados, aprendizado.faltam)}</p>
      ) : (
        <>
          {lista.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {lista.map((frase) => (
                <li key={frase} className="flex gap-3 text-texto">
                  <span aria-hidden="true" className="mt-[0.55em] h-1.5 w-3 shrink-0 rounded-[1px] bg-marca-texto" />
                  {frase}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-texto-suave">{t.semConclusao}</p>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <Tabela titulo={t.porPrioridade} grupos={aprendizado.porFaixa} rotulo={(faixa) => ptBR.pontuacao.faixas[faixa]} />
            <Tabela titulo={t.porOrigem} grupos={aprendizado.porOrigem} rotulo={(origem) => ptBR.leads.origens[origem]} />
          </div>
        </>
      )}
    </section>
  );
}
