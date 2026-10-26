import { describe, expect, it } from 'vitest';
import { auditDrawing, readDwg, readDxf, type Drawing, type Entity } from 'nasjidwg';
import { edificioExemplo } from './exemplo';
import { CAMADAS, montarPranchas, type Prancha } from './prancha';
import { escreverPdf } from './pdf';
import { escreverDxf } from './dxf';
import { desenhoDwg, type EscritorDwg } from './dwg';
import { svgPrancha } from './svg';
import { lerDxf } from '../dxf/read';

const vendor = import.meta.glob('/public/vendor/nasjidwg-*.mjs');
async function escritorDwg(): Promise<EscritorDwg> {
  const m = (await Object.values(vendor)[0]()) as { writeDwg2018: EscritorDwg };
  return m.writeDwg2018;
}

const CARIMBO = { empresa: 'Escritório Exemplo', responsavel: 'Eng. Exemplo', registro: 'CREA 000000/D', data: '20/10/2026' };
function prancha(): Prancha {
  const prs = montarPranchas(edificioExemplo().modelo, { carimbo: CARIMBO });
  expect(prs).toHaveLength(1);
  return prs[0];
}

const TIPO: Record<string, string> = { pl: 'polyline', circ: 'circle', hach: 'hatch', txt: 'text' };
/** Contagem "camada:tipo" das primitivas e das entidades relidas. */
const contar = (xs: { c: string; t: string }[]) => xs.reduce<Record<string, number>>((m, x) => { const k = `${x.c}:${x.t}`; m[k] = (m[k] ?? 0) + 1; return m; }, {});
const dePrims = (pr: Prancha, papel: boolean) => contar((papel ? pr.papel : pr.modelo).map((q) => ({ c: q.c, t: TIPO[q.t] })));
const deEnts = (es: Entity[]) => contar(es.filter((e) => e.type !== 'viewport').map((e) => ({ c: e.layer, t: e.type === 'polyline' ? 'polyline' : e.type })));
const textos = (es: Entity[]) => es.flatMap((e) => (e.type === 'text' ? [e.text] : [])).sort();
const textosPr = (pr: Prancha, papel: boolean) => (papel ? pr.papel : pr.modelo).flatMap((q) => (q.t === 'txt' ? [q.s] : [])).sort();

