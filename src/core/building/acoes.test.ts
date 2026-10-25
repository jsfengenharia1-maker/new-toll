// Frente N2a: ações e combinações. Combinações conferidas à mão (nbrCombinations com γ = 1,4, G favorável 1,0).
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { alertasSituacoes, comandosDoPerfil, equilibrioGlobal, fatoresDaSituacao, gamaCDoControle, perfilMateriaisDe } from './acoes';
import { caDoAbaco, interpolar, interpolarCurvas, validarAbacos, vizinhancaDoAbaco } from './abacosVento';
import { combinacoesDoEstado, combinacoesEdificio } from './combinacoes';
import { dimensionarEdificio } from './dimensionamento';
import { diagramaEmpuxo, k0, kaCoulomb, kaRankine } from './empuxo';
import { gamas } from './materiais';
import { revisarEdificio } from './revisao';
import { casosDaObra, casosParaCarga, relacaoEfetiva, type TipoEmpuxo } from './types';
import { ANTES_DESAPRUMO } from './antesDesaprumo';

/** Prédio 6 × 5 m (4 pilares de 25 × 25), 1 laje por pavimento, sem vento. */
function predio(vento = false) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  ok('lote', { comandos: [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  if (!vento) ok('vento.definir', { ativo: false });
  ok('opcoes.definir', { valores: ANTES_DESAPRUMO }); // os ELU deste arquivo são conferidos à mão sem o desaprumo global
  return { s, ok };
}

/** Prédio 10 × 8 m com 3 × 3 pilares e 4 panos (2 × 2). */
function predio2x2() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('lote', { comandos: [0, 5, 10].flatMap((x) => [0, 4, 8].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  ok('lote', { comandos: [v([[0, 0], [10, 0]]), v([[0, 4], [10, 4]]), v([[0, 8], [10, 8]]), v([[0, 0], [0, 8]]), v([[5, 0], [5, 8]]), v([[10, 0], [10, 8]])] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  ok('vento.definir', { ativo: false });
  ok('opcoes.definir', { valores: ANTES_DESAPRUMO });
  return { s, ok };
}

const nomes = (s: Sessao) => Object.fromEntries((s.modelo.casos ?? []).map((c) => [c.nome, c.id]));
const combs = (s: Sessao) => combinacoesEdificio(s.modelo, analisarEdificio(s.modelo));

describe('N2a: categorias de uso como casos (C3.13, C3.14, C3.18)', () => {
  it('duas categorias: combinações ELU, QP, frequentes e raras conferidas à mão', () => {
    const { s, ok } = predio();
    ok('grupo.editar', { id: 'g_3', uso: 'escritorio' }); // Tipo: escritório (classe B); térreo comum e cobertura: classe A
    const cs = combs(s);
    const elu = (n: string) => cs.find((c) => c.nome === n)!.fatores;
    // principal Q (ψ0 de QB = 0,7) e principal QB (ψ0 de Q = 0,5): γ = 1,4
    expect(elu('ELU G desf. · Q principal')).toEqual({ G: 1.4, Q: 1.4, QB: +(1.4 * 0.7).toFixed(4) });
    expect(elu('ELU G desf. · QB principal')).toEqual({ G: 1.4, Q: +(1.4 * 0.5).toFixed(4), QB: 1.4 });
    expect(elu('ELU G fav. · QB principal')).toEqual({ G: 1, Q: 0.7, QB: 1.4 });
    // quase permanente: ψ2 de cada categoria (Q 0,3; QB 0,4)
    expect(cs.find((c) => c.tipo === 'QP')!.fatores).toEqual({ G: 1, Q: 0.3, QB: 0.4 });
    // frequentes: principal ψ1 (Q 0,4; QB 0,6) e a outra ψ2
    expect(cs.find((c) => c.nome === 'ELS frequente · QB')!.fatores).toEqual({ G: 1, Q: 0.3, QB: 0.6 });
    // raras: principal integral + ψ1 da outra
    expect(cs.find((c) => c.nome === 'Rara · QB principal + acompanhantes')!.fatores).toEqual({ QB: 1, G: 1, Q: 0.4 });
    expect(cs.filter((c) => c.tipo === 'ELU')).toHaveLength(8); // (G desf., G fav.) × (Q, QB) × (principal, sozinha)
  });

  it('uma categoria só: igual ao caso Q único (regressão)', () => {
    const { s } = predio();
    expect(casosDaObra(s.modelo).map((c) => c.id)).toEqual(['G', 'Q']);
    expect(combs(s).filter((c) => c.tipo === 'ELU').map((c) => c.fatores)).toEqual([{ G: 1.4, Q: 1.4 }, { G: 1, Q: 1.4 }]);
  });

  it('grupo misto: cargas de área em Q e QB no mesmo grupo, sem carga variável geral (C3.18)', () => {
    const { s, ok } = predio();
    ok('grupo.editar', { id: 'g_3', uso: 'misto' });
    expect(s.modelo.grupos.find((g) => g.id === 'g_3')!.q).toBe(0);
    expect(casosParaCarga(s.modelo).map((c) => c.id)).toEqual(['G', 'Q', 'QB', 'QC']); // QB e QC já podem receber carga
    expect(casosDaObra(s.modelo).map((c) => c.id)).toEqual(['G', 'Q']);
    ok('carga.area', { grupo: 'g_3', contorno: [[0, 0], [3, 0], [3, 5], [0, 5]], valor: 1.5, caso: 'Q' });
    ok('carga.area', { grupo: 'g_3', contorno: [[3, 0], [6, 0], [6, 5], [3, 5]], valor: 3, caso: 'QB' });
    expect(casosDaObra(s.modelo).map((c) => c.id)).toEqual(['G', 'Q', 'QB']);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    expect(an.casos).toEqual(['G', 'Q', 'QB']);
    // cargas nas áreas (metade da laje em cada caso, 15 m² discretizados pela malha), nos 3 pavimentos do grupo
    expect(an.totais.Q).toBeGreaterThan(0.9 * 3 * 15 * 1.5);
    expect(an.totais.Q).toBeLessThan(1.1 * 3 * 15 * 1.5);
    expect(an.totais.QB).toBeGreaterThan(0.9 * 3 * 15 * 3);
    expect(an.totais.QB).toBeLessThan(1.1 * 3 * 15 * 3);
    // sem carga variável geral: as duas categorias combinam como ações distintas
    expect(combs(s).find((c) => c.nome === 'ELU G desf. · QB principal')!.fatores).toEqual({ G: 1.4, Q: 0.7, QB: 1.4 });
  });
});

describe('N2a: compatibilidade, arranjos e cargas móveis (C10.12, C10.13, K1.5.13)', () => {
  it('tabela de compatibilidade: incompatível, transitividade, simultâneo e volta ao derivado', () => {
    const { s, ok } = predio();
    for (const n of ['A', 'B', 'C']) ok('caso.criar', { nome: n, natureza: 'Q' });
    const id = nomes(s);
    const rel = (a: string, z: string) => relacaoEfetiva(casosDaObra(s.modelo), id[a], id[z]);
    expect(rel('A', 'B')).toBe('compativel');
    ok('caso.compatibilidade', { a: id.A, b: id.B, relacao: 'incompativel' });
    expect(rel('A', 'B')).toBe('incompativel');
    for (const c of combs(s)) expect(c.fatores[id.A] && c.fatores[id.B], c.nome).toBeFalsy();
    expect(combs(s).some((c) => c.fatores[id.A] && c.fatores[id.C])).toBe(true);
    // B×C incompatível torna A, B e C um componente: A×C passa a ser incompatível e não pode voltar a compatível
    ok('caso.compatibilidade', { a: id.B, b: id.C, relacao: 'incompativel' });
    expect(rel('A', 'C')).toBe('incompativel');
    const r = s.executar('caso.compatibilidade', { a: id.A, b: id.C, relacao: 'compativel' });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('COMPAT_TRANSITIVA');
    // simultâneo: C segue A com o mesmo fator
    ok('caso.compatibilidade', { a: id.B, b: id.C, relacao: 'compativel' });
    ok('caso.compatibilidade', { a: id.C, b: id.A, relacao: 'simultaneo' });
    expect(casosDaObra(s.modelo).find((c) => c.id === id.C)!.simultaneo).toBe(id.A);
    expect(rel('A', 'C')).toBe('simultaneo');
    // voltar a compatível o par que coincide com o derivado não guarda exceção
    ok('caso.compatibilidade', { a: id.A, b: id.B, relacao: 'compativel' });
    expect(s.modelo.compat?.some((o) => o.a === id.A && o.b === id.B)).toBeFalsy();
    // Q × W não é compatibilidade
    ok('caso.criar', { nome: 'Vt', natureza: 'W' });
    expect(s.executar('caso.compatibilidade', { a: id.A, b: nomes(s).Vt, relacao: 'incompativel' }).ok).toBe(false);
  });

  it('grupo explícito continua valendo e a opção combinarAdicionais=false torna os adicionais excludentes', () => {
    const { s, ok } = predio();
    ok('caso.criar', { nome: 'X', natureza: 'Q', grupo: 'g' });
    ok('caso.criar', { nome: 'Y', natureza: 'Q', grupo: 'g' });
    ok('caso.criar', { nome: 'Z', natureza: 'Q' });
    const id = nomes(s);
    expect(casosDaObra(s.modelo).find((c) => c.id === id.X)!.grupo).toBe('g');
    expect(casosDaObra(s.modelo).find((c) => c.id === id.Z)!.grupo).toBeUndefined();
    ok('estados.definir', { combinarAdicionais: { Q: false } });
    const g = casosDaObra(s.modelo).filter((c) => [id.X, id.Y, id.Z].includes(c.id)).map((c) => c.grupo);
    expect(new Set(g).size).toBe(1);
    expect(g[0]).toBe('g');
    for (const c of combs(s)) expect([id.X, id.Y, id.Z].filter((k) => c.fatores[k]).length, c.nome).toBeLessThanOrEqual(1);
    // a obra continua combinando Q (uso) com um dos adicionais
    expect(combs(s).some((c) => c.fatores.Q && c.fatores[id.Z])).toBe(true);
  });

  it('xadrez: 2 arranjos incompatíveis, 4 panos alternados e carga variável do grupo zerada', () => {
    const { s, ok } = predio2x2();
    expect(s.modelo.lajes.filter((l) => l.grupo === 'g_3')).toHaveLength(4);
    ok('caso.arranjos', { modo: 'xadrez', grupo: 'g_3', nome: 'Uso alternado' });
    const m = s.modelo, filhos = m.casos!.filter((c) => c.pai);
    expect(filhos).toHaveLength(2);
    expect(m.grupos.find((g) => g.id === 'g_3')!.q).toBe(0);
    const porCaso = (id: string) => m.cargas.filter((c) => c.caso === id);
    expect(porCaso(filhos[0].id)).toHaveLength(2);
    expect(porCaso(filhos[1].id)).toHaveLength(2);
    expect(porCaso(filhos[0].id)[0].valor).toBe(1.5);
    // os dois panos de um arranjo não são vizinhos (diagonal)
    const centro = (c: { pontos: [number, number][] }) => [c.pontos.reduce((t, q) => t + q[0], 0) / c.pontos.length, c.pontos.reduce((t, q) => t + q[1], 0) / c.pontos.length];
    const [a, z] = porCaso(filhos[0].id).map(centro);
    expect(Math.abs(a[0] - z[0])).toBeGreaterThan(2);
    expect(Math.abs(a[1] - z[1])).toBeGreaterThan(2);
    // o pai não combina; os arranjos nunca juntos
    const ids = casosDaObra(m).map((c) => c.id);
    expect(ids).toEqual(['G', 'Q', filhos[0].id, filhos[1].id]);
    for (const c of combs(s)) expect(c.fatores[filhos[0].id] && c.fatores[filhos[1].id], c.nome).toBeFalsy();
    expect(combs(s).filter((c) => c.nome.startsWith('ELU G desf.') && c.fatores[filhos[0].id])).not.toHaveLength(0);
    // carga lançada no pai é recusada
    const r = s.executar('carga.ponto', { grupo: 'g_3', ponto: [1, 1], valor: 5, caso: m.casos!.find((c) => !c.pai)!.id });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('CASO_COM_ARRANJOS');
    // remover o pai leva os arranjos e as cargas
    ok('caso.remover', { id: m.casos!.find((c) => !c.pai)!.id });
    expect(s.modelo.casos).toBeUndefined();
    expect(s.modelo.cargas.filter((c) => c.tipo === 'area')).toHaveLength(0);
  });

  it('faixas por direção: colunas alternadas (2 panos por arranjo, mesma coluna)', () => {
    const { s, ok } = predio2x2();
    ok('caso.arranjos', { modo: 'faixasX', grupo: 'g_3', nome: 'Faixas', valor: 2 });
    const m = s.modelo, filhos = m.casos!.filter((c) => c.pai);
    for (const f of filhos) {
      const cs = m.cargas.filter((c) => c.caso === f.id);
      expect(cs).toHaveLength(2);
      const xs = cs.map((c) => c.pontos.reduce((t, q) => t + q[0], 0) / c.pontos.length);
      expect(Math.abs(xs[0] - xs[1])).toBeLessThan(0.5); // mesma coluna
      expect(cs[0].valor).toBe(2);
    }
  });

  it('carga móvel: uma posição por passo ao longo do trajeto, incompatíveis; limite de posições', () => {
    const { s, ok } = predio();
    ok('caso.arranjos', { modo: 'movel', grupo: 'g_3', nome: 'Veículo', trajeto: [[0, 2], [3, 2], [3, 4]], passo: 2, valor: 40, carga: 'ponto' });
    const m = s.modelo, filhos = m.casos!.filter((c) => c.pai);
    // comprimento 3 + 2 = 5 m, passo 2: posições a 0, 2 e 4 m → (0;2), (2;2), (3;3)
    expect(filhos).toHaveLength(3);
    const pos = filhos.map((f) => m.cargas.find((c) => c.caso === f.id)!.pontos[0]);
    expect(pos).toEqual([[0, 2], [2, 2], [3, 3]]);
    expect(m.cargas.every((c) => c.valor === 40 && c.tipo === 'ponto')).toBe(true);
    for (const c of combs(s)) expect(filhos.filter((f) => c.fatores[f.id]).length, c.nome).toBeLessThanOrEqual(1);
    const mut = predio().s;
    const r = mut.executar('caso.arranjos', { modo: 'movel', grupo: 'g_3', nome: 'V2', trajeto: [[0, 0], [6, 0]], passo: 0.05, valor: 10 });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('ARRANJO_MUITOS');
    // carga em linha transversal ao trajeto
    const l = predio();
    l.ok('caso.arranjos', { modo: 'movel', grupo: 'g_3', nome: 'Eixo', trajeto: [[0, 2], [4, 2]], passo: 4, valor: 12, carga: 'linha', comprimento: 2, orientacao: 'transversal' });
    expect(l.s.modelo.cargas.map((c) => c.pontos)).toEqual([[[0, 1], [0, 3]], [[4, 1], [4, 3]]]);
  });
});

describe('N2a: empuxo de terra como ação (K1.5.12, K1.9.46)', () => {
  const solo = (extra: Partial<TipoEmpuxo> = {}): TipoEmpuxo => ({ id: 'e', nome: 'T', metodo: 'repouso', estratos: [{ espessura: 10, gama: 18, phi: 30 }], cotaAterro: 0, ...extra });

  it('coeficientes: K0 de Jaky, Rankine e Coulomb com talude', () => {
    expect(k0(30)).toBeCloseTo(0.5, 12);
    expect(kaRankine(30)).toBeCloseTo(1 / 3, 12);
    expect(kaRankine(30, 10)).toBeCloseTo(0.34953, 4); // cosβ(cosβ − √(cos²β − cos²φ))/(cosβ + √…)
    expect(kaCoulomb(30, 0, 0)).toBeCloseTo(1 / 3, 12);
    expect(kaCoulomb(30, 20, 0)).toBeLessThan(1 / 3); // atrito na parede reduz Ka
    expect(kaRankine(20, 30)).toBeNull();
  });

  it('diagrama homogêneo: p = K0·γ·z, resultante e braço (cálculo manual)', () => {
    const d = diagramaEmpuxo(solo(), 0, -3);
    expect(d.pontos).toHaveLength(2);
    expect(d.pontos[1].total).toBeCloseTo(0.5 * 18 * 3, 10); // 27 kPa
    expect(d.resultante).toBeCloseTo(0.5 * 27 * 3, 10); // 40,5 kN/m
    expect(d.cotaResultante).toBeCloseTo(-2, 10); // a 1 m da base
    // parede entre -1 e -3: trapézio de 9 a 27 kPa
    const t = diagramaEmpuxo(solo(), -1, -3);
    expect(t.pontos.map((p) => +p.total.toFixed(6))).toEqual([9, 27]);
    expect(t.resultante).toBeCloseTo(((9 + 27) / 2) * 2, 10);
    // sobrecarga de 10 kPa soma K0·q = 5 kPa em toda a altura
    const q = diagramaEmpuxo(solo({ sobrecarga: 10 }), 0, -3);
    expect(q.pontos[0].total).toBeCloseTo(5, 10);
    expect(q.resultante).toBeCloseTo(40.5 + 5 * 3, 10);
  });

  it('nível d\'água: γ submerso abaixo, água hidrostática e alívio por drenagem', () => {
    // NA a 1 m do topo: σv'(−3) = 18·1 + 8·2 = 34 → solo 17 kPa; água 10·2 = 20 kPa
    const d = diagramaEmpuxo(solo({ nivelAgua: -1 }), 0, -3);
    const base = d.pontos.at(-1)!;
    expect(base.solo).toBeCloseTo(17, 10);
    expect(base.agua).toBeCloseTo(20, 10);
    const na = d.pontos.find((p) => Math.abs(p.cota + 1) < 1e-9)!;
    expect(na.solo).toBeCloseTo(9, 10);
    expect(na.agua).toBe(0);
    // resultante: 0,5·9·1 + (9 + 17)/2·2 + 0,5·20·2 = 4,5 + 26 + 20
    expect(d.resultante).toBeCloseTo(50.5, 10);
    // drenagem de 50 % reduz a água à metade
    expect(diagramaEmpuxo(solo({ nivelAgua: -1, alivio: 50 }), 0, -3).resultante).toBeCloseTo(40.5, 10);
  });

  it('estratos: salto de K na interface e acima do aterro sem pressão', () => {
    const t = solo({ estratos: [{ espessura: 2, gama: 18, phi: 30 }, { espessura: 5, gama: 20, phi: 20 }] });
    const d = diagramaEmpuxo(t, 0, -4);
    const naInterface = d.pontos.filter((p) => Math.abs(p.cota + 2) < 1e-9);
    expect(naInterface).toHaveLength(2);
    expect(naInterface[0].total).toBeCloseTo((1 - Math.sin(Math.PI / 6)) * 36, 8); // K0(30°)·36
    expect(naInterface[1].total).toBeCloseTo((1 - Math.sin((20 * Math.PI) / 180)) * 36, 8); // K0(20°)·36
    expect(diagramaEmpuxo(t, 3, 1).resultante).toBe(0); // acima da cota do aterro
  });

  it('comando empuxo.tipo e caso H: γh nas ELU, G favorável 1,0, permanente nas demais', () => {
    const { s, ok } = predio();
    ok('empuxo.tipo', { nome: 'Subsolo', metodo: 'rankine', estratos: [{ espessura: 6, gama: 18, phi: 28 }], cotaAterro: -0.5, sobrecarga: 10, nivelAgua: -3, alivio: 20 });
    const tipo = s.modelo.empuxos![0];
    expect(tipo.metodo).toBe('rankine');
    expect(s.executar('empuxo.tipo', { nome: 'Ruim', metodo: 'rankine', talude: 40, estratos: [{ espessura: 3, gama: 18, phi: 20 }] }).ok).toBe(false);
    ok('caso.criar', { nome: 'Empuxo', natureza: 'H', empuxo: tipo.id, descricao: 'Parede do subsolo' });
    expect(s.executar('empuxo.tipo', { id: tipo.id, remover: true }).ok).toBe(false); // em uso
    const h = nomes(s).Empuxo;
    const cs = combs(s);
    expect(cs.find((c) => c.nome === 'ELU G desf. · Q principal')!.fatores).toEqual({ G: 1.4, [h]: 1.4, Q: 1.4 });
    expect(cs.find((c) => c.nome === 'ELU G fav. · Q principal')!.fatores).toEqual({ G: 1, [h]: 1, Q: 1.4 });
    expect(cs.find((c) => c.tipo === 'QP')!.fatores[h]).toBe(1);
    // γh próprio (1,35): só o desfavorável das ELU muda
    ok('materiais.definir', { gamas: { h: 1.35 } });
    expect(combs(s).find((c) => c.nome === 'ELU G desf. · Q principal')!.fatores).toEqual({ G: 1.4, [h]: 1.35, Q: 1.4 });
    // caso H com carga na laje: entra como permanente nos esforços (γh nas lajes)
    expect(gamas(s.modelo).h).toBe(1.35);
    // natureza do pai/filho
    expect(s.executar('caso.criar', { nome: 'Sub', natureza: 'Q', pai: h }).ok).toBe(false);
  });
});

describe('N2a: estados-limite, controle de execução e γ (C10.14, C10.16, K1.7.3, K1.8.1, K1.8.3, K1.9.27)', () => {
  it('estados.definir: concreto é fixo, modo usuário só em grupos com lista, valores iguais ao padrão não são guardados', () => {
    const { s, ok } = predio();
    expect(s.executar('estados.definir', { estados: { concreto: { ativo: false } } }).erros[0].codigo).toBe('ESTADO_FIXO');
    expect(s.executar('estados.definir', { estados: { flecha: { modo: 'usuario' } } }).erros[0].codigo).toBe('ESTADO_SEM_LISTA');
    ok('estados.definir', { estados: { flecha: { ativo: false }, solo: { modo: 'usuario' } } });
    expect(s.modelo.estados).toEqual({ flecha: { ativo: false }, solo: { modo: 'usuario' } });
    ok('estados.definir', { estados: { flecha: { ativo: true }, solo: { modo: 'norma' } } });
    expect(s.modelo.estados).toBeUndefined();
  });

  it('grupo desativado sai da revisão: flecha fora do limite deixa de ser erro', () => {
    const { s, ok } = predio();
    const an = analisarEdificio(s.modelo);
    const dim = dimensionarEdificio(s.modelo, an);
    dim.lajes[0].mensagens.push('Flecha total 99 mm > 24 mm.');
    expect(revisarEdificio(s.modelo, an, dim).itens.some((i) => i.codigo === 'FLECHA')).toBe(true);
    ok('estados.definir', { estados: { flecha: { ativo: false } } });
    expect(revisarEdificio(s.modelo, an, dim).itens.some((i) => i.codigo === 'FLECHA')).toBe(false);
  });

  it('controle de execução fixa o γc padrão; valor editado pelo usuário prevalece', () => {
    const { s, ok } = predio();
    expect([gamaCDoControle(), gamaCDoControle('desfavoravel'), gamaCDoControle('premoldado')]).toEqual([1.4, 1.54, 1.3]);
    expect(gamas(s.modelo).c).toBe(1.4);
    ok('norma.definir', { controle: 'desfavoravel' });
    expect(gamas(s.modelo).c).toBeCloseTo(1.54, 12);
    ok('norma.definir', { controle: 'premoldado' });
    expect(gamas(s.modelo).c).toBe(1.3);
    ok('materiais.definir', { gamas: { c: 1.45 } });
    expect(gamas(s.modelo).c).toBe(1.45);
    ok('norma.definir', { controle: 'normal' });
    expect(s.modelo.norma.controle).toBeUndefined();
    expect(gamas(s.modelo).c).toBe(1.45);
    // γc maior reduz fcd: o dimensionamento dos pilares muda
    const a = predio();
    a.ok('norma.definir', { controle: 'desfavoravel' });
    expect(gamas(a.s.modelo).c).toBeGreaterThan(gamas(predio().s.modelo).c);
  });

  it('perfil de materiais: gravar e aplicar reproduz a norma da obra', () => {
    const a = predio();
    a.ok('norma.definir', { fck: 35, aco: 'CA-50', controle: 'premoldado' });
    a.ok('materiais.definir', { fck: { pilar: 40 }, aco: { vigaEstribo: 'CA-60' }, gamas: { s: 1.2 } });
    const perfil = perfilMateriaisDe(a.s.modelo);
    const b = predio();
    for (const c of comandosDoPerfil(perfil)) b.ok(c.nome, c.params);
    expect(b.s.modelo.norma).toEqual(a.s.modelo.norma);
  });
});

describe('N2a: situações do usuário e alerta de responsabilidade (C10.17 a C10.20, K1.7.5)', () => {
  it('importar da norma reproduz exatamente as combinações de cada grupo de estados', () => {
    const { s, ok } = predio();
    ok('caso.criar', { nome: 'Água', natureza: 'Q', grupo: 'r' });
    ok('caso.criar', { nome: 'Vazio', natureza: 'Q', grupo: 'r' });
    ok('caso.criar', { nome: 'Impacto', natureza: 'E' });
    for (const estado of ['concreto', 'solo', 'fissuracao'] as const) {
      ok('situacao.importar', { estado });
      const norma = combinacoesDoEstado(s.modelo, analisarEdificio(s.modelo), estado);
      const user = s.modelo.situacoes!.filter((x) => x.estado === estado);
      expect(user.map((x) => x.nome)).toEqual(norma.map((c) => c.nome));
      expect(user.map((x) => fatoresDaSituacao(x))).toEqual(norma.map((c) => c.fatores));
    }
    expect(s.modelo.situacoes!.some((x) => x.situacao === 'excepcional')).toBe(true);
    // importar de novo substitui
    const n = s.modelo.situacoes!.length;
    ok('situacao.importar', { estado: 'solo' });
    expect(s.modelo.situacoes).toHaveLength(n);
    // grupo sem lista é recusado
    expect(s.executar('situacao.importar', { estado: 'flecha' }).erros[0].codigo).toBe('ESTADO_SEM_LISTA');
  });

  it('importar com a lista da análise mantém o vento ampliado por 0,95·γz', () => {
    const { s, ok } = predio(true);
    const an = analisarEdificio(s.modelo);
    const norma = combinacoesEdificio(s.modelo, an).filter((c) => c.tipo === 'ELU');
    ok('situacao.importar', { estado: 'concreto', combinacoes: norma.map((c) => ({ nome: c.nome, fatores: c.fatores })) });
    const user = s.modelo.situacoes!.filter((x) => x.estado === 'concreto');
    expect(user.map((x) => fatoresDaSituacao(x))).toEqual(norma.map((c) => c.fatores));
    expect(alertasSituacoes({ ...s.modelo, estados: { concreto: { modo: 'usuario' } } }, combinacoesEdificio(s.modelo, an))).toEqual([]);
  });

  it('γ e ψ separados: fator = γ·ψ; criar, copiar, editar e apagar', () => {
    const { s, ok } = predio();
    ok('situacao.criar', { nome: 'ELU própria', estado: 'concreto', modo: 'gamapsi', gama: { G: 1.4, Q: 1.4 }, psi: { G: 1, Q: 0.5 } });
    const sit = s.modelo.situacoes![0];
    expect(fatoresDaSituacao(sit)).toEqual({ G: 1.4, Q: 0.7 });
    ok('situacao.criar', { nome: 'Cópia', copiarDe: sit.id });
    expect(s.modelo.situacoes![1]).toMatchObject({ estado: 'concreto', modo: 'gamapsi', gama: { G: 1.4, Q: 1.4 } });
    expect(s.executar('situacao.criar', { nome: 'Cópia', copiarDe: sit.id }).erros[0].codigo).toBe('SITUACAO_REPETIDA');
    ok('situacao.editar', { id: sit.id, modo: 'fatores' });
    expect(s.modelo.situacoes![0]).toMatchObject({ modo: 'fatores', fatores: { G: 1.4, Q: 0.7 } });
    expect(s.executar('situacao.editar', { id: sit.id, fatores: { Inexistente: 1 } }).erros[0].codigo).toBe('CASO_INEXISTENTE');
    ok('situacao.remover', { ids: [sit.id] });
    expect(s.modelo.situacoes).toHaveLength(1);
  });

  it('alerta de responsabilidade: fator do usuário abaixo do da norma gera COMB_USUARIO na revisão e no dimensionamento', () => {
    const { s, ok } = predio();
    ok('situacao.importar', { estado: 'concreto' });
    ok('estados.definir', { estados: { concreto: { modo: 'usuario' } } });
    let an = analisarEdificio(s.modelo);
    expect(dimensionarEdificio(s.modelo, an).avisosAcoes).toBeUndefined(); // importada: sem alerta
    // reduz o fator de Q de 1,4 para 1,2 em todas as situações
    for (const sit of s.modelo.situacoes!) if (sit.fatores.Q) ok('situacao.editar', { id: sit.id, fatores: { ...sit.fatores, Q: 1.2 } });
    an = analisarEdificio(s.modelo);
    const dim = dimensionarEdificio(s.modelo, an);
    expect(dim.avisosAcoes).toHaveLength(1);
    expect(dim.avisosAcoes![0]).toMatch(/Combinações do usuário.*Concreto armado.*fator máximo de Q = 1,2.*abaixo de 1,4 da norma/);
    const rev = revisarEdificio(s.modelo, an, dim);
    expect(rev.itens.find((i) => i.codigo === 'COMB_USUARIO')).toMatchObject({ nivel: 'aviso', tipo: 'obra' });
    // o dimensionamento usa as combinações do usuário: o momento de cálculo da viga cai (Q de 1,4 para 1,2)
    const ref = dimensionarEdificio(predio().s.modelo, analisarEdificio(predio().s.modelo));
    expect(dim.vigas.map((v) => v.nome)).toEqual(ref.vigas.map((v) => v.nome));
    expect(Math.max(...dim.vigas.map((v) => v.Mpos))).toBeLessThan(Math.max(...ref.vigas.map((v) => v.Mpos)));
    // modo norma volta a ignorar as situações
    ok('estados.definir', { estados: { concreto: { modo: 'norma' } } });
    expect(dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)).avisosAcoes).toBeUndefined();
  });

  it('grupo em modo usuário sem situações usa as da norma', () => {
    const { s, ok } = predio();
    ok('estados.definir', { estados: { solo: { modo: 'usuario' } } });
    const an = analisarEdificio(s.modelo);
    expect(combinacoesDoEstado(s.modelo, an, 'solo').map((c) => c.nome)).toEqual(combinacoesEdificio(s.modelo, an).filter((c) => c.tipo === 'RARA').map((c) => c.nome));
  });
});

describe('N2a: equilíbrio global (EQU) (K1.8.1)', () => {
  it('fórmula conferida à mão com cargas e forças fabricadas', () => {
    const { s } = predio();
    const [p1, p2, p3, p4] = s.modelo.pilares; // (0,0) (6,0) (6,5) (0,5)
    const fund = [[p1, 300], [p2, 100], [p3, 100], [p4, 300]].map(([p, N]) => ({ pilar: (p as { id: string }).id, caso: 'G', N: N as number, Vx: 0, Vy: 0, Mx: 0, My: 0 }));
    const vento = { classe: 'A' as const, altura: 9, gamaZ: [], casos: [{ nome: 'W0°', direcao: 0 as const, exc: 0 as const, forcas: [{ pavimento: 'a', zona: 0, z: 3, altura: 3, largura: 5, larguraCorrigida: 5, s2: 1, vk: 1, q: 1, F: 20, Mz: 0 }, { pavimento: 'b', zona: 0, z: 6, altura: 3, largura: 5, larguraCorrigida: 5, s2: 1, vk: 1, q: 1, F: 30, Mz: 0 }] }, { nome: 'W90°', direcao: 90 as const, exc: 0 as const, forcas: [{ pavimento: 'a', zona: 0, z: 3, altura: 3, largura: 5, larguraCorrigida: 5, s2: 1, vk: 1, q: 1, F: 50, Mz: 0 }] }] };
    const r = equilibrioGlobal(s.modelo, { fundacao: fund, vento }, { equGamaFav: 0.9, equGamaVento: 1.4 });
    expect(r).toHaveLength(2);
    // vento a 0° (para +X): aresta em x = 6,125; braços 6,125 (pilares em x = 0) e 0,125 (x = 6)
    const Mest0 = 0.9 * (600 * 6.125 + 200 * 0.125), Minst0 = 1.4 * (20 * 3 + 30 * 6);
    expect(r[0].Mest).toBeCloseTo(Mest0, 9);
    expect(r[0].Minst).toBeCloseTo(Minst0, 9);
    expect(r[0].FS).toBeCloseTo(Mest0 / Minst0, 9);
    expect(r[0].ok).toBe(true);
    // 90° (para +Y): aresta em y = 5,125; braços 5,125 (y = 0) e 0,125 (y = 5)
    expect(r[1].Mest).toBeCloseTo(0.9 * (400 * 5.125 + 400 * 0.125), 9);
    expect(r[1].Minst).toBeCloseTo(1.4 * 50 * 3, 9);
    expect(r[1].W).toBe(800);
    // edifício esbelto: vento grande derruba (FS < 1)
    const forte = { ...vento, casos: vento.casos.map((c) => ({ ...c, forcas: c.forcas.map((f) => ({ ...f, F: f.F * 40 })) })) };
    const f = equilibrioGlobal(s.modelo, { fundacao: fund, vento: forte }, { equGamaFav: 0.9, equGamaVento: 1.4 });
    expect(f[0].ok).toBe(false);
    expect(f[0].FS).toBeLessThan(1);
  });

  it('no dimensionamento: resultado por direção, aviso quando não atende e grupo desativável', () => {
    const { s, ok } = predio(true);
    let an = analisarEdificio(s.modelo);
    let dim = dimensionarEdificio(s.modelo, an);
    expect(dim.equilibrio).toHaveLength(4);
    expect(dim.equilibrio!.every((e) => e.ok && e.FS > 1)).toBe(true);
    expect(dim.avisosAcoes).toBeUndefined();
    // γ do vento no máximo, permanentes minoradas a 0,5 e vento 60 m/s: fica abaixo de 1 em alguma direção?
    ok('opcoes.definir', { valores: { equGamaFav: 0.5, equGamaVento: 2 } });
    ok('vento.definir', { v0: 60 });
    an = analisarEdificio(s.modelo);
    dim = dimensionarEdificio(s.modelo, an);
    for (const e of dim.equilibrio!) expect(e.ok).toBe(e.Mest >= e.Minst);
    if (dim.equilibrio!.some((e) => !e.ok)) expect(revisarEdificio(s.modelo, an, dim).itens.some((i) => i.codigo === 'EQU_TOMBAMENTO' && i.nivel === 'erro')).toBe(true);
    ok('estados.definir', { estados: { equilibrio: { ativo: false } } });
    expect(dimensionarEdificio(s.modelo, an).equilibrio).toBeUndefined();
  });
});

describe('N2a: vento — ábacos e platibanda (K1.5.23, K1.5.27, K1.5.29)', () => {
  it('interpolação linear nos pontos e entre curvas (cálculo manual)', () => {
    expect(interpolar([[1, 1], [2, 1.4]], 1.5)).toEqual({ y: 1.2, fora: false });
    expect(interpolar([[1, 1], [2, 1.4]], 3)).toEqual({ y: 1.4, fora: true });
    expect(interpolar([], 1)).toBeNull();
    const curvas = [{ param: 1, pontos: [[1, 1], [2, 1.4]] as [number, number][] }, { param: 3, pontos: [[1, 1.2], [2, 1.6]] as [number, number][] }];
    // h/l1 = 2 (meio das curvas), l1/l2 = 1,5: (1,2 + 1,4)/2
    expect(interpolarCurvas(curvas, 2, 1.5)!.y).toBeCloseTo(1.3, 12);
    expect(interpolarCurvas(curvas, 1, 1)!).toEqual({ y: 1, fora: false });
    expect(interpolarCurvas(curvas, 5, 1)!.fora).toBe(true);
    expect(caDoAbaco(undefined, 1, 1, 1)).toBeNull();
    expect(caDoAbaco({ caAlta: curvas }, 2, 2, 1.5)!.y).toBeCloseTo(1.3, 12);
    expect(vizinhancaDoAbaco({ vizinhanca: [[0.5, 1.3], [1.5, 1.0]] }, 1)!.y).toBeCloseTo(1.15, 12);
    expect(validarAbacos({ caBaixa: [{ param: 1, pontos: [[2, 1], [1, 1]] }] })[0]).toMatch(/abscissas devem crescer/);
    expect(validarAbacos({ caBaixa: [{ param: 1, pontos: [] }, { param: 1, pontos: [] }] })[0]).toMatch(/repetido/);
  });

  it('Ca automático: recusado com a tabela vazia; com a tabela, F proporcional ao Ca do ábaco', () => {
    const { s, ok } = predio(true);
    const r = s.executar('vento.definir', { caAuto: 1 });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('ABACO_VAZIO');
    const F0 = analisarEdificio(s.modelo).vento!.casos.find((c) => c.nome === 'W0°')!.forcas.map((f) => f.F);
    // tabela constante de 1,04 (= 0,8 × 1,3) em qualquer h/l1 e l1/l2
    ok('vento.definir', { abacos: { caBaixa: [{ param: 1, pontos: [[0.2, 1.04], [5, 1.04]] }] }, caAuto: 1 });
    const an = analisarEdificio(s.modelo);
    const F1 = an.vento!.casos.find((c) => c.nome === 'W0°')!.forcas.map((f) => f.F);
    F1.forEach((f, i) => expect(f).toBeCloseTo((F0[i] * 1.04) / 1.3, 9));
    expect(an.vento!.ca).toMatchObject({ x: 1.04, y: 1.04, auto: true });
    // tabela esvaziada: volta ao Ca informado
    ok('vento.definir', { abacos: { caBaixa: [] } });
    expect(s.modelo.vento!.caAuto).toBeUndefined();
    expect(s.modelo.vento!.abacos).toBeUndefined();
    // alta turbulência sem tabela: recusado
    expect(s.executar('vento.definir', { caAuto: 2 }).ok).toBe(false);
  });

  it('fator de vizinhança automático pela distância e fallback com aviso fora da faixa', () => {
    const { s, ok } = predio(true);
    expect(s.executar('vento.definir', { vizAuto: true }).erros[0].codigo).toBe('ABACO_VAZIO');
    const F0 = analisarEdificio(s.modelo).vento!.casos.find((c) => c.nome === 'W0°')!.forcas[0].F;
    ok('vento.definir', { abacos: { vizinhanca: [[0.5, 1.3], [1.5, 1.0]] }, vizAuto: true, vizDist: 5.25 }); // d/l1 = 5,25/5,25... l1 = ly = 5,25 (vento em X) → 1,0
    const an = analisarEdificio(s.modelo);
    expect(an.vento!.viz).toMatchObject({ auto: true });
    expect(an.vento!.viz!.x).toBeCloseTo(1.15, 12); // d/l1 = 1: 1,3 + (1 − 0,5)·(1,0 − 1,3)/(1,5 − 0,5)
    expect(analisarEdificio(s.modelo).vento!.casos.find((c) => c.nome === 'W0°')!.forcas[0].F).toBeCloseTo(F0 * 1.15, 9);
    ok('vento.definir', { vizDist: 50 }); // fora da faixa: valor da ponta (1,0) e aviso
    const fora = analisarEdificio(s.modelo);
    expect(fora.avisos.some((a) => /vizinhança.*fora da faixa/.test(a))).toBe(true);
    expect(fora.vento!.viz!.x).toBe(1);
  });

  it('platibanda: largura corrigida b′ = b·(2a + h)/h na meia faixa dá a área b·(h/2 + a)', () => {
    const { s, ok } = predio(true);
    const w = () => analisarEdificio(s.modelo).vento!.casos.find((c) => c.nome === 'W0°')!.forcas;
    const sem = w();
    ok('vento.definir', { platibanda: 1 });
    const com = w();
    const u = com.at(-1)!, u0 = sem.at(-1)!;
    const h = 3; // pé-direito dos pavimentos
    expect(u.larguraCorrigida).toBeCloseTo(u.largura * (2 * 1 + h) / h, 9);
    expect(u.F / u0.F).toBeCloseTo((h / 2 + 1) / (h / 2), 9);
    expect(com.slice(0, -1).map((f) => f.larguraCorrigida)).toEqual(com.slice(0, -1).map((f) => f.largura));
  });
});

describe('N2a: descrição do caso (C10.8)', () => {
  it('descrição guardada, alterada e removida', () => {
    const { s, ok } = predio();
    ok('caso.criar', { nome: 'Sobrecarga de obra', natureza: 'Q', descricao: 'Equipamentos de montagem' });
    const id = nomes(s)['Sobrecarga de obra'];
    expect(casosDaObra(s.modelo).find((c) => c.id === id)!.descricao).toBe('Equipamentos de montagem');
    ok('caso.editar', { id, descricao: 'Montagem do pré-moldado' });
    expect(s.modelo.casos![0].descricao).toBe('Montagem do pré-moldado');
    ok('caso.editar', { id, descricao: '' });
    expect(s.modelo.casos![0].descricao).toBeUndefined();
  });
});
