import { describe, expect, it } from 'vitest';
import { buildDxf, dxfText, DXF_LAYERS } from './dxf';
import { samplePortico, sampleTrelica } from './samples';
import { analyze } from '../core/solver';
import { memberSeries, fmt } from './results';
import { makeUnits } from './units';

type Pair = [number, string];

function pairs(txt: string): Pair[] {
  const lines = txt.split('\r\n');
  if (lines[lines.length - 1] === '') lines.pop();
  expect(lines.length % 2).toBe(0);
  const out: Pair[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    expect(lines[i]).toMatch(/^\s*-?\d+$/);
    out.push([parseInt(lines[i], 10), lines[i + 1]]);
  }
  return out;
}

/** Entidades da seção ENTITIES, com seus pares. */
function entities(ps: Pair[]) {
  const start = ps.findIndex(([c, v], i) => c === 2 && v === 'ENTITIES' && ps[i - 1][1] === 'SECTION');
  const end = ps.findIndex(([c, v], i) => i > start && c === 0 && v === 'ENDSEC');
  const out: { type: string; layer: string; p: Pair[] }[] = [];
  for (let i = start + 1; i < end; i++) {
    if (ps[i][0] === 0) out.push({ type: ps[i][1], layer: '', p: [] });
    else { const e = out[out.length - 1]; e.p.push(ps[i]); if (ps[i][0] === 8) e.layer = ps[i][1]; }
  }
  return out;
}

const count = (es: ReturnType<typeof entities>, type: string, layer?: string) => es.filter((e) => e.type === type && (!layer || e.layer === layer)).length;

describe('exportação DXF R12', () => {
  const model = samplePortico();
  const a = analyze(model);
  const r = a.cases.get(1)!;
  const txt = buildDxf({ model, analysis: a, results: [r], resultLabel: 'Permanente', caseId: 1 });
  const ps = pairs(txt);
  const es = entities(ps);

  it('estrutura: seções na ordem, cabeçalho R12 e EOF', () => {
    const sections = ps.filter(([c], i) => c === 2 && ps[i - 1]?.[1] === 'SECTION').map(([, v]) => v);
    expect(sections).toEqual(['HEADER', 'TABLES', 'ENTITIES']);
    expect(ps.filter(([c, v]) => c === 0 && v === 'ENDSEC')).toHaveLength(3);
    expect(ps[ps.length - 1]).toEqual([0, 'EOF']);
    const iv = ps.findIndex(([c, v]) => c === 9 && v === '$ACADVER');
    expect(ps[iv + 1]).toEqual([1, 'AC1009']);
    // texto só em ASCII (R12 não tem UTF-8)
    expect(/^[\x20-\x7e\r\n]*$/.test(txt)).toBe(true);
  });

  it('tabelas: todas as camadas declaradas e usadas por alguma entidade', () => {
    const declared = ps.filter(([c], i) => c === 2 && ps[i - 1]?.[0] === 0 && ps[i - 1][1] === 'LAYER').map(([, v]) => v);
    for (const l of DXF_LAYERS) expect(declared).toContain(l.name);
    const used = new Set(es.map((e) => e.layer));
    for (const l of used) expect(declared).toContain(l);
    for (const l of ['GEOMETRIA', 'NOS', 'APOIOS', 'CARGAS', 'COTAS', 'TEXTOS', 'DIAG_N', 'DIAG_V', 'DIAG_M', 'DEFORMADA']) expect(used.has(l)).toBe(true);
    expect(ps.some(([c, v], i) => c === 2 && v === 'STANDARD' && ps[i - 1][1] === 'STYLE')).toBe(true);
  });

  it('entidades: barras em escala real, polilinhas fechadas por SEQEND, diagramas por barra', () => {
    expect(count(es, 'LINE', 'GEOMETRIA')).toBe(model.members.length);
    const first = es.find((e) => e.type === 'LINE' && e.layer === 'GEOMETRIA')!;
    const g = (c: number) => parseFloat(first.p.find(([k]) => k === c)![1]);
    const m0 = model.members[0], ni = model.nodes.find((n) => n.id === m0.ni)!, nj = model.nodes.find((n) => n.id === m0.nj)!;
    expect([g(10), g(20), g(11), g(21)]).toEqual([ni.x, ni.y, nj.x, nj.y]);
    expect(count(es, 'POLYLINE')).toBe(count(es, 'SEQEND'));
    expect(count(es, 'POLYLINE', 'DIAG_M')).toBe(model.members.length);
    expect(count(es, 'POLYLINE', 'DEFORMADA')).toBe(model.members.length);
    // um quadrado por nó
    expect(count(es, 'POLYLINE', 'NOS')).toBe(model.nodes.length);
    // 2 apoios engastados: base + 5 hachuras cada
    expect(count(es, 'LINE', 'APOIOS')).toBe(12);
    // cotas: vãos 8 e 2, total 10, níveis 5 e 1,2, altura 6,2
    const dimTexts = es.filter((e) => e.type === 'TEXT' && e.layer === 'COTAS').map((e) => e.p.find(([k]) => k === 1)![1]);
    for (const t of ['8,00', '2,00', '10,00', '5,00', '1,20', '6,20', '+6,20', '%%p0,00']) expect(dimTexts).toContain(t);
  });

  it('valores do momento máximo em texto na camada DIAG_M (unidade de exibição)', () => {
    let maxAbs = 0;
    for (const pm of a.prep.members) { const s = memberSeries([r], pm.index, pm.L, 'M'); s.max.forEach((v) => { if (Math.abs(v) > Math.abs(maxAbs)) maxAbs = v; }); }
    const texts = es.filter((e) => e.type === 'TEXT' && e.layer === 'DIAG_M').map((e) => e.p.find(([k]) => k === 1)![1]);
    expect(texts).toContain(fmt(maxAbs));
    const mt = { ...model, units: { force: 'tf' as const } };
    const t2 = entities(pairs(buildDxf({ model: mt, analysis: analyze(mt), results: [r] })));
    expect(t2.filter((e) => e.type === 'TEXT' && e.layer === 'DIAG_M').map((e) => e.p.find(([k]) => k === 1)![1])).toContain(fmt(makeUnits('tf').M.to(maxAbs)));
  });

  it('treliça: rótulas como círculos; sem análise, sem diagramas', () => {
    const t = sampleTrelica();
    const e2 = entities(pairs(buildDxf({ model: t })));
    expect(count(e2, 'CIRCLE', 'ROTULAS')).toBe(t.members.length * 2);
    expect(e2.some((e) => e.layer.startsWith('DIAG_') || e.layer === 'DEFORMADA')).toBe(false);
  });

  it('texto ASCII', () => {
    expect(dxfText('Pórtico · δ 2 m² ±')).toBe('Portico - d 2 m2 %%p');
  });
});
