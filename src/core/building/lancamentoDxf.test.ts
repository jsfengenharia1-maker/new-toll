import { describe, expect, it } from 'vitest';
import { readDwg, writeDwg2018, writeDxf } from 'nasjidwg';
import { lerDxf } from '../dxf/read';
import { lerDwg } from '../dxf/dwgLeitor';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { edificioExemplo } from '../sheets/exemplo';
import { montarPranchas } from '../sheets/prancha';
import { desenhoDwg } from '../sheets/dwg';
import { escreverDxf } from '../sheets/dxf';
import { cadeiasDe, retanguloDe } from '../geom/cadeias';
import { configuracaoDaMascara, lerConfiguracao, papelPeloNome, propostaDeLancamento, sugerirRegras, vigasDoClique } from './lancamentoDxf';
import { verificar } from './verify';
import { gruposDaMascara, type BuildingModel } from './types';

// ---- DXF fictício, gerado aqui (nunca arquivo de obra): unidades em cm ----
type Ent = string;
const par = (c: number, v: string | number) => `${c}\n${v}`;
const lw = (camada: string, pts: [number, number][], fechada = true): Ent => ['0\nLWPOLYLINE', par(8, camada), par(90, pts.length), par(70, fechada ? 1 : 0), ...pts.map(([x, y]) => `${par(10, x)}\n${par(20, y)}`)].join('\n');
const linha = (camada: string, a: [number, number], z: [number, number]): Ent => ['0\nLINE', par(8, camada), par(10, a[0]), par(20, a[1]), par(11, z[0]), par(21, z[1])].join('\n');
const texto = (camada: string, x: number, y: number, t: string): Ent => ['0\nTEXT', par(8, camada), par(10, x), par(20, y), par(40, 10), par(1, t)].join('\n');
const circulo = (camada: string, x: number, y: number, r: number): Ent => ['0\nCIRCLE', par(8, camada), par(10, x), par(20, y), par(40, r)].join('\n');
const arco = (camada: string, x: number, y: number, r: number, a0: number, a1: number): Ent => ['0\nARC', par(8, camada), par(10, x), par(20, y), par(40, r), par(50, a0), par(51, a1)].join('\n');
const rect = (cx: number, cy: number, b: number, h: number, ang = 0): [number, number][] => {
  const a = (ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([i, j]) => [cx + (i * b / 2) * c - (j * h / 2) * s, cy + (i * b / 2) * s + (j * h / 2) * c] as [number, number]);
};
const dxf = (ents: Ent[]) => ['0\nSECTION', '2\nHEADER', '9\n$INSUNITS', '70\n5', '0\nENDSEC', '0\nSECTION', '2\nENTITIES', ...ents, '0\nENDSEC', '0\nEOF'].join('\n');

/** Grade 3 × 2 de pilares 20 × 50 cm a cada 5 m e 4,5 m, vigas de 15 cm por faces, eixos, contorno, abertura e ponto fixo. */
function dxfGrade(): string {
  const ents: Ent[] = [];
  const xs = [0, 500, 1000], ys = [0, 450];
  let n = 1;
  for (const y of ys) for (const x of xs) { ents.push(lw('PILARES', rect(x, y, 20, 50))); ents.push(texto('TEXTO', x + 30, y + 40, `P${n++}`)); }
  ents.push(lw('PILARES', rect(0, 0, 8, 8))); // contorno duplicado dentro do P1
  ents.push(lw('PILARES', rect(750, -300, 30, 30, 30))); // pilar girado
  ents.push(circulo('PILARES', 250, -300, 20)); // pilar circular d = 40
  for (const y of ys) for (const [x0, x1] of [[10, 490], [510, 990]]) { ents.push(linha('VIGAS', [x0, y + 7.5], [x1, y + 7.5])); ents.push(linha('VIGAS', [x0, y - 7.5], [x1, y - 7.5])); }
  ents.push(linha('VIGAS', [300, 300], [400, 300])); // linha solta
  for (const [x, nome] of [[0, 'A'], [500, 'B'], [1000, 'C']] as const) { ents.push(linha('EIXOS', [x, -100], [x, 550])); ents.push(texto('EIXOS', x - 5, -125, nome)); }
  ents.push(lw('CONTORNO', [[-50, -50], [1050, -50], [1050, 500], [-50, 500]]));
  ents.push(lw('ABERTURA', [[200, 150], [260, 150], [260, 210], [200, 210]]));
  ents.push(lw('PONTO-FIXO', [[1005, 470], [1015, 470], [1015, 480], [1005, 480]])); // canto NE do P6
  return dxf(ents);
}

