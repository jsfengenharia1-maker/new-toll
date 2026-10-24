import { beforeAll, describe, expect, it } from 'vitest';
import { aplicarComando } from '../commands';
import { edificioVazio, type BuildingModel } from '../building/types';
import { verificar } from '../building/verify';
import { fixtureIfc, lidoFicticio } from './fixtureIfc';
import { acoDoTexto, fckDoTexto, lerIfc, type ApiIfc, type IfcLido } from './ler';
import { materiaisSugeridos } from './materiais';
import { agruparPavimentos, mapeamentoPadrao, propostaIfc } from './proposta';
import { iniciarIfc, type ModuloIfc } from './web';
import { memorialIfc } from './memorial';

// web-ifc em Node: a devDependency (compilação para Node), carregada por require para não depender do bundler
let api: ApiIfc;
const ler = (txt: string): IfcLido => lerIfc(api, new TextEncoder().encode(txt));
const lerArquivo = async (): Promise<string> => {
  const FS = 'node:fs';
  const fs = (await import(/* @vite-ignore */ FS)) as { readFileSync: (p: string, c: string) => string };
  return fs.readFileSync(new URL('./fixtures/edificio.ifc', import.meta.url).pathname, 'utf8');
};

beforeAll(async () => {
  const M = 'node:module';
  const { createRequire } = (await import(/* @vite-ignore */ M)) as { createRequire: (u: string) => (n: string) => unknown };
  api = await iniciarIfc(createRequire(import.meta.url)('web-ifc') as ModuloIfc);
});

const perto = (a: number, b: number, t = 1e-5) => expect(Math.abs(a - b)).toBeLessThanOrEqual(t);

