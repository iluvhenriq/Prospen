"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import { registrarContato } from "@/modules/leads/acoes";
import type { EstadoAcao } from "@/modules/leads/estados";

const inicial: EstadoAcao = {};

// As opções vêm dos textos (mesma ordem da lista do banco): este componente
// roda no navegador e não pode importar valores de "@/modules/leads/tipos".
const CANAIS = Object.keys(ptBR.contatos.canais);
const RESULTADOS = Object.keys(ptBR.contatos.resultados);

// Escolhas em forma de botões (rádio por baixo): um toque em cada grupo e
// "Registrar". Funciona sem JavaScript e pelo teclado (setas no grupo).
function Opcoes({
  nome,
  legenda,
  opcoes,
  rotulos,
  padrao,
  erro,
}: {
  nome: string;
  legenda: string;
  opcoes: readonly string[];
  rotulos: Record<string, string>;
  padrao?: string;
  erro?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-texto">{legenda}</legend>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((opcao) => (
          <label key={opcao} className="cursor-pointer">
            <input type="radio" name={nome} value={opcao} defaultChecked={opcao === padrao} className="peer sr-only" />
            <span
              className={cn(
                "inline-flex h-8 items-center rounded-controle border border-borda-campo bg-superficie px-3 text-sm text-texto transition-colors",
                "hover:bg-musgo-50 peer-checked:border-acao peer-checked:bg-acao peer-checked:text-acao-texto",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-musgo-700",
              )}
            >
              {rotulos[opcao]}
            </span>
          </label>
        ))}
      </div>
      {erro ? <p className="text-sm text-erro">{erro}</p> : null}
    </fieldset>
  );
}

// Registro rápido de uma tentativa de contato, com a próxima ação opcional.
export function RegistroContato({ leadId, hoje }: { leadId: string; hoje: string }) {
  const [estado, executar, pendente] = useActionState(registrarContato, inicial);
  const t = ptBR.contatos;
  const v = estado.sucesso ? {} : (estado.valores ?? {});

  return (
    // Depois de um registro certo o React limpa o formulário, que volta ao padrão.
    <form action={executar} className="flex flex-col gap-4">
      <input type="hidden" name="leadId" value={leadId} />
      {estado.mensagem ? <Alerta variante={estado.sucesso ? "sucesso" : "erro"}>{estado.mensagem}</Alerta> : null}

      <Opcoes nome="canal" legenda={t.canal} opcoes={CANAIS} rotulos={t.canais} padrao={v.canal || "ligacao"} erro={estado.erros?.canal} />
      <Opcoes nome="resultado" legenda={t.resultado} opcoes={RESULTADOS} rotulos={t.resultados} padrao={v.resultado} erro={estado.erros?.resultado} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-texto">{t.proximaOpcional}</legend>
        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <Campo rotulo={t.proximaData} name="proximaAcaoEm" type="date" min={hoje} defaultValue={v.proximaAcaoEm} erro={estado.erros?.proximaAcaoEm} />
          <Campo
            rotulo={t.proximaTexto}
            name="proximaAcao"
            maxLength={200}
            placeholder={t.proximaTextoExemplo}
            defaultValue={v.proximaAcao}
            erro={estado.erros?.proximaAcao}
          />
        </div>
      </fieldset>

      <div>
        <Botao type="submit" carregando={pendente}>
          {t.registrar}
        </Botao>
      </div>
    </form>
  );
}