function obraComGabarito(texto = dxfGrade()) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const lido = lerDxf(texto);
  const r = s.executar('mascara.importar', { grupo: 'g_3', nome: 'Arquitetura', geo: lido.camadas, escala: 0.01, centralizar: false });
  expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
  return { s, lido };
}

describe('regras por camada', () => {
  it('papel pelo nome da camada, em português e inglês', () => {
    expect(papelPeloNome('PILAR')).toBe('pilar');
    expect(papelPeloNome('A-COLUMN')).toBe('pilar');
    expect(papelPeloNome('Pilar-Parede')).toBe('pilarParede');
    expect(papelPeloNome('EIXO')).toBe('eixo');
    expect(papelPeloNome('CONTORNO_EDIFICIO')).toBe('contorno');
    expect(papelPeloNome('FUROS')).toBe('abertura');
    expect(papelPeloNome('PONTO FIXO')).toBe('pontoFixo');
    expect(papelPeloNome('TEXTO')).toBe('texto');
    expect(papelPeloNome('FOLHA-TEXTO')).toBe('ignorar');
    expect(papelPeloNome('COTA')).toBe('ignorar');
    expect(papelPeloNome('VIGA')).toBeNull(); // faces ou eixo: decide a geometria
    expect(papelPeloNome('VIGA-EIXO')).toBe('vigaEixo');
    expect(papelPeloNome('XYZ')).toBeNull();
  });

  it('sugerirRegras usa o nome e, sem nome reconhecido, a geometria', () => {
    const { s } = obraComGabarito();
    const m = s.modelo.mascaras[0];
    const r = sugerirRegras(m.geo, m.escala);
    expect(r.papeis).toEqual({ PILARES: 'pilar', VIGAS: 'vigaFaces', EIXOS: 'eixo', CONTORNO: 'contorno', ABERTURA: 'abertura', 'PONTO-FIXO': 'pontoFixo', TEXTO: 'texto' });
    // camada sem nome reconhecido: retângulos pequenos fechados = pilar; pares de linhas = viga por faces; polilinha externa grande = contorno
    const geo = lerDxf(dxf([lw('A1', rect(0, 0, 20, 40)), lw('A1', rect(300, 0, 20, 40)), linha('A2', [0, 0], [400, 0]), linha('A2', [0, 15], [400, 15]), lw('A3', [[0, 0], [2000, 0], [2000, 1500], [0, 1500]])])).camadas;
    expect(sugerirRegras(geo, 0.01).papeis).toEqual({ A1: 'pilar', A2: 'vigaFaces', A3: 'contorno' });
  });
});

describe('cadeias e retângulos', () => {
  it('cadeias abertas, fechadas e com cruzamento; retângulo girado', () => {
    const segs = [0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 5, 5, 6, 5];
    const c = cadeiasDe(segs).sort((a, z) => z.pontos.length - a.pontos.length);
    expect(c).toHaveLength(2);
    expect(c[0].fechada).toBe(true);
    expect(c[0].pontos).toHaveLength(4);
    expect(c[1].fechada).toBe(false);
    const q = retanguloDe(rect(3, 2, 0.4, 0.2, 30))!;
    expect(q.b).toBeCloseTo(0.4, 9); expect(q.h).toBeCloseTo(0.2, 9); expect(q.angulo).toBeCloseTo(30, 6);
    expect(q.cx).toBeCloseTo(3, 9); expect(q.cy).toBeCloseTo(2, 9);
    expect(retanguloDe([[0, 0], [2, 0], [2, 1], [0.5, 1]])).toBeNull();
  });
});

