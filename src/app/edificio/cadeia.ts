// Lançamento em cadeia por polilinha (viga, parede, carga linear): cada clique depois do primeiro cria (ou estende) o
// elemento na hora, sem Enter. Lógica pura: a Planta guarda os estágios e o Desfazer do modelo os reconcilia.
export type P2 = [number, number];

/** Estado da cadeia depois de um clique: pontos clicados, passagem de cada trecho (null = reto), tamanho do log e id do elemento. */
export interface EstagioCadeia { pontos: P2[]; passagens: (P2 | null)[]; log: number; id?: string }
export type AcaoCadeia = 'iniciar' | 'estender' | 'encerrar';

/** O que um clique faz: o 1º inicia; um clique no último ponto (até `tol` m, como o 2º clique de um duplo clique) encerra; os demais estendem. */
export function acaoDoClique(pontos: P2[], p: P2, tol: number): AcaoCadeia {
  if (!pontos.length) return 'iniciar';
  const u = pontos[pontos.length - 1];
  return Math.hypot(p[0] - u[0], p[1] - u[1]) <= tol ? 'encerrar' : 'estender';
}

/** Passagens depois de acrescentar o trecho `n` (n = pontos antes do clique): mantém as anteriores e põe a do novo (null = reto). */
export function passagensDoTrecho(passagens: (P2 | null)[], n: number, curva: boolean, passagem: P2 | null): (P2 | null)[] {
  return [...passagens.slice(0, Math.max(0, n - 1)), curva ? passagem : null];
}

/** Inicia a cadeia no primeiro ponto (`log` = tamanho do log do modelo nesse instante). */
export const iniciarCadeia = (p: P2, log: number): EstagioCadeia[] => [{ pontos: [p], passagens: [], log }];

/** Acrescenta o estágio do trecho recém-criado. */
export function estenderCadeia(estagios: EstagioCadeia[], p: P2, passagens: (P2 | null)[], log: number, id: string): EstagioCadeia[] {
  const u = estagios[estagios.length - 1];
  return [...estagios, { pontos: [...u.pontos, p], passagens, log, id }];
}

/**
 * Reconcilia a cadeia com o log do modelo depois de um Desfazer: descarta os estágios cujo comando foi desfeito
 * (cada um é um comando); devolve null quando a cadeia acabou (desfeito além do 1º ponto, ou comando alheio).
 * Com só o 1º ponto (nenhum comando ainda) a cadeia segue de pé e apenas acompanha o log.
 */
export function reconciliarCadeia(estagios: EstagioCadeia[], log: number): EstagioCadeia[] | null {
  if (estagios.length === 1) return [{ ...estagios[0], log }];
  let e = estagios;
  while (e.length > 1 && e[e.length - 1].log > log) e = e.slice(0, -1);
  return e[e.length - 1].log === log ? e : null;
}
