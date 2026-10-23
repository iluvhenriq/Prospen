"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { CampoSelecao } from "@/components/ui/campo-texto";
import { ptBR } from "@/lib/i18n/pt-BR";
import { criarEtiqueta } from "@/modules/leads/acoes";
import type { EstadoAcao } from "@/modules/leads/estados";

const inicial: EstadoAcao = {};

// Cores na ordem em que aparecem na lista. Os valores precisam bater com o banco.
const CORES = ["neutra", "roxo", "musgo", "aviso", "erro"] as const;

// Criação de etiqueta na página de gerenciamento.
export function FormularioEtiqueta() {
  const [estado, executar, pendente] = useActionState(criarEtiqueta, inicial);
  const t = ptBR.leads.etiquetasPagina;

  return (
    <div className="flex flex-col gap-3">
      {estado.mensagem ? (
        <Alerta variante={estado.sucesso ? "sucesso" : "erro"}>{estado.mensagem}</Alerta>
      ) : null}
      <form action={executar} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Campo
          rotulo={t.nome}
          name="nome"
          autoComplete="off"
          maxLength={80}
          defaultValue={estado.sucesso ? "" : (estado.valores?.nome ?? "")}
          erro={estado.erros?.nome}
          className="sm:flex-1"
          required
        />
        <CampoSelecao rotulo={t.cor} name="cor" defaultValue="neutra" className="sm:w-44">
          {CORES.map((cor) => (
            <option key={cor} value={cor}>
              {t.cores[cor]}
            </option>
          ))}
        </CampoSelecao>
        {/* Alinha o botão com os campos: o rótulo ocupa a primeira linha. */}
        <Botao type="submit" carregando={pendente} className="sm:mt-6">
          {t.criar}
        </Botao>
      </form>
    </div>
  );
}
