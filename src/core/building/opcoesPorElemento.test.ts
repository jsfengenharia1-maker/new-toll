// V7f (K1.4.1): opções de cálculo próprias de lajes e pilares (lista fechada das que só atuam no dimensionamento),
// validação de faixa, mensagem e memória detalhada; o outro elemento não muda.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { Registrador, comMemoria } from '../memoria/registrador';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { OPCOES_DETALHE, OPCOES_INFO, OPCOES_POR_LAJE, OPCOES_POR_PILAR } from './opcoes';

function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('vento.definir', { ativo: false });
  const pts: [number, number][] = [[0, 0], [5, 0], [10, 0], [0, 5], [5, 5], [10, 5]];
  s.executar('lote', { comandos: pts.map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [10, 0]]), v([[0, 5], [10, 5]]), v([[0, 0], [0, 5]]), v([[5, 0], [5, 5]]), v([[10, 0], [10, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s;
}
const calcular = (s: Sessao) => { const an = analisarEdificio(s.modelo); return dimensionarEdificio(s.modelo, an); };

describe('V7f: listas fechadas de opções por elemento', () => {
  it('só opções de dimensionamento (OPCOES_DETALHE), com faixa em OPCOES_INFO', () => {
    for (const k of [...OPCOES_POR_LAJE, ...OPCOES_POR_PILAR]) {
      expect(OPCOES_DETALHE.has(k), k).toBe(true);
      expect(OPCOES_INFO.some((i) => i.chave === k), k).toBe(true);
    }
  });
});

describe('V7f: opções próprias da laje', () => {
  const s = predio(), base = calcular(s);
  const [l1, l2] = s.modelo.lajes;

  it('taxa mínima própria: As ≥ ρ·h só na laje com a opção (12 cm²/m com 1 %); a outra não muda; mensagem e desfazer', () => {
    expect(s.modelo.lajes.length).toBe(2);
    const r1 = s.executar('laje.editar', { id: l1.id, opcoes: { lajeTaxaMin: 1 } });
    expect(r1.ok, r1.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    const d = calcular(s), a = d.lajes.find((x) => x.laje === l1.id)!, a0 = base.lajes.find((x) => x.laje === l1.id)!;
    for (const k of [0, 1] as const) {
      expect(a.As.pos[k]).toBeGreaterThanOrEqual(12 - 1e-6);
      expect(a0.As.pos[k]).toBeLessThan(12);
    }
    expect(a.mensagens.some((m) => /^Opções próprias da laje: Lajes: taxa mínima de armadura = 1/.test(m))).toBe(true);
    expect(JSON.stringify(d.lajes.find((x) => x.laje === l2.id)!.As)).toBe(JSON.stringify(base.lajes.find((x) => x.laje === l2.id)!.As));
    // desfazer devolve o dimensionamento da obra
    s.desfazer();
    expect(s.modelo.lajes.find((x) => x.id === l1.id)!.opcoes).toBeUndefined();
    expect(JSON.stringify(calcular(s).lajes.map((x) => x.As))).toBe(JSON.stringify(base.lajes.map((x) => x.As)));
  });

  it('validação: fora da faixa e opção fora da lista são recusadas; {} remove', () => {
    expect(s.executar('laje.editar', { id: l1.id, opcoes: { lajeTaxaMin: 9 } }).ok).toBe(false);
    expect(s.executar('laje.editar', { id: l1.id, opcoes: { malha: 1 } }).ok).toBe(false);
    expect(s.executar('laje.editar', { id: l1.id, opcoes: { lajeTaxaMin: 0.5, lajeBitolaMinima: 6.3 } }).ok).toBe(true);
    expect(s.modelo.lajes.find((x) => x.id === l1.id)!.opcoes).toEqual({ lajeTaxaMin: 0.5, lajeBitolaMinima: 6.3 });
    expect(s.executar('laje.editar', { id: l1.id, opcoes: {} }).ok).toBe(true);
    expect(s.modelo.lajes.find((x) => x.id === l1.id)!.opcoes).toBeUndefined();
  });

  it('memória detalhada registra a opção própria com os valores usados', () => {
    s.executar('laje.editar', { id: l1.id, opcoes: { lajeTaxaMin: 1 } });
    const reg = new Registrador();
    comMemoria(reg, () => calcular(s));
    const p = reg.passos.find((x) => x.topico === 'Opções próprias da laje');
    expect(p).toBeTruthy();
    expect(p!.entradas.lajeTaxaMin).toBe(1);
    // a armadura mínima registrada usa a taxa própria: As,mín = 1 % × 0,12 m
    const amin = reg.passos.find((x) => x.elemento === p!.elemento && x.descricao === 'Armadura mínima por metro');
    expect(amin!.resultado as number).toBeCloseTo(0.01 * 0.12, 9);
    s.executar('laje.editar', { id: l1.id, opcoes: {} });
  });
});

describe('V7f: opções próprias do pilar', () => {
  const s = predio(), base = calcular(s);
  const [p1, p2] = s.modelo.pilares;

  it('taxa mínima própria de 2 %: As ≥ 12,5 cm² = 0,00125 m² (25 × 25) só no pilar com a opção; mensagem; os outros não mudam', () => {
    const r = s.executar('pilar.editar', { id: p1.id, opcoes: { pilarTaxaMin: 2 } });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    const d = calcular(s), a = d.pilares.filter((x) => x.pilar === p1.id);
    expect(a.length).toBeGreaterThan(0);
    for (const x of a) expect(x.As).toBeGreaterThanOrEqual(12.5e-4 - 1e-9);
    expect(base.pilares.filter((x) => x.pilar === p1.id).some((x) => x.As < 12.5e-4)).toBe(true);
    expect(a[0].mensagens.some((m) => /^Opções próprias do pilar: Pilares: taxa geométrica mínima = 2/.test(m))).toBe(true);
    expect(JSON.stringify(d.pilares.filter((x) => x.pilar === p2.id).map((x) => x.As))).toBe(JSON.stringify(base.pilares.filter((x) => x.pilar === p2.id).map((x) => x.As)));
  });

  it('validação de faixa, memória e remoção', () => {
    expect(s.executar('pilar.editar', { id: p1.id, opcoes: { pilarTaxaMin: 10 } }).ok).toBe(false);
    expect(s.executar('pilar.editar', { id: p1.id, opcoes: { malha: 1 } }).ok).toBe(false);
    const reg = new Registrador();
    comMemoria(reg, () => calcular(s));
    const p = reg.passos.find((x) => x.topico === 'Opções próprias do pilar');
    expect(p).toBeTruthy();
    expect(p!.entradas.pilarTaxaMin).toBe(2);
    expect(s.executar('pilar.editar', { id: p1.id, opcoes: {} }).ok).toBe(true);
    expect(s.modelo.pilares.find((x) => x.id === p1.id)!.opcoes).toBeUndefined();
    expect(JSON.stringify(calcular(s).pilares.map((x) => x.As))).toBe(JSON.stringify(base.pilares.map((x) => x.As)));
  });
});
