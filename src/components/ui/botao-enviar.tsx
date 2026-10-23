"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Botao } from "./botao";

// Botão de envio para formulários que chamam uma ação do servidor sem estado
// de retorno. Mostra o carregamento enquanto o formulário em volta é enviado.
export function BotaoEnviar(props: Omit<ComponentProps<typeof Botao>, "type" | "carregando">) {
  const { pending } = useFormStatus();
  return <Botao type="submit" carregando={pending} {...props} />;
}