describe('proposta de lançamento', () => {
  it('contagens e atributos de cada elemento do DXF sintético', () => {
    const { s } = obraComGabarito();
    const m = s.modelo.mascaras[0];
    const p = propostaDeLancamento(s.modelo, m, sugerirRegras(m.geo, m.escala));
    // 6 retângulos 20 × 50, o girado, o circular e o duplicado dentro do P1 (ambíguo)
    expect(p.pilares).toHaveLength(9);
    const ret = p.pilares.filter((q) => q.secao.tipo === 'ret' && q.secao.b === 0.2 && q.secao.h === 0.5);
    expect(ret).toHaveLength(6);
    expect(ret.map((q) => q.nome).sort()).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    const gir = p.pilares.find((q) => q.angulo > 0 && q.angulo < 90 && q.secao.tipo === 'ret' && q.secao.b === 0.3)!;
    expect(gir.angulo).toBeCloseTo(30, 6);
    expect([gir.x, gir.y]).toEqual([7.5, -3]);
    const circ = p.pilares.find((q) => q.secao.tipo === 'circ')!;
    expect(circ.secao).toEqual({ tipo: 'circ', d: 0.4 });
    expect([circ.x, circ.y]).toEqual([2.5, -3]);
    expect(p.pilares.filter((q) => q.ambiguo === 'PILAR_DENTRO_DE_PILAR')).toHaveLength(1);
    // ponto fixo por camada: canto nordeste do P6 vira o ponto fixo
    const p6 = p.pilares.find((q) => q.nome === 'P6')!;
    expect(p6.ajuste).toBe('ne');
    expect(p6.x).toBeCloseTo(10.1, 6); expect(p6.y).toBeCloseTo(4.75, 6);
    // vigas por faces: as duas interrompidas pelo pilar do meio viram uma só, de face a face
    expect(p.vigas).toHaveLength(2);
    for (const v of p.vigas) { expect(v.secao).toEqual({ b: 0.15, h: 0.4 }); expect(v.pontos).toHaveLength(2); expect(v.pontos[0][0]).toBeCloseTo(0.1, 6); expect(v.pontos[1][0]).toBeCloseTo(9.9, 6); }
    expect(p.vigas.map((v) => v.pontos[0][1]).sort((a, z) => a - z)).toEqual([0, 4.5]);
    expect(p.ambiguos.map((a) => a.codigo).sort()).toEqual(['LINHA_SOLTA', 'PILAR_DENTRO_DE_PILAR']);
    expect(p.eixos.map((e) => e.nome)).toEqual(['A', 'B', 'C']);
    expect(p.eixos[0].p1).toEqual([0, -1]); expect(p.eixos[0].p2).toEqual([0, 5.5]);
    expect(p.aberturas).toHaveLength(1);
    expect(p.contorno!.area).toBeCloseTo(11 * 5.5, 6);
    expect(p.ignorados.map((x) => x.motivo)).toContain('linha sem par (viga por faces)');
    expect(p.contagens).toMatchObject({ pilares: 9, vigas: 2, eixos: 3, aberturas: 1, contorno: 1, ambiguos: 2, jaLancados: 0 });
  });

  it('segue a transformação da máscara (escala, rotação e deslocamento) sem mudar a origem dos elementos', () => {
    const { s } = obraComGabarito();
    const m = s.modelo.mascaras[0];
    const r = sugerirRegras(m.geo, m.escala);
    const base = propostaDeLancamento(s.modelo, m, r);
    expect(s.executar('mascara.editar', { id: m.id, rotacao: 90, dx: 100, dy: 50 }).ok).toBe(true);
    const gir = propostaDeLancamento(s.modelo, s.modelo.mascaras[0], r);
    expect(gir.pilares.map((q) => q.origem)).toEqual(base.pilares.map((q) => q.origem));
    const p1 = base.pilares.find((q) => q.nome === 'P2')!, p1g = gir.pilares.find((q) => q.nome === 'P2')!;
    expect([p1g.x, p1g.y]).toEqual([100 - p1.y, 50 + p1.x]);
    const retG = gir.pilares.find((q) => q.nome === 'P2')!;
    expect(retG.angulo).toBeCloseTo(90, 6); // b passa à vertical
  });

  it('viga por eixo: polilinhas e arcos; pilar-parede não retangular fica como ignorado', () => {
    const geo = lerDxf(dxf([lw('VIGA-EIXO', [[0, 0], [400, 0], [400, 300]], false), arco('VIGA-EIXO', 0, 300, 100, 0, 90), lw('PILAR-PAREDE', [[0, 0], [100, 0], [100, 20], [20, 20], [20, 80], [0, 80]])])).camadas;
    const { s } = obraComGabarito();
    expect(s.executar('mascara.importar', { grupo: 'g_3', nome: 'Eixos', geo, escala: 0.01, centralizar: false }).ok).toBe(true);
    const m = s.modelo.mascaras[1];
    const p = propostaDeLancamento(s.modelo, m, sugerirRegras(m.geo, m.escala, { larguraViga: 0.2, alturaViga: 0.5 }));
    expect(p.vigas).toHaveLength(2);
    expect(p.vigas[0].secao).toEqual({ b: 0.2, h: 0.5 });
    expect(p.vigas.find((v) => v.pontos.length === 3)!.pontos).toEqual([[0, 0], [4, 0], [4, 3]]);
    const arc = p.vigas.find((v) => v.pontos.length > 3)!;
    expect(arc.pontos[0][0]).toBeCloseTo(1, 4); expect(arc.pontos[0][1]).toBeCloseTo(3, 4);
    expect(arc.pontos.at(-1)![0]).toBeCloseTo(0, 4); expect(arc.pontos.at(-1)![1]).toBeCloseTo(4, 4);
    expect(p.pilares).toHaveLength(0);
    expect(p.ignorados.some((x) => x.motivo.startsWith('pilar-parede não retangular'))).toBe(true);
  });
});

