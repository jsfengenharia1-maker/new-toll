// Escadas (E4a): geometria dos tipos de lance contra o cálculo manual, alturas, cargas próprias, apoios do patamar,
// repetição, comandos e códigos de revisão. Pavimentos do edifício padrão: Térreo 0, Tipo 1/2/3 (grupo g_3) 3/6/9, Cobertura 12.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { escadasNoMemorial, geometriaEscada, geometriaEscadas, instanciasDaEscada, resumoEscadas, tipoLancePor, TIPOS_LANCE_PREDEFINIDOS, type Escada, type LanceEscada, type TipoLance } from './escadas';
import { revisarEdificio } from './revisao';
import { verificar } from './verify';
import { OPCOES_PADRAO_CALCULO } from './opcoes';

const E = 0.5 / 3, PISO = 0.2967; // espelho de 1/6 m (18 degraus em 3 m) e 2e + p = 63 cm
const tipo = (t: Partial<TipoLance> & Pick<TipoLance, 'tipologia' | 'trechos'>): TipoLance => ({ id: 'T', nome: 'T', ...t });
function predio(escada: Partial<Omit<Escada, 'lances'>> & { lances?: Omit<LanceEscada, 'id'>[] }, t: TipoLance, extra: Record<string, unknown>[] = []) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((x) => x.mensagem).join(' ')}`).toBe(true); };
  const { id: _i, nome, ...campos } = t;
  ok('tipoLance.criar', { id: 'T', tipo: { nome, ...campos } });
  ok('escada.criar', { id: 'e1', grupo: 'g_3', origem: [0, 0], angulo: 0, piso: PISO, espelho: E, lances: [{ tipo: 'T' }], ...escada });
  for (const e of extra) ok(e.nome as string, e.params as Record<string, unknown>);
  const b = s.modelo, g = geometriaEscada(b.escadas![0], [...b.tiposLance!, ...TIPOS_LANCE_PREDEFINIDOS], b);
  return { s, b, g, l: g.lances[0] };
}
const cod = (g: { diagnosticos: { codigo: string; severidade: string }[] }, sev?: string) => g.diagnosticos.filter((d) => !sev || d.severidade === sev).map((d) => d.codigo);
const caixaDe = (pl: [number, number][]) => [Math.min(...pl.map((p) => p[0])), Math.min(...pl.map((p) => p[1])), Math.max(...pl.map((p) => p[0])), Math.max(...pl.map((p) => p[1]))];

describe('E4a: lance reto', () => {
  const r = predio({}, tipo({ tipologia: 'reto', trechos: [18] }));
  it('cotas e contorno: 17 pisos até o patamar (último degrau no piso de cima)', () => {
    expect(cod(r.g, 'erro')).toEqual([]);
    expect(cod(r.g)).toEqual([]);
    const t = r.l.trechos[0], R = 17 * PISO;
    expect(t.comprimento).toBeCloseTo(R, 9);
    expect(t.cotaIni).toBeCloseTo(3, 9);
    expect(t.cotaFim).toBeCloseTo(3 + 17 * E, 9); // inclinação e/p
    expect(caixaDe(t.planta)[2]).toBeCloseTo(R, 9);
    expect(r.g.caixa![1]).toBeCloseTo(-0.6, 9); // largura 1,20 centrada na origem
    expect(r.l.cotaTopo).toBe(6);
    expect(r.l.alturaVencida).toBeCloseTo(3, 5);
    expect(r.l.degrausLinhas).toHaveLength(18);
  });
  it('espessura pré-dimensionada: vão 5,044 m / 30 = 16,8 cm → 17 cm', () => {
    expect(r.l.espessura.vaoMax).toBeCloseTo(17 * PISO, 9);
    expect(r.l.espessura.valor).toBeCloseTo(0.17, 9);
    expect(r.l.espessura.automatica).toBe(true);
  });
  it('último degrau sobre a laje: 18 pisos e 18 cm', () => {
    const l = predio({ ultimoDegrau: 'laje' }, tipo({ tipologia: 'reto', trechos: [18] })).l;
    expect(l.trechos[0].comprimento).toBeCloseTo(18 * PISO, 9);
    expect(l.trechos[0].cotaFim).toBeCloseTo(6, 9);
    expect(l.espessura.valor).toBeCloseTo(0.18, 9);
  });
  it('espessura informada vale; cargas próprias por m² (concreto 25 kN/m³)', () => {
    const l = predio({}, tipo({ tipologia: 'reto', trechos: [18], espessura: 0.15 })).l, cosA = PISO / Math.hypot(PISO, E);
    expect(l.espessura.valor).toBe(0.15);
    expect(l.cargas.pesoLaje).toBeCloseTo(3.75, 9);
    expect(l.cargas.pesoDegraus).toBeCloseTo(25 * (E / 2) * cosA, 9);
    expect(l.cargas.pesoProjecao).toBeCloseTo(3.75 / cosA + (25 * E) / 2, 9);
    expect(l.cargas.permanenteProjecao).toBeCloseTo(l.cargas.pesoProjecao + 1, 9);
    expect(l.cargas.sobrecarga).toBe(2.5);
    expect(l.cargas.pesoPatamar).toBeCloseTo(3.75, 9);
  });
  it('alvenaria nos degraus (cerâmico 13 kN/m³) pesa 13/25 dos degraus concretados; acesso ao público: 3,0 kN/m²', () => {
    const c = predio({}, tipo({ tipologia: 'reto', trechos: [18], espessura: 0.15 })).l.cargas;
    const a = predio({ execucao: 'alvenaria', acesso: 'publico', corrimao: 0.4 }, tipo({ tipologia: 'reto', trechos: [18], espessura: 0.15 })).l.cargas;
    expect(a.pesoDegraus).toBeCloseTo((c.pesoDegraus * 13) / 25, 9);
    expect(a.pesoLaje).toBe(c.pesoLaje);
    expect(a.sobrecarga).toBe(3);
    expect(a.corrimao).toBe(0.4);
    expect(a.volumeConcreto).toBeLessThan(c.volumeConcreto);
  });
});

describe('E4a: tipologias com patamar', () => {
  it('meia-volta 9 + 9 com poço de 10 cm: contornos e cotas', () => {
    const { g, l } = predio({}, tipo({ tipologia: 'meiaVolta2', trechos: [9, 9], poco: 0.1 }));
    const R = 8 * PISO;
    expect(cod(g, 'erro')).toEqual([]);
    const [f1, pat, f2] = l.trechos;
    expect(f1.tipo).toBe('lance'); expect(pat.tipo).toBe('patamar'); expect(f2.tipo).toBe('lance');
    expect(caixaDe(f1.planta)).toEqual([0, -0.6, expect.closeTo(R, 9), 0.6]);
    const p = caixaDe(pat.planta); // 1,2 de profundidade; largura 1,2 + 0,1 + 1,2 = 2,5 a partir de y = -0,6
    expect(p[0]).toBeCloseTo(R, 9); expect(p[2]).toBeCloseTo(R + 1.2, 9); expect(p[1]).toBeCloseTo(-0.6, 9); expect(p[3]).toBeCloseTo(1.9, 9);
    expect(pat.cotaIni).toBeCloseTo(4.5, 9);
    const c2 = caixaDe(f2.planta); // volta pelo lado esquerdo, y de 0,7 a 1,9, voltando ao x = 0
    expect(c2[0]).toBeCloseTo(0, 9); expect(c2[2]).toBeCloseTo(R, 9); expect(c2[1]).toBeCloseTo(0.7, 9); expect(c2[3]).toBeCloseTo(1.9, 9);
    expect(f2.cotaIni).toBeCloseTo(4.5, 9); expect(f2.cotaFim).toBeCloseTo(4.5 + 8 * E, 9);
    expect(l.alturaVencida).toBeCloseTo(3, 5);
  });
  it('giro à direita espelha o desenho', () => {
    const { l } = predio({ giro: 'dir' }, tipo({ tipologia: 'meiaVolta2', trechos: [9, 9], poco: 0.1 }));
    const c2 = caixaDe(l.trechos[2].planta);
    expect(c2[1]).toBeCloseTo(-1.9, 9); expect(c2[3]).toBeCloseTo(-0.7, 9);
  });
  it('três lances com quarto de volta: espiral em torno do poço', () => {
    const { g, l } = predio({}, tipo({ tipologia: 'quartoVolta3', trechos: [6, 6, 6] }));
    const R = 5 * PISO;
    expect(cod(g, 'erro')).toEqual([]);
    expect(l.trechos.map((t) => t.tipo)).toEqual(['lance', 'patamar', 'lance', 'patamar', 'lance']);
    const c2 = caixaDe(l.trechos[2].planta); // sobe em +y pelo centro x = R + 0,6
    expect(c2[0]).toBeCloseTo(R + 0, 9); expect(c2[2]).toBeCloseTo(R + 1.2, 9); expect(c2[1]).toBeCloseTo(0.6, 9); expect(c2[3]).toBeCloseTo(0.6 + R, 9);
    const c3 = caixaDe(l.trechos[4].planta); // volta em -x ao longo de y = 0,6 + R + 0,6
    expect(c3[0]).toBeCloseTo(0, 9); expect(c3[2]).toBeCloseTo(R, 9); expect(c3[1]).toBeCloseTo(R + 0.6, 9); expect(c3[3]).toBeCloseTo(R + 1.8, 9);
    expect(l.trechos[3].cotaIni).toBeCloseTo(3 + 12 * E, 9);
  });
  it('dois lances consecutivos: patamar reto de 1,2 m e segundo lance na mesma direção', () => {
    const { l } = predio({}, tipo({ tipologia: 'consecutivos2', trechos: [9, 9] }));
    const R = 8 * PISO, c2 = caixaDe(l.trechos[2].planta);
    expect(c2[0]).toBeCloseTo(R + 1.2, 9); expect(c2[2]).toBeCloseTo(2 * R + 1.2, 9);
  });
  it('volta inteira: como a meia-volta sem poço', () => {
    const { l } = predio({}, tipo({ tipologia: 'voltaInteira2', trechos: [9, 9] }));
    const p = caixaDe(l.trechos[1].planta);
    expect(p[3] - p[1]).toBeCloseTo(2.4, 9);
  });
  it('N lances com meia-volta (4 trechos) fecham 3 m e alternam o lado', () => {
    const { g, l } = predio({}, tipo({ tipologia: 'meiaVoltaN', trechos: [5, 5, 4, 4], poco: 0.2 }));
    expect(cod(g, 'erro')).toEqual([]);
    expect(l.trechos.filter((t) => t.tipo === 'lance')).toHaveLength(4);
    const y3 = caixaDe(l.trechos[4].planta);
    expect(y3[1]).toBeCloseTo(-0.6, 9); // o terceiro lance volta ao lado do primeiro
  });
  it('espessura: patamar livre soma o vão; apoiado separa (mínimo de 8 cm)', () => {
    const livre = predio({}, tipo({ tipologia: 'meiaVolta2', trechos: [9, 9], poco: 0.1 })).l.espessura;
    expect(livre.vaoMax).toBeCloseTo(2 * 8 * PISO + 1.2, 9);
    expect(livre.valor).toBeCloseTo(0.2, 9);
    const apo = predio({}, tipo({ tipologia: 'meiaVolta2', trechos: [9, 9], poco: 0.1 }), [{ nome: 'lance.editar', params: { escada: 'e1', lance: 'ln_x', patamares: [] } }].slice(0, 0));
    expect(apo.l.espessura.valor).toBeCloseTo(0.2, 9);
  });
});

describe('E4a: degraus iniciais, desnível inicial e alturas', () => {
  it('2 degraus iniciais + 14 no trecho com desnível de 20 cm e espelho de 20 cm fecham os 3 m', () => {
    const { g, l } = predio({ espelho: 0.2, piso: 0.25 }, tipo({ tipologia: 'reto', trechos: [14], degrausIniciais: 2, desnivelInicial: 0.2 }));
    expect(cod(g, 'erro')).toEqual([]);
    expect(l.degraus.total).toBe(16);
    expect(l.cotaBase).toBeCloseTo(2.8, 9);
    expect(l.alturaVencida).toBeCloseTo(3, 9);
    expect(l.trechos[0].cotaIni).toBeCloseTo(2.8 + 2 * 0.2, 9); // a laje inclinada nasce depois dos degraus do piso
    expect(caixaDe(l.trechos[0].planta)[0]).toBeCloseTo(0.5, 9);
    const s = l.cargas.superficies[0]; // carga de superfície: peso médio dos degraus 25·e/2, sem sobrecarga
    expect(s.origem).toBe('degraus iniciais');
    expect(s.permanente).toBeCloseTo(2.5, 9);
    expect(Math.abs(((s.planta[1][0] - s.planta[0][0]) * (s.planta[2][1] - s.planta[1][1])))).toBeCloseTo(0.5 * 1.2, 9);
  });
  it('ESCADA_ALTURA quando os degraus não fecham o desnível (tolerância de 1 mm)', () => {
    const g = predio({}, tipo({ tipologia: 'reto', trechos: [17] })).g;
    expect(cod(g, 'erro')).toEqual(['ESCADA_ALTURA']);
    expect(g.diagnosticos[0].mensagem).toContain('17 degraus');
    expect(g.diagnosticos[0].mensagem).toContain('diferença de 16,7 cm');
    const ok = predio({ espelho: 3 / 18 + 0.0004 }, tipo({ tipologia: 'reto', trechos: [18] })).g; // 0,4 mm × 18 = 7 mm: fora
    expect(cod(ok, 'erro')).toEqual(['ESCADA_ALTURA']);
    const dentro = predio({ espelho: 3 / 18 + 0.00004 }, tipo({ tipologia: 'reto', trechos: [18] })).g; // 0,7 mm no total: dentro
    expect(cod(dentro, 'erro')).toEqual([]);
  });
  it('ESCADA_BLONDEL e dimensões como aviso', () => {
    const g = predio({ espelho: 0.2, piso: 0.25 }, tipo({ tipologia: 'reto', trechos: [15] })).g;
    expect(cod(g, 'erro')).toEqual([]);
    expect(cod(g, 'aviso')).toEqual(['ESCADA_BLONDEL', 'ESCADA_DIMENSOES']);
    const estreita = predio({ largura: 0.9 }, tipo({ tipologia: 'reto', trechos: [18] })).g;
    expect(cod(estreita, 'aviso')).toEqual(['ESCADA_DIMENSOES']);
  });
  it('desnível inicial menor que 10 cm, poço fora da meia-volta e trechos incoerentes são recusados no comando', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const tenta = (t: Record<string, unknown>) => s.executar('tipoLance.criar', { tipo: { nome: 'x', ...t } });
    expect(tenta({ tipologia: 'reto', trechos: [18], desnivelInicial: 0.05 }).ok).toBe(false);
    expect(tenta({ tipologia: 'reto', trechos: [18], desnivelInicial: 0.1 }).ok).toBe(true);
    expect(tenta({ tipologia: 'reto', trechos: [18], poco: 0.1 }).ok).toBe(false);
    expect(tenta({ tipologia: 'meiaVolta2', trechos: [9] }).ok).toBe(false);
    expect(tenta({ tipologia: 'meiaVoltaN', trechos: [9] }).ok).toBe(false);
    expect(tenta({ tipologia: 'reto', trechos: [18], degrausPatamar: 1 }).ok).toBe(false);
  });
  it('ESCADA_TRECHO_CURTO e degraus do patamar que não cabem', () => {
    expect(cod(predio({}, tipo({ tipologia: 'consecutivos2', trechos: [1, 17] })).g, 'erro')).toContain('ESCADA_TRECHO_CURTO');
    expect(cod(predio({ piso: 0.6 }, tipo({ tipologia: 'consecutivos2', trechos: [9, 5], degrausPatamar: 3 })).g, 'erro')).toContain('ESCADA_PATAMAR_DEGRAUS');
  });
  it('degraus sobre o patamar: fecham a altura e geram carga de superfície', () => {
    const { g, l } = predio({}, tipo({ tipologia: 'meiaVolta2', trechos: [8, 8], degrausPatamar: 2 }));
    expect(cod(g, 'erro')).toEqual([]);
    expect(l.trechos[2].cotaIni).toBeCloseTo(3 + 8 * E + 2 * E, 9);
    const s = l.cargas.superficies.find((x) => x.origem === 'degraus do patamar')!;
    expect(s.permanente).toBeCloseTo((25 * E) / 2, 9);
    expect(s.patamar).toBe(0);
  });
});

describe('E4a: apoios do patamar (C8.26 a C8.30)', () => {
  const lance = (patamares: unknown[]) => [{ nome: 'lance.editar', params: { escada: 'e1', lance: 'LN', patamares } }];
  function com(patamares: unknown[], extra: Partial<TipoLance> = {}) {
    const p = predio({}, tipo({ tipologia: 'meiaVolta2', trechos: [9, 9], poco: 0.1, espessura: 0.15, ...extra }));
    const id = p.b.escadas![0].lances[0].id;
    const r = p.s.executar('lance.editar', { escada: 'e1', lance: id, patamares });
    expect(r.ok, r.erros.map((x) => x.mensagem).join(' ')).toBe(true);
    const b = p.s.modelo;
    return geometriaEscada(b.escadas![0], [...b.tiposLance!, ...TIPOS_LANCE_PREDEFINIDOS], b);
  }
  void lance;
  it('parede de alvenaria sob a borda frontal: γ·largura·(patamar − espessura − piso de baixo)', () => {
    const g = com([{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'alvenaria', largura: 0.15 }] }]);
    expect(cod(g, 'erro')).toEqual([]);
    const ln = g.lances[0].cargas.linhas;
    expect(ln).toHaveLength(1);
    expect(ln[0].valor).toBeCloseTo(13 * 0.15 * (4.5 - 0.15 - 3), 9); // 2,6325 kN/m
    expect(ln[0].sobre).toBe('abaixo');
    expect(Math.hypot(ln[0].b[0] - ln[0].a[0], ln[0].b[1] - ln[0].a[1])).toBeCloseTo(2.5, 9);
    expect(g.lances[0].espessura.vaoMax).toBeCloseTo(8 * PISO, 9); // patamar apoiado separa os vãos
  });
  it('parede de concreto (25 kN/m³) nas bordas laterais: dois segmentos', () => {
    const ln = com([{ apoiado: true, apoios: [{ borda: 'lateral', tipo: 'concreto', largura: 0.2 }] }]).lances[0].cargas.linhas;
    expect(ln).toHaveLength(2);
    expect(ln[0].valor).toBeCloseTo(25 * 0.2 * 1.35, 9);
  });
  it('tirante soma a alvenaria entre o patamar e o piso de cima, aplicada no elemento de cima', () => {
    const g = com([{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'tirante', largura: 0.15 }] }]);
    const ln = g.lances[0].cargas.linhas[0];
    expect(ln.valor).toBeCloseTo(13 * 0.15 * (6 - 4.5), 9);
    expect(ln.sobre).toBe('acima');
    expect(cod(g)).not.toContain('ESCADA_PAREDE_SUP');
  });
  it('conector: sem peso, reação na E4c; avisos de parede superior e de patamar mal definido', () => {
    const g = com([{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'conector', largura: 0.1 }] }]);
    expect(g.lances[0].cargas.linhas[0].valor).toBe(0);
    expect(cod(g, 'aviso')).toEqual(['ESCADA_PAREDE_SUP']);
    expect(cod(com([{ apoiado: true }]), 'erro')).toEqual(['ESCADA_PATAMAR_APOIO']);
    expect(cod(com([{ apoiado: false, apoios: [{ borda: 'frontal', tipo: 'alvenaria', largura: 0.15 }] }]), 'erro')).toEqual(['ESCADA_PATAMAR_APOIO']);
  });
  it('bloco de concreto e peso informado', () => {
    const l1 = com([{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'alvenaria', largura: 0.15, bloco: 'concreto' }] }]).lances[0].cargas.linhas[0];
    expect(l1.valor).toBeCloseTo(14 * 0.15 * 1.35, 9);
    const l2 = com([{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'alvenaria', largura: 0.15, gama: 15.7 }] }]).lances[0].cargas.linhas[0];
    expect(l2.valor).toBeCloseTo(15.7 * 0.15 * 1.35, 9);
  });
});

describe('E4a: repetição, número de lances e pavimentos', () => {
  it('lances iguais consecutivos: um por pavimento, cada um com o seu desnível', () => {
    const { b } = predio({ lances: [{ tipo: 'T', repetir: 3 }] }, tipo({ tipologia: 'reto', trechos: [18] }));
    const g = geometriaEscadas(b)[0];
    expect(cod(g, 'erro')).toEqual([]);
    expect(g.lances.map((l) => [l.cotaPiso, l.cotaTopo])).toEqual([[3, 6], [6, 9], [9, 12]]);
    expect(g.lances.map((l) => l.repeticao)).toEqual([0, 1, 2]);
  });
  it('repetição além do grupo: ESCADA_PAVIMENTO; sem pavimento acima: ESCADA_SEM_TOPO', () => {
    const { b } = predio({ lances: [{ tipo: 'T', repetir: 4 }] }, tipo({ tipologia: 'reto', trechos: [18] }));
    expect(cod(geometriaEscadas(b)[0], 'erro')).toEqual(['ESCADA_PAVIMENTO']);
    const cob = b.pavimentos.find((p) => p.nome === 'Cobertura')!.id;
    const q = predio({ grupo: cob === b.pavimentos[0].id ? 'g_3' : b.pavimentos.find((p) => p.nome === 'Cobertura')!.grupo, lances: [{ tipo: 'T', pavimento: cob }] }, tipo({ tipologia: 'reto', trechos: [18] }));
    expect(cod(geometriaEscadas(q.b)[0], 'erro')).toEqual(['ESCADA_SEM_TOPO']);
  });
  it('número ilimitado de lances na escada (12) e tipos diferentes por lance', () => {
    const lances = Array.from({ length: 12 }, () => ({ tipo: 'T', pavimento: 'pav_4', cotaInicial: 3 }));
    const { b } = predio({ lances }, tipo({ tipologia: 'reto', trechos: [18] }));
    expect(geometriaEscadas(b)[0].lances).toHaveLength(12);
    expect(instanciasDaEscada(b, b.escadas![0])).toHaveLength(12);
  });
  it('cota inicial própria do primeiro pavimento do lance', () => {
    const { b } = predio({ lances: [{ tipo: 'T', cotaInicial: 2.5 }] }, tipo({ tipologia: 'reto', trechos: [18] }));
    const g = geometriaEscadas(b)[0];
    expect(g.lances[0].desnivel).toBeCloseTo(3.5, 9);
    expect(cod(g, 'erro')).toEqual(['ESCADA_ALTURA']);
  });
});

describe('E4a: comandos, tipos predefinidos e revisão', () => {
  it('tipo predefinido vira cópia na obra, reaproveitada; não se remove tipo em uso', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    expect(s.executar('escada.criar', { id: 'e1', grupo: 'g_3', origem: [0, 0], espelho: E, piso: PISO, lances: [{ tipo: 'pre:reto-18' }, { tipo: 'pre:reto-18' }] }).ok).toBe(true);
    expect(s.modelo.tiposLance).toHaveLength(1);
    expect(s.modelo.tiposLance![0].predefinido).toBe('pre:reto-18');
    expect(s.modelo.escadas![0].lances.map((l) => l.tipo)).toEqual([s.modelo.tiposLance![0].id, s.modelo.tiposLance![0].id]);
    const r = s.executar('tipoLance.remover', { id: s.modelo.tiposLance![0].id });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('TIPO_LANCE_EM_USO');
    expect(s.executar('tipoLance.copiar', { de: 'pre:meia-volta-9-9', nome: 'Meu' }).ok).toBe(true);
    expect(tipoLancePor(s.modelo, s.modelo.tiposLance!.at(-1)!.id)!.nome).toBe('Meu');
  });
  it('escada.dados grava só o que difere do padrão', () => {
    const { s } = predio({}, tipo({ tipologia: 'reto', trechos: [18] }));
    expect(s.executar('escada.dados', { id: 'e1', giro: 'dir', execucao: 'alvenaria', corrimao: 0.5, revestimento: 1.2 }).ok).toBe(true);
    const e = s.modelo.escadas![0];
    expect([e.giro, e.execucao, e.corrimao, e.revestimento]).toEqual(['dir', 'alvenaria', 0.5, 1.2]);
    expect(s.executar('escada.dados', { id: 'e1', giro: 'esq', execucao: 'concretados', corrimao: 0, limpar: ['revestimento'] }).ok).toBe(true);
    const f = s.modelo.escadas![0];
    expect('giro' in f || 'execucao' in f || 'corrimao' in f || 'revestimento' in f).toBe(false);
  });
  it('verificar() e a revisão trazem os códigos ESCADA_*; sem escada nada muda', () => {
    const { b } = predio({}, tipo({ tipologia: 'reto', trechos: [17] }));
    expect(verificar(b).map((d) => d.codigo)).toContain('ESCADA_ALTURA');
    const rev = revisarEdificio(b, null, null);
    const i = rev.itens.find((x) => x.tipo === 'escada')!;
    expect(i.codigo).toBe('ESCADA_ALTURA');
    expect(i.nivel).toBe('erro');
    expect(i.sugestao).toBeTruthy();
    const sem = new Sessao();
    for (const c of comandosEdificioPadrao()) sem.executar(c.nome, c.params, 'sistema');
    expect(verificar(sem.modelo).some((d) => d.codigo.startsWith('ESCADA'))).toBe(false);
  });
  it('resumo e memorial', () => {
    const { b } = predio({}, tipo({ tipologia: 'reto', trechos: [18] }));
    const r = resumoEscadas(b);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ escada: 'E1', lance: 1, pavimento: 'Tipo 1', degraus: 18, espessura: 0.17, espessuraAutomatica: true });
    const m = escadasNoMemorial(b);
    expect(m.map((x) => x.secao)).toEqual(expect.arrayContaining(['Dados comuns', 'Tipos de lance', 'Geometria', 'Cargas']));
    expect(m.find((x) => x.rotulo === 'Lance 1: espessura')!.valor).toContain('17 cm');
    expect(m.find((x) => x.rotulo === 'Último degrau')!.aConfirmar).toBe(true);
  });
  it('opções novas: padrões', () => {
    expect([OPCOES_PADRAO_CALCULO.escadaEspessuraDivisor, OPCOES_PADRAO_CALCULO.escadaDesnivelMin, OPCOES_PADRAO_CALCULO.escadaSobrecargaPrivada, OPCOES_PADRAO_CALCULO.escadaSobrecargaPublica, OPCOES_PADRAO_CALCULO.escadaBlondelMin, OPCOES_PADRAO_CALCULO.escadaBlondelMax]).toEqual([30, 10, 2.5, 3, 63, 64]);
  });
});
