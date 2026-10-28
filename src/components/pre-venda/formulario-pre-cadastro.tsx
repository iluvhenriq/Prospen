"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { CampoSelecao } from "@/components/ui/campo-texto";
import { ptBR } from "@/lib/i18n/pt-BR";
import { enviarPreCadastro, type EstadoPreCadastro } from "@/modules/pre-cadastro/acoes";

const inicial: EstadoPreCadastro = {};

// Pré-cadastro da página de apresentação. Funciona sem JavaScript.
export function FormularioPreCadastro({ emailContato }: { emailContato: string }) {
  const [estado, acao, pendente] = useActionState(enviarPreCadastro, inicial);
  const t = ptBR.preVenda.formulario;

  if (estado.sucesso) {
    return <Alerta variante="sucesso">{t.pronto}</Alerta>;
  }

  return (
    // noValidate: as mensagens vêm do servidor, sempre em português.
    <form action={acao} noValidate className="flex flex-col gap-4">
      {estado.mensagem ? <Alerta variante="erro">{estado.mensagem}</Alerta> : null}
      <Campo
        rotulo={t.nome}
        name="nome"
        autoComplete="name"
        maxLength={80}
        defaultValue={estado.valores?.nome}
        erro={estado.erros?.nome}
        required
      />
      <Campo
        rotulo={t.email}
        name="email"
        type="email"
        autoComplete="email"
        maxLength={254}
        defaultValue={estado.valores?.email}
        erro={estado.erros?.email}
        required
      />
      <Campo
        rotulo={t.empresa}
        name="empresa"
        autoComplete="organization"
        maxLength={120}
        defaultValue={estado.valores?.empresa}
        erro={estado.erros?.empresa}
      />
      <CampoSelecao rotulo={t.segmento} name="segmento" defaultValue="">
        <option value="">{t.segmentoNenhum}</option>
        {Object.entries(t.segmentos).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </CampoSelecao>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-texto">{t.interessesTitulo}</legend>
        <p className="text-xs text-texto-suave">{t.interessesAviso}</p>
        {Object.entries(t.interesses).map(([valor, rotulo]) => (
          <label key={valor} className="flex items-start gap-2.5 text-sm text-texto">
            <input type="checkbox" name="interesses" value={valor} className="mt-0.5 size-4 shrink-0 accent-musgo-700" />
            {rotulo}
          </label>
        ))}
      </fieldset>
      <Botao type="submit" carregando={pendente} tamanho="grande" className="w-full">
        {t.botao}
      </Botao>
      <p className="text-xs text-texto-suave">
        {t.avisoInicio}{" "}
        <a href={`mailto:${emailContato}`} className="font-medium text-musgo-700 underline hover:text-musgo-900">
          {emailContato}
        </a>
        . {t.avisoFim}{" "}
        <Link href="/privacidade" className="font-medium text-musgo-700 underline hover:text-musgo-900">
          {ptBR.privacidade.link.toLowerCase()}
        </Link>
        .
      </p>
    </form>
  );
}
