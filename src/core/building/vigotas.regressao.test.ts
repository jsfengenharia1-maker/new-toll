// E3b: as treliçadas da R6 mantêm os resultados. O baseline `vigotas.base.json` foi gerado pelo código anterior à E3b
// (igualação por pico, sem redistribuição, mínimos da obra): com as opções antigas, ou com os padrões novos (que coincidem
// pelo máximo), as vigotas, as mensagens das lajes e o resumo de aço têm de ser idênticos. O baseline foi gerado rodando as mesmas cenas (digest abaixo) no commit anterior à E3b.
import { describe, expect, it } from 'vitest';
import base from './vigotas.base.json';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';

/** Opções da E3b nos valores anteriores (não existem no código que gerou o baseline). */
const ANTIGAS = { vigotaIgualacaoPonto: 0, vigotaRedistribuir: 0, vigotaBranson: 0 };
function pav(vaos: number[], tipo: Record<string, unknown>, opcoes: Record<string, unknown> | null, carga?: number, fixar = false) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]);
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const L = xs.at(-1)!;
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, 5], [L, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo });
  if (carga) ok('carga.area', { grupo: 'g_3', contorno: [[0, 0], [L, 0], [L, 5], [0, 5]], valor: carga });
  if (opcoes) ok('opcoes.definir', opcoes);
  if (fixar) ok('opcoes.definir', { valores: ANTIGAS });
  return dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
}
const r6 = (x: unknown): unknown => typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : Array.isArray(x) ? x.map(r6) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, r6(v)])) : x;
// o diagrama igualado e a lista de vigotas são campos novos da E3b: fora do digest
const semNovos = (k: string, v: unknown) => (k === 'diagrama' || k === 'lista' ? undefined : v);
const digest = (d: ReturnType<typeof dimensionarEdificio>) => JSON.parse(JSON.stringify(r6({ vig: d.vigotas, msg: d.lajes.map((l) => l.mensagens), aco: d.resumoAcoVigotas, tr: d.trelicas, flecha: d.lajes.map((l) => l.flecha) }), semNovos));
const H12 = { tipo: 'trelicada', modelo: 'H12', capa: 0.04 };
const CENAS: Record<string, [fixar: boolean, f: (fixar: boolean) => ReturnType<typeof dimensionarEdificio>]> = {
  v2: [false, (x) => pav([4, 4], H12, null, undefined, x)],
  v3: [false, (x) => pav([3, 6, 4], { tipo: 'trelicada', modelo: 'H16', capa: 0.04 }, null, undefined, x)],
  // pela média, ponto a ponto e por pico diferem: a cena fixa a opção antiga
  media: [true, (x) => pav([4], H12, { valores: { vigotaIgualacao: 2, vigotaIgualacaoDif: 30 } }, undefined, x)],
  carga: [false, (x) => pav([5], H12, null, 15, x)],
  nbr: [false, (x) => pav([4, 4], H12, { perfil: 'nbr' }, undefined, x)],
  semMin: [false, (x) => pav([4, 4], H12, { valores: { vigotaMomentoMinPositivo: 0, vigotaMomentoMinNegativo: 0, vigotaRigidez: 0.6 } }, undefined, x)],
};

describe('regressão das treliçadas da R6 (baseline anterior à E3b)', () => {
  for (const [k, [fixar, f]] of Object.entries(CENAS)) {
    it(`cena ${k}: resultados idênticos${fixar ? ' (opções antigas fixadas)' : ' (padrões novos)'}`, () => { expect(digest(f(fixar))).toEqual((base as Record<string, unknown>)[k]); });
  }
  it('opções antigas fixadas em todas as cenas dão os mesmos resultados', () => {
    for (const [k, [, f]] of Object.entries(CENAS)) expect(digest(f(true)), k).toEqual((base as Record<string, unknown>)[k]);
  });
});
