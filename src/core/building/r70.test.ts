// R7-0: pendências das fatias executadas (núcleo): categorias de uso como casos próprios, máscara desalinhada entre
// grupos, girar e espelhar a seleção, momento na face do pilar, origem dos resultados, logo no carimbo e regressão
// do edifício de 10 pavimentos.
import { describe, expect, it } from 'vitest';
import { readDxf, auditDrawing } from 'nasjidwg';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { combinacoesEdificio } from './combinacoes';
import { dimensionarEdificio } from './dimensionamento';
import { casosDaObra, PSI_CLASSE } from './types';
import { verificar } from './verify';
import { montarPranchas } from '../sheets/prancha';
import { escreverPdf } from '../sheets/pdf';
import { escreverDxf } from '../sheets/dxf';
import { desenhoDwg } from '../sheets/dwg';
import { svgPrancha } from '../sheets/svg';
import { edificioExemplo } from '../sheets/exemplo';
import { base64Bytes, bytesBase64, infoJpeg, LIMITE_LOGO } from '../sheets/logo';
import { montarConjunto } from '../sheets/conjunto';
import { lerQuadroVigas } from './quadros';

function sessao() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  return { s, ok };
}

/** Pórtico 3 × 2 vãos em pilares 20 × 50 com lajes maciças no Tipo; `vezes` repete o último Tipo. */
function predio(vezes = 0) {
  const { s, ok } = sessao();
  if (vezes) ok('pavimento.repetir', { id: 'pav_6', vezes });
  const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
  ok('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } });
  ok('lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok };
}

// JPEG 8 × 4 px (vermelho), gerado para o teste
const JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAEAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDHooorhPqD/9k=';

describe('categorias de uso como casos próprios (NBR 6118, Tabela 11.2)', () => {
  it('grupo de garagem vira caso QC com ψ da classe C; residencial e áreas comuns ficam em Q', () => {
    const { s, ok } = predio();
    // cobertura com lajes (classe A, caso Q) e o Tipo como garagem (classe C, caso QC)
    const cob = s.modelo.pavimentos.at(-1)!.grupo;
    ok('lote', { comandos: [[[0, 0], [15, 0]], [[0, 9], [15, 9]], [[0, 0], [0, 9]], [[15, 0], [15, 9]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: cob, pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
    ok('laje.detectarPanos', { grupo: cob, tipo: { tipo: 'macica', h: 0.12 } });
    ok('grupo.editar', { id: 'g_3', uso: 'garagem' });
    const casos = casosDaObra(s.modelo);
    expect(casos.map((c) => c.id)).toEqual(['G', 'Q', 'QC']);
    expect(casos[2].psi).toEqual(PSI_CLASSE.C);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    expect(an.casos).toEqual(['G', 'Q', 'QC']);
    // a carga de uso do Tipo (garagem) foi para QC; a da cobertura continua em Q
    const tipo = s.modelo.pavimentos[1].id, topo = s.modelo.pavimentos.at(-1)!.id;
    expect(an.cargasPavimento[tipo].QC).toBeCloseTo(3 * 15 * 9, 6);
    expect(an.cargasPavimento[tipo].Q).toBeCloseTo(0, 9);
    expect(an.cargasPavimento[topo].QC).toBeCloseTo(0, 9);
    expect(an.cargasPavimento[topo].Q).toBeCloseTo(1 * 15 * 9, 6);
    // combinações: QC como principal (Q acompanhante com ψ0 = 0,5) e Q principal (QC acompanhante com ψ0 = 0,8); cada uma também sozinha
    const combs = combinacoesEdificio(s.modelo, an), elu = combs.filter((c) => c.tipo === 'ELU');
    expect(elu.some((c) => c.fatores.QC === 1.4 && c.fatores.Q === +(1.4 * 0.5).toFixed(4))).toBe(true);
    expect(elu.some((c) => c.fatores.Q === 1.4 && c.fatores.QC === +(1.4 * 0.8).toFixed(4))).toBe(true);
    expect(elu.some((c) => c.nome === 'ELU G desf. · QC sozinha')).toBe(true);
    const qp = combs.find((c) => c.tipo === 'QP')!;
    expect(qp.fatores.QC).toBeCloseTo(0.6, 9);
    expect(qp.fatores.Q).toBeCloseTo(0.3, 9);
    // ψ editável por classe
    ok('norma.definir', { psiUso: { C: [0.8, 0.7, 0.5] } });
    expect(casosDaObra(s.modelo)[2].psi).toEqual([0.8, 0.7, 0.5]);
    // opção desligada: um caso Q só, com a mesma carga total
    const totalQ = an.totais.Q + an.totais.QC;
    ok('opcoes.definir', { valores: { categoriasUso: 0 } });
    expect(casosDaObra(s.modelo).map((c) => c.id)).toEqual(['G', 'Q']);
    const an2 = analisarEdificio(s.modelo);
    expect(an2.totais.Q).toBeCloseTo(totalQ, 6);
  });

  it('obra só com usos da classe A não muda (um caso Q)', () => {
    const { s } = predio();
    expect(casosDaObra(s.modelo).map((c) => c.id)).toEqual(['G', 'Q']);
  });
});

describe('máscara desalinhada entre grupos', () => {
  const GEO = { PAREDE: { linhas: [0, 0, 1500, 0, 1500, 0, 1500, 900, 1500, 900, 0, 900, 0, 900, 0, 0], arcos: [], textos: [] } };
  it('avisa com dois grupos deslocados e a sugestão corrige', () => {
    const { s, ok } = sessao();
    const cob = s.modelo.pavimentos.at(-1)!.grupo;
    ok('mascara.importar', { grupo: 'g_3', nome: 'Tipo', geo: GEO, escala: 0.01, centralizar: false });
    ok('mascara.importar', { grupo: cob, nome: 'Cobertura', geo: GEO, escala: 0.01, centralizar: false });
    expect(verificar(s.modelo).some((d) => d.codigo === 'MASCARA_DESALINHADA')).toBe(false);
    const m = s.modelo.mascaras[1];
    ok('mascara.editar', { id: m.id, dx: m.dx + 0.3, dy: m.dy - 0.2 });
    const d = verificar(s.modelo).find((x) => x.codigo === 'MASCARA_DESALINHADA')!;
    expect(d).toBeDefined();
    expect(d.severidade).toBe('aviso');
    expect(d.elementos).toEqual([m.id, s.modelo.mascaras[0].id]);
    expect(d.mensagem).toContain('0,36 m');
    ok(d.sugestao!.comando, d.sugestao!.params);
    expect(verificar(s.modelo).some((x) => x.codigo === 'MASCARA_DESALINHADA')).toBe(false);
    // abaixo da tolerância (5 cm) não avisa; desenhos de tamanhos diferentes também não
    const m2 = s.modelo.mascaras[1];
    ok('mascara.editar', { id: m2.id, dx: m2.dx + 0.04 });
    expect(verificar(s.modelo).some((x) => x.codigo === 'MASCARA_DESALINHADA')).toBe(false);
    ok('mascara.editar', { id: m2.id, escala: 0.02 });
    expect(verificar(s.modelo).some((x) => x.codigo === 'MASCARA_DESALINHADA')).toBe(false);
  });
});

describe('girar e espelhar a seleção', () => {
  it('girar 90° em torno de um centro: posição, ângulo do pilar, vigas, lajes e cargas; desfazer volta', () => {
    const { s, ok } = sessao();
    ok('pilar.inserir', { x: 2, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.5 }, ajuste: 'ne' });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[2, 0], [6, 0]], secao: { b: 0.15, h: 0.4 }, alinhamento: 'esq' });
    ok('laje.criar', { grupo: 'g_3', contorno: [[2, 0], [6, 0], [6, 3], [2, 3]] });
    ok('carga.ponto', { grupo: 'g_3', ponto: [4, 1], valor: 10 });
    const antes = JSON.stringify(s.modelo);
    const p = s.modelo.pilares[0], v = s.modelo.vigas[0], l = s.modelo.lajes[0], c = s.modelo.cargas[0];
    ok('editar.girar', { pilares: [p.id], vigas: [v.id], lajes: [l.id], cargas: [c.id], centro: [0, 0], angulo: 90 });
    const q = s.modelo.pilares[0];
    expect(q.x).toBeCloseTo(0, 9); expect(q.y).toBeCloseTo(2, 9); expect(q.angulo).toBe(90); expect(q.ajuste).toBe('ne');
    expect(s.modelo.vigas[0].pontos[1][0]).toBeCloseTo(0, 9); expect(s.modelo.vigas[0].pontos[1][1]).toBeCloseTo(6, 9);
    expect(s.modelo.vigas[0].alinhamento).toBe('esq');
    expect(s.modelo.lajes[0].contorno[2][0]).toBeCloseTo(-3, 9);
    expect(s.modelo.cargas[0].pontos[0][0]).toBeCloseTo(-1, 9);
    s.desfazer();
    expect(JSON.stringify(s.modelo)).toBe(antes);
  });

  it('espelhar por um eixo: ajuste norte ↔ sul, face da viga mantida; cópia espelhada com novos números', () => {
    const { s, ok } = sessao();
    ok('pilar.inserir', { x: 1, y: 0, angulo: 30, secao: { tipo: 'ret', b: 0.2, h: 0.5 }, ajuste: 'no' });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[1, 2], [3, 2]], secao: { b: 0.15, h: 0.4 }, alinhamento: 'dir' });
    const p = s.modelo.pilares[0], v = s.modelo.vigas[0];
    ok('editar.espelhar', { pilares: [p.id], vigas: [v.id], eixo: [[5, 0], [5, 1]] });
    const q = s.modelo.pilares[0];
    expect(q.x).toBeCloseTo(9, 9); expect(q.y).toBeCloseTo(0, 9);
    expect(q.angulo).toBeCloseTo(150, 9); // 2·90° − 30°
    expect(q.ajuste).toBe('so');
    expect(s.modelo.vigas[0].pontos).toEqual([[9, 2], [7, 2]]);
    expect(s.modelo.vigas[0].alinhamento).toBe('esq');
    // a face externa continua do mesmo lado do mundo: face da viga em y = 2 − b... (alinhamento 'dir' original, à direita do traçado +x = y−)
    ok('editar.espelhar', { pilares: [q.id], vigas: [s.modelo.vigas[0].id], eixo: [[5, 0], [5, 1]], copiar: true });
    expect(s.modelo.pilares).toHaveLength(2);
    expect(s.modelo.pilares[1].nome).toBe('P2');
    expect(s.modelo.pilares[1].x).toBeCloseTo(1, 9);
    expect(s.modelo.vigas).toHaveLength(2);
    expect(s.modelo.vigas[1].alinhamento).toBe('dir');
    // espelhar sobre outro pilar é recusado
    const r = s.executar('editar.espelhar', { pilares: [s.modelo.pilares[0].id], eixo: [[5, 0], [5, 1]], copiar: true });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('PILAR_SOBREPOSTO');
  });
});

