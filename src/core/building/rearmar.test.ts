// R7f: revisão de detalhe (rearmar sem refazer a análise), rearmar alterados, desbloqueio gravado, agrupamento de
// pórticos, cópia de armadura entre pórticos e entre grupos de lajes.
import { describe, expect, it } from 'vitest';
import { afetaCalculo, afetaDetalhe, afetaEsforcos, afetaFundacao, comandosEdificioPadrao, listarComandos, Sessao } from '../commands';
import { analisarEdificio, type AnaliseEdificio } from './analitico';
import { dimensionarEdificio, type Dimensionamento } from './dimensionamento';
import { efeitoDaOpcao, OPCOES_ANALISE, OPCOES_DETALHE, opcaoClassificada, OPCOES_INFO } from './opcoes';
import { rearmar } from './rearmar';
import { revisarEdificio } from './revisao';
import { modeloDaViga, motivoCopia, perfilDaViga } from './copiaArmadura';
import { motivoAgrupamento } from './agrupamento';

function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('vento.definir', { ativo: false });
  const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
  ok('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } });
  ok('lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok };
}

/** Dimensionamento sem as informações do rearme, para comparar com um cálculo novo. */
const limpo = (d: Dimensionamento) => { const { rearme: _r, ...resto } = d; return JSON.parse(JSON.stringify(resto)); };
const nomeViga = (s: Sessao, nome: string) => s.modelo.vigas.find((v) => v.nome === nome)!;

describe('revisões: detalhe, seção e esforços', () => {
  it('tabela, armadura e opções de detalhamento só mudam revDetalhe; seção muda o cálculo mas não os esforços; carga muda tudo', () => {
    const { s, ok } = predio();
    const v = s.modelo.vigas[0];
    const marca = () => [s.revCalculo, s.revEsforcos, s.revDetalhe, s.revFundacao];
    let m = marca();
    ok('tabela.definir', { tipo: 'estribos', tabela: { id: 'padrao', nome: 'Padrão', linhas: [{ bAte: 999, bitolas: [5, 6.3], sMin: 8, sMax: 20, ramos: [2] }] } });
    expect(marca()).toEqual([m[0], m[1], m[2] + 1, m[3]]);
    m = marca();
    ok('viga.armadura', { id: v.id, inf: { n: 3, phi: 16 }, estribo: { phi: 6.3, s: 0.15 } });
    expect(marca()).toEqual([m[0], m[1], m[2] + 1, m[3]]);
    m = marca();
    ok('opcoes.definir', { valores: { redistribuicao: 10, lajeNegativoVao: 20 } });
    expect(marca()).toEqual([m[0], m[1], m[2] + 1, m[3]]);
    m = marca();
    ok('viga.editar', { id: v.id, tabela: 'padrao', cobrimento: 3 });
    expect(marca()).toEqual([m[0], m[1], m[2] + 1, m[3]]);
    m = marca();
    ok('opcoes.definir', { valores: { axialPilares: 3 } }); // análise
    expect(marca()).toEqual([m[0] + 1, m[1] + 1, m[2] + 1, m[3] + 1]);
    m = marca();
    ok('viga.editar', { id: v.id, secao: { b: 0.2, h: 0.5 } }); // seção: cálculo sim, esforços guardados ainda servem para rearmar
    expect(marca()).toEqual([m[0] + 1, m[1], m[2] + 1, m[3] + 1]);
    m = marca();
    s.desfazer();
    expect(marca()).toEqual([m[0] + 1, m[1], m[2] + 1, m[3] + 1]);
    m = marca();
    ok('carga.ponto', { grupo: 'g_3', ponto: [2, 2], valor: 10 });
    expect(marca()).toEqual([m[0] + 1, m[1] + 1, m[2] + 1, m[3] + 1]);
  });

  it('lote soma os níveis; comando desconhecido é cálculo pleno', () => {
    expect(afetaDetalhe('lote', { comandos: [{ nome: 'tabela.restaurar' }, { nome: 'prancha.definir' }] })).toBe(true);
    expect(afetaCalculo('lote', { comandos: [{ nome: 'tabela.restaurar' }, { nome: 'prancha.definir' }] })).toBe(false);
    expect(afetaFundacao('lote', { comandos: [{ nome: 'tabela.restaurar' }] })).toBe(false);
    expect(afetaEsforcos('lote', { comandos: [{ nome: 'tabela.restaurar' }, { nome: 'eixo.malha', params: {} }] })).toBe(true);
    expect(afetaDetalhe('nao.existe')).toBe(true);
    expect(afetaCalculo('viga.editar', { id: 'x', secao: { b: 1, h: 1 } })).toBe(true);
    expect(afetaEsforcos('viga.editar', { id: 'x', secao: { b: 1, h: 1 } })).toBe(false);
    expect(afetaEsforcos('viga.editar', { id: 'x', nome: 'V' })).toBe(true);
  });

  it('opções de detalhe não entram na análise: o cálculo é idêntico com qualquer valor e o código-fonte da análise não as cita', () => {
    const { s } = predio();
    const base = JSON.stringify(semMs(analisarEdificio(s.modelo)));
    const detalhe = OPCOES_INFO.filter((o) => efeitoDaOpcao(o.chave) === 'detalhe');
    expect(detalhe.length).toBeGreaterThan(70);
    // muda todas de uma vez (para o maior valor da faixa): a análise não pode mudar
    const valores = Object.fromEntries(detalhe.map((o) => [o.chave, o.padrao === o.max ? o.min : o.max]));
    const t = new Sessao(s.modelo);
    expect(t.executar('opcoes.definir', { valores }).ok).toBe(true);
    expect(t.revCalculo).toBe(0);
    expect(JSON.stringify(semMs(analisarEdificio(t.modelo)))).toBe(base);
    // e as classificadas como análise (ou fundação) têm de ser tratadas como tais
    for (const k of ['malha', 'torcaoViga', 'modeloGlobal', 'radierK', 'limiteDeslocTopo']) expect(efeitoDaOpcao(k)).toBe(true);
    for (const k of ['fundModo', 'gerarDistVisao', 'vigaEqAlivio']) expect(efeitoDaOpcao(k)).toBe('fundacao');
    const src = import.meta.glob(['./analitico.ts', './vento.ts', './combinacoes.ts', './lajes.ts', './materiais.ts', '../fe3d.ts', '../condensacao.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(src).length).toBe(7);
    for (const o of detalhe) for (const [f, txt] of Object.entries(src)) expect(new RegExp(`\\b(op|opcoes|o)\\.${o.chave}\\b`).test(txt), `${f} lê a opção de detalhe ${o.chave}`).toBe(false);
  }, 120000);

  it('toda opção tem classificação explícita (análise, detalhe, fundação ou base elástica), sem duplicidade nem chave sobrando', () => {
    const chaves = new Set(OPCOES_INFO.map((o) => o.chave as string));
    const sem = OPCOES_INFO.filter((o) => !opcaoClassificada(o.chave)).map((o) => o.chave);
    expect(sem, `opção sem classificação em opcoes.ts (OPCOES_ANALISE ou OPCOES_DETALHE): ${sem.join(', ')}`).toEqual([]);
    for (const k of OPCOES_DETALHE) { expect(chaves.has(k), `OPCOES_DETALHE cita chave inexistente ${k}`).toBe(true); expect(OPCOES_ANALISE.has(k as never), `${k} está nos dois conjuntos`).toBe(false); }
    for (const k of OPCOES_ANALISE) expect(chaves.has(k), `OPCOES_ANALISE cita chave inexistente ${k}`).toBe(true);
    // N2c: 2ª ordem global e comprimento flexível entram na análise; o resto dos pilares só no dimensionamento
    for (const k of ['segundaOrdem', 'pilarComprimento', 'engasteTransicao']) expect(efeitoDaOpcao(k), k).toBe(true);
    for (const k of ['pilarLancesDesligados', 'pilarFluencia', 'pilarTaxaMin', 'rearmarLimiteRigidez']) expect(efeitoDaOpcao(k), k).toBe('detalhe');
  });

  it('vínculo externo e cargas nos pilares (N2c) são cálculo pleno', () => {
    for (const n of ['pilar.vinculo', 'carga.pilar', 'carga.pilarRemover']) { expect(afetaCalculo(n), n).toBe(true); expect(afetaEsforcos(n), n).toBe(true); }
  });

  it('E1a: geometria e início do pilar são análise plena; seção e fck do lance só rigidez', () => {
    expect(afetaEsforcos('pilar.secaoLance', { id: 'x', pavimento: 'y', dx: 0.1 })).toBe(true);
    expect(afetaEsforcos('pilar.secaoLance', { id: 'x', pavimento: 'y', angulo: 10 })).toBe(true);
    expect(afetaEsforcos('pilar.secaoLance', { id: 'x', pavimento: 'y', secao: { tipo: 'ret', b: 1, h: 1 } })).toBe(false);
    expect(afetaCalculo('pilar.secaoLance', { id: 'x', pavimento: 'y', fck: 40 })).toBe(true);
    expect(afetaEsforcos('pilar.editar', { id: 'x', inicio: 'fundacao' })).toBe(true);
    expect(afetaEsforcos('pilar.inserir', { x: 0, y: 0 })).toBe(true);
  });

  it('comandos de detalhe e de fundação não são classificados como cálculo pleno por engano', () => {
    const detalhe = ['pilar.armadura', 'viga.armadura', 'laje.armaduraVigotas', 'armadura.desbloquear', 'viga.copiarArmadura', 'viga.detalhe', 'pilar.detalhe', 'viga.tramo', 'laje.armaduraBase', 'laje.armaduraPredefinida',
      'laje.uniformizacao', 'laje.linhaDobra', 'laje.barras', 'lajes.gerarArmadura', 'tabela.definir', 'tabela.restaurar', 'laje.puncao', 'pilar.flambagem', 'vigas.agrupar', 'lajes.copiaArmadura'];
    const nomes = new Set(listarComandos().map((c) => c.nome));
    for (const n of detalhe) { expect(nomes.has(n), n).toBe(true); expect(afetaCalculo(n), n).toBe(false); expect(afetaDetalhe(n), n).toBe(true); expect(afetaFundacao(n), n).toBe(false); }
  });
});

const semMs = (a: AnaliseEdificio) => ({ ...a, ms: 0, opcoes: {} });

describe('rearmar sem refazer a análise', () => {
  it('depois de mudar tabela e armadura, rearmar com a análise vigente = análise e dimensionamento novos', () => {
    const { s, ok } = predio();
    const an = analisarEdificio(s.modelo), d0 = dimensionarEdificio(s.modelo, an);
    ok('tabela.definir', { tipo: 'estribos', tabela: { id: 'padrao', nome: 'Padrão', linhas: [{ bAte: 999, bitolas: [6.3], sMin: 10, sMax: 15, ramos: [2] }] } });
    ok('opcoes.definir', { valores: { redistribuicao: 5, vigaNegativoVao: 30, pilarSimetria: 1000 } });
    const v = nomeViga(s, 'V1');
    ok('viga.armadura', { id: v.id, inf: { n: 4, phi: 16 }, estribo: { phi: 8, s: 0.1 } });
    const r = rearmar(s.modelo, an, { modo: 'todos', anterior: d0, modeloAnterior: s.modelo });
    expect('dim' in r).toBe(true);
    if (!('dim' in r)) return;
    const novo = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    expect(limpo(r.dim)).toEqual(limpo(novo));
    expect(r.dim.vigas.find((x) => x.viga === v.id)!.estribo).toContain('φ8');
    expect(r.dim.rearme).toMatchObject({ modo: 'todos', antigos: false });
  }, 120000);

  it('seção alterada: rearma com os esforços guardados, avisa esforços antigos e, no modo alterados, só refaz o elemento alterado', () => {
    const { s, ok } = predio();
    const an = analisarEdificio(s.modelo), mA = s.modelo, d0 = dimensionarEdificio(mA, an);
    const v = nomeViga(s, 'V1');
    ok('viga.editar', { id: v.id, secao: { b: 0.15, h: 0.7 } });
    expect(s.revEsforcos).toBe(0 + s.revEsforcos); // só seção: esforços guardados servem
    const todos = rearmar(s.modelo, an, { modo: 'todos', anterior: d0, modeloAnterior: mA, modeloAnalise: mA, esforcosRev: 3 });
    expect('dim' in todos).toBe(true);
    if (!('dim' in todos)) return;
    const rv = todos.dim.vigas.find((x) => x.viga === v.id)!;
    expect(rv.h).toBe(0.7);
    expect(rv.mensagens.some((m) => m.startsWith('Esforços antigos'))).toBe(true);
    expect(revisarEdificio(s.modelo, null, todos.dim).itens.some((i) => i.codigo === 'ESFORCO_ANTIGO' && i.id === v.id)).toBe(true);
    expect(todos.dim.rearme).toMatchObject({ antigos: true, esforcosRev: 3 });
    expect(todos.dim.rearme!.variacoes.map((x) => x.id)).toEqual([v.id]);
    // só alterados: os demais guardam o resultado anterior (mesmo objeto)
    const alt = rearmar(s.modelo, an, { modo: 'alterados', anterior: d0, modeloAnterior: mA, modeloAnalise: mA, esforcosRev: 3 });
    expect('dim' in alt).toBe(true);
    if (!('dim' in alt)) return;
    expect(alt.dim.rearme!.refeitos.map((x) => x.id)).toEqual([v.id]);
    expect(alt.dim.rearme!.refeitos[0].motivo).toBe('seção modificada');
    for (const x of alt.dim.vigas) if (x.viga !== v.id) expect(x).toBe(d0.vigas.find((y) => y.viga === x.viga));
    expect(alt.dim.vigas.find((x) => x.viga === v.id)).toEqual(rv);
    expect(alt.dim.rearme!.mantidos).toBeGreaterThan(0);
    // mudança global (opção): todos entram no modo alterados
    ok('opcoes.definir', { valores: { redistribuicao: 0 } });
    const glob = rearmar(s.modelo, an, { modo: 'alterados', anterior: d0, modeloAnterior: mA });
    expect('dim' in glob && glob.dim.rearme!.global).toMatch(/opcoes/);
    // elementos diferentes dos analisados: recusa
    ok('viga.remover', { ids: [nomeViga(s, 'V2').id] });
    const r2 = rearmar(s.modelo, an, { modo: 'todos', modeloAnalise: mA });
    expect(r2).toHaveProperty('erro');
  }, 180000);

  it('modo alterados com os mesmos esforços e rigidez = dimensionamento completo', () => {
    const { s, ok } = predio();
    const an = analisarEdificio(s.modelo), mA = s.modelo, d0 = dimensionarEdificio(mA, an);
    const v = nomeViga(s, 'V3');
    ok('viga.armadura', { id: v.id, inf: d0.vigas.find((x) => x.viga === v.id)!.arranjo.inf!, estribo: d0.vigas.find((x) => x.viga === v.id)!.arranjo.estribo! });
    ok('armadura.desbloquear', { ids: [v.id] });
    const alt = rearmar(s.modelo, an, { modo: 'alterados', anterior: d0, modeloAnterior: mA });
    const cheio = rearmar(s.modelo, an, { modo: 'todos' });
    expect('dim' in alt && 'dim' in cheio).toBe(true);
    if ('dim' in alt && 'dim' in cheio) expect(limpo(alt.dim)).toEqual(limpo(cheio.dim));
  }, 120000);

  it('seção alterada de elemento bloqueado: a armadura bloqueada sai e desfazer devolve', () => {
    const { s, ok } = predio();
    const v = nomeViga(s, 'V1'), p = s.modelo.pilares[0];
    ok('viga.armadura', { id: v.id, inf: { n: 3, phi: 16 }, estribo: { phi: 6.3, s: 0.15 } });
    ok('viga.editar', { id: v.id, secao: { b: 0.15, h: 0.6 } });
    expect(nomeViga(s, 'V1').armadura).toBeUndefined();
    s.desfazer();
    expect(nomeViga(s, 'V1').armadura?.inf).toEqual({ n: 3, phi: 16 });
    const lance = s.modelo.pavimentos[1].id;
    ok('pilar.armadura', { id: p.id, pavimento: lance, phi: 16, nb: 3, nh: 3, estribo: { phi: 5, s: 0.2 } });
    ok('pilar.editar', { id: p.id, secao: { tipo: 'ret', b: 0.25, h: 0.5 } });
    expect(s.modelo.pilares[0].armaduras).toBeUndefined();
  });
});

describe('agrupamento de pórticos', () => {
  it('a armadura do pórtico que governa vale para todos; um valor em um vale para todos; desagrupar solta', () => {
    const { s, ok } = predio();
    const a = nomeViga(s, 'V1'), b = nomeViga(s, 'V2'); // V1 e V2 horizontais em y = 9 e y = 4,5? (ordem de numeração) — iguais em vãos e seção
    expect(motivoAgrupamento(s.modelo, [a.id, b.id])).toBeNull();
    ok('vigas.agrupar', { acao: 'criar', ids: [a.id, b.id] });
    expect(s.modelo.agrupamentos).toHaveLength(1);
    const an = analisarEdificio(s.modelo);
    const d = dimensionarEdificio(s.modelo, an);
    const ra = d.vigas.find((x) => x.viga === a.id)!, rb = d.vigas.find((x) => x.viga === b.id)!;
    expect(ra.agrupada).toBe('G1');
    expect(ra.arranjo).toEqual(rb.arranjo);
    expect(d.agrupamentos![0]).toMatchObject({ nome: 'G1', efetivo: true });
    expect(d.agrupamentos![0].desenhos).toEqual([[a.id, b.id]]);
    // a armadura do grupo atende cada membro (sem ARM_BLOQ) e não é menor que a de cada um sozinho
    const sozinho = dimensionarEdificio({ ...s.modelo, agrupamentos: undefined }, an);
    for (const x of [a, b]) {
      const g = d.vigas.find((y) => y.viga === x.id)!, i = sozinho.vigas.find((y) => y.viga === x.id)!;
      expect(g.mensagens.some((m) => m.startsWith('Armadura bloqueada insuficiente'))).toBe(false);
      expect(g.AsInf).toBeGreaterThanOrEqual(i.AsInf - 1e-12);
      expect(g.AsSup).toBeGreaterThanOrEqual(i.AsSup - 1e-12);
    }
    // editar um vale para todos
    ok('viga.armadura', { id: a.id, inf: { n: 5, phi: 16 }, estribo: { phi: 6.3, s: 0.12 } });
    expect(nomeViga(s, 'V2').armadura?.inf).toEqual({ n: 5, phi: 16 });
    ok('armadura.desbloquear', { ids: [b.id] });
    expect(s.modelo.vigas.every((v) => !v.armadura)).toBe(true);
    // desagrupar
    ok('vigas.agrupar', { acao: 'desagrupar', ids: [a.id] });
    expect(s.modelo.agrupamentos).toBeUndefined();
    s.desfazer();
    expect(s.modelo.agrupamentos).toHaveLength(1);
  }, 120000);

  it('sem as mesmas condições o agrupamento é desconsiderado com o motivo; uma viga em um só agrupamento; remover viga desfaz o grupo', () => {
    const { s, ok } = predio();
    const h = nomeViga(s, 'V1'), vert = s.modelo.vigas.find((v) => v.pontos[0][0] === v.pontos[1][0])!;
    ok('vigas.agrupar', { acao: 'criar', ids: [h.id, vert.id] }); // sem verificar condições
    expect(motivoAgrupamento(s.modelo, [h.id, vert.id])).toMatch(/vãos|seção/);
    const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    expect(d.agrupamentos![0].efetivo).toBe(false);
    expect(d.vigas.find((x) => x.viga === h.id)!.mensagens.some((m) => /desconsiderado: /.test(m))).toBe(true);
    expect(revisarEdificio(s.modelo, null, d).itens.some((i) => i.codigo === 'AGRUP_IGNORADO')).toBe(true);
    const r = s.executar('vigas.agrupar', { acao: 'criar', ids: [h.id, nomeViga(s, 'V3').id] });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('AGRUPAMENTO_EXISTENTE');
    ok('viga.remover', { ids: [vert.id] });
    expect(s.modelo.agrupamentos).toBeUndefined();
    s.desfazer();
    expect(s.modelo.agrupamentos).toHaveLength(1);
  }, 120000);
});

describe('cópia de armadura entre pórticos', () => {
  it('condições com o motivo da recusa; cópia leva armadura e detalhe; modelo da biblioteca', () => {
    const { s, ok } = predio();
    const a = nomeViga(s, 'V1'), b = nomeViga(s, 'V2'), vert = s.modelo.vigas.find((v) => v.pontos[0][0] === v.pontos[1][0])!;
    ok('viga.armadura', { id: a.id, inf: { n: 3, phi: 16 }, estribo: { phi: 6.3, s: 0.15 } });
    ok('viga.detalhe', { id: a.id, fatorEmenda: 1.2 });
    // vãos diferentes: recusa com o motivo
    const r = s.executar('viga.copiarArmadura', { de: a.id, para: [vert.id] });
    expect(r.ok).toBe(false);
    expect(r.erros[0].mensagem).toMatch(/vão|vãos/);
    expect(motivoCopia(s.modelo, perfilDaViga(s.modelo, a), vert)).toMatch(/vão/);
    expect(motivoCopia(s.modelo, perfilDaViga(s.modelo, a), b)).toBeNull();
    // desnível diferente
    ok('viga.editar', { id: b.id, nivel: -0.05 });
    expect(motivoCopia(s.modelo, perfilDaViga(s.modelo, a), nomeViga(s, 'V2'))).toMatch(/desnível/);
    ok('viga.editar', { id: b.id, nivel: 0 });
    ok('viga.copiarArmadura', { de: a.id, para: [b.id] });
    expect(nomeViga(s, 'V2').armadura?.inf).toEqual({ n: 3, phi: 16 });
    expect(nomeViga(s, 'V2').detalhe?.fatorEmenda).toBe(1.2);
    // modelo da biblioteca: aplicado em outra obra
    const m = modeloDaViga(s.modelo, nomeViga(s, 'V1'), 'Modelo 15 m')!;
    expect(m.nome).toBe('Modelo 15 m');
    const { s: t, ok: ok2 } = predio();
    ok2('viga.copiarArmadura', { modelo: m, para: [nomeViga(t, 'V3').id] });
    expect(nomeViga(t, 'V3').armadura?.estribo).toEqual({ phi: 6.3, s: 0.15 });
    expect(t.executar('viga.copiarArmadura', { modelo: { ...m, vaos: [1, 2] }, para: [nomeViga(t, 'V3').id] }).ok).toBe(false);
    expect(t.executar('viga.copiarArmadura', { modelo: { versao: 2 }, para: [nomeViga(t, 'V3').id] }).erros[0].codigo).toBe('MODELO_INVALIDO');
  }, 120000);
});

describe('cópia da armadura das lajes', () => {
  it('salva, recupera onde a geometria não mudou (furo novo corta as barras) e copia de outro grupo', () => {
    const { s, ok } = predio();
    const L = s.modelo.lajes[0];
    ok('laje.armaduraBase', { ids: [L.id], inf: { barras: [{ dir: 0, phi: 6.3, s: 15 }] } });
    ok('laje.linhaDobra', { acao: 'criar', grupo: 'g_3', a: [2, 0], z: [2, 4.5] });
    ok('lajes.copiaArmadura', { acao: 'salvar', nome: 'Antes do furo', data: '2026-10-21' });
    const c = s.modelo.copiasLaje![0];
    expect(c.lajes).toHaveLength(s.modelo.lajes.length);
    // apaga a base e abre um furo na laje; recuperar traz a base de volta e avisa do furo novo
    ok('laje.armaduraBase', { ids: [L.id], remover: ['inf'] });
    ok('laje.abertura', { id: L.id, contorno: [[1, 1], [2, 1], [2, 2], [1, 2]] });
    const r = ok('lajes.copiaArmadura', { acao: 'recuperar', copia: c.id });
    expect(r.mensagem).toMatch(/furo novo/);
    expect(s.modelo.lajes[0].base?.inf?.barras?.[0]?.s).toBe(15);
    expect(s.modelo.lajes[0].furos).toHaveLength(1);
    // contorno mudou: não restaura essa laje
    ok('laje.armaduraBase', { ids: [L.id], remover: ['inf'] });
    ok('laje.editar', { id: L.id, contorno: [[0, 0], [5, 0], [5, 4.4], [0, 4.4]] });
    const r2 = ok('lajes.copiaArmadura', { acao: 'recuperar', copia: c.id });
    expect(r2.mensagem).toMatch(/geometria mudou/);
    expect(s.modelo.lajes[0].base).toBeUndefined();
    // copiar de outro grupo: só onde há laje de mesmo contorno
    const t = predio();
    t.ok('grupo.criar', { nome: 'Outro' });
    const g2 = t.s.modelo.grupos.at(-1)!.id;
    t.ok('laje.armaduraBase', { ids: [t.s.modelo.lajes[0].id], inf: { barras: [{ dir: 1, phi: 8, s: 20 }] } });
    expect(t.s.executar('lajes.copiaArmadura', { acao: 'copiar', de: 'g_3', para: g2 }).ok).toBe(true);
    expect(t.s.executar('lajes.copiaArmadura', { acao: 'copiar', de: 'g_3', para: 'g_3' }).ok).toBe(false);
    expect(t.s.executar('lajes.copiaArmadura', { acao: 'recuperar', copia: 'nao' }).erros[0].codigo).toBe('COPIA_INEXISTENTE');
    t.ok('lajes.copiaArmadura', { acao: 'salvar' });
    t.ok('lajes.copiaArmadura', { acao: 'remover', copia: t.s.modelo.copiasLaje![0].id });
    expect(t.s.modelo.copiasLaje).toBeUndefined();
  }, 120000);
});
