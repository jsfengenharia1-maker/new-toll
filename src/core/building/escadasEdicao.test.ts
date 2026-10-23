// Escadas, E4b: inserção, mover, girar, copiar, duplicar lance, bloqueio de tipo, biblioteca e seleção.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { geometriaEscada, nomeSequencial, tiposLanceDisponiveis } from './escadas';
import {
  anguloDeInsercao, deltaPorPontos, escadasNaJanela, escadasNoPonto, escadasPorGrupo, exportarTiposLance, girarPonto, lerBibliotecaTiposLance, previaInsercao, tiposLanceIguais,
} from './escadasEdicao';
import { OPCOES_PADRAO_CALCULO } from './opcoes';

const E = 0.5 / 3, PISO = 0.2967;
function obra() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((x) => x.mensagem).join(' ')}`).toBe(true); };
  ok('escada.criar', { id: 'e1', grupo: 'g_3', origem: [2, 3], angulo: 20, piso: PISO, espelho: E, lances: [{ tipo: 'pre:meia-volta-9-9' }] });
  return { s, ok };
}
const geo = (s: Sessao, id: string) => { const b = s.modelo; return geometriaEscada(b.escadas!.find((e) => e.id === id)!, tiposLanceDisponiveis(b), b); };
const planta = (s: Sessao, id: string) => geo(s, id).lances.flatMap((l) => l.planta).flat();
const perto = (a: number[][], b: number[][]) => { expect(a).toHaveLength(b.length); a.forEach((p, i) => { expect(p[0]).toBeCloseTo(b[i][0], 9); expect(p[1]).toBeCloseTo(b[i][1], 9); }); };

describe('E4b: direção de inserção e transformações', () => {
  it('ângulo pelos dois cliques e ortogonal', () => {
    expect(anguloDeInsercao([0, 0], [1, 1])).toBeCloseTo(45, 9);
    expect(anguloDeInsercao([0, 0], [-1, 0])).toBe(180);
    expect(anguloDeInsercao([1, 1], [1, 0])).toBe(270);
    expect(anguloDeInsercao([0, 0], [5, 0.4], true)).toBe(0);
    expect(anguloDeInsercao([0, 0], [0.3, -5], true)).toBe(270);
    expect(anguloDeInsercao([2, 2], [2, 2])).toBeNull();
  });
  it('delta de giro por pontos', () => {
    expect(deltaPorPontos([0, 0], [1, 0], [0, 1])).toBeCloseTo(90, 9);
    expect(deltaPorPontos([0, 0], [1, 0], [0, -1])).toBeCloseTo(-90, 9);
    expect(deltaPorPontos([0, 0], [0, 0], [0, 1])).toBeNull();
  });
});

describe('E4b: mover, girar e copiar mantêm a geometria (tolerância 1e-9)', () => {
  it('mover desloca todo o contorno', () => {
    const { s, ok } = obra();
    const antes = planta(s, 'e1');
    ok('escada.mover', { ids: ['e1'], dx: 4.5, dy: -2 });
    perto(planta(s, 'e1'), antes.map((p) => [p[0] + 4.5, p[1] - 2]));
    expect(s.modelo.escadas![0].origem).toEqual([6.5, 1]);
  });
  it('girar em torno do início do lance gira o contorno e soma o ângulo', () => {
    const { s, ok } = obra();
    const antes = planta(s, 'e1');
    ok('escada.girar', { ids: ['e1'], angulo: 70 });
    perto(planta(s, 'e1'), antes.map((p) => girarPonto(p, [2, 3], 70)));
    expect(s.modelo.escadas![0].angulo).toBeCloseTo(90, 9);
    expect(s.modelo.escadas![0].origem).toEqual([2, 3]);
  });
  it('girar em torno de um centro gira também a origem; 360° é recusado', () => {
    const { s, ok } = obra();
    const antes = planta(s, 'e1');
    ok('escada.girar', { ids: ['e1'], angulo: -30, centro: [0, 0] });
    perto(planta(s, 'e1'), antes.map((p) => girarPonto(p, [0, 0], -30)));
    expect(s.executar('escada.girar', { ids: ['e1'], angulo: 360 }).ok).toBe(false);
  });
  it('copiarDe copia dados e lances com ids novos, nome em sequência, e troca o giro (escada simétrica)', () => {
    const { s, ok } = obra();
    ok('escada.dados', { id: 'e1', corrimao: 0.4, execucao: 'alvenaria' });
    ok('escada.copiarDe', { de: 'e1', id: 'e2', dx: 0, dy: 6, giro: 'dir' });
    const [a, b] = s.modelo.escadas!;
    expect(b.nome).toBe('E2');
    expect(b.origem).toEqual([2, 9]);
    expect([b.giro, b.corrimao, b.execucao, b.angulo]).toEqual(['dir', 0.4, 'alvenaria', 20]);
    expect(b.lances).toHaveLength(1);
    expect(b.lances[0].id).not.toBe(a.lances[0].id);
    expect(b.lances[0].tipo).toBe(a.lances[0].tipo);
    expect(a.giro).toBeUndefined();
    // o giro à direita leva o patamar para o outro lado: o contorno não é a cópia deslocada
    const deslocada = planta(s, 'e1').map((p) => [p[0], p[1] + 6]);
    const copia = planta(s, 'e2');
    expect(copia.some((p, i) => Math.abs(p[0] - deslocada[i][0]) > 1e-6 || Math.abs(p[1] - deslocada[i][1]) > 1e-6)).toBe(true);
  });
  it('copiar sem trocar nada reproduz o contorno deslocado', () => {
    const { s, ok } = obra();
    ok('escada.copiarDe', { de: 'e1', dx: 0, dy: 6 });
    perto(planta(s, s.modelo.escadas![1].id), planta(s, 'e1').map((p) => [p[0], p[1] + 6]));
  });
  it('escada.editar muda dados e posição; remover apaga várias e o desfazer restaura', () => {
    const { s, ok } = obra();
    ok('escada.editar', { id: 'e1', origem: [5, 5], angulo: 0, largura: 1.0 });
    expect(s.modelo.escadas![0]).toMatchObject({ origem: [5, 5], angulo: 0, largura: 1.0 });
    ok('escada.copiarDe', { de: 'e1', dx: 10, dy: 0 });
    ok('escada.remover', { ids: ['e1', s.modelo.escadas![1].id] });
    expect(s.modelo.escadas).toBeUndefined();
    s.desfazer();
    expect(s.modelo.escadas).toHaveLength(2);
    expect(s.executar('escada.remover', { ids: ['nao'] }).erros[0].codigo).toBe('ESCADA_INEXISTENTE');
  });
});

describe('E4b: lance.duplicar e nomes em sequência', () => {
  it('o lance duplicado vai para o topo, sem pavimento nem cota fixos', () => {
    const { s, ok } = obra();
    ok('lance.editar', { escada: 'e1', lance: s.modelo.escadas![0].lances[0].id, pavimento: s.modelo.pavimentos[1].id, cotaInicial: 3.02 });
    const l0 = s.modelo.escadas![0].lances[0];
    ok('lance.duplicar', { escada: 'e1', lance: l0.id });
    const ls = s.modelo.escadas![0].lances;
    expect(ls).toHaveLength(2);
    expect(ls[1].id).not.toBe(l0.id);
    expect(ls[1].tipo).toBe(l0.tipo);
    expect(ls[1].pavimento).toBeUndefined();
    expect(ls[1].cotaInicial).toBeUndefined();
    ok('lance.duplicar', { escada: 'e1', lance: l0.id, vezes: 2 });
    expect(s.modelo.escadas![0].lances).toHaveLength(4);
  });
  it('nomeSequencial', () => {
    const { s } = obra();
    expect(nomeSequencial(s.modelo)).toBe('E2');
    expect(nomeSequencial(s.modelo, 'E1')).toBe('E2');
    expect(nomeSequencial(s.modelo, 'E9')).toBe('E10');
    expect(nomeSequencial(s.modelo, 'Escada A')).toBe('Escada A 2');
  });
  it('inserção repetida numera em sequência, mesmo depois de remover uma', () => {
    const { s, ok } = obra();
    for (let i = 0; i < 3; i++) ok('escada.criar', { grupo: 'g_3', origem: [10 * (i + 1), 0], nome: nomeSequencial(s.modelo, s.modelo.escadas!.at(-1)!.nome), piso: PISO, espelho: E, lances: [{ tipo: 'pre:reto-18' }] });
    expect(s.modelo.escadas!.map((e) => e.nome)).toEqual(['E1', 'E2', 'E3', 'E4']);
    ok('escada.remover', { ids: [s.modelo.escadas![1].id] });
    ok('escada.criar', { grupo: 'g_3', origem: [0, 20], piso: PISO, espelho: E, lances: [{ tipo: 'pre:reto-18' }] });
    expect(s.modelo.escadas!.map((e) => e.nome)).toEqual(['E1', 'E3', 'E4', 'E5']);
  });
});

describe('E4b: tipo de lance bloqueado, desbloqueio e biblioteca', () => {
  it('tipo em uso recusa edição; desbloqueio permite; novo bloqueio recusa', () => {
    const { s, ok } = obra();
    const t = s.modelo.tiposLance![0].id;
    const r = s.executar('tipoLance.editar', { id: t, tipo: { trechos: [8, 8] } });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('TIPO_LANCE_BLOQUEADO');
    ok('tipoLance.desbloquear', { id: t });
    ok('tipoLance.editar', { id: t, tipo: { trechos: [8, 8] } });
    expect(s.modelo.tiposLance![0].trechos).toEqual([8, 8]);
    expect(s.modelo.tiposLance![0].desbloqueado).toBe(true);
    ok('tipoLance.desbloquear', { id: t, desbloquear: false });
    expect(s.executar('tipoLance.editar', { id: t, tipo: { trechos: [9, 9] } }).ok).toBe(false);
  });
  it('tipo sem uso edita livremente; copiar não herda o desbloqueio', () => {
    const { s, ok } = obra();
    ok('tipoLance.criar', { id: 'x', tipo: { nome: 'X', tipologia: 'reto', trechos: [10] } });
    ok('tipoLance.editar', { id: 'x', tipo: { trechos: [11] } });
    const usado = s.modelo.tiposLance![0].id;
    ok('tipoLance.desbloquear', { id: usado });
    ok('tipoLance.copiar', { de: usado, nome: 'Cópia' });
    expect(s.modelo.tiposLance!.at(-1)!.desbloqueado).toBeUndefined();
  });
  it('exportar e importar: ida e volta sem duplicar, ids novos, inválidos recusados', () => {
    const { s, ok } = obra();
    ok('tipoLance.criar', { id: 'x', tipo: { nome: 'Fundação', tipologia: 'reto', trechos: [20], desnivelInicial: 0.15, degrausIniciais: 2 } });
    const bib = exportarTiposLance(s.modelo);
    expect(bib.tipos).toHaveLength(2); // a cópia do predefinido usado em e1 + o criado
    expect(bib.tipos.every((t) => !('id' in t) && !('predefinido' in t))).toBe(true);
    expect(exportarTiposLance(s.modelo, ['x']).tipos).toHaveLength(1);
    const nova = new Sessao();
    for (const c of comandosEdificioPadrao()) nova.executar(c.nome, c.params, 'sistema');
    const lido = lerBibliotecaTiposLance(JSON.stringify(bib), OPCOES_PADRAO_CALCULO);
    expect(lido.erros).toEqual([]);
    expect(nova.executar('tipoLance.importar', { tipos: lido.tipos }).ok).toBe(true);
    expect(nova.modelo.tiposLance).toHaveLength(2);
    expect(nova.modelo.tiposLance!.map((t) => t.id)).not.toContain('x');
    expect(nova.executar('tipoLance.importar', { tipos: lido.tipos }).ok).toBe(true);
    expect(nova.modelo.tiposLance).toHaveLength(2);
    expect(exportarTiposLance(nova.modelo).tipos.every((t, i) => tiposLanceIguais(t, bib.tipos[i]))).toBe(true);
    const ruim = lerBibliotecaTiposLance({ formato: 'statikos-tipos-lance', versao: 1, tipos: [{ nome: 'Ruim', tipologia: 'reto', trechos: [10], desnivelInicial: 0.05 }, { nome: 'Z', tipologia: 'reto', trechos: [5], foo: 1 }] }, OPCOES_PADRAO_CALCULO);
    expect(ruim.tipos).toHaveLength(0);
    expect(ruim.erros).toHaveLength(2);
    expect(lerBibliotecaTiposLance('não é json', OPCOES_PADRAO_CALCULO).erros[0]).toContain('JSON');
    expect(lerBibliotecaTiposLance({ formato: 'outro' }, OPCOES_PADRAO_CALCULO).erros).toHaveLength(1);
    expect(nova.executar('tipoLance.importar', { tipos: [{ nome: 'Ruim', tipologia: 'reto', trechos: [10], desnivelInicial: 0.05 }] }).ok).toBe(false);
  });
});

describe('E4b: prévia, erro geométrico e seleção', () => {
  it('prévia aponta ESCADA_ALTURA e tipo inexistente; escada válida não tem erro', () => {
    const { s } = obra();
    const bom = previaInsercao(s.modelo, { grupo: 'g_3', origem: [0, 0], angulo: 0, dados: { piso: PISO, espelho: E }, lances: [{ tipo: 'pre:reto-18' }] });
    expect(bom.erros).toEqual([]);
    expect(bom.geometria.caixa).not.toBeNull();
    const ruim = previaInsercao(s.modelo, { grupo: 'g_3', origem: [0, 0], angulo: 0, dados: { piso: PISO, espelho: 0.2 }, lances: [{ tipo: 'pre:reto-18' }] });
    expect(ruim.erros.join(' ')).toContain('não fecha o desnível');
    expect(previaInsercao(s.modelo, { grupo: 'g_3', origem: [0, 0], angulo: 0, lances: [{ tipo: 'nada' }] }).erros.join(' ')).toContain('não existe');
    expect(previaInsercao(s.modelo, { grupo: 'g_3', origem: [0, 0], angulo: 0, lances: [] }).erros).toContain('A escada precisa de ao menos um lance.');
    expect(previaInsercao(s.modelo, { grupo: 'zz', origem: [0, 0], angulo: 0, lances: [{ tipo: 'pre:reto-18' }] }).erros.length).toBeGreaterThan(0);
  });
  it('prévia coincide com a escada criada com os mesmos dados', () => {
    const { s } = obra();
    const pv = previaInsercao(s.modelo, { grupo: 'g_3', origem: [2, 3], angulo: 20, dados: { piso: PISO, espelho: E }, lances: [{ tipo: 'pre:meia-volta-9-9' }] });
    perto(pv.geometria.lances.flatMap((l) => l.planta).flat(), planta(s, 'e1'));
  });
  it('seleção por janela', () => {
    const { s, ok } = obra();
    ok('escada.criar', { id: 'e2', grupo: 'g_3', origem: [40, 40], angulo: 0, piso: PISO, espelho: E, lances: [{ tipo: 'pre:reto-18' }] });
    const c = geo(s, 'e1').caixa!;
    const meio: [number, number] = [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2];
    expect(escadasNaJanela(s.modelo, 'g_3', [c[0] - 1, c[1] - 1, c[2] + 1, c[3] + 1])).toEqual(['e1']);
    expect(escadasNaJanela(s.modelo, 'g_3', [meio[0], meio[1], meio[0] + 0.1, meio[1] + 0.1])).toEqual([]);
    expect(escadasNaJanela(s.modelo, 'g_3', [meio[0], meio[1], meio[0] + 0.1, meio[1] + 0.1], 'cruza')).toEqual(['e1']);
    expect(escadasNaJanela(s.modelo, 'g_3', [-1000, -1000, 1000, 1000])).toEqual(['e1', 'e2']);
    expect(escadasNaJanela(s.modelo, 'outro', [-1000, -1000, 1000, 1000])).toEqual([]);
  });
  it('clique dentro do contorno devolve a escada; fora, nada', () => {
    const { s } = obra();
    const q = geo(s, 'e1').lances[0].planta[0];
    const cx = q.reduce((a, p) => a + p[0], 0) / q.length, cy = q.reduce((a, p) => a + p[1], 0) / q.length;
    expect(escadasNoPonto(s.modelo, 'g_3', [cx, cy])).toEqual(['e1']);
    expect(escadasNoPonto(s.modelo, 'g_3', [500, 500])).toEqual([]);
    expect(escadasNoPonto(s.modelo, 'g_3', [500, 500], 0.1)).toEqual([]);
    expect(escadasNoPonto(s.modelo, 'g_4', [cx, cy])).toEqual([]);
  });
  it('lista por grupo', () => {
    const { s } = obra();
    const l = escadasPorGrupo(s.modelo);
    expect(l).toHaveLength(1);
    expect(l[0].escadas[0]).toMatchObject({ nome: 'E1', lances: 1, degraus: 18 });
  });
});
