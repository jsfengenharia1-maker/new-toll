// N2b (auditoria N2, 22/10/2026): causa medida da diferença dos momentos das vigas entre o modelo integrado (`modeloGlobal` = 1) e o
// separado (0) no edifício de 10 pavimentos (3 × 2 vãos, pilares 20 × 50, vigas 15 × 50, lajes maciças de 12 cm — o mesmo da
// regressão da R7-0). Antes da correção do apoio na face do pilar (abaixo) a queda de V2 era Mpos −11,0 % e Mneg −7,6 %; depois dela
// é Mpos −10,6 % e Mneg −5,5 %.
//
// Medido em 22/10/2026 (V2 = viga interna do eixo y = 4,5 m; separado → integrado):
//   só cargas verticais (sem vento):  Mpos −2,3 %, Mneg 0 %, V −12,0 % (V1 −11,6 %, V5 +6,7 %); reações dos pilares se redistribuem
//                                     (P5 −1,0 %, borda +0,4 %, canto +0,8 %), soma igual à carga total;
//   com vento (ELU):                  Mpos −10,6 %, Mneg −5,5 %, V −2,7 %; a parcela de vento cai ~39 % no Mpos e ~11 % no Mneg;
//   rigidez axial dos pilares ×99,99: o efeito vertical continua (Mpos −1,3 %, V −6,9 %) — não é encurtamento diferencial;
//   torção das lajes desligada:       nada muda (Mpos −10,3 %, Mneg −5,5 %) — não é a torção;
//   rigidez da laje → 0 (treliçada com `vigotaRigidez` 1 → 0,1, mesmas cargas): Mpos, Mneg e reações caem de ≤ 3,1 % para ≤ 0,8 %.
// Conclusão: a causa é a flexão da laje (12 cm) ligada aos pilares e às vigas no mesmo modelo — parte da carga vertical vai direto
// aos pilares pela laje e parte do momento de vento passa à laje. Não é erro do acoplamento: a diferença cresce com a rigidez da laje
// e some quando ela vai a zero.
//
// Erro achado e corrigido neste trabalho (modelo separado): com malha de 0,25 m e pilar de 50 cm, o nó da malha exatamente na face do
// pilar (y = ±0,25 m do eixo) entrava como apoio do pilar só de um lado (regra par-ímpar de `dentroPoligono` em `pontoApoio`), e o
// edifício simétrico dava reações assimétricas (grelha P1 24,39 × P3 26,56 kN; V1 ≠ V3; V4 ≠ V7). Agora o contorno do pilar conta
// como dentro (tolerância de 1 µm), como já fazia o modelo integrado; o integrado não mudou.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { ANTES_N2E } from './antesN2e';
import { ANTES_N4C } from './antesN4c';
import { ANTES_DESAPRUMO } from './antesDesaprumo';

function predio(vezes: number, laje: Record<string, unknown>) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  if (vezes) ok('pavimento.repetir', { id: 'pav_6', vezes });
  const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
  ok('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } });
  ok('lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: laje });
  return { s, ok };
}

/** Calcula o edifício com o modelo `mg` (0 separado, 1 integrado), com ou sem vento, e opções extras. */
function calc(vezes: number, laje: Record<string, unknown>, mg: number, vento: boolean, extra: Record<string, number> = {}) {
  const { s, ok } = predio(vezes, laje);
  ok('opcoes.definir', { valores: { modeloGlobal: mg, cortanteBarrasLaje: mg ? 1 : 0, pilarLancesDesligados: 0, ...ANTES_N2E, ...ANTES_N4C, ...ANTES_DESAPRUMO, ...extra } });
  if (!vento) ok('vento.definir', { ativo: false });
  const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);
  const viga = (n: string) => d.vigas.find((x) => x.nome === n)!;
  const G = (n: number) => an.fundacao.filter((f) => f.caso === 'G')[n].N;
  const soma = an.fundacao.filter((f) => f.caso === 'G').reduce((t, f) => t + f.N, 0);
  return { an, d, viga, G, soma, totalG: an.totais.G };
}
const rel = (a: number, b: number) => a / b - 1;
const MACICA = { tipo: 'macica', h: 0.12 };