describe('lancamento.aplicar', () => {
  it('aplica, é desfeito num passo, não duplica ao reimportar e gera um modelo sem erro de lançamento', () => {
    const { s } = obraComGabarito();
    const m = s.modelo.mascaras[0];
    const p = propostaDeLancamento(s.modelo, m, sugerirRegras(m.geo, m.escala));
    const antes = s.modelo;
    const nLog = s.log.length;
    const excluir = p.ambiguos.flatMap((a) => (a.origem ? [a.origem] : []));
    const r = s.executar('lancamento.aplicar', { grupo: 'g_3', mascara: m.id, proposta: p, excluir });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    expect(s.log.length).toBe(nLog + 1);
    expect(s.modelo.pilares).toHaveLength(8);
    expect(s.modelo.pilares.every((q) => q.origemLancamento?.startsWith('dxf:Arquitetura:'))).toBe(true);
    expect(s.modelo.pilares.find((q) => q.nome === 'P6')!.ajuste).toBe('ne');
    expect(s.modelo.vigas).toHaveLength(2);
    expect(s.modelo.eixos).toHaveLength(3);
    expect(s.modelo.lajes.length).toBeGreaterThan(0); // panos do contorno + abertura como furo
    expect(s.modelo.lajes.some((l) => (l.furos ?? []).length === 1)).toBe(true);
    expect(verificar(s.modelo).filter((d) => d.severidade === 'erro')).toEqual([]);
    // reimportar não duplica
    const p2 = propostaDeLancamento(s.modelo, s.modelo.mascaras[0], sugerirRegras(m.geo, m.escala));
    expect(p2.contagens).toMatchObject({ pilares: 1, vigas: 0, eixos: 0, aberturas: 1 }); // só o ambíguo excluído e a abertura (vira furo igual, pulado)
    expect(p2.contagens.jaLancados).toBeGreaterThanOrEqual(13);
    const n = s.modelo.pilares.length, nv = s.modelo.vigas.length, nl = s.modelo.lajes.length;
    expect(s.executar('lancamento.aplicar', { grupo: 'g_3', mascara: m.id, proposta: p2, excluir }).ok).toBe(true);
    expect([s.modelo.pilares.length, s.modelo.vigas.length, s.modelo.lajes.length]).toEqual([n, nv, nl]);
    // desfazer o segundo e o primeiro
    s.desfazer();
    s.desfazer();
    expect(s.modelo).toEqual(antes);
  });

  it('aplicação parcial e recusas', () => {
    const { s } = obraComGabarito();
    const m = s.modelo.mascaras[0];
    const p = propostaDeLancamento(s.modelo, m, sugerirRegras(m.geo, m.escala));
    const so = s.executar('lancamento.aplicar', { grupo: 'g_3', mascara: m.id, proposta: p, excluir: [...p.pilares, ...p.vigas, ...p.eixos].map((x) => x.origem), lajes: false });
    expect(so.ok).toBe(true);
    expect(s.modelo.pilares).toHaveLength(0);
    expect(s.executar('lancamento.aplicar', { grupo: 'xx', mascara: m.id, proposta: p }).erros[0].codigo).toBe('GRUPO_INEXISTENTE');
    expect(s.executar('lancamento.aplicar', { grupo: 'g_3', mascara: 'zz', proposta: p }).erros[0].codigo).toBe('MASCARA_INEXISTENTE');
    expect(s.executar('lancamento.aplicar', { grupo: 'g_3', mascara: m.id, proposta: { ...p, mascara: 'Outra' } }).erros[0].codigo).toBe('PROPOSTA_DE_OUTRA_MASCARA');
    expect(s.executar('lancamento.aplicar', { grupo: 'g_3', mascara: m.id, proposta: { mascara: 'Arquitetura' } as never }).erros[0].codigo).toBe('PROPOSTA_INVALIDA');
  });
});