function conferirRelido(d: Drawing, pr: Prancha) {
  expect(deEnts(d.entities)).toEqual(dePrims(pr, false));
  expect(deEnts(d.paperSpace ?? [])).toEqual(dePrims(pr, true));
  expect(textos(d.entities)).toEqual(textosPr(pr, false));
  expect(textos(d.paperSpace ?? [])).toEqual(textosPr(pr, true));
  // geometria: vértices das polilinhas do modelo na mesma ordem
  const pls = d.entities.filter((e) => e.type === 'polyline');
  const prPl = pr.modelo.filter((q) => q.t === 'pl');
  pls.forEach((e, i) => e.type === 'polyline' && e.vertices.forEach((v, k) => { expect(v.x).toBeCloseTo(prPl[i].pts[k][0], 6); expect(v.y).toBeCloseTo(prPl[i].pts[k][1], 6); }));
  // janela na escala da prancha
  const vps = (d.paperSpace ?? []).filter((e) => e.type === 'viewport');
  expect(vps).toHaveLength(2);
  const vp2 = vps.find((e) => e.type === 'viewport' && e.height < pr.H)!;
  if (vp2.type === 'viewport') expect(vp2.height / vp2.viewHeight!).toBeCloseTo(1000 / pr.escala, 6);
  // camadas com a pena
  for (const [c, def] of Object.entries(CAMADAS)) expect(d.layers.find((l) => l.name === c)?.lineweight).toBeCloseTo(def.pena, 2);
  expect((d.layouts ?? []).map((l) => l.name)).toContain(pr.titulo.replace(/[<>/\\":;?*|=`]/g, '-'));
}

describe('pranchas', () => {
  it('planta de formas do grupo Tipo: formato e escala automáticos, elementos, quadro e carimbo', () => {
    const pr = prancha();
    expect([pr.formato, pr.escala]).toEqual(['A2', 75]); // automática a partir de 1:75 (folhas de referência)
    expect(pr.avisos).toEqual([]);
    const txt = textosPr(pr, false);
    for (const t of ['V1 15×50', 'P1', '20×50', 'L1', 'h=12', '500', '1500', 'A', '1']) expect(txt).toContain(t);
    expect(pr.modelo.filter((q) => q.t === 'hach')).toHaveLength(12); // pilares que chegam ao pavimento
    const pap = textosPr(pr, true);
    for (const t of ['QUADRO DE PILARES', 'PLANTA DE FORMAS — TIPO', 'Escritório Exemplo', 'CREA 000000/D', '1:75', '01/01', 'Fundação', 'Cobertura']) expect(pap).toContain(t);
    // tudo do modelo cabe na janela
    const s = 1000 / pr.escala, j = pr.janela!;
    for (const q of pr.modelo) for (const [x, y] of q.t === 'pl' || q.t === 'hach' ? q.pts : q.t === 'circ' ? [q.centro] : [q.p]) {
      const px = (j.x0 + j.x1) / 2 + (x - j.centro[0]) * s, py = (j.y0 + j.y1) / 2 + (y - j.centro[1]) * s;
      expect(px).toBeGreaterThanOrEqual(j.x0); expect(px).toBeLessThanOrEqual(j.x1); expect(py).toBeGreaterThanOrEqual(j.y0); expect(py).toBeLessThanOrEqual(j.y1);
    }
    // formato fixo menor que o necessário: aviso
    const a4 = montarPranchas(edificioExemplo().modelo, { formato: 'A4', escala: 50 })[0];
    expect(a4.avisos.join(' ')).toMatch(/não cabe/);
    expect(svgPrancha(pr)).toMatch(/^<svg[^>]+viewBox="0 0 594 420"/);
  });

  it('carimbo: todo campo lançado pelo comando sai na legenda', () => {
    const s = edificioExemplo();
    const campos = { empresa: 'Empresa X', obra: 'Residencial Y', cliente: 'Cliente Z', local: 'Rua A, 10 — Cidade', responsavel: 'Eng. W', registro: 'CREA 1/D', art: 'ART 123', etapa: 'Projeto para execução', desenho: 'Desenhista K', revisao: 'R02', data: '01/11/2026' };
    expect(s.executar('prancha.definir', { carimbo: campos }).ok).toBe(true);
    const pap = textosPr(montarPranchas(s.modelo)[0], true);
    for (const v of Object.values(campos)) expect(pap).toContain(v);
    // vazio volta ao padrão: obra e local dos dados da obra
    expect(s.executar('prancha.definir', { carimbo: { obra: '', local: '' } }).ok).toBe(true);
    expect(textosPr(montarPranchas(s.modelo)[0], true)).toContain(s.modelo.obra.nome);
  });

  it('carimbo: a descrição da obra sai sob o nome, cortada em 90 caracteres', () => {
    const s = edificioExemplo();
    expect(s.executar('obra.definir', { descricao: ['Residencial fictício de 5 pavimentos', 'Fase de anteprojeto'] }).ok).toBe(true);
    expect(textosPr(montarPranchas(s.modelo)[0], true)).toContain('Residencial fictício de 5 pavimentos · Fase de anteprojeto');
    expect(s.executar('obra.definir', { descricao: ['x'.repeat(120)] }).ok).toBe(true);
    const pap = textosPr(montarPranchas(s.modelo)[0], true);
    expect(pap).toContain('x'.repeat(90));
    expect(pap).not.toContain('x'.repeat(91));
    expect(s.executar('obra.definir', { descricao: [] }).ok).toBe(true);
    expect(textosPr(montarPranchas(s.modelo)[0], true)).not.toContain('xxxxxxxxxx');
  });

  it('PDF: estrutura (xref), página no tamanho da folha, camadas OCG e texto em WinAnsi', () => {
    const pr = prancha();
    const b = escreverPdf([pr, pr]);
    const t = Array.from(b, (c) => String.fromCharCode(c)).join('');
    expect(t.startsWith('%PDF-1.5')).toBe(true);
    const xref = +t.slice(t.lastIndexOf('startxref') + 9).trim().split(/\s/)[0];
    expect(t.slice(xref, xref + 4)).toBe('xref');
    const linhas = t.slice(xref).split('\n'), tot = +linhas[1].split(' ')[1];
    for (let i = 1; i < tot; i++) { const off = +linhas[2 + i].slice(0, 10); expect(t.slice(off).startsWith(`${i} 0 obj`)).toBe(true); }
    expect(t).toContain('/MediaBox [0 0 1683.7795 1190.5512]');
    expect((t.match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
    expect((t.match(/\/Type \/OCG/g) ?? []).length).toBe(Object.keys(CAMADAS).length - 29); // CORTE e CORTE-MARCA (V6a), PILAR-NASCE, ESCADAS (E4b), FUNDACAO, MASCARA, PONTO-FIXO, as camadas de armação, as 6 de cargas (V5) e as 12 de resultados (V6f: ISO-0 a ISO-10 e ISOLINHAS) não aparecem
    expect(t).toContain('(V1 15\\32750) Tj'); // × em WinAnsi (0xD7)
    expect(t).toContain('(Escrit\\363rio Exemplo) Tj');
  });

  it('DXF R2000 relido pelo nasjidwg e pelo leitor próprio: mesmas entidades, camadas, textos e janela', () => {
    const pr = prancha();
    const bytes = escreverDxf(pr);
    const t = Array.from(bytes, (c) => String.fromCharCode(c)).join('');
    expect(t).toContain('AC1015');
    const d = readDxf(bytes);
    expect(d.warnings).toEqual([]);
    expect(auditDrawing(d).filter((f) => f.severity === 'error')).toEqual([]);
    conferirRelido(d, pr);
    const own = lerDxf(t);
    expect(own.insunits).toBe(6);
    expect(own.camadas.VIGA.linhas.length / 4).toBeGreaterThan(20);
    expect(own.camadas.TEXTO.textos.map((x) => x.t)).toContain('V1 15×50');
    expect(own.camadas['FOLHA-TEXTO'].textos.map((x) => x.t)).toContain('PLANTA DE FORMAS — TIPO');
  });

  it('DWG R2018 pelo escritor sob demanda, relido: as mesmas entidades do DXF', async () => {
    const pr = prancha();
    const w = await escritorDwg();
    const r = w(desenhoDwg(pr));
    expect(r.skipped).toEqual([]);
    const d = readDwg(r.data);
    expect(auditDrawing(d).filter((f) => f.severity === 'error')).toEqual([]);
    conferirRelido(d, pr);
    // DXF e DWG lidos são iguais entidade a entidade (tipo, camada, texto)
    const dx = readDxf(escreverDxf(pr));
    const resumo = (es: Entity[]) => es.map((e) => `${e.type}:${e.layer}:${e.type === 'text' ? e.text : ''}`);
    expect(resumo(d.entities)).toEqual(resumo(dx.entities));
  });
});
