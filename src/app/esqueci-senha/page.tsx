import type { Metadata } from "next";
import Link from "next/link";
import { CartaoAcesso, classeLinkTexto } from "@/components/conta/cartao-acesso";
import { FormularioEsqueci } from "@/components/conta/formulario-esqueci";
import { ptBR } from "@/lib/i18n/pt-BR";

export const metadata: Metadata = { title: ptBR.acesso.esqueci.titulo };

export default function PaginaEsqueciSenha() {
  return (
    <CartaoAcesso
      titulo={ptBR.acesso.esqueci.titulo}
      descricao={ptBR.acesso.esqueci.descricao}
      rodape={
        <Link href="/entrar" className={classeLinkTexto}>
          {ptBR.acesso.esqueci.voltar}
        </Link>
      }
    >
      <FormularioEsqueci />
    </CartaoAcesso>
  );
}