describe('N2b: integrado × separado no edifício de 10 pavimentos com lajes maciças (causa medida)', () => {
  // cada modelo roda uma vez por combinação de vento
  const sepV = calc(5, MACICA, 0, false), intV = calc(5, MACICA, 1, false);
  const sepW = calc(5, MACICA, 0, true), intW = calc(5, MACICA, 1, true);

  it('só cargas verticais (sem vento): V2 Mpos −2,3 % e V −12 %, Mneg igual; V1 −12 % e V5 +6,7 % (a carga vai direto aos pilares pela laje)', () => {
    const [a, b] = [sepV.viga('V2'), intV.viga('V2')];
    expect(Math.abs(rel(b.Mpos, a.Mpos) - -0.023)).toBeLessThan(0.01);
    expect(Math.abs(rel(b.Mneg, a.Mneg))).toBeLessThan(0.01);
    expect(Math.abs(rel(b.V, a.V) - -0.12)).toBeLessThan(0.02);
    expect(Math.abs(rel(intV.viga('V1').V, sepV.viga('V1').V) - -0.116)).toBeLessThan(0.02);
    expect(Math.abs(rel(intV.viga('V5').V, sepV.viga('V5').V) - 0.067)).toBeLessThan(0.02);
    // equilíbrio: a soma das reações é a carga total nos dois modelos (a carga só muda de caminho)
    expect(rel(sepV.soma, sepV.totalG)).toBeCloseTo(0, 9);
    expect(rel(intV.soma, intV.totalG)).toBeCloseTo(0, 9);
    // o pilar central (P5) perde carga e os de borda ganham
    expect(rel(intV.G(4), sepV.G(4))).toBeLessThan(-0.005);
    expect(rel(intV.G(3), sepV.G(3))).toBeGreaterThan(0.002);
  }, 180000);

  it('com vento (regressão da R7-0): V2 Mpos −10,6 %, Mneg −5,5 % e V −2,7 %; a parcela de vento cai ~39 % no Mpos e ~11 % no Mneg', () => {
    const [a, b] = [sepW.viga('V2'), intW.viga('V2')];
    expect(a.Mpos).toBeCloseTo(65.338, 2);
    expect(b.Mpos).toBeCloseTo(58.399, 2);
    expect(rel(b.Mpos, a.Mpos)).toBeCloseTo(-0.106, 2);
    expect(rel(b.Mneg, a.Mneg)).toBeCloseTo(-0.055, 2);
    expect(rel(b.V, a.V)).toBeCloseTo(-0.027, 2);
    // parcela do vento = (com vento) − (sem vento)
    const pv = (w: number, v: number) => w - v;
    expect(Math.abs(rel(pv(b.Mpos, intV.viga('V2').Mpos), pv(a.Mpos, sepV.viga('V2').Mpos)) - -0.386)).toBeLessThan(0.04);
    expect(Math.abs(rel(-pv(b.Mneg, intV.viga('V2').Mneg), -pv(a.Mneg, sepV.viga('V2').Mneg)) - -0.108)).toBeLessThan(0.03);
  }, 180000);

  it('não é encurtamento diferencial dos pilares: com rigidez axial ×99,99 o efeito vertical continua (Mpos −1,3 %, V −6,9 %)', () => {
    const rig = { axialPilares: 99.99 };
    const a = calc(5, MACICA, 0, false, rig).viga('V2'), b = calc(5, MACICA, 1, false, rig).viga('V2');
    expect(Math.abs(rel(b.Mpos, a.Mpos) - -0.013)).toBeLessThan(0.01);
    expect(Math.abs(rel(b.Mneg, a.Mneg))).toBeLessThan(0.01);
    expect(Math.abs(rel(b.V, a.V) - -0.069)).toBeLessThan(0.02);
  }, 180000);

  it('não é a torção das lajes: com torção desligada o efeito do vento é o mesmo (Mpos −10,3 %, Mneg −5,5 %)', () => {
    const t0 = { torcaoLaje: 0 };
    const a = calc(5, MACICA, 0, true, t0).viga('V2'), b = calc(5, MACICA, 1, true, t0).viga('V2');
    expect(Math.abs(rel(b.Mpos, a.Mpos) - -0.103)).toBeLessThan(0.012);
    expect(Math.abs(rel(b.Mneg, a.Mneg) - -0.055)).toBeLessThan(0.012);
  }, 180000);

  it('simetria: nos dois modelos P1 = P3, P4 = P6, P7 = P9, P10 = P12 e V1 = V3, V4 = V7, V5 = V6 (antes da correção do apoio na face o separado dava até 1,7 % nas reações)', () => {
    for (const m of [sepV, intV, sepW, intW]) {
      for (const [i, j] of [[0, 2], [3, 5], [6, 8], [9, 11]]) expect(Math.abs(rel(m.G(i), m.G(j)))).toBeLessThan(1e-6);
      for (const [a, b] of [['V1', 'V3'], ['V4', 'V7'], ['V5', 'V6']]) {
        const [p, q] = [m.viga(a), m.viga(b)];
        expect(Math.abs(p.Mpos - q.Mpos)).toBeLessThan(1e-4);
        expect(Math.abs(p.Mneg - q.Mneg)).toBeLessThan(1e-4);
        expect(Math.abs(p.V - q.V)).toBeLessThan(1e-4);
      }
    }
  });
});

