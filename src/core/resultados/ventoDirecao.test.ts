// V7c: distorção (Δ/h) e vento por direção, vento na malha (movimento de corpo rígido do diafragma).
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { combinacoesEdificio } from '../building/combinacoes';
import { csvDeslocamentos, deslocamentosPilares, lancesDoPortico, maximosPilaresCombinados, tabelaDeslocamentosMalha } from './consultas';
import { csvDeslocamentosVento, deslocamentosVentoMalha, maximosVentoPorPano, ventoPorDirecao } from './ventoDirecao';

/** Quatro pilares (um deles muito mais rígido, para dar torção) com vigas e laje; vento ligado. */
function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ps: [number, number, number][] = [[0, 0, 0.7], [6, 0, 0.25], [6, 5, 0.25], [0, 5, 0.25]];
  s.executar('lote', { comandos: ps.map(([x, y, t]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: t, h: t } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

describe('V7c: distorção e vento por direção (K1.11.50)', () => {
  const b = predio(), an = analisarEdificio(b);

  it('há um caso de vento por direção e a distorção por pavimento é Δ ÷ h do maior lance', () => {
    const vd = ventoPorDirecao(b, an);
    expect(vd.length).toBe(an.vento!.casos.length);
    expect(vd.length).toBeGreaterThanOrEqual(4);
    const dp = deslocamentosPilares(b, an);
    let cmp = 0;
    for (const d of vd) {
      const ix = d.direcao === 0 || d.direcao === 180 ? 'dx' : 'dy';
      expect(d.pavimentos.length).toBeGreaterThan(1);
      for (const p of d.pavimentos) {
        // recálculo independente: maior |Δ| do lance na direção ÷ altura, entre os pilares do pavimento
        const lances = dp.filter((q) => q.pavimento === p.pavimento);
        const esperado = Math.max(...lances.map((q) => Math.abs(q.casos[d.caso][ix]) / q.altura));
        expect(p.distorcao).toBeCloseTo(esperado, 12);
        expect(p.distorcao).toBeGreaterThan(0);
        expect(p.drift).toBeCloseTo(p.distorcao * p.altura, 12);
        expect(p.driftFreq).toBeCloseTo(p.drift * d.psi1, 12);
        expect(p.limDrift).toBeCloseTo(p.altura / an.opcoes.limiteDeslocPavimento, 12);
      }
      // o deslocamento relativo dos lances de um pilar soma o deslocamento do topo (base engastada em u = 0)
      const pilar = dp.find((q) => q.pavimento === d.pavimentos[0].pavimento)!.pilar;
      const soma = dp.filter((q) => q.pilar === pilar).reduce((t, q) => t + q.casos[d.caso][ix], 0);
      const topo = dp.filter((q) => q.pilar === pilar).sort((x, y) => y.z - x.z)[0].casos[d.caso][ix === 'dx' ? 'ux' : 'uy'];
      expect(soma).toBeCloseTo(topo, 10);
      // o topo do pavimento mais alto, na combinação frequente, é o do resumo do núcleo (an.vento.deslocamentos)
      const ref = an.vento!.deslocamentos!.find((x) => x.caso === d.caso);
      if (ref) { cmp++; expect(d.topoFreq).toBeCloseTo(ref.topo, 10); expect(d.ok).toBe(ref.ok); }
    }
    expect(cmp).toBeGreaterThanOrEqual(4);
  });

  it('distorção máxima da combinação traz o pilar e a combinação que a produzem', () => {
    const mx = maximosPilaresCombinados(b, an, 'FREQ'), dp = deslocamentosPilares(b, an), combs = combinacoesEdificio(b, an);
    for (const m of mx) {
      for (const [eixo, comp, ux] of [['x', 'gx', 'ux'], ['y', 'gy', 'uy']] as const) {
        const r = m[eixo];
        expect(r.distorcao).toBeGreaterThan(0);
        const c = combs.find((q) => q.nome === r.combinacaoDistorcao)!;
        expect(c).toBeTruthy();
        const lance = dp.find((q) => q.pilar === r.pilarDistorcao && q.pavimento === m.pavimento)!;
        const soma = Object.entries(c.fatores).reduce((t, [n, f]) => t + f * (lance.casos[n]?.[comp] ?? 0), 0);
        expect(Math.abs(soma)).toBeCloseTo(r.distorcao, 10);
        void ux;
      }
    }
  });
});

describe('V7c: vento na malha (K1.15.3-1)', () => {
  const b = predio(), an = analisarEdificio(b), pm = an.portico;

  it('movimento de corpo rígido: cada pilar reproduz o deslocamento horizontal dos demais; torção (rz ≠ 0) presente', () => {
    const lances = lancesDoPortico(an), cv = an.vento!.casos;
    const pav = b.pavimentos[1], tops = lances.filter((l) => l.t.pavimento === pav.id);
    expect(tops.length).toBe(4);
    let algumRz = 0;
    cv.forEach((_, ic) => {
      const u = pm.resVento!.desloc[ic], A = tops[0], pA = pm.modelo.nos[A.topo], rz = u[A.topo * 6 + 5];
      algumRz = Math.max(algumRz, Math.abs(rz));
      for (const T of tops) {
        const p = pm.modelo.nos[T.topo];
        expect(u[T.topo * 6 + 5]).toBeCloseTo(rz, 12);
        expect(u[A.topo * 6] - rz * (p[1] - pA[1])).toBeCloseTo(u[T.topo * 6], 9);
        expect(u[A.topo * 6 + 1] + rz * (p[0] - pA[0])).toBeCloseTo(u[T.topo * 6 + 1], 9);
      }
    });
    expect(algumRz).toBeGreaterThan(1e-7);
  });

  it('linhas da malha: um registro por nó e caso de vento; nó no pilar = deslocamento do pilar; máximos por pano e CSV', () => {
    const linhas = deslocamentosVentoMalha(b, an), tab = tabelaDeslocamentosMalha(b, an);
    const nos = an.grelhas.filter((g) => g.res && !g.res.erro && lancesDoPortico(an).some((l) => l.t.pavimento === g.pavimento)).reduce((t, g) => t + g.modelo.nos.length, 0);
    expect(linhas.length).toBe(nos * an.vento!.casos.length);
    // nó da malha na posição do topo de um pilar: mesmo ux, uy
    const lances = lancesDoPortico(an);
    let achou = 0;
    for (const l of lances) {
      const p = pm.modelo.nos[l.topo];
      const q = linhas.find((x) => x.pavimento === l.t.pavimento && Math.hypot(x.x - p[0], x.y - p[1]) < 1e-6 && x.caso === an.vento!.casos[0].nome);
      if (!q) continue;
      achou++;
      expect(q.ux).toBeCloseTo(pm.resVento!.desloc[0][l.topo * 6], 9);
      expect(q.uy).toBeCloseTo(pm.resVento!.desloc[0][l.topo * 6 + 1], 9);
    }
    expect(achou).toBeGreaterThan(3);
    // a malha dos casos verticais continua intacta
    expect(tab.linhas.length).toBe(tab.linhas.filter((x) => an.casos.includes(x.caso)).length);
    const porPano = maximosVentoPorPano(b, linhas);
    expect(porPano.length).toBeGreaterThan(0);
    for (const p of porPano) for (const c of Object.values(p.casos)) expect(c.u).toBeCloseTo(Math.hypot(c.ux, c.uy), 12);
    const csv = csvDeslocamentosVento(linhas).split('\n');
    expect(csv[0]).toBe('Pavimento;Laje;No;X (m);Y (m);Caso;ux (mm);uy (mm)');
    expect(csv.length).toBe(linhas.length + 1);
    expect(csvDeslocamentos(tab.linhas).split('\n').length).toBe(tab.linhas.length + 1);
  });
});