describe('L3: leitura do IFC (web-ifc em Node)', () => {
  it('IFC4 em metros: pavimentos, cotas, pilares, vigas, laje com abertura e materiais', () => {
    const l = ler(fixtureIfc());
    expect(l.esquema).toBe('IFC4');
    expect(l.unidade).toBe(1);
    expect(l.projeto).toBe('Edificio Ficticio');
    expect(l.edificio).toBe('Bloco A');
    expect(l.pavimentos.map((p) => [p.nome, p.cota])).toEqual([['Pavimento 1', 0], ['Pavimento 2', 3]]);
    expect(l.colunas).toHaveLength(8);
    const p1 = l.colunas.filter((c) => c.pavimento === l.pavimentos[0].id).sort((a, b) => a.id - b.id);
    expect(p1.map((c) => [c.x, c.y, c.angulo])).toEqual([[0, 0, 0], [5, 0, 0], [5, 4, 90], [0, 4, 0]]);
    expect(p1[0].secao).toEqual({ tipo: 'ret', b: 0.2, h: 0.4 });
    expect(p1[1].secao).toEqual({ tipo: 'circ', d: 0.3 });
    expect(p1[2].secao).toEqual({ tipo: 'ret', b: 0.2, h: 0.4 });
    expect(p1[3].secao).toEqual({ tipo: 'ret', b: 0.25, h: 0.25 });
    expect(p1.map((c) => [c.z0, c.z1])).toEqual([[0, 3], [0, 3], [0, 3], [0, 3]]);
    expect(l.vigas).toHaveLength(8);
    const v1 = l.vigas.filter((v) => v.pavimento === l.pavimentos[0].id).sort((a, b) => a.id - b.id);
    expect(v1.map((v) => v.pontos)).toEqual([[[0, 0], [5, 0]], [[5, 0], [5, 4]], [[5, 4], [0, 4]], [[0, 4], [0, 0]]]);
    for (const v of l.vigas) { expect(v.b).toBe(0.15); expect(v.h).toBe(0.4); }
    expect(l.vigas.filter((v) => v.pavimento === l.pavimentos[1].id)[0].zTopo).toBe(3);
    expect(l.lajes).toHaveLength(2);
    const s = l.lajes[0];
    expect(s.contorno).toEqual([[-0.1, -0.1], [5.1, -0.1], [5.1, 4.1], [-0.1, 4.1]]);
    expect(s.espessura).toBe(0.12);
    expect(s.predefinido).toBe('FLOOR');
    expect(s.furos).toHaveLength(1);
    const f = s.furos[0];
    expect(Math.min(...f.map((q) => q[0]))).toBe(2); expect(Math.max(...f.map((q) => q[0]))).toBe(3);
    expect(Math.min(...f.map((q) => q[1]))).toBe(1.5); expect(Math.max(...f.map((q) => q[1]))).toBe(2.5);
    expect(l.materiais.map((m) => [m.nome, m.fck, m.aco])).toEqual([['Concreto C30', 30, undefined], ['CA-50', undefined, 'CA-50'], ['Concreto C25', 25, undefined]]);
    expect(l.colunas[0].materiais).toEqual(['Concreto C30', 'CA-50']);
    expect(l.lajes[0].materiais).toEqual(['Concreto C25']);
    expect(l.classes).toEqual({ IFCCOLUMN: 8, IFCBEAM: 8, IFCSLAB: 2 });
    expect(l.avisos).toEqual([]);
  });

  it('IFC2X3 em milímetros recupera a mesma geometria em metros', () => {
    const a = ler(fixtureIfc()), b = ler(fixtureIfc({ esquema: 'IFC2X3', unidade: 'mm' }));
    expect(b.esquema).toBe('IFC2X3');
    expect(b.unidade).toBe(0.001);
    expect(b.pavimentos.map((p) => p.cota)).toEqual([0, 3]);
    expect(b.colunas.map((c) => [c.x, c.y, c.angulo, c.secao, c.z0, c.z1])).toEqual(a.colunas.map((c) => [c.x, c.y, c.angulo, c.secao, c.z0, c.z1]));
    expect(b.vigas.map((v) => [v.pontos, v.b, v.h])).toEqual(a.vigas.map((v) => [v.pontos, v.b, v.h]));
    expect(b.lajes.map((s) => [s.contorno, s.furos, s.espessura])).toEqual(a.lajes.map((s) => [s.contorno, s.furos, s.espessura]));
    expect(b.materiais.map((m) => m.nome)).toEqual(a.materiais.map((m) => m.nome));
  });

  it('o arquivo da pasta fixtures (até 20 KB) é o gerado pelo fixtureIfc e traz brep, paredes e fundações', async () => {
    const txt = await lerArquivo();
    expect(txt.length).toBeLessThanOrEqual(20 * 1024);
    expect(txt).toBe(fixtureIfc({ pilarBrep: true, paredes: true, fundacoes: true }));
    const l = ler(txt);
    // pilar sem extrusão: caixa envolvente da malha, com aviso
    const pb = l.colunas.find((c) => c.nome === 'PB1')!;
    expect(pb.aproximado).toBe(true);
    expect([pb.x, pb.y, pb.secao, pb.z0, pb.z1]).toEqual([2, 2, { tipo: 'ret', b: 0.3, h: 0.3 }, 0, 3]);
    expect(l.avisos.map((a) => a.codigo)).toEqual(['IFC_APROXIMADO']);
    // paredes (extrusão do retângulo) e relatório de classes
    expect(l.paredes.map((w) => [w.nome, w.pontos, w.espessura, w.z0, w.z1])).toEqual([
      ['Parede concreto', [[7, 1], [9, 1]], 0.2, 0, 3], ['Parede alvenaria', [[7, 3], [9, 3]], 0.14, 0, 3],
    ]);
    expect(l.classes).toEqual({ IFCCOLUMN: 9, IFCBEAM: 8, IFCSLAB: 2, IFCWALL: 2, IFCFOOTING: 1, IFCPILE: 1 });
    expect(l.outros.map((o) => o.classe)).toEqual(['IFCFOOTING', 'IFCPILE']);
  });

  it('arquivo inválido lança erro em português; texto vazio não derruba', () => {
    expect(() => ler('isto não é um IFC')).toThrow();
  });

  it('classe de resistência pelo nome e pelo rótulo', () => {
    expect(fckDoTexto('Concreto C30')).toBe(30);
    expect(fckDoTexto('C30/37')).toBe(30);
    expect(fckDoTexto('Concreto fck 35 MPa')).toBe(35);
    expect(fckDoTexto('CA-50')).toBeUndefined();
    expect(fckDoTexto('Concreto')).toBeUndefined();
    expect(acoDoTexto('Aço CA-60')).toBe('CA-60');
    expect(acoDoTexto('CA50')).toBe('CA-50');
    expect(acoDoTexto('Concreto C30')).toBeUndefined();
  });
});