describe('momento na face do pilar e origem dos resultados', () => {
  const { s } = predio();
  const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);

  it('faces dos pilares: negativo na face menor que o do eixo do apoio, com a combinação', () => {
    const v = d.vigas.find((x) => x.facesPilar.length >= 4)!;
    expect(v).toBeDefined();
    for (const f of v.facesPilar) {
      expect(f.nomePilar).toMatch(/^P\d+$/);
      expect(f.Mmin).toBeLessThanOrEqual(f.Mmax);
      expect(f.combinacaoMin).toMatch(/ELU/);
    }
    // apoio interno: o negativo na face não passa do maior negativo da envoltória
    const interno = v.facesPilar.slice(1, -1);
    for (const f of interno) expect(f.Mmin).toBeGreaterThanOrEqual(v.Mneg - 1e-6);
  });

  it('origem: combinação determinante, fórmula e item da NBR em vigas, pilares e lajes', () => {
    const v = d.vigas[0];
    const inf = v.origens.find((o) => o.grandeza === 'Armadura inferior')!;
    expect(inf.combinacao).toBe(v.envoltoria.determinantes.Mmax);
    expect(inf.item).toContain('17.2.2');
    expect(v.origens.find((o) => o.grandeza.startsWith('Estribos'))!.combinacao).toBe(v.envoltoria.determinantes.V);
    expect(v.origens.find((o) => o.grandeza === 'Flecha')!.item).toContain('Tabela 13.3');
    const p = d.pilares.find((x) => x.determinantes?.length)!;
    const o = p.origens!.find((x) => x.grandeza === 'Armadura longitudinal')!;
    expect(p.determinantes!.map((x) => x.combinacao)).toContain(o.combinacao);
    expect(o.item).toContain('15.8.3.3.2');
    expect(d.lajes[0].origens!.map((x) => x.grandeza)).toEqual(['Armadura', 'Flecha', 'Fissuração']);
  });
});

