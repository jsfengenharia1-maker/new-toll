import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';

/** Dois blocos no grupo Tipo separados por junta (sem vigas entre eles): 6 × 5 m em x 0–6 e 4 × 5 m em x 10–14. */
function doisBlocos() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  const ret = (x0: number, x1: number) => {
    ok('lote', { comandos: [[x0, 0], [x1, 0], [x1, 5], [x0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    ok('lote', { comandos: [[[x0, 0], [x1, 0]], [[x0, 5], [x1, 5]], [[x0, 0], [x0, 5]], [[x1, 0], [x1, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  };
  ret(0, 6); ret(10, 14);
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok };
}

describe('zonas independentes e vento (N1c)', () => {
  it('blocos sem vigas entre si: diafragmas separados e vento repartido pela largura de cada zona', () => {
    const { s } = doisBlocos();
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const tipo1 = s.modelo.pavimentos.find((p) => p.grupo === 'g_3')!.id;
    const zs = an.portico.zonas[tipo1].filter((z) => z.nos.length > 1);
    expect(zs).toHaveLength(2);
    // vento em Y (90°, centrado): força do pavimento repartida 6 : 4 entre os blocos
    const w90 = an.vento!.casos.find((c) => c.direcao === 90 && c.exc === 0)!;
    const f = w90.forcas.filter((x) => x.pavimento === tipo1);
    expect(f).toHaveLength(2);
    const [a, b] = f.map((x) => Math.abs(x.F)).sort((p, q) => q - p);
    expect(a / b).toBeCloseTo(6 / 4, 6);
    // equilíbrio horizontal na fundação
    const ic = an.vento!.casos.indexOf(w90);
    const soma = an.fundacao.filter((x) => x.caso === w90.nome).reduce((t, x) => t + x.Vy, 0);
    const total = w90.forcas.reduce((t, x) => t + x.F, 0);
    expect(soma).toBeCloseTo(-total, 3);
    expect(ic).toBeGreaterThanOrEqual(0);
    // um diafragma só por pavimento sem a opção
    const um = analisarEdificio({ ...s.modelo, opcoes: { zonasIndependentes: 0 } });
    expect(um.portico.zonas[tipo1].filter((z) => z.nos.length > 1)).toHaveLength(1);
  });

  it('coeficiente por sentido, fator de vizinhança e platibanda', () => {
    const { s, ok } = doisBlocos();
    const forca = (dir: number) => { const an = analisarEdificio(s.modelo); const c = an.vento!.casos.find((x) => x.direcao === dir && x.exc === 0)!; return c.forcas; };
    const tot = (fs: { F: number }[]) => fs.reduce((t, x) => t + Math.abs(x.F), 0);
    const f0 = forca(0), f180 = forca(180);
    expect(tot(f180)).toBeCloseTo(tot(f0), 6);
    ok('vento.definir', { sentido: { xn: 0.33 } });
    expect(tot(forca(180))).toBeCloseTo(0.33 * tot(f180), 6);
    expect(tot(forca(0))).toBeCloseTo(tot(f0), 6);
    ok('vento.definir', { sentido: { xn: 1 }, vizinhanca: 1.2 });
    expect(s.modelo.vento!.sentido).toBeUndefined();
    expect(tot(forca(0))).toBeCloseTo(1.2 * tot(f0), 6);
    ok('vento.definir', { vizinhanca: 1, platibanda: 1 });
    const ult = s.modelo.pavimentos.at(-1)!.id;
    const topo0 = f0.filter((x) => x.pavimento === ult), topo1 = forca(0).filter((x) => x.pavimento === ult);
    expect(topo1[0].altura).toBeCloseTo(topo0[0].altura + 1, 9);
  });

  it('limite do γz editável: aviso acima do limite (torre esbelta, γz ≈ 1,14)', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const ok = (n: string, p: Record<string, unknown>) => expect(s.executar(n, p).ok, n).toBe(true);
    ok('pavimento.repetir', { id: 'pav_6', vezes: 8 });
    ok('vento.definir', { v0: 50 });
    ok('lote', { comandos: [[0, 0], [3, 0], [3, 3], [0, 3]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.2 } } })) });
    ok('lote', { comandos: [[[0, 0], [3, 0]], [[0, 3], [3, 3]], [[0, 0], [0, 3]], [[3, 0], [3, 3]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
    ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    const acima = () => analisarEdificio(s.modelo).avisos.some((a) => a.startsWith('γz') && a.includes('acima do limite'));
    const gz = Math.max(...analisarEdificio(s.modelo).vento!.gamaZ.map((g) => g.max));
    expect(gz).toBeGreaterThan(1.1);
    expect(gz).toBeLessThan(1.3);
    expect(acima()).toBe(false); // padrão 1,3
    ok('opcoes.definir', { valores: { limiteGamaZ: 1.1 } });
    expect(acima()).toBe(true);
  });
});