describe('L3: proposta de lançamento', () => {
  it('pavimentos de planta idêntica formam um grupo; pilares contínuos nascem na fundação e vão ao último pavimento', () => {
    const l = lidoFicticio();
    const g = agruparPavimentos(l);
    expect([...g.values()]).toEqual(['Tipo', 'Tipo']);
    const m = mapeamentoPadrao(l);
    expect(m.obra.nome).toBe('Edificio Ficticio');
    expect(m.materiais.pilar).toEqual({ material: 'Concreto C30', fck: 30, aco: 'CA-50' });
    expect(m.materiais.laje).toEqual({ material: 'Concreto C25', fck: 25 });
    const p = propostaIfc(l, m, 'x.ifc');
    expect(p.grupos).toHaveLength(1);
    expect(p.pavimentos.map((x) => [x.nome, x.cota])).toEqual([['Pavimento 1', 0], ['Pavimento 2', 3]]);
    expect(p.pilares).toHaveLength(4);
    for (const q of p.pilares) { expect(q.nasce).toBe('fundacao'); expect(q.morre).toBe(p.pavimentos[1].chave); expect(q.secoes).toEqual([]); expect(q.origem).toMatch(/^ifc:Col0/); }
    expect(p.pilares.map((q) => [q.x, q.y, q.angulo])).toEqual([[0, 0, 0], [5, 0, 0], [0, 4, 0], [5, 4, 90]]);
    expect(p.vigas).toHaveLength(4);
    expect(p.vigas.map((v) => v.origem)).toEqual(['ifc:Vig00', 'ifc:Vig01', 'ifc:Vig02', 'ifc:Vig03']);
    expect(p.lajes).toHaveLength(1);
    expect(p.lajes[0].h).toBe(0.12);
    expect(p.contagens).toMatchObject({ pavimentos: 2, grupos: 1, pilares: 4, vigas: 4, lajes: 1, paredes: 0, ambiguos: 0 });
  });

  it('sem agrupar, cada pavimento tem as suas vigas e lajes e o pilar de cima nasce no pavimento 1', () => {
    const l = lidoFicticio({ andares: 3 });
    const m = mapeamentoPadrao(l);
    m.pavimentos.forEach((p) => { p.grupo = p.nome; });
    const p = propostaIfc(l, m);
    expect(p.grupos).toHaveLength(3);
    expect(p.vigas).toHaveLength(12);
    expect(p.lajes).toHaveLength(3);
    expect(p.pilares).toHaveLength(4);
    expect(p.pilares[0]).toMatchObject({ nasce: 'fundacao', morre: p.pavimentos[2].chave });
  });

  it('seção diferente em um lance vira seção por lance; posição diferente quebra o pilar', () => {
    const l = lidoFicticio({ andares: 3 });
    const c = l.colunas.find((x) => x.pavimento === l.pavimentos[1].id && x.nome.startsWith('P1-'))!;
    c.secao = { tipo: 'ret', b: 0.2, h: 0.3 };
    const c2 = l.colunas.find((x) => x.pavimento === l.pavimentos[1].id && x.nome.startsWith('P4-'))!;
    c2.x = 0.5;
    const m = mapeamentoPadrao(l);
    const p = propostaIfc(l, m);
    const p1 = p.pilares.find((q) => q.x === 0 && q.y === 0)!;
    expect(p1.secao).toEqual({ tipo: 'ret', b: 0.2, h: 0.4 });
    expect(p1.secoes).toEqual([{ pavimento: p.pavimentos[2].chave, secao: { tipo: 'ret', b: 0.2, h: 0.3 } }]);
    // P4: o do 1º pavimento vai até o pavimento 2; o deslocado nasce no pavimento 2 e vai ao 3
    const p4 = p.pilares.filter((q) => q.y === 4 && q.x !== 5);
    expect(p4).toHaveLength(2); // (0; 4) do 1º lance e o deslocado de 0,5 m; o do 3º pavimento não alcança lance acima
    expect(p.pilares).toHaveLength(5);
  });

  it('planta diferente dentro de um grupo gera ambíguo e só vale a do representante', () => {
    const l = lidoFicticio();
    l.vigas = l.vigas.filter((v) => !(v.pavimento === l.pavimentos[1].id && v.nome.startsWith('V4')));
    const m = mapeamentoPadrao(l);
    expect(new Set(m.pavimentos.map((x) => x.grupo)).size).toBe(2); // plantas diferentes: grupos separados por padrão
    m.pavimentos[1].grupo = m.pavimentos[0].grupo;
    const p = propostaIfc(l, m);
    expect(p.ambiguos.map((a) => a.codigo)).toEqual(['GRUPO_DIFERENTE']);
    expect(p.vigas).toHaveLength(4);
    expect(p.ignorados.find((x) => x.classe === 'IFCBEAM')?.quantidade).toBe(3);
  });

  it('extremo da viga dentro do pilar vai ao centro; fora, fica; opção desligada não mexe', () => {
    const l = lidoFicticio();
    const v = l.vigas[0];
    v.pontos = [[0.1, 0], [4.9, 0.02]]; // pontas na face do pilar retangular (0,0) e dentro do círculo (5,0)
    const m = mapeamentoPadrao(l);
    const p = propostaIfc(l, m);
    expect(p.vigas[0].pontos).toEqual([[0, 0], [5, 0]]);
    expect(p.contagens.extremosAjustados).toBe(2);
    m.ajustarExtremos = false;
    expect(propostaIfc(l, m).vigas[0].pontos).toEqual([[0.1, 0], [4.9, 0.02]]);
  });

  it('lajes de fundo e patamares ficam de fora; pavimento desmarcado some; classes só de relatório aparecem', () => {
    const l = lidoFicticio();
    l.lajes[0].predefinido = 'BASESLAB';
    l.classes = { ...l.classes, IFCSTAIRFLIGHT: 2, IFCMEMBER: 3 };
    const m = mapeamentoPadrao(l);
    m.pavimentos[1].incluir = false;
    const p = propostaIfc(l, m);
    expect(p.lajes).toHaveLength(0);
    expect(p.ignorados.map((x) => x.classe).sort()).toEqual(['IFCBEAM', 'IFCCOLUMN', 'IFCMEMBER', 'IFCSLAB', 'IFCSLAB', 'IFCSTAIRFLIGHT']);
    expect(p.pavimentos).toHaveLength(1);
    // pilares do pavimento 2 ficam de fora; os do 1 não alcançam outro pavimento depois do único incluído -> fundação até o 1
    expect(p.pilares).toHaveLength(4);
    expect(p.pilares[0]).toMatchObject({ nasce: 'fundacao', morre: p.pavimentos[0].chave });
  });

  it('coordenadas georreferenciadas são deslocadas para perto da origem', () => {
    const l = lidoFicticio();
    for (const c of l.colunas) { c.x += 500000; c.y += 7000000; }
    for (const v of l.vigas) v.pontos = v.pontos.map(([x, y]) => [x + 500000, y + 7000000]);
    for (const s of l.lajes) { s.contorno = s.contorno.map(([x, y]) => [x + 500000, y + 7000000]); s.furos = s.furos.map((f) => f.map(([x, y]) => [x + 500000, y + 7000000])); }
    const p = propostaIfc(l, mapeamentoPadrao(l));
    expect(p.deslocamento).toEqual([-500000, -7000000]);
    expect(p.pilares[0].x).toBe(0); expect(p.pilares[0].y).toBe(0);
    expect(p.avisos.join(' ')).toMatch(/deslocadas/);
  });

  it('materiais sem classe reconhecida ficam vazios (vale o da obra); fck fora da faixa vira ambíguo', () => {
    const sem = lidoFicticio({ semMateriais: true });
    expect(materiaisSugeridos(sem)).toEqual({ pilar: {}, viga: {}, laje: {}, fundacao: {} });
    const l = lidoFicticio();
    const m = mapeamentoPadrao(l);
    m.materiais.viga = { fck: 150 };
    const p = propostaIfc(l, m);
    expect(p.ambiguos.map((a) => a.codigo)).toEqual(['IFC_FCK_FORA_DA_FAIXA']);
    expect(p.materiais.viga).toEqual({});
  });
});

