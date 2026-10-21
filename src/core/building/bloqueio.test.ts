import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { revisarEdificio } from './revisao';

function grade() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  ok('lote', { comandos: [[0, 0], [5, 0], [10, 0], [0, 5], [5, 5], [10, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  ok('lote', { comandos: [[[0, 0], [10, 0]], [[0, 5], [10, 5]], [[0, 0], [0, 5]], [[5, 0], [5, 5]], [[10, 0], [10, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  const dim = () => dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
  return { s, ok, dim };
}

describe('armadura editada e bloqueada (R2)', () => {
  it('viga: bloqueada é só verificada; insuficiente reprova; muda o nº de vãos → desconsiderada', () => {
    const { s, ok, dim } = grade();
    const v = s.modelo.vigas[0], r0 = dim().vigas.find((x) => x.viga === v.id)!;
    expect(r0.bloqueada).toBe(false);
    const a = r0.arranjo;
    // bloqueia o próprio arranjo calculado: continua atendendo
    ok('viga.armadura', { id: v.id, inf: a.inf!, ...(a.sup ? { sup: a.sup } : {}), estribo: a.estribo!, ...(a.laterais ? { laterais: a.laterais } : {}) });
    const r1 = dim().vigas.find((x) => x.viga === v.id)!;
    expect(r1.bloqueada).toBe(true);
    expect(r1.status).toBe(r0.status);
    expect(r1.barrasInf).toBe(r0.barrasInf);
    // armadura pequena: reprova com código ARM_BLOQ
    ok('viga.armadura', { id: v.id, inf: { n: 2, phi: 8 }, estribo: { phi: 5, s: 0.3 } });
    const d2 = dim(), r2 = d2.vigas.find((x) => x.viga === v.id)!;
    expect(r2.status).toBe('fail');
    expect(r2.mensagens.some((m) => m.startsWith('Armadura bloqueada insuficiente: inferior'))).toBe(true);
    expect(r2.barrasInf).toBe('2 φ8');
    expect(revisarEdificio(s.modelo, null, d2).itens.some((x) => x.codigo === 'ARM_BLOQ' && x.id === v.id)).toBe(true);
    // novo pilar no meio de um vão muda o nº de vãos: o bloqueio sai do modelo no mesmo passo (R7f) e a viga é redimensionada
    ok('pilar.inserir', { x: 2.5, y: 0, secao: { tipo: 'ret', b: 0.25, h: 0.25 } });
    expect(s.modelo.vigas[0].armadura).toBeUndefined();
    const r3 = dim().vigas.find((x) => x.viga === v.id)!;
    expect(r3.bloqueada).toBe(false);
    s.desfazer();
    expect(s.modelo.vigas[0].armadura?.inf).toEqual({ n: 2, phi: 8 }); // desfazer devolve a armadura
    // arquivo antigo: bloqueio com número de vãos fora de uso continua sendo desconsiderado, com aviso
    const velho = { ...s.modelo, vigas: s.modelo.vigas.map((x) => (x.id === v.id ? { ...x, armadura: { ...x.armadura!, vaos: 9 } } : x)) };
    const r4 = dimensionarEdificio(velho, analisarEdificio(velho)).vigas.find((x) => x.viga === v.id)!;
    expect(r4.bloqueada).toBe(false);
    expect(r4.mensagens.some((m) => m.startsWith('Armadura bloqueada desconsiderada'))).toBe(true);
    ok('armadura.desbloquear', {});
    expect(s.modelo.vigas.every((x) => !x.armadura)).toBe(true);
  });

  it('pilar: arranjo calculado bloqueado dá a mesma utilização; armadura mínima demais reprova', () => {
    const { s, ok, dim } = grade();
    const p0 = dim().pilares[0], pil = s.modelo.pilares.find((x) => x.id === p0.pilar)!;
    const arr = p0.arranjo!;
    ok('pilar.armadura', { id: pil.id, pavimento: p0.pavimentoId!, phi: arr.phi, nb: arr.nb!, nh: arr.nh!, estribo: arr.estribo });
    const p1 = dim().pilares.find((x) => x.pilar === p0.pilar && x.pavimentoId === p0.pavimentoId)!;
    expect(p1.bloqueada).toBe(true);
    expect(p1.util).toBeCloseTo(p0.util, 9);
    expect(p1.armadura).toBe(p0.armadura);
    ok('pilar.armadura', { id: pil.id, pavimento: p0.pavimentoId!, phi: 8, nb: 2, nh: 2, estribo: { phi: 5, s: 0.3 } });
    const p2 = dim().pilares.find((x) => x.pilar === p0.pilar && x.pavimentoId === p0.pavimentoId)!;
    expect(p2.status).toBe('fail');
    expect(p2.mensagens.some((m) => m.startsWith('Armadura bloqueada insuficiente'))).toBe(true);
  });
});
