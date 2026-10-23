// Limite simples de tentativas por chave (por exemplo, "entrada:e-mail").
//
// Vive na memória do processo. Serve para um servidor só, que é o caso do
// desenvolvimento e do início da publicação. Com vários servidores ao mesmo
// tempo cada um conta separado, e a contagem precisaria ir para o banco
// (veja "Pontos de atenção" em docs/arquitetura.md).

export type Regra = { maximo: number; janelaMs: number };
export type Situacao = { bloqueado: boolean; segundosParaLiberar: number };

type Registro = { tempos: number[]; expiraEm: number };

// Teto de chaves guardadas, para a memória não crescer sem limite
// mesmo se alguém testar milhares de e-mails diferentes.
const MAXIMO_DE_CHAVES = 10_000;

const global = globalThis as unknown as { __prospenLimites?: Map<string, Registro> };

function registros(): Map<string, Registro> {
  return (global.__prospenLimites ??= new Map());
}

function limpar(agora: number): void {
  const mapa = registros();
  if (mapa.size <= MAXIMO_DE_CHAVES) return;
  for (const [chave, registro] of mapa) {
    if (registro.expiraEm <= agora) mapa.delete(chave);
  }
  // Ainda cheio: descarta as mais antigas (o Map mantém a ordem de inserção).
  for (const chave of mapa.keys()) {
    if (mapa.size <= MAXIMO_DE_CHAVES) break;
    mapa.delete(chave);
  }
}

// Diz se a chave já passou do limite dentro da janela de tempo.
export function verificarLimite(
  chave: string,
  { maximo, janelaMs }: Regra,
  agora: number = Date.now(),
): Situacao {
  const registro = registros().get(chave);
  const recentes = (registro?.tempos ?? []).filter((t) => agora - t < janelaMs);

  if (recentes.length === 0) {
    registros().delete(chave);
    return { bloqueado: false, segundosParaLiberar: 0 };
  }
  if (registro) registro.tempos = recentes;

  if (recentes.length >= maximo) {
    const liberaEm = recentes[0] + janelaMs;
    return {
      bloqueado: true,
      segundosParaLiberar: Math.max(1, Math.ceil((liberaEm - agora) / 1000)),
    };
  }
  return { bloqueado: false, segundosParaLiberar: 0 };
}

// Anota uma tentativa. A janela informada define por quanto tempo ela conta.
export function registrarTentativa(
  chave: string,
  janelaMs: number,
  agora: number = Date.now(),
): void {
  const mapa = registros();
  const registro = mapa.get(chave);
  const tempos = (registro?.tempos ?? []).filter((t) => agora - t < janelaMs);
  tempos.push(agora);
  mapa.set(chave, { tempos, expiraEm: agora + janelaMs });
  limpar(agora);
}

// Esquece as tentativas de uma chave (por exemplo, depois de um login certo).
export function zerarTentativas(chave: string): void {
  registros().delete(chave);
}

// Só para os testes.
export function limparTodosOsLimites(): void {
  registros().clear();
}
