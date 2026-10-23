import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';
import { diagramaVigotas, dadosDasVigotas, rotulosDeVigotas, textoVigota, vistaDisponivel, type DadosVigota } from './vigotasVista';
import { hipotesesDeEsforco, type Envoltoria } from './esforcosCaso';

/** Duas lajes treliçadas H12+4 (vãos 4 + 4 m em x, 5 m em y; vigotas em x), sem vento. */
function trelicadas() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = [0, 4, 8];
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  ok('lote', { comandos: [[[0, 0], [8, 0]], [[0, 5], [8, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } });
  const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);
  return { b: s.modelo, an, d };
}

describe('diagramas das vigotas por hipótese (C7.187, C12.14)', () => {
  const { b, an, d } = trelicadas();
  const hs = hipotesesDeEsforco(b, an);
  const r = d.vigotas![0];

  it('envoltória ELU: máximo igual ao esforço da análise do dimensionamento; torção nula', () => {
    const env = hs.find((h) => h.id === 'env:ELU') as Envoltoria;
    const dg = diagramaVigotas(b, an, r, env);
    expect(dg.length).toBe(r.faixas.length);
    const mx = Math.max(...dg.flatMap((f) => f.Mmax));
    expect(mx).toBeCloseTo(Math.max(...r.faixas.map((f) => f.calc.mPos)), 2);
    for (const f of dg) { expect(f.T.every((t) => t === 0)).toBe(true); expect(f.intereixo).toBe(r.intereixo); }
    // vão com carga uniforme: o máximo está longe das pontas e o cortante é máximo nelas
    const f0 = dg[0], imax = f0.Mmax.indexOf(Math.max(...f0.Mmax));
    expect(imax).toBeGreaterThan(0); expect(imax).toBeLessThan(f0.Mmax.length - 1);
    expect(f0.V[0]).toBeGreaterThan(f0.V[imax]);
  });

  it('superposição: a combinação 1,4G + 1,4Q é a soma dos casos G e Q', () => {
    const G = hs.find((h) => h.id === 'caso:G')!, Q = hs.find((h) => h.id === 'caso:Q')!;
    const elu = hs.find((h) => h.tipo === 'combinacao' && h.fatores.G === 1.4 && h.fatores.Q === 1.4)!;
    expect(elu).toBeTruthy();
    const dG = diagramaVigotas(b, an, r, G), dQ = diagramaVigotas(b, an, r, Q), dC = diagramaVigotas(b, an, r, elu);
    // (o extremo no nó é o maior entre as duas barras vizinhas: a soma vale até a descontinuidade do nó, ~0,3 N·m)
    dC.forEach((f, i) => f.Mmax.forEach((m, k) => expect(m).toBeCloseTo(1.4 * dG[i].Mmax[k] + 1.4 * dQ[i].Mmax[k], 2)));
    // vigota biapoiada (borda sem engaste na análise) tem momento positivo no meio do vão
    expect(Math.max(...dG[0].Mmax)).toBeGreaterThan(0);
  });
});

describe('vistas das vigotas na planta com a chave de esforços (C7.87 a C7.92)', () => {
  const tre: DadosVigota = { familia: 'trelicada', mPos: 4.256, v: [7.5, 8.25], trelica: 'TR 12645', adicional: { n: 2, phi: 10, comprimento: 3.2 } };
  const mol: DadosVigota = { familia: 'moldada', mPos: 6, v: [9, 9], inferior: { phi: 12.5, comprimento: 4.1 }, estribos: { phi: 5, s: 0.2 } };
  const pro: DadosVigota = { familia: 'protendida', mPos: 5, v: [6, 6] };
  const arm: DadosVigota = { familia: 'armada', mPos: 5, v: [6, 6] };

  it('chave ligada: momento positivo e cortantes por metro de largura', () => {
    expect(textoVigota(tre, 'momentos', true)).toEqual(['M = 4,26 kN·m/m']);
    expect(textoVigota(tre, 'cortantes', true)).toEqual(['V = 7,50 kN/m', 'V = 8,25 kN/m']);
    expect(textoVigota(mol, 'momentos', true)).toEqual(['M = 6,00 kN·m/m']);
  });

  it('chave desligada: tipo, armadura inferior, treliça ou estribos', () => {
    expect(textoVigota(pro, 'momentos', false)).toEqual(['Protendida']);
    expect(textoVigota(arm, 'momentos', false)).toEqual(['Armada']);
    expect(textoVigota(tre, 'momentos', false)).toEqual(['Armada +2φ10 c=3,20 m']);
    expect(textoVigota(mol, 'momentos', false)).toEqual(['φ12,5 c=4,10 m']);
    expect(textoVigota(tre, 'cortantes', false)).toEqual(['TR 12645']);
    expect(textoVigota(mol, 'cortantes', false)).toEqual(['φ5 c/20']);
    expect(textoVigota(pro, 'cortantes', false)).toEqual(['Protendida']);
  });

  it('vista da armadura inferior só existe com a chave desligada e para moldadas (C7.91)', () => {
    expect(vistaDisponivel('armaduraInferior', true)).toBe(false);
    expect(vistaDisponivel('armaduraInferior', false)).toBe(true);
    expect(vistaDisponivel('momentos', true)).toBe(true);
    expect(textoVigota(mol, 'armaduraInferior', true)).toEqual([]);
    expect(textoVigota(mol, 'armaduraInferior', false)).toEqual(['φ12,5 c=4,10 m']);
    expect(textoVigota(tre, 'armaduraInferior', false)).toEqual([]);
  });

  const { d } = trelicadas();
  const r = d.vigotas![0];

  it('rótulos da laje treliçada: um por alinhamento nos momentos e dois nos cortantes, nos dois estados da chave', () => {
    const dados = dadosDasVigotas(r);
    expect(dados).toHaveLength(r.grupos.length);
    expect(dados[0].mPos).toBeCloseTo(r.grupos[0].porMetro.mPos, 12);
    const on = rotulosDeVigotas(r, 'momentos', true), off = rotulosDeVigotas(r, 'momentos', false);
    expect(on).toHaveLength(r.faixas.length); expect(off).toHaveLength(r.faixas.length);
    expect(on[0].texto).toMatch(/^M = \d+,\d\d kN·m\/m$/);
    expect(off[0].texto.startsWith('Armada')).toBe(true);
    const f = r.faixas[0];
    expect(on[0].pos[0]).toBeCloseTo((f.a[0] + f.z[0]) / 2, 9); expect(on[0].pos[1]).toBeCloseTo((f.a[1] + f.z[1]) / 2, 9);
    const vOn = rotulosDeVigotas(r, 'cortantes', true), vOff = rotulosDeVigotas(r, 'cortantes', false);
    expect(vOn).toHaveLength(2 * r.faixas.length);
    expect(vOn[0].ponta).toBe(0); expect(vOn[1].ponta).toBe(1);
    expect(vOn[0].texto).toBe(`V = ${r.grupos[0].porMetro.v[0].toFixed(2).replace('.', ',')} kN/m`);
    expect(vOff).toHaveLength(r.faixas.length);
    expect(vOff[0].texto).toBe('TR 12645');
    expect(rotulosDeVigotas(r, 'armaduraInferior', false)).toEqual([]);
  });
});
