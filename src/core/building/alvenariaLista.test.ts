// E1e: listas, formulários e comandos da interface da alvenaria estrutural (funções puras de alvenariaLista.ts).
import { describe, expect, it } from 'vitest';
import { quantitativoParede, resistenciaAlvenaria } from './alvenaria';
import { dimensionarVerga, verificarPanoAlvenaria, type ResultadoAlvenariaParede } from './alvenariaDim';
import {
  aberturasBlocosDoMesmoTipo, armaduraVergaDoForm, bibliotecaDeAlvenaria, comandosDaBiblioteca, FORM_BLOCO_PADRAO, formDaVerga, formDoBloco, formDoTipo, larguraDoMaterialCm, linhasBlocos,
  linhasLadosAlv, linhasPanosAlv, linhasPontosAlv, linhasQuantitativo, linhasTiposAlvenaria, linhasVergas, mensagensAlv, paramsBloco, paramsTipoAlvenaria, paramsVergaEditar, resumoBiblioteca,
  resumoCartaoAlv, rotuloTipoParede, tiposDoTipoParede,
} from './alvenariaLista';
import { opcoesEmUso } from './opcoes';
import { FORCAS_NULAS } from './paredesArmadura';
import { nomePav, ok, padrao } from './paredesFixtures';

const op = opcoesEmUso(undefined);

function obra() {
  const s = padrao(1);
  ok(s, 'bloco.tipo', paramsBloco({ nome: 'B20', comprimentoCm: 40, larguraCm: 20, alturaCm: 20, fbk: 8, canto: 'auto' }));
  ok(s, 'alvenaria.tipo', paramsTipoAlvenaria({ ...formDoTipo(undefined, 'blocos', s.modelo.blocos![0].id), nome: 'Blocos B20' }));
  ok(s, 'alvenaria.tipo', paramsTipoAlvenaria({ ...formDoTipo(undefined, 'generica'), nome: 'Genérica' }));
  return s;
}

