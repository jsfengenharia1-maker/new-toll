import { it } from 'vitest';
import { analisarEdificio } from './analitico';
import { resolver3 } from '../fe3d';
import { comandosEdificioPadrao, Sessao } from '../commands';
it('prof', () => {
  const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('pavimento.repetir', { id: 'pav_6', vezes: 6 });
  const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
  s.executar('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } });
  s.executar('lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  const t0 = performance.now();
  const an = analisarEdificio(s.modelo);
  const t1 = performance.now();
  let tg = 0; for (const g of an.grelhas) if (g.res) { const a = performance.now(); resolver3(g.modelo, [{ nodais: [], distribuidas: [] }, { nodais: [], distribuidas: [] }]); tg += performance.now() - a; }
  const a = performance.now(); resolver3(an.portico.modelo, [{ nodais: [], distribuidas: [] }, { nodais: [], distribuidas: [] }]); const tp = performance.now() - a;
  console.log('total', (t1 - t0).toFixed(0), 'grelhas', tg.toFixed(0), 'portico', tp.toFixed(0), 'neq portico', an.portico.res?.neq, 'hb', an.portico.res?.hb, 'grelha neq', an.grelhas.find((g) => g.res)?.res?.neq, 'hb', an.grelhas.find((g) => g.res)?.res?.hb);
});
