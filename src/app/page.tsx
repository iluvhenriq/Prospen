import { BotaoLink } from "@/components/ui/botao";
import { Etiqueta } from "@/components/ui/etiqueta";
import { ptBR } from "@/lib/i18n/pt-BR";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-musgo-800">
        {ptBR.app.nome}
      </h1>
      <p className="max-w-md text-base text-texto-suave">{ptBR.app.descricao}</p>
      <Etiqueta variante="roxo">{ptBR.inicio.status}</Etiqueta>
      <p className="max-w-md text-sm text-texto-suave">{ptBR.inicio.detalhe}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <BotaoLink href="/cadastrar" tamanho="grande">
          {ptBR.navegacao.criarConta}
        </BotaoLink>
        <BotaoLink href="/entrar" variante="contorno" tamanho="grande">
          {ptBR.navegacao.entrar}
        </BotaoLink>
      </div>
    </main>
  );
}
