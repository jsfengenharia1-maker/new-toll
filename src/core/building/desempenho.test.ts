// Desempenho (R7-0, meta da N1e): edifício fictício de 13 pavimentos (3 × 2 vãos, lajes maciças, vento nas quatro
// direções) com análise + dimensionamento e detalhamento em até 3 s. Mede até cinco vezes e vale a melhor (a primeira
// inclui a compilação do JIT e a disputa com os outros arquivos de teste; o worker do app fica aquecido entre cálculos).
import { expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';

export const META_13_PAVIMENTOS_MS = 3000;

it('13 pavimentos: análise + dimensionamento em até 3 s', () => {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('pavimento.repetir', { id: 'pav_6', vezes: 8 });
  const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
  s.executar('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } });
  s.executar('lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  expect(s.modelo.pavimentos).toHaveLength(13);
  const tempos: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const an = analisarEdificio(s.modelo);
    const d = dimensionarEdificio(s.modelo, an);
    tempos.push(performance.now() - t0);
    expect(an.erro).toBeUndefined();
    expect(d.vigas.length).toBeGreaterThan(0);
    if (Math.min(...tempos) <= META_13_PAVIMENTOS_MS) break;
  }
  console.log(`desempenho: 13 pavimentos em ${tempos.map((t) => t.toFixed(0)).join(' / ')} ms`);
  expect(Math.min(...tempos)).toBeLessThanOrEqual(META_13_PAVIMENTOS_MS);
}, 90000);