describe('L3: comando ifc.importar', () => {
  const aplicar = (b: BuildingModel, l: IfcLido = lidoFicticio(), ajusta?: (m: ReturnType<typeof mapeamentoPadrao>) => void) => {
    const m = mapeamentoPadrao(l);
    ajusta?.(m);
    const proposta = propostaIfc(l, m, 'edificio.ifc', b);
    return aplicarComando(b, 'ifc.importar', { proposta });
  };

  it('gera grupo, pavimentos, pilares, vigas, laje com abertura, materiais e registro da origem', () => {
    const r = aplicar(edificioVazio());
    expect(r.ok, JSON.stringify(r.erros)).toBe(true);
    const b = r.modelo;
    expect(b.obra.origem).toBe('ifc');
    expect(b.obra.nome).toBe('Edificio Ficticio');
    expect(b.pavimentos.map((p) => [p.nome, p.cota])).toEqual([['Pavimento 1', 0], ['Pavimento 2', 3]]);
    expect(b.grupos).toHaveLength(1);
    expect(b.pavimentos[0].grupo).toBe(b.pavimentos[1].grupo);
    expect(b.pilares.map((p) => [p.nome, p.x, p.y, p.angulo, p.ajuste, p.nasce, p.morre, p.secao])).toEqual([
      ['P1', 0, 0, 0, 'c', 'fundacao', b.pavimentos[1].id, { tipo: 'ret', b: 0.2, h: 0.4 }],
      ['P2', 5, 0, 0, 'c', 'fundacao', b.pavimentos[1].id, { tipo: 'circ', d: 0.3 }],
      ['P3', 0, 4, 0, 'c', 'fundacao', b.pavimentos[1].id, { tipo: 'ret', b: 0.25, h: 0.25 }],
      ['P4', 5, 4, 90, 'c', 'fundacao', b.pavimentos[1].id, { tipo: 'ret', b: 0.2, h: 0.4 }],
    ]);
    expect(b.pilares.every((p) => p.origemLancamento?.startsWith('ifc:'))).toBe(true);
    expect(b.vigas).toHaveLength(4);
    for (const v of b.vigas) { expect(v.grupo).toBe(b.grupos[0].id); expect(v.secao).toEqual({ b: 0.15, h: 0.4 }); expect(v.alinhamento).toBe('centro'); }
    expect(b.lajes).toHaveLength(1);
    expect(b.lajes[0].tipo).toEqual({ tipo: 'macica', h: 0.12 });
    expect(b.lajes[0].contorno).toHaveLength(4);
    const area = b.lajes[0].contorno.reduce((s, q, i, a) => { const z = a[(i + 1) % a.length]; return s + q[0] * z[1] - z[0] * q[1]; }, 0) / 2;
    perto(area, 20, 1e-6); // pano pelo eixo das vigas (5 × 4), não o contorno do IfcSlab
    expect(b.lajes[0].furos).toHaveLength(1);
    expect(b.norma.fckElem).toEqual({ laje: 25 }); // pilar e viga C30 = fck da obra (30)
    expect(b.norma.acoPos).toBeUndefined(); // CA-50 = aço da obra
    expect(b.obra.ifc).toMatchObject({ arquivo: 'edificio.ifc', esquema: 'IFC4', unidade: 1, lancados: { pavimentos: 2, pilares: 4, vigas: 4, lajes: 1, furos: 1, paredes: 0, pulados: 0 } });
    expect(b.obra.ifc!.materiais.find((x) => x.tipo === 'laje')).toEqual({ tipo: 'laje', material: 'Concreto C25', fck: 25 });
    expect(verificar(b).filter((d) => d.severidade === 'erro' && /IFC|PILAR|VIGA|LAJE|PAVIMENTO/.test(d.codigo))).toEqual([]);
  });

  it('reimportar o mesmo arquivo não duplica nada', () => {
    const r1 = aplicar(edificioVazio());
    const r2 = aplicar(r1.modelo);
    expect(r2.ok).toBe(true);
    const b = r2.modelo;
    expect([b.pavimentos.length, b.grupos.length, b.pilares.length, b.vigas.length, b.lajes.length]).toEqual([2, 1, 4, 4, 1]);
    expect(b.obra.ifc!.lancados).toMatchObject({ pavimentos: 0, pilares: 0, vigas: 0, lajes: 0, pulados: 8 });
    const p = propostaIfc(lidoFicticio(), mapeamentoPadrao(lidoFicticio()), 'x.ifc', r1.modelo);
    expect(p.jaLancados).toHaveLength(p.contagens.pilares + p.contagens.vigas + p.contagens.lajes);
  });

  it('IFC lido do arquivo: aplicar gera modelo sem erro de lançamento (cadeia web-ifc → proposta → comando)', async () => {
    const l = ler(await lerArquivo());
    const m = mapeamentoPadrao(l);
    expect(m.pavimentos.map((p) => p.grupo)).toEqual(['Tipo', 'Tipo']); // pilar e parede extras só do pavimento 1 não mudam a planta (vigas e lajes iguais)
    const p = propostaIfc(l, m, 'edificio.ifc');
    const r = aplicarComando(edificioVazio(), 'ifc.importar', { proposta: p });
    expect(r.ok, JSON.stringify(r.erros)).toBe(true);
    expect(r.modelo.pilares).toHaveLength(5);
    expect(r.modelo.paredes).toHaveLength(1);
    expect(r.modelo.paredes![0]).toMatchObject({ tipo: 'concreto', pontos: [[7, 1], [9, 1]], esq: 0.1, dir: 0.1, nasce: 'fundacao' });
    expect(p.ignorados.map((x) => x.classe).sort()).toEqual(['IFCFOOTING', 'IFCPILE', 'IFCWALL']);
  });

  it('proposta inválida é recusada com mensagem', () => {
    const r = aplicarComando(edificioVazio(), 'ifc.importar', { proposta: { arquivo: 'x', grupos: [], pavimentos: [], pilares: [{ origem: 'a', nasce: 'fundacao', morre: 'nao' }], vigas: [], lajes: [], paredes: [] } });
    expect(r.ok).toBe(false);
    expect(r.erros?.[0].codigo).toBe('PROPOSTA_INVALIDA');
  });

  it('pavimento já existente na mesma cota é reaproveitado', () => {
    const v = aplicarComando(edificioVazio(), 'pavimento.criar', { nome: 'Térreo', cota: 0 }).modelo;
    const r = aplicar(v);
    expect(r.ok).toBe(true);
    expect(r.modelo.pavimentos.map((p) => p.nome)).toEqual(['Térreo', 'Pavimento 2']);
  });
});

describe('L3: memorial', () => {
  it('lista arquivo, esquema, mapeamento de materiais e relatório', () => {
    const b = aplicarComando(edificioVazio(), 'ifc.importar', { proposta: propostaIfc(lidoFicticio(), mapeamentoPadrao(lidoFicticio()), 'edificio.ifc') }).modelo;
    const mem = memorialIfc(b)!;
    expect(mem.cabecalho.find((x) => x[0] === 'Arquivo')?.[1]).toBe('edificio.ifc');
    expect(mem.cabecalho.find((x) => x[0] === 'Esquema')?.[1]).toBe('IFC4');
    expect(mem.materiais.find((x) => x.tipo === 'Lajes')).toMatchObject({ material: 'Concreto C25', fck: '25 MPa' });
    expect(mem.relatorio.find((x) => x[0] === 'Pilares lançados')?.[1]).toBe('4');
    expect(memorialIfc(edificioVazio())).toBeNull();
  });
});
