import { BotaoLink } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-texto">
        {ptBR.naoEncontrado.titulo}
      </h1>
      <p className="max-w-md text-texto-suave">{ptBR.naoEncontrado.descricao}</p>
      <BotaoLink href="/">{ptBR.naoEncontrado.voltar}</BotaoLink>
    </main>
  );
}
