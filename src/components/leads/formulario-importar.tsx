"use client";

import Link from "next/link";
import { useActionState, useRef, useState, startTransition, type ChangeEvent } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao, BotaoLink } from "@/components/ui/botao";
import { Cartao, CartaoConteudo, CartaoCabecalho, CartaoTitulo } from "@/components/ui/cartao";
import { Etiqueta } from "@/components/ui/etiqueta";
import { Entrada } from "@/components/ui/campo";
import { ptBR } from "@/lib/i18n/pt-BR";
import { importarPlanilha } from "@/modules/leads/acoes";
import type { EstadoImportacao, ResumoAnalise } from "@/modules/leads/estados";

const inicial: EstadoImportacao = {};
const LIMITE_BYTES = 2 * 1024 * 1024;

// Identifica o arquivo escolhido. Se a pessoa trocar de arquivo, o resultado
// da conferência anterior deixa de valer e some da tela.
function assinaturaDo(arquivo: File): string {
  return `${arquivo.name}|${arquivo.size}|${arquivo.lastModified}`;
}

export function FormularioImportar() {
  const [estado, executar, pendente] = useActionState(importarPlanilha, inicial);
  const formulario = useRef<HTMLFormElement>(null);
  const [arquivoAtual, setArquivoAtual] = useState<string | null>(null);
  const [conferido, setConferido] = useState<string | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [intencaoEmAndamento, setIntencaoEmAndamento] = useState<"conferir" | "importar">("conferir");
  const t = ptBR.leads.importacao;

  // O resultado do servidor só vale para o arquivo que foi enviado.
  const vigente = arquivoAtual !== null && arquivoAtual === conferido;
  const resultado = vigente ? estado.resultado : undefined;
  // Depois de importar, os números mostrados são os do que realmente foi gravado
  // (podem diferir da conferência se alguém cadastrou o mesmo contato nesse intervalo).
  const analise =
    vigente && estado.analise
      ? resultado
        ? {
            ...estado.analise,
            aImportar: resultado.aceitas,
            duplicadas: resultado.duplicadas,
            rejeitadas: resultado.rejeitadas,
          }
        : estado.analise
      : undefined;
  const erroDoServidor = vigente ? estado.erro : undefined;

  function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    setErroLocal(null);
    setArquivoAtual(arquivo ? assinaturaDo(arquivo) : null);
  }

  // Envia manualmente, em vez de usar action={...} no formulário: assim o React
  // não limpa o campo de arquivo depois da conferência, e a pessoa pode importar
  // o mesmo arquivo logo em seguida sem escolhê-lo de novo.
  function enviar(intencao: "conferir" | "importar") {
    const form = formulario.current;
    const arquivo = form?.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0];
    if (!form || !arquivo) {
      setErroLocal(t.escolhaArquivo);
      return;
    }
    if (arquivo.size > LIMITE_BYTES) {
      setErroLocal(t.arquivoGrande);
      return;
    }
    setErroLocal(null);
    setConferido(assinaturaDo(arquivo));
    setIntencaoEmAndamento(intencao);

    const dados = new FormData(form);
    dados.set("intencao", intencao);
    startTransition(() => executar(dados));
  }

  function recomecar() {
    formulario.current?.reset();
    setArquivoAtual(null);
    setConferido(null);
    setErroLocal(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>{t.arquivo}</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoConteudo>
          <form
            ref={formulario}
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(evento) => {
              evento.preventDefault();
              enviar("conferir");
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="arquivo-csv" className="text-sm font-medium text-texto">
                {t.arquivo}
              </label>
              <Entrada
                id="arquivo-csv"
                name="arquivo"
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={aoEscolherArquivo}
                className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-musgo-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-musgo-800"
                aria-describedby="ajuda-arquivo-csv"
              />
              <p id="ajuda-arquivo-csv" className="text-sm text-texto-suave">
                {t.ajudaArquivo}
              </p>
            </div>

            {erroLocal ? <Alerta variante="erro">{erroLocal}</Alerta> : null}
            {erroDoServidor ? <Alerta variante="erro">{erroDoServidor}</Alerta> : null}

            {!resultado ? (
              <div className="flex flex-wrap items-center gap-3">
                <Botao
                  type="submit"
                  variante={analise ? "contorno" : "primario"}
                  carregando={pendente && intencaoEmAndamento === "conferir"}
                  disabled={pendente}
                >
                  {pendente && intencaoEmAndamento === "conferir" ? t.analisando : t.analisar}
                </Botao>
                {analise && analise.aImportar > 0 ? (
                  <Botao
                    type="button"
                    carregando={pendente && intencaoEmAndamento === "importar"}
                    disabled={pendente}
                    onClick={() => enviar("importar")}
                  >
                    {pendente && intencaoEmAndamento === "importar"
                      ? t.importando
                      : t.importar(analise.aImportar)}
                  </Botao>
                ) : null}
              </div>
            ) : null}
          </form>
        </CartaoConteudo>
      </Cartao>

      {resultado ? (
        <Alerta variante="sucesso" titulo={t.concluidaTitulo}>
          <p>{t.concluida(resultado.aceitas)}</p>
          {resultado.duplicadas + resultado.rejeitadas > 0 ? (
            <p className="mt-1">
              {resultado.duplicadas.toLocaleString("pt-BR")} {t.tipoDuplicada.toLowerCase()}s e{" "}
              {resultado.rejeitadas.toLocaleString("pt-BR")} com problema ficaram de fora.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3">
            <BotaoLink href="/painel/leads" tamanho="pequeno">
              {t.verLeads}
            </BotaoLink>
            <Botao type="button" variante="contorno" tamanho="pequeno" onClick={recomecar}>
              {t.importarOutra}
            </Botao>
          </div>
        </Alerta>
      ) : null}

      {analise ? <ResultadoDaConferencia analise={analise} depoisDeImportar={Boolean(resultado)} /> : null}
    </div>
  );
}

function Numero({
  valor,
  rotulo,
  destaque = false,
}: {
  valor: number;
  rotulo: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-lg border border-borda bg-fundo px-4 py-3">
      <p className={destaque ? "text-2xl font-semibold text-roxo-700" : "text-2xl font-semibold text-texto"}>
        {valor.toLocaleString("pt-BR")}
      </p>
      <p className="text-sm text-texto-suave">{rotulo}</p>
    </div>
  );
}

function ResultadoDaConferencia({
  analise,
  depoisDeImportar,
}: {
  analise: ResumoAnalise;
  depoisDeImportar: boolean;
}) {
  const t = ptBR.leads.importacao;
  const colunas = [
    { rotulo: t.colunaNome, titulo: analise.colunas.nome },
    { rotulo: t.colunaEmpresa, titulo: analise.colunas.empresa },
    { rotulo: t.colunaEmail, titulo: analise.colunas.email },
    { rotulo: t.colunaTelefone, titulo: analise.colunas.telefone },
  ];

  return (
    <Cartao>
      <CartaoCabecalho>
        <CartaoTitulo>{t.resultadoTitulo}</CartaoTitulo>
        <p className="text-sm text-texto-suave">
          {analise.nomeArquivo}, {t.total(analise.totalLinhas)}
        </p>
      </CartaoCabecalho>
      <CartaoConteudo className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Numero
            valor={analise.aImportar}
            rotulo={depoisDeImportar ? t.importados : t.aImportar}
            destaque
          />
          <Numero valor={analise.duplicadas} rotulo={t.duplicadas} />
          <Numero valor={analise.rejeitadas} rotulo={t.rejeitadas} />
        </div>

        {analise.aImportar === 0 && !depoisDeImportar ? (
          <Alerta variante="aviso">{t.nadaParaImportar}</Alerta>
        ) : null}
        {analise.avisos.map((aviso) => (
          <Alerta key={aviso} variante="aviso">
            {aviso}
          </Alerta>
        ))}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-texto">{t.colunasTitulo}</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {colunas.map((coluna) => (
              <li key={coluna.rotulo} className="flex flex-wrap items-center gap-2">
                <span className="w-20 text-texto-suave">{coluna.rotulo}</span>
                {coluna.titulo ? (
                  <Etiqueta variante="musgo">{coluna.titulo}</Etiqueta>
                ) : (
                  <span className="text-texto-suave">{t.naoEncontrada}</span>
                )}
              </li>
            ))}
          </ul>
          {analise.colunas.nomeVemDaEmpresa ? (
            <p className="mt-2 text-sm text-texto-suave">{t.nomeDaEmpresa}</p>
          ) : null}
          {analise.colunas.ignoradas.length > 0 ? (
            <p className="mt-2 text-sm text-texto-suave">
              {t.ignoradas(analise.colunas.ignoradas.join(", "))}
            </p>
          ) : null}
        </div>

        {analise.ocorrencias.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-texto">{t.ocorrenciasTitulo}</h3>
            <div className="max-h-80 overflow-auto rounded-lg border border-borda">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="sticky top-0 bg-musgo-50 text-texto-suave">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">{t.linha}</th>
                    <th scope="col" className="px-3 py-2 font-medium">{t.tipo}</th>
                    <th scope="col" className="px-3 py-2 font-medium">{t.motivo}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {analise.ocorrencias.map((ocorrencia) => (
                    <tr key={`${ocorrencia.linha}-${ocorrencia.tipo}`}>
                      <td className="px-3 py-2 tabular-nums">{ocorrencia.linha}</td>
                      <td className="px-3 py-2">
                        <Etiqueta variante={ocorrencia.tipo === "rejeitada" ? "erro" : "aviso"}>
                          {ocorrencia.tipo === "rejeitada" ? t.tipoRejeitada : t.tipoDuplicada}
                        </Etiqueta>
                      </td>
                      <td className="px-3 py-2 text-texto-suave">{ocorrencia.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {analise.ocorrenciasOmitidas > 0 ? (
              <p className="mt-2 text-sm text-texto-suave">{t.omitidas(analise.ocorrenciasOmitidas)}</p>
            ) : null}
          </div>
        ) : null}

        {depoisDeImportar ? (
          <p className="text-sm text-texto-suave">
            <Link href="/painel/leads" className="font-medium text-roxo-700 underline-offset-4 hover:underline">
              {t.verLeads}
            </Link>
          </p>
        ) : null}
      </CartaoConteudo>
    </Cartao>
  );
}