describe('vigas pelo clique no gabarito', () => {
  const geo = () => lerDxf(dxf([linha('V', [0, 0], [400, 0]), lw('V', [[600, 0], [900, 0], [900, 300]], false), arco('V', 0, 800, 200, 0, 90)])).camadas;
  const obra = () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    expect(s.executar('mascara.importar', { grupo: 'g_3', nome: 'G', geo: geo(), escala: 0.01, centralizar: false }).ok).toBe(true);
    return s;
  };
  it('linha: pela face (corpo do lado do cursor) e pelo eixo', () => {
    const s = obra();
    const acima = vigasDoClique(s.modelo, 'g_3', [2, 0.05], [2, 0.5], 'face');
    expect(acima).toEqual([{ pontos: [[0, 0], [4, 0]], alinhamento: 'dir', origem: acima[0].origem }]); // cursor à esquerda de 0→4: linha = face direita
    const abaixo = vigasDoClique(s.modelo, 'g_3', [2, 0.05], [2, -0.5], 'face');
    expect(abaixo[0].alinhamento).toBe('esq');
    expect(vigasDoClique(s.modelo, 'g_3', [2, 0.05], [2, 0.5], 'eixo')[0].alinhamento).toBe('centro');
    expect(vigasDoClique(s.modelo, 'g_3', [2, 2], [2, 3], 'eixo')).toEqual([]);
    expect(s.executar('viga.daMascara', { grupo: 'g_3', ponto: [2, 0.05], cursor: [2, 0.5], modo: 'face', secao: { b: 0.15, h: 0.4 } }).ok).toBe(true);
    expect(s.modelo.vigas).toHaveLength(1);
    expect(s.modelo.vigas[0]).toMatchObject({ pontos: [[0, 0], [4, 0]], alinhamento: 'dir', secao: { b: 0.15, h: 0.4 } });
    expect(s.executar('viga.daMascara', { grupo: 'g_3', ponto: [2, 0.05], cursor: [2, 0.5], modo: 'face', secao: { b: 0.15, h: 0.4 } }).erros[0].codigo).toBe('VIGA_JA_LANCADA');
    expect(s.executar('viga.daMascara', { grupo: 'g_3', ponto: [2, 2], modo: 'eixo', secao: { b: 0.15, h: 0.4 } }).erros[0].codigo).toBe('SEM_GEOMETRIA_NO_CLIQUE');
    s.desfazer();
    expect(s.modelo.vigas).toHaveLength(0);
  });
  it('polilinha: uma viga por trecho reto; arco: viga poligonal pelo lado do cursor', () => {
    const s = obra();
    const l = vigasDoClique(s.modelo, 'g_3', [7.5, 0], [7.5, 1], 'face');
    expect(l.map((v) => v.pontos)).toEqual([[[6, 0], [9, 0]], [[9, 0], [9, 3]]]);
    expect(l.map((v) => v.alinhamento)).toEqual(['dir', 'dir']); // cursor dentro da cantoneira: corpo para o lado de dentro
    const a = vigasDoClique(s.modelo, 'g_3', [2 * Math.cos(Math.PI / 4), 8 + 2 * Math.sin(Math.PI / 4)], [0.5, 8.5], 'face');
    expect(a).toHaveLength(1);
    expect(a[0].alinhamento).toBe('dir'); // cursor dentro do círculo
    expect(a[0].pontos.length).toBeGreaterThan(10);
    expect(a[0].pontos[0]).toEqual([2, 8]);
    expect(vigasDoClique(s.modelo, 'g_3', [2 * Math.cos(Math.PI / 4), 8 + 2 * Math.sin(Math.PI / 4)], [3, 10], 'face')[0].alinhamento).toBe('esq');
    expect(s.executar('viga.daMascara', { grupo: 'g_3', ponto: [7.5, 0], cursor: [7.5, 1], modo: 'face', secao: { b: 0.15, h: 0.4 } }).ok).toBe(true);
    expect(s.modelo.vigas).toHaveLength(2);
  });
});