describe('blocos e tipos de alvenaria (listas e formulários)', () => {
  it('linhas dos blocos e dos tipos com as resistências calculadas', () => {
    const s = obra();
    expect(linhasBlocos(s.modelo)).toEqual([{ id: s.modelo.blocos![0].id, nome: 'B20', dimensoes: '40 × 20 × 20 cm', fbk: '8,00', canto: 'automático (não)', emUso: 1 }]);
    const [tb, tg] = linhasTiposAlvenaria(s.modelo);
    expect(tb).toMatchObject({ nome: 'Blocos B20', modeloTexto: 'blocos de concreto', bloco: 'B20', gama: '14,0', fd: '2,24', ftd: '0,22', fk: '4,48', E: '5120', G: '2133', nu: '0,20', armada: 'não', emUso: 0 });
    expect(tg).toMatchObject({ nome: 'Genérica', modeloTexto: 'alvenaria genérica', bloco: '—', fd: '1,20', ftd: '0,12', fk: '—', E: '1500', emUso: 0 });
  });
  it('formulário do bloco: cm em m, canto automático omitido e viagem de ida e volta', () => {
    expect(paramsBloco(FORM_BLOCO_PADRAO)).toEqual({ nome: 'Bloco 15 × 20 × 40', comprimento: 0.4, largura: 0.15, altura: 0.2, fbk: 6 });
    expect(paramsBloco({ ...FORM_BLOCO_PADRAO, canto: 'sim' }, 'bl_x')).toMatchObject({ id: 'bl_x', canto: true });
    const s = obra();
    expect(formDoBloco(s.modelo.blocos![0])).toEqual({ nome: 'B20', comprimentoCm: 40, larguraCm: 20, alturaCm: 20, fbk: 8, canto: 'auto' });
    ok(s, 'bloco.tipo', paramsBloco({ ...formDoBloco(s.modelo.blocos![0]), canto: 'nao', fbk: 10 }, s.modelo.blocos![0].id));
    expect(s.modelo.blocos![0]).toMatchObject({ canto: false, fbk: 10 });
    expect(linhasBlocos(s.modelo)[0].canto).toBe('não');
  });
  it('formulário do tipo: blocos com armadura bloqueada, edição que esvazia campos opcionais vai em `limpar`', () => {
    const s = obra();
    const bl = s.modelo.blocos![0].id;
    const f = { ...formDoTipo(undefined, 'blocos', bl), nome: 'Armada', armada: true, fpk: 20, argamassa: 6, vPhi: 12.5, vSCm: 40, hPhi: 6.3, hSCm: 40 };
    const p = paramsTipoAlvenaria(f);
    expect(p).toMatchObject({ modelo: 'blocos', bloco: bl, armada: true, fpk: 20, argamassa: 6, armadura: { vertical: { phi: 12.5, s: 0.4 }, horizontal: { phi: 6.3, s: 0.4 } } });
    expect(p.fd).toBeUndefined();
    ok(s, 'alvenaria.tipo', p);
    const t = s.modelo.tiposAlvenaria!.at(-1)!;
    expect(formDoTipo(t).vSCm).toBe(40);
    const edit = paramsTipoAlvenaria({ ...formDoTipo(t), fpk: undefined, vPhi: undefined, vSCm: undefined, hPhi: undefined, hSCm: undefined }, t.id, t);
    expect(edit.limpar).toEqual(['fpk', 'armadura']);
    ok(s, 'alvenaria.tipo', edit);
    expect(s.modelo.tiposAlvenaria!.at(-1)).toMatchObject({ armada: true });
    expect(s.modelo.tiposAlvenaria!.at(-1)!.fpk).toBeUndefined();
    expect(s.modelo.tiposAlvenaria!.at(-1)!.armadura).toBeUndefined();
    // genérica: G só com considerarG
    const g = paramsTipoAlvenaria({ ...formDoTipo(undefined, 'generica'), G: 600, considerarG: false });
    expect(g.G).toBeUndefined();
    expect(paramsTipoAlvenaria({ ...formDoTipo(undefined, 'generica'), G: 600, considerarG: true }).G).toBe(600);
  });
  it('rótulo, largura do material e tipos que servem ao tipo de parede', () => {
    const s = obra(), t1 = nomePav(s, 'Tipo 1'), terreo = nomePav(s, 'Térreo');
    const mat = s.modelo.tiposAlvenaria![0].id;
    ok(s, 'parede.criar', { pontos: [[0, 0], [3, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    ok(s, 'parede.criar', { pontos: [[0, 3], [3, 3]], espessura: 0.2 });
    expect(rotuloTipoParede(s.modelo, s.modelo.paredes![0])).toBe('Blocos (Blocos B20)');
    expect(rotuloTipoParede(s.modelo, s.modelo.paredes![1])).toBe('Concreto');
    expect(rotuloTipoParede(s.modelo, { tipo: 'alvenaria' })).toBe('Alvenaria genérica (sem tipo)');
    expect(larguraDoMaterialCm(s.modelo, mat)).toBe(20);
    expect(larguraDoMaterialCm(s.modelo, s.modelo.tiposAlvenaria![1].id)).toBeUndefined();
    expect(tiposDoTipoParede(s.modelo, 'blocos').map((t) => t.nome)).toEqual(['Blocos B20']);
    expect(tiposDoTipoParede(s.modelo, 'alvenaria').map((t) => t.nome)).toEqual(['Genérica']);
    expect(linhasTiposAlvenaria(s.modelo)[0].emUso).toBe(1);
  });
});

describe('biblioteca do usuário', () => {
  it('grava sem ids, importa em outra obra pelo nome do bloco e não duplica na segunda importação', () => {
    const s = obra();
    ok(s, 'alvenaria.tipo', { id: s.modelo.tiposAlvenaria![0].id, fpk: 12, armada: true });
    const lib = bibliotecaDeAlvenaria(s.modelo);
    expect(resumoBiblioteca(lib)).toBe('1 bloco(s) e 2 tipo(s) de alvenaria');
    expect(JSON.stringify(lib)).not.toMatch(/"id"/);
    expect(lib.tipos[0]).toMatchObject({ nome: 'Blocos B20', blocoNome: 'B20', fpk: 12, armada: true });
    // só um tipo: leva o bloco dele
    expect(bibliotecaDeAlvenaria(s.modelo, [s.modelo.tiposAlvenaria![1].id])).toMatchObject({ blocos: [], tipos: [{ nome: 'Genérica' }] });
    const outra = padrao(1);
    const cmds = comandosDaBiblioteca(outra.modelo, lib);
    expect(cmds.map((c) => c.nome)).toEqual(['bloco.tipo', 'alvenaria.tipo', 'alvenaria.tipo']);
    ok(outra, 'lote', { comandos: cmds });
    expect(outra.modelo.blocos!.length).toBe(1);
    expect(outra.modelo.tiposAlvenaria![0]).toMatchObject({ nome: 'Blocos B20', bloco: outra.modelo.blocos![0].id, fpk: 12, armada: true });
    expect(outra.modelo.tiposAlvenaria![0]).not.toHaveProperty('blocoNome');
    expect(comandosDaBiblioteca(outra.modelo, lib)).toEqual([]);
    outra.desfazer();
    expect(outra.modelo.blocos).toBeUndefined();
  });
  it('tipo de blocos com nome de bloco inexistente é recusado', () => {
    const r = padrao(1).executar('alvenaria.tipo', { nome: 'X', modelo: 'blocos', gama: 14, blocoNome: 'nao existe' });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('BLOCO_INEXISTENTE');
  });
});

describe('janela da parede: linhas', () => {
  const s = obra();
  const t1 = nomePav(s, 'Tipo 1'), terreo = nomePav(s, 'Térreo');
  ok(s, 'parede.criar', { pontos: [[0, 0], [3.2, 0]], espessura: 0.2, tipo: 'blocos', material: s.modelo.tiposAlvenaria![0].id, nasce: terreo, morre: t1 });
  ok(s, 'parede.abertura', { parede: s.modelo.paredes![0].id, s: 1, largura: 1, altura: 2, pavimento: terreo });
  const w = s.modelo.paredes![0], bl = s.modelo.blocos![0], t = s.modelo.tiposAlvenaria![0];
  const res = resistenciaAlvenaria(t, bl, op);
  const el = (ny: number, nxy = 0) => ({ s: 0.5, z: 0.5, area: 1, forcas: [{ ...FORCAS_NULAS, ny, nxy }] });
  const pano = verificarPanoAlvenaria({ nome: 'p', t: 0.2, H: 3, combos: ['C1'], op, fydV: 434.78, fydH: 434.78, passoV: 0.2, passoH: 0.2, res, elementos: [el(-100), { ...el(-100, 400), s: 1.5 }, el(-100), el(-100), el(-100)] });
  const a = w.aberturas![0];
  const verga = dimensionarVerga({ a, nomePav: 'Tipo 1', lado: 0, lance: t1, t: 0.2, bl, res, fyd: 434.78, op, hVerga: 1, hPeitoril: 0.05, verga: { combos: [{ N: 60, M: 30, V: 5 }] }, peitoril: { combos: [{ N: 0, M: 0, V: 0 }] }, modular: true, semAviso: false });
  const r: ResultadoAlvenariaParede = {
    id: w.id, nome: w.nome, tipo: 'blocos', material: t.id, nomeMaterial: t.nome, armada: false, resistencia: res,
    panos: [{ ...pano, lado: 0, nomeLado: 'L1', pavimento: t1, nomePav: 'Tipo 1', pano: 0, panos: 1, s0: 0, s1: 3.2, z0: 0, z1: 3 }], lados: [], vergas: [verga], quantitativo: quantitativoParede(s.modelo, w, bl, op),
    status: 'ok', mensagens: [],
  };
  it('panos, pontos, vergas, mensagens e resumo', () => {
    const [p] = linhasPanosAlv(r);
    expect(p).toMatchObject({ chave: `0|${t1}|0`, trecho: 'L1', lance: 'Tipo 1', intervalo: '0,00 a 3,20', vertical: '—', origem: '—', situacao: 'atende' });
    expect(p.cumprimento).toBe('80,0 % (exigido 80 %)'); // 4 de 5 elementos de mesma área atendem
    expect(p.esbeltez).toBe('15,0 (máx. 24)');
    expect(linhasPontosAlv(r)[0]).toMatchObject({ trecho: 'L1', lance: 'Tipo 1', ponto: '1,50; 0,50', limite: 'cisalhamento' });
    expect(linhasLadosAlv(r)).toEqual([]);
    const [v] = linhasVergas(r);
    expect(v).toMatchObject({ id: a.id, tipo: 'porta', dimensoes: '1,00 × 2,00 m', modular: 'sim', contraverga: '—', estribo: '—', origem: 'calculada', situacao: 'atende' });
    expect(v.verga).toMatch(/^\d+ φ/);
    expect(mensagensAlv(r).length).toBe(pano.mensagens.length);
    const rc = resumoCartaoAlv(r);
    expect(rc).toMatchObject({ material: 'Blocos B20', armada: 'não armada', situacao: 'atende', status: 'ok', panos: 1 });
    expect(rc.cumprimentoMin).toBe('80,0 %');
  });
  it('quantitativo por lance com a linha de total', () => {
    const q = linhasQuantitativo(r);
    expect(q.length).toBe(2);
    expect(q[0]).toMatchObject({ lance: 'Tipo 1', fiadas: '15', inteiros: '78', meios: '25', cantos: '0', canaletas: '5', total: '108', area: '7,60' });
    expect(q[1]).toMatchObject({ lance: 'Total', total: '108' });
    expect(linhasQuantitativo({ ...r, quantitativo: undefined })).toEqual([]);
  });
  it('formulário da verga: ida e volta, janela com contraverga e aberturas do mesmo tipo', () => {
    expect(formDaVerga()).toEqual({ n: 2, phi: 10, estriboPhi: 5, estriboSCm: 20, contravergaN: 0, contravergaPhi: 10 });
    const f = formDaVerga({ n: 3, phi: 12.5, estribo: { phi: 6.3, s: 0.4 }, contraverga: { n: 2, phi: 8 } });
    expect(f).toEqual({ n: 3, phi: 12.5, estriboPhi: 6.3, estriboSCm: 40, contravergaN: 2, contravergaPhi: 8 });
    expect(armaduraVergaDoForm(f, 'janela')).toEqual({ n: 3, phi: 12.5, estribo: { phi: 6.3, s: 0.4 }, contraverga: { n: 2, phi: 8 } });
    expect(armaduraVergaDoForm(f, 'porta')).toEqual({ n: 3, phi: 12.5, estribo: { phi: 6.3, s: 0.4 } });
    expect(paramsVergaEditar('ab_1', formDaVerga(), 'porta')).toEqual({ acao: 'editar', abertura: 'ab_1', armadura: { n: 2, phi: 10, estribo: { phi: 5, s: 0.2 } } });
    ok(s, 'parede.abertura', { parede: w.id, s: 2.2, largura: 0.8, altura: 2, pavimento: terreo });
    const [a1, a2] = s.modelo.paredes![0].aberturas!;
    expect(aberturasBlocosDoMesmoTipo(s.modelo, a1.id)).toEqual([a2.id]);
    expect(aberturasBlocosDoMesmoTipo(s.modelo, 'nao')).toEqual([]);
    ok(s, 'verga.armadura', paramsVergaEditar(a1.id, formDaVerga(), 'porta'));
    expect(s.modelo.paredes![0].aberturas![0].verga).toEqual({ n: 2, phi: 10, estribo: { phi: 5, s: 0.2 } });
  });
});