describe('N2b: limite — rigidez da laje → 0 aproxima o integrado do separado (mesmas cargas)', () => {
  // laje treliçada H12 com `vigotaRigidez` (mínimo 0,1) reduzindo o EI das nervuras: a carga não muda, só a rigidez à flexão da laje
  const TREL = { tipo: 'trelicada', modelo: 'H12', capa: 0.04 };
  /** Maior diferença relativa integrado × separado: [momentos das vigas e reações G dos pilares, cortantes das vigas]. */
  const dif = (vento: boolean, rig: number): [number, number] => {
    const a = calc(5, TREL, 0, vento, { vigotaRigidez: rig }), b = calc(5, TREL, 1, vento, { vigotaRigidez: rig });
    let m = 0, cv = 0;
    for (const v of a.d.vigas) {
      const w = b.viga(v.nome);
      m = Math.max(m, Math.abs(w.Mpos - v.Mpos) / Math.max(1, v.Mpos), Math.abs(w.Mneg - v.Mneg) / Math.max(1, Math.abs(v.Mneg)));
      cv = Math.max(cv, Math.abs(w.V - v.V) / Math.max(1, v.V));
    }
    for (let i = 0; i < 12; i++) m = Math.max(m, Math.abs(rel(b.G(i), a.G(i))));
    expect(rel(b.soma, b.totalG)).toBeCloseTo(0, 9);
    return [m, cv];
  };
  it('momentos e reações: diferença máxima ≤ 5 % com a rigidez normal da treliçada e ≤ 2 % com 0,1·EI (cai ≥ 20 %; sem vento cai a 1/4); os cortantes caem também (com vento e sem)', () => {
    for (const vento of [false, true]) {
      const [m1, v1] = dif(vento, 1), [m01, v01] = dif(vento, 0.1);
      expect(m1).toBeGreaterThan(0.015);
      expect(m1).toBeLessThan(0.05);
      expect(m01).toBeLessThan(0.02);
      expect(m01).toBeLessThan(0.8 * m1);
      expect(v01).toBeLessThan(v1);
    }
  }, 240000);
});