describe('gabaritos e vistas', () => {
  it('importação guarda arquivo, regras e a origem original; origemOriginal desfaz alinhar e editar', () => {
    const { s } = obraComGabarito();
    const m = s.modelo.mascaras[0];
    const regras = sugerirRegras(m.geo, m.escala);
    expect(s.executar('mascara.importar', { grupo: 'g_3', nome: 'Com regras', geo: m.geo, escala: 0.01, centralizar: true, regras, arquivo: { nome: 'obra.dwg', tipo: 'dwg' } }).ok).toBe(true);
    const n = s.modelo.mascaras[1];
    expect(n.arquivo).toEqual({ nome: 'obra.dwg', tipo: 'dwg' });
    expect(n.regras).toEqual(regras);
    expect(n.original).toEqual({ escala: 0.01, rotacao: 0, dx: n.dx, dy: n.dy });
    const o = { ...n.original! };
    expect(s.executar('mascara.alinhar', { id: n.id, de: [[0, 0], [10, 0]], para: [[3, 3], [3, 13]], escalar: true }).ok).toBe(true);
    expect(s.executar('mascara.editar', { id: n.id, rotacao: 17, dx: 9 }).ok).toBe(true);
    expect(s.modelo.mascaras[1].rotacao).toBe(17);
    expect(s.executar('mascara.origemOriginal', { id: n.id }).ok).toBe(true);
    expect(s.modelo.mascaras[1]).toMatchObject(o);
    // máscara de arquivo antigo, sem origem guardada
    expect(s.executar('mascara.origemOriginal', { id: m.id }).ok).toBe(true); // a primeira também foi importada pelo comando
    expect(s.executar('mascara.regras', { id: n.id, regras: { ...regras, papeis: { ...regras.papeis, ZZ: 'pilar' } } }).erros[0].codigo).toBe('CAMADA_INEXISTENTE');
    expect(s.executar('mascara.regras', { id: n.id, regras: { ...regras, papeis: { ...regras.papeis, PILARES: 'xx' as never } } }).erros[0].codigo).toBe('PAPEL_INVALIDO');
    expect(s.executar('mascara.regras', { id: n.id, regras: { ...regras, vigaFacesMin: 1 } }).erros[0].codigo).toBe('REGRAS_INVALIDAS');
  });

  it('vista em vários grupos, copiar, desligar e remover o grupo', () => {
    const { s } = obraComGabarito();
    const m = s.modelo.mascaras[0];
    expect(s.executar('grupo.criar', { nome: 'Cobertura' }).ok).toBe(true);
    const gc = s.modelo.grupos.at(-1)!.id;
    expect(s.executar('mascara.editar', { id: m.id, grupos: ['g_3', gc] }).ok).toBe(true);
    expect(gruposDaMascara(s.modelo.mascaras[0])).toEqual(['g_3', gc]);
    expect(s.executar('mascara.editar', { id: m.id, visivel: false }).ok).toBe(true);
    expect(s.modelo.mascaras[0].visivel).toBe(false);
    expect(s.executar('mascara.editar', { id: m.id, visivel: true }).ok).toBe(true);
    expect(s.modelo.mascaras[0].visivel).toBeUndefined();
    expect(s.executar('mascara.copiar', { id: m.id, grupos: [gc] }).ok).toBe(true);
    const c = s.modelo.mascaras[1];
    expect(c.grupo).toBe(gc);
    expect(c.grupos).toBeUndefined();
    expect(c.nome).toBe('Arquitetura (Cobertura)');
    expect(c.geo).toEqual(m.geo);
    expect(c.id).not.toBe(m.id);
    expect(s.executar('mascara.copiar', { id: m.id, grupos: ['nao'] }).erros[0].codigo).toBe('GRUPO_INEXISTENTE');
    expect(s.executar('mascara.editar', { id: m.id, grupos: ['nao'] }).erros[0].codigo).toBe('GRUPO_INEXISTENTE');
  });

  it('camadas: apelido, cor, espessura e textos; configuração salva e reaplicada', () => {
    const { s } = obraComGabarito();
    const m = s.modelo.mascaras[0];
    expect(s.executar('mascara.camadas', { id: m.id, camadas: ['PILARES'], apelido: 'Pilares da arquitetura', cor: '#ff0000', espessura: 2, textos: false }).ok).toBe(true);
    const c = s.modelo.mascaras[0].camadas.find((x) => x.nome === 'PILARES')!;
    expect(c).toMatchObject({ apelido: 'Pilares da arquitetura', cor: '#ff0000', espessura: 2, textos: false });
    const cfg = configuracaoDaMascara(s.modelo.mascaras[0]);
    const txt = JSON.stringify(cfg);
    expect(lerConfiguracao(txt)).toEqual(cfg);
    expect(typeof lerConfiguracao('{')).toBe('string');
    expect(typeof lerConfiguracao('{"versao":2,"camadas":[]}')).toBe('string');
    // volta ao padrão e reaplica a configuração salva
    expect(s.executar('mascara.camadas', { id: m.id, camadas: ['PILARES'], apelido: '', cor: '', espessura: 0, textos: true, visivel: false }).ok).toBe(true);
    expect(s.modelo.mascaras[0].camadas.find((x) => x.nome === 'PILARES')).toEqual({ nome: 'PILARES', visivel: false, capturavel: true });
    expect(s.executar('mascara.configurar', { id: m.id, configuracao: cfg }).ok).toBe(true);
    expect(s.modelo.mascaras[0].camadas.find((x) => x.nome === 'PILARES')).toMatchObject({ visivel: true, apelido: 'Pilares da arquitetura', espessura: 2, textos: false });
    expect(s.executar('mascara.configurar', { id: m.id, configuracao: { versao: 2 } as never }).erros[0].codigo).toBe('CONFIGURACAO_INVALIDA');
  });

  it('pavimento.remover do único grupo da vista a remove; com grupos associados, a vista fica com os outros', () => {
    const { s } = obraComGabarito();
    const m = s.modelo.mascaras[0];
    expect(s.executar('grupo.criar', { nome: 'Cobertura' }).ok).toBe(true);
    const gc = s.modelo.grupos.at(-1)!.id;
    expect(s.executar('pavimento.criar', { nome: 'Cob', cota: 30, grupo: gc }).ok).toBe(true);
    expect(s.executar('mascara.editar', { id: m.id, grupos: ['g_3', gc] }).ok).toBe(true);
    for (const p of s.modelo.pavimentos.filter((q) => q.grupo === 'g_3')) expect(s.executar('pavimento.remover', { id: p.id }).ok).toBe(true);
    expect(s.modelo.grupos.some((g) => g.id === 'g_3')).toBe(false);
    expect(s.modelo.mascaras).toHaveLength(1);
    expect(s.modelo.mascaras[0].grupo).toBe(gc);
    expect(s.modelo.mascaras[0].grupos).toBeUndefined();
  });
});