describe('logo no carimbo', () => {
  it('base64 e cabeçalho JPEG', () => {
    const b = base64Bytes(JPEG)!;
    expect(infoJpeg(b)).toEqual({ w: 8, h: 4, comp: 3 });
    expect(bytesBase64(b)).toBe(JPEG);
    expect(base64Bytes('***')).toBeNull();
    expect(infoJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it('prancha.definir guarda o logo; PDF, SVG, DXF e DWG o levam; inválido e grande são recusados', () => {
    const s = edificioExemplo();
    expect(s.executar('prancha.definir', { logo: { dados: 'iVBORw0KGgoAAAANSUhEUg==' } }).erros[0].codigo).toBe('LOGO_INVALIDO');
    expect(s.executar('prancha.definir', { logo: { dados: 'A'.repeat(LIMITE_LOGO + 4) } }).erros[0].codigo).toBe('LOGO_GRANDE');
    expect(s.executar('prancha.definir', { logo: { dados: JPEG, nome: 'logo.png' } }).ok).toBe(true);
    expect(s.modelo.prancha!.logo).toMatchObject({ largura: 8, altura: 4, nome: 'logo.png' });
    const pr = montarPranchas(s.modelo)[0];
    expect(pr.logo).toBeDefined();
    const L = pr.logo!;
    // dentro da legenda, proporção 2:1
    expect((L.x1 - L.x0) / (L.y1 - L.y0)).toBeCloseTo(2, 6);
    const pdf = new TextDecoder('latin1').decode(escreverPdf([pr]));
    expect(pdf).toContain('/Subtype /Image /Width 8 /Height 4 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode');
    expect(pdf).toContain('/Logo Do');
    expect(pdf).toContain('/XObject << /Logo');
    expect(svgPrancha(pr)).toContain(`href="data:image/jpeg;base64,${JPEG}"`);
    const dxf = new TextDecoder('latin1').decode(escreverDxf(pr, { arquivoLogo: 'obra-logo.jpg' }));
    const d = readDxf(dxf);
    const img = (d.paperSpace ?? []).find((e) => e.type === 'image');
    expect(img).toBeDefined();
    if (img?.type === 'image') { expect(img.widthPx).toBe(8); expect(img.heightPx).toBe(4); expect(img.path).toBe('obra-logo.jpg'); expect(img.position.x).toBeCloseTo(L.x0, 6); }
    expect(auditDrawing(d).filter((x) => x.severity === 'error')).toEqual([]);
    const dw = desenhoDwg(pr);
    expect(dw.paperSpace!.some((e) => e.type === 'image')).toBe(true);
    // as pranchas de armação também levam o logo
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an);
    const conj = montarConjunto(s.modelo, an, dim, { tipos: ['vigas'] }).pranchas;
    expect(conj.length).toBeGreaterThan(0);
    expect(conj.every((p) => p.logo)).toBe(true);
    expect(s.executar('prancha.definir', { removerLogo: true }).ok).toBe(true);
    expect(s.modelo.prancha!.logo).toBeUndefined();
    expect(montarPranchas(s.modelo)[0].logo).toBeUndefined();
  });
});

describe('regressão: edifício fictício de 10 pavimentos (3 × 2 vãos, lajes maciças)', () => {
  // valores do cálculo em 20/10/2026 (antes e depois da otimização do núcleo da R7-0, idênticos)
  const { s } = predio(5);
  const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);
  it('γz, deslocamento do topo e reações', () => {
    expect(s.modelo.pavimentos).toHaveLength(10);
    expect(an.gdl).toBe(54464);
    const gz = an.vento!.gamaZ;
    expect(gz[0].max).toBeCloseTo(1.18503, 4);
    expect(gz[0].ampliacao).toBeCloseTo(1.12578, 4);
    expect(gz[1].max).toBeCloseTo(1.06142, 4);
    const w0 = an.vento!.deslocamentos!.find((x) => x.direcao === 0)!;
    expect(w0.H).toBeCloseTo(28.5, 9);
    expect(w0.topo * 1000).toBeCloseTo(12.112, 2);
    expect(w0.ok).toBe(true);
    const soma = (c: string) => an.fundacao.filter((f) => f.caso === c).reduce((t, f) => t + f.N, 0);
    expect(soma('G')).toBeCloseTo(6390, 4);
    expect(soma('Q')).toBeCloseTo(1620, 4);
    const p1 = an.fundacao.filter((f) => f.pilar === s.modelo.pilares[0].id);
    expect(p1.find((f) => f.caso === 'G')!.N).toBeCloseTo(298.817, 2);
    expect(p1.find((f) => f.caso === 'W0°')!.My).toBeCloseTo(-33.685, 2);
    expect(p1.find((f) => f.caso === 'W90°')!.Mx).toBeCloseTo(61.154, 2);
  });
  it('vigas, pilares e lajes', () => {
    const v2 = d.vigas.find((x) => x.nome === 'V2')!;
    expect(v2.Mpos).toBeCloseTo(65.626, 2);
    expect(v2.Mneg).toBeCloseTo(-99.569, 2);
    expect(v2.V).toBeCloseTo(79.434, 2);
    expect([v2.barrasInf, v2.barrasSup, v2.estribo]).toEqual(['2 φ16', '2 φ20', 'φ5 c/22']);
    const p5 = d.pilares.filter((x) => x.pilar === s.modelo.pilares[4].id);
    expect(p5.map((x) => x.armadura)).toEqual(['10 φ20', '10 φ20', '10 φ16', '14 φ10', '6 φ10', '6 φ10', '6 φ10', '6 φ10', '6 φ10', '6 φ10']);
    expect(p5[0].Nd).toBeCloseTo(1788.932, 2);
    expect(p5[3].util).toBeCloseTo(0.99677, 4);
    const l1 = d.lajes.find((x) => x.nome === 'L1')!;
    expect(l1.mPos[0]).toBeCloseTo(6.6033, 3);
    expect(l1.mNeg[0]).toBeCloseTo(-11.093, 2);
  });
});

describe('quadro de vigas colado do Excel', () => {
  it('Tab ou ponto e vírgula, vírgula decimal, polilinha; mesmo nome edita, cabeçalho é ignorado', () => {
    const { s, ok } = sessao();
    ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [5, 0]], secao: { b: 0.15, h: 0.4 } });
    const q = lerQuadroVigas('Viga\tb\th\tx1\ty1\tx2\ty2\nV1\t20\t50\t0\t0\t6\t0\nV9;14;40;0;3;2,5;3;2,5;6\n', s.modelo, 'g_3');
    expect(q.ignoradas).toBe(1);
    expect(q.comandos).toEqual([
      { nome: 'viga.editar', params: { id: s.modelo.vigas[0].id, secao: { b: 0.2, h: 0.5 }, pontos: [[0, 0], [6, 0]] } },
      { nome: 'viga.tracar', params: { grupo: 'g_3', nome: 'V9', secao: { b: 0.14, h: 0.4 }, pontos: [[0, 3], [2.5, 3], [2.5, 6]] } },
    ]);
    ok('lote', { comandos: q.comandos });
    expect(s.modelo.vigas.map((v) => v.nome)).toEqual(['V1', 'V9']);
    expect(s.modelo.vigas[1].pontos).toHaveLength(3);
  });
});