describe('ida e volta com as pranchas do edifício fictício', () => {
  const exemplo = () => {
    const e = edificioExemplo();
    const pr = montarPranchas(e.modelo, { carimbo: { empresa: 'Exemplo', responsavel: 'Eng. Exemplo', registro: 'CREA 0', data: '22/10/2026' } })[0];
    return { e, pr };
  };
  const recupera = (lido: ReturnType<typeof lerDxf>, grupoDestino: BuildingModel) => {
    expect(lido.insunits).toBe(6);
    const novo = new Sessao();
    for (const c of comandosEdificioPadrao()) novo.executar(c.nome, c.params, 'sistema');
    expect(novo.executar('mascara.importar', { grupo: 'g_3', nome: 'Formas', geo: lido.camadas, escala: 1, centralizar: false }).ok).toBe(true);
    const m = novo.modelo.mascaras[0];
    const regras = sugerirRegras(m.geo, m.escala);
    const p = propostaDeLancamento(novo.modelo, m, regras);
    void grupoDestino;
    return { p, regras };
  };

  it('DXF das formas relido: pilares e vigas voltam com a mesma geometria', () => {
    const { e, pr } = exemplo();
    const lido = lerDxf(new TextDecoder('latin1').decode(escreverDxf(pr)));
    const { p, regras } = recupera(lido, e.modelo);
    expect(regras.papeis.PILAR).toBe('pilar');
    expect(regras.papeis.VIGA).toBe('vigaFaces');
    expect(regras.papeis.EIXO).toBe('eixo');
    expect(p.pilares.filter((q) => !q.ambiguo)).toHaveLength(e.modelo.pilares.length);
    const orig = e.modelo.pilares.map((q) => `${q.x.toFixed(2)};${q.y.toFixed(2)}`).sort();
    expect(p.pilares.filter((q) => !q.ambiguo).map((q) => `${q.x.toFixed(2)};${q.y.toFixed(2)}`).sort()).toEqual(orig);
    expect(p.pilares.every((q) => q.secao.tipo === 'ret' && q.secao.b === 0.2 && q.secao.h === 0.5)).toBe(true);
    expect(p.vigas).toHaveLength(e.modelo.vigas.length);
    expect(p.vigas.every((v) => v.secao.b === 0.15)).toBe(true);
    const comp = (pts: [number, number][]) => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
    // vigas inteiras (desenhadas de centro a centro de pilar): 3 de 15 m e 4 de 9 m
    expect(p.vigas.map((v) => Math.round(comp(v.pontos))).sort((a, z) => a - z)).toEqual([9, 9, 9, 9, 15, 15, 15]);
    expect(p.eixos.length).toBeGreaterThanOrEqual(7);
  });

  it('DWG gerado pelo escritor e relido pelo leitor: o mesmo DxfLido e a mesma proposta', () => {
    const { e, pr } = exemplo();
    const r = writeDwg2018(desenhoDwg(pr));
    expect(r.skipped).toEqual([]);
    const dwg = lerDwg(r.data, { readDwg: (d) => readDwg(d), writeDxf: (d) => writeDxf(d as never) });
    const dxfLido = lerDxf(new TextDecoder('latin1').decode(escreverDxf(pr)));
    // o DWG vem só do espaço-modelo: as camadas da folha (carimbo, legenda) ficam de fora
    expect(Object.keys(dwg.camadas).sort()).toEqual(['COTA', 'EIXO', 'LAJE', 'PILAR', 'TEXTO', 'VIGA']);
    for (const c of ['PILAR', 'VIGA', 'EIXO']) expect(dwg.camadas[c].linhas.length).toBe(dxfLido.camadas[c].linhas.length);
    const { p } = recupera({ ...dwg, insunits: 6 }, e.modelo);
    expect(p.pilares.filter((q) => !q.ambiguo)).toHaveLength(e.modelo.pilares.length);
    expect(p.vigas).toHaveLength(e.modelo.vigas.length);
  });

  it('lerDwg com arquivo corrompido devolve erro em português', () => {
    expect(() => lerDwg(new Uint8Array([1, 2, 3, 4]), { readDwg: (d) => readDwg(d), writeDxf: (d) => writeDxf(d as never) })).toThrow(/Não foi possível ler o DWG/);
  });
});
