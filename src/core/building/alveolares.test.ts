// E3e: lajes alveolares — cálculo manual do painel biapoiado, escolha da placa, serviço, cortante, negativos, processos
// construtivos (escorado × engaste aproximado × duas fases num vão de dois tramos), paginação, apoios, comandos e ficha.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import {
  apoioDaPonta, cordaEm, exportarFichasAlveolares, FICHAS_ALVEOLAR_EXEMPLO, fatorEngasteAproximado, fichaAlveolarPor, fichasAlveolaresCatalogo, geometriaAlveolar,
  importarFichasAlveolares, negativosDaLista, negativosParaLista, paginarPlacas, placasNoMemorial, resistenciasPorMetro, validarFichaAlveolar, vrdPositivo, type FichaAlveolar,
} from './alveolares';
import { listaDePlacas, resumoAcoAlveolares, resumoAlveolar, alveolaresNoMemorial } from './alveolaresDim';
import { dimensionarEdificio } from './dimensionamento';
import { classificar } from './revisao';
import { sugestaoDe } from './sugestoes';

type Ok = (n: string, p: Record<string, unknown>) => void;
const ALV = (placa = 'A25-1') => ({ tipo: 'alveolar', ficha: 'ex:alveolar', placa });
const L = 4.8; // vão das placas: 12 barras de 0,40 m (o meio é um nó)
const PP = 2.8 + 25 * 0.05; // peso da A25-x: placa + capa de 5 cm

interface Opc { Lx?: number; Ly?: number; carga?: number; meio?: boolean; opcoes?: Record<string, number>; antes?: (ok: Ok, s: Sessao) => void; extra?: (ok: Ok, s: Sessao) => void }
/** Pano de `Lx` × `Ly` m (padrão 6 × 4,8: placas em y, 5 placas de 1,20 m), vigas 40×200 (apoios praticamente rígidos) em pilares 40×40; `carga` = permanente de área extra (kN/m²); `meio` = viga e pilares em y = Ly/2 (dois panos). */
function pav(tipo: Record<string, unknown>, o: Opc = {}) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok: Ok = (n, p) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const Lx = o.Lx ?? 6, Ly = o.Ly ?? L, ys = o.meio ? [0, Ly / 2, Ly] : [0, Ly];
  ok('lote', { comandos: ys.flatMap((y) => [0, Lx].map((x) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.4, h: 0.4 } } }))) });
  const vigas = [...ys.map((y) => [[0, y], [Lx, y]]), [[0, 0], [0, Ly]], [[Lx, 0], [Lx, Ly]]];
  ok('lote', { comandos: vigas.map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.4, h: 2 } } })) });
  o.antes?.(ok, s);
  ok('laje.detectarPanos', { grupo: 'g_3', tipo });
  if (o.carga) ok('carga.area', { grupo: 'g_3', caso: 'G', contorno: [[-0.3, -0.3], [Lx + 0.3, -0.3], [Lx + 0.3, Ly + 0.3], [-0.3, Ly + 0.3]], valor: o.carga });
  if (o.opcoes) ok('opcoes.definir', { valores: o.opcoes });
  o.extra?.(ok, s);
  const an = analisarEdificio(s.modelo);
  const d = dimensionarEdificio(s.modelo, an);
  return { s, d, an, r: d.alveolares?.[0], rs: d.alveolares ?? [], lajes: d.lajes };
}
const g = (s: Sessao) => s.modelo.grupos.find((x) => x.id === 'g_3')!;
const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
/** Momento positivo no meio do vão (nó do meio) do diagrama da faixa que governa. */
/** Equilíbrio exato da faixa que governa: M(ℓ/2) = M₀ + V₀·ℓ/2 − p·ℓ²/8 com p = (V₀ + Vₙ)/ℓ (soma das reações da própria faixa) e M₀ o momento da ponta inicial. */
const equilibrioMeio = (r: NonNullable<ReturnType<typeof pav>['r']>) => {
  const V = r.diagrama.V, { Mmax, Mmin } = r.diagrama, M0 = Math.abs(Mmin[0]) > Math.abs(Mmax[0]) ? Mmin[0] : Mmax[0];
  return M0 + (V[0] * L) / 2 - ((V[0] + V.at(-1)!) * L) / 8;
};
const mMeio = (r: NonNullable<ReturnType<typeof pav>['r']>) => { const i = r.diagrama.x.findIndex((x) => Math.abs(x - L / 2) < 1e-6); expect(i).toBeGreaterThanOrEqual(0); return r.diagrama.Mmax[i]; };

describe('E3e: painel biapoiado contra o cálculo manual', () => {
  it('M = qd·ℓ²/8, V = qd·ℓ/2 e aproveitamento contra Mu e VRd da ficha', () => {
    const { s, r, lajes } = pav(ALV('A25-2'), { carga: 5 });
    expect(r).toBeDefined();
    const qd = 1.4 * (PP + g(s).gRev + 5) + 1.4 * g(s).q;
    expect(r!.placas).toHaveLength(5);
    expect(r!.vao).toBeCloseTo(L, 6);
    expect(rel(r!.envoltoria.mPos, (qd * L * L) / 8)).toBeLessThan(0.02);
    expect(rel(r!.envoltoria.v[0], (qd * L) / 2)).toBeLessThan(0.01);
    expect(r!.envoltoria.mNeg[0]).toBeCloseTo(0, 6); // placa apoiada: sem negativo de cálculo
    expect(r!.positivo.Mu).toBe(55);
    expect(r!.positivo.aproveitamento).toBeCloseTo(r!.envoltoria.mPos / 55, 9);
    expect(r!.positivo.ok).toBe(true);
    // serviço: CAA II → protensão limitada, combinação frequente; Ms = p·ℓ²/8 com p = G + ψ1·Q
    const pFreq = PP + g(s).gRev + 5 + 0.4 * g(s).q;
    expect(r!.servico!.nivel).toBe('limitada');
    expect(r!.servico!.combinacao).toBe('frequente');
    expect(rel(r!.servico!.Ms, (pFreq * L * L) / 8)).toBeLessThan(0.02);
    expect(r!.servico!.Madm).toBe(40);
    expect(r!.cortante[0]).toMatchObject({ VRd: 105, ok: true, regiao: 'positiva' }); // apoio simples: Mapoio = 0 ≤ Mdesc → coluna da seção descomprimida
    expect(r!.negativos).toEqual([null, null]);
    expect(r!.status).toBe('ok');
    expect(lajes.every((x) => x.status === 'ok')).toBe(true);
    // a laje comum recebe as mensagens "Alveolares: ..." (resumo)
    expect(lajes[0].mensagens.some((m) => classificar(m).codigo === 'ALVEOLAR_RESUMO')).toBe(true);
  });

  it('reação nas vigas: a soma das reações dos pilares é a carga total do pano e das vigas', () => {
    const { s, an, r } = pav(ALV('A25-2'), { carga: 5 });
    const A = 6 * L, gk = PP + g(s).gRev + 5, pesoVigas = (2 * 6 + 2 * L) * 0.4 * 2 * 25;
    const grelha = an.grelhas.find((x) => x.res)!;
    const totalG = Object.values(grelha.reacoes).reduce((t, c) => t + (c.G ?? 0), 0);
    expect(rel(totalG, gk * A + pesoVigas)).toBeLessThan(1e-6);
    // o cortante de cálculo nas pontas × comprimento das vigas de apoio é a carga de cálculo transmitida
    const qd = 1.4 * gk + 1.4 * g(s).q;
    expect(rel(2 * r!.envoltoria.v[0] * 6, qd * A)).toBeLessThan(0.02);
  });

  it('os três processos coincidem no painel isolado (sem continuidade): M, V e reações', () => {
    const res = [0, 1, 2].map((processo) => pav(ALV('A25-2'), { carga: 5, opcoes: { alveolarProcesso: processo } }));
    const qd = 1.4 * (PP + g(res[0].s).gRev + 5) + 1.4 * g(res[0].s).q;
    for (const x of res) {
      expect(rel(x.r!.envoltoria.mPos, (qd * L * L) / 8)).toBeLessThan(0.02);
      expect(rel(x.r!.envoltoria.v[0], (qd * L) / 2)).toBeLessThan(0.02);
    }
    // reações nos pilares iguais (a fase 1 entra como reações nas pontas)
    const tot = res.map((x) => Object.values(x.an.grelhas.find((y) => y.res)!.reacoes).reduce((t, c) => t + (c.G ?? 0), 0));
    expect(rel(tot[1], tot[0])).toBeLessThan(1e-6);
    expect(rel(tot[2], tot[0])).toBeLessThan(1e-6);
    // flecha total: a fase 1 isostática soma 5pℓ⁴/384EI e reproduz a da grelha
    expect(rel(res[2].lajes[0].flecha, res[0].lajes[0].flecha)).toBeLessThan(0.03);
  });

  it('flecha da variável contra 5·q·ℓ⁴/(384·EI) com o EI da ficha', () => {
    const { s, lajes } = pav(ALV('A25-1'), { carga: 0 });
    const q = g(s).q, EI = 20000;
    expect(rel(lajes[0].flechaQ, (5 * q * L ** 4) / (384 * EI))).toBeLessThan(0.04);
  });
});

describe('E3e: escolha da placa, serviço e fora de tabela', () => {
  it('Mu insuficiente na A25-1: sugere a A25-2 (menor Mu que atende) e a laje fica reprovada', () => {
    const { r, lajes } = pav(ALV('A25-1'), { carga: 5 });
    expect(r!.positivo.ok).toBe(false);
    expect(r!.placaEscolhida).toBe('A25-2');
    expect(r!.trocar).toBe(true);
    expect(r!.status).toBe('fail');
    expect(r!.candidatas.map((c) => [c.placa, c.adequada])).toEqual([['A25-1', false], ['A25-2', true], ['A25-3', true], ['A30-1', true]]);
    const m = lajes[0].mensagens.find((x) => /A25-1 não atende/.test(x))!;
    expect(m).toMatch(/momento positivo .* > Mu 40,00/);
    expect(m).toMatch(/adote a placa A25-2/);
    expect(classificar(m)).toMatchObject({ codigo: 'ALVEOLAR_PLACA', nivel: 'erro' });
  });

  it('placa que atende mas há outra mais econômica: aviso informativo; fixada: sem sugestão', () => {
    const a = pav(ALV('A25-3'), { carga: 5 });
    expect(a.r!.status).toBe('ok');
    expect(a.r!.placaEscolhida).toBe('A25-2');
    expect(a.r!.trocar).toBe(true);
    expect(a.lajes[0].mensagens.some((m) => classificar(m).codigo === 'ALVEOLAR_TROCAR')).toBe(true);
    const f = pav(ALV('A25-3'), { carga: 5, extra: (ok, s) => ok('laje.alveolar', { ids: [s.modelo.lajes[0].id], fixar: true }) });
    expect(f.r!.fixa).toBe(true);
    expect(f.r!.placaEscolhida).toBe('A25-3');
    expect(f.r!.trocar).toBe(false);
    expect(f.lajes[0].mensagens.some((m) => classificar(m).codigo === 'ALVEOLAR_TROCAR')).toBe(false);
  });

  it('as outras placas são avaliadas com o peso próprio delas (razão das cargas de cálculo)', () => {
    // 14 kN/m² adicionais: só a A30-1 (95 kN·m/m, h = 30 cm, 4,65 kN/m²) atende; outra altura
    const { r, lajes } = pav(ALV('A25-1'), { carga: 14 });
    expect(r!.placaEscolhida).toBe('A30-1');
    expect(r!.candidatas.find((c) => c.placa === 'A25-3')!.adequada).toBe(false);
    expect(lajes[0].mensagens.find((m) => /adote a placa A30-1/.test(m))).toMatch(/muda a altura da laje de 25 para 30 cm/);
  });

  it('o momento de serviço do ambiente governa (CAA IV: protensão completa, combinação rara)', () => {
    const base = { carga: 11, extra: (ok: Ok, s: Sessao) => ok('laje.exposicao', { ids: [s.modelo.lajes[0].id], caa: 'IV' }) };
    const { r, lajes } = pav(ALV('A25-3'), base);
    expect(r!.servico).toMatchObject({ nivel: 'completa', combinacao: 'rara', Madm: 46 });
    expect(r!.positivo.ok).toBe(true); // ELU passa (Md ≈ 71 < 75)…
    expect(r!.servico!.ok).toBe(false); // …mas o serviço (≈ 50 > 46) não
    expect(r!.placaEscolhida).toBe('A30-1');
    expect(lajes[0].mensagens.find((m) => /não atende/.test(m))).toMatch(/momento de serviço .* > 46,00 kN·m\/m \(protensão completa\)/);
  });

  it('nenhuma placa atende: ALVEOLAR_FORA_TABELA', () => {
    const { r, lajes } = pav(ALV('A25-1'), { carga: 25 });
    expect(r!.placaEscolhida).toBeNull();
    expect(r!.status).toBe('fail');
    const m = lajes[0].mensagens.find((x) => /nenhuma placa/.test(x))!;
    expect(classificar(m)).toMatchObject({ codigo: 'ALVEOLAR_FORA_TABELA', nivel: 'erro' });
  });

  it('cortante insuficiente (flexão positiva): erro com a marca "insuficiente" na placa', () => {
    const ficha = { nome: 'Cortante baixo', placas: [{ id: 'X1', altura: 0.25, capa: 0.05, largura: 1.2, larguraMin: 0.3, apoioMin: 0.07, apoioMax: 0.15, pesoM2: 2.8, positivo: { Mu: 200, Mfis: 100, EI: 20000, EIfis: 9000 }, VRd: 20 }] };
    const { r, lajes } = pav({ tipo: 'alveolar', ficha: 'fx', placa: 'X1' }, { carga: 5, antes: (ok) => ok('ficha.alveolar', { acao: 'criar', id: 'fx', ficha }) });
    expect(r!.cortante[0]).toMatchObject({ VRd: 20, ok: false });
    expect(r!.status).toBe('fail');
    expect(r!.placas.every((p) => p.status === 'insuficiente')).toBe(true);
    expect(lajes[0].mensagens.find((m) => /nenhuma placa/.test(m))).toMatch(/cortante .* > VRd 20,00 kN\/m/);
    // com VRd suficiente passa
    const ok2 = pav({ tipo: 'alveolar', ficha: 'fx', placa: 'X1' }, { carga: 5, antes: (ok) => ok('ficha.alveolar', { acao: 'criar', id: 'fx', ficha: { ...ficha, placas: [{ ...ficha.placas[0], VRd: 60 }] } }) });
    expect(ok2.r!.status).toBe('ok');
  });

  it('ficha sem dados do fabricante (gabarito do catálogo): a verificação não é feita, com aviso', () => {
    const { r, lajes } = pav({ tipo: 'alveolar', ficha: 'cat:alveolar-generica', placa: 'GEN-20' }, { carga: 5 });
    expect(r!.positivo.Mu).toBeNull();
    expect(r!.placaEscolhida).toBeNull();
    expect(r!.status).toBe('ok');
    expect(lajes[0].mensagens.some((m) => classificar(m).codigo === 'ALVEOLAR_SEM_DADOS')).toBe(true);
  });
});

describe('E3e: continuidade, negativos e processo construtivo (dois tramos iguais)', () => {
  const dois = (processo: number, carga = 3) => pav(ALV('A25-3'), { meio: true, Ly: 2 * L, carga, opcoes: { alveolarProcesso: processo } });
  /** Negativo de cálculo na ponta do apoio comum (a ponta de menor momento nos dois panos). */
  const negMeio = (r: NonNullable<ReturnType<typeof pav>['r']>) => -Math.min(...r.envoltoria.mNeg);

  it('escorado (processo 0): propped cantilever sob p — M− = p·ℓ²/8 e M+ = 9·p·ℓ²/128', () => {
    const { s, rs } = dois(0);
    expect(rs).toHaveLength(2);
    const qd = 1.4 * (PP + g(s).gRev + 3) + 1.4 * g(s).q;
    for (const r of rs) {
      expect(rel(negMeio(r), (qd * L * L) / 8)).toBeLessThan(0.05);
      expect(rel(r.envoltoria.mPos, (9 * qd * L * L) / 128)).toBeLessThan(0.05);
      // equilíbrio no meio do vão da própria faixa (exato) e reações do apoio comum (5pℓ/8) e do apoio livre (3pℓ/8)
      expect(rel(mMeio(r), equilibrioMeio(r))).toBeLessThan(0.015); // a capa transversal troca cortante entre faixas vizinhas (< 1 %)
      expect(rel(Math.max(r.diagrama.V[0], r.diagrama.V.at(-1)!), (5 * qd * L) / 8)).toBeLessThan(0.03);
      expect(rel(Math.min(r.diagrama.V[0], r.diagrama.V.at(-1)!), (3 * qd * L) / 8)).toBeLessThan(0.03);
    }
    // exatamente uma ponta com negativo em cada pano (a do apoio comum); linha da ficha de menor Mu que cobre (φ16, Mu 52)
    for (const r of rs) {
      expect(r.negativos.filter((n) => n)).toHaveLength(1);
      const n = r.negativos.find((x) => x)!;
      expect(n).toMatchObject({ phi: 16, s: 0.2, Mu: 52, fonte: 'ficha', ok: true });
      expect(n.Md).toBeCloseTo(negMeio(r), 9);
      expect(n.barras).toBe(Math.ceil(6 / 0.2 - 1e-6));
      expect(n.comprimento).toBeGreaterThanOrEqual(0.25 * L - 1e-9); // mínimo vigotaNegativoVao = 25 % do vão
    }
    expect(rs.every((r) => r.status === 'ok')).toBe(true);
  });

  it('engaste aproximado (processo 1): fator 1 − pp/total, entre o isostático e o escorado', () => {
    expect(fatorEngasteAproximado(4, 10)).toBeCloseTo(0.6, 12); // exemplo do enunciado
    const p0 = dois(0), p1 = dois(1);
    const total = PP + g(p1.s).gRev + 3 + g(p1.s).q, f = 1 - PP / total;
    expect(f).toBeCloseTo(0.5759, 3);
    const m0 = negMeio(p0.rs[0]), m1 = negMeio(p1.rs[0]);
    expect(m1).toBeGreaterThan(0.2 * m0);
    expect(m1).toBeLessThan(m0);
    expect(p1.rs[0].envoltoria.mPos).toBeGreaterThan(p0.rs[0].envoltoria.mPos);
    const qd = 1.4 * (PP + g(p1.s).gRev + 3) + 1.4 * g(p1.s).q;
    expect(rel(mMeio(p1.rs[0]), equilibrioMeio(p1.rs[0]))).toBeLessThan(0.015);
    expect(qd).toBeGreaterThan(0);
    expect(p1.rs[0].processo).toBe(1);
  });

  it('duas fases (processo 2): M− = p₂·ℓ²/8 e M(ℓ/2) = γg·pp·ℓ²/8 + p₂·ℓ²/16, com p₂ sem o peso da placa', () => {
    const { s, rs } = dois(2);
    const p2 = 1.4 * (g(s).gRev + 3) + 1.4 * g(s).q, ppd = 1.4 * PP;
    for (const r of rs) {
      expect(r.processo).toBe(2);
      expect(rel(negMeio(r), (p2 * L * L) / 8)).toBeLessThan(0.05);
      expect(rel(mMeio(r), (ppd * L * L) / 8 + (p2 * L * L) / 16)).toBeLessThan(0.03);
      // cortante: fase 1 (pp·ℓ/2) soma ao da laje contínua
      expect(r.envoltoria.v[0]).toBeGreaterThan((ppd * L) / 2);
    }
  });

  it('a ordem dos processos: M− escorado > engaste aproximado > duas fases; M(ℓ/2) cresce no sentido inverso', () => {
    const r = [0, 1, 2].map((p) => dois(p).rs[0]);
    expect(negMeio(r[0])).toBeGreaterThan(negMeio(r[1]));
    expect(negMeio(r[1])).toBeGreaterThan(negMeio(r[2]));
    expect(mMeio(r[2])).toBeGreaterThan(mMeio(r[0]));
  });

  it('sem continuidade (opção 0): as bordas são apoiadas e não há negativo', () => {
    const { rs } = pav(ALV('A25-3'), { meio: true, Ly: 2 * L, carga: 3, opcoes: { alveolarContinuidade: 0 } });
    for (const r of rs) { expect(negMeio(r)).toBeCloseTo(0, 6); expect(r.negativos).toEqual([null, null]); }
  });

  it('engaste informado na aresta vale em borda livre; negativo editado insuficiente é erro e desbloquear apaga', () => {
    const livre = pav(ALV('A25-3'), { carga: 3, extra: (ok, s) => ok('laje.alveolar', { ids: [s.modelo.lajes[0].id], engasteBordas: [1, 1, 1, 1] }) });
    expect(-Math.min(...livre.r!.envoltoria.mNeg)).toBeGreaterThan(1);
    const ed = pav(ALV('A25-3'), { meio: true, Ly: 2 * L, carga: 3, extra: (ok, s) => {
      ok('laje.alveolar', { ids: s.modelo.lajes.map((l) => l.id), negativos: { inicio: { phi: 8, s: 0.2, percentual: 30 }, fim: { phi: 8, s: 0.2, percentual: 30 } } });
    } });
    const n = ed.rs[0].negativos.filter((x) => x);
    expect(n.length).toBeGreaterThan(0);
    expect(n.every((x) => x!.fonte === 'editado')).toBe(true);
    expect(n.some((x) => !x!.ok && x!.Mu === 14)).toBe(true);
    expect(ed.rs.some((r) => r.status === 'fail')).toBe(true);
    ed.s.executar('armadura.desbloquear', { tipo: 'laje' });
    expect(ed.s.modelo.lajes.every((l) => !l.alveolar?.negativos)).toBe(true);
    expect(ed.s.modelo.lajes.some((l) => l.alveolar)).toBe(false);
  });

  it('momentos mínimos por tipo de vão: negativo mínimo p·ℓ²/16 na ponta apoiada', () => {
    const { s, r } = pav(ALV('A25-3'), { carga: 3, opcoes: { alveolarMomentoMinNegativo: 16 } });
    const qd = 1.4 * (PP + g(s).gRev + 3) + 1.4 * g(s).q;
    expect(r!.envoltoria.mNeg[0]).toBeCloseTo(-(qd * L * L) / 16, 1);
    const n = r!.negativos[0]!;
    expect(n.Md).toBeCloseTo((qd * L * L) / 16, 1);
    expect(n.Mu).toBeGreaterThanOrEqual(n.Md);
  });
});

describe('E3e: paginação das placas, apoios e quantitativos', () => {
  const ret = (Lx: number, Ly: number) => [[0, 0], [Lx, 0], [Lx, Ly], [0, Ly]] as [number, number][];

  it('faixa múltipla da largura: placas inteiras', () => {
    const p = paginarPlacas({ contorno: ret(6, 4.8), direcao: 90 }, 1.2, 0.3);
    expect(p.placas.map((x) => +x.largura.toFixed(4))).toEqual([1.2, 1.2, 1.2, 1.2, 1.2]);
    expect(p.placas.every((x) => !x.cortada && !x.obliqua)).toBe(true);
    expect(p.placas[0].L).toBeCloseTo(4.8, 9);
  });
  it('resto ≥ largura mínima: placa de borda cortada', () => {
    const p = paginarPlacas({ contorno: ret(5.5, 4.8), direcao: 90 }, 1.2, 0.3);
    expect(p.placas.map((x) => +x.largura.toFixed(4))).toEqual([1.2, 1.2, 1.2, 1.2, 0.7]);
    expect(p.placas.map((x) => x.cortada)).toEqual([false, false, false, false, true]);
  });
  it('resto menor que a mínima: a última inteira e o resto se dividem em duas iguais', () => {
    const p = paginarPlacas({ contorno: ret(5.0, 4.8), direcao: 90 }, 1.2, 0.3);
    expect(p.placas.map((x) => +x.largura.toFixed(4))).toEqual([1.2, 1.2, 1.2, 0.7, 0.7]);
    expect(p.placas.reduce((t, x) => t + x.largura, 0)).toBeCloseTo(5, 9);
  });
  it('faixa menor que a mínima: uma placa só, com aviso; ponto de inserção no lado oposto numera do outro lado', () => {
    const p = paginarPlacas({ contorno: ret(0.2, 4.8), direcao: 90 }, 1.2, 0.3);
    expect(p.placas).toHaveLength(1);
    expect(p.avisos[0]).toMatch(/menor que a largura mínima/);
    const a = paginarPlacas({ contorno: ret(5.5, 4.8), direcao: 90, insercao: 0 }, 1.2, 0.3), b = paginarPlacas({ contorno: ret(5.5, 4.8), direcao: 90, insercao: 1 }, 1.2, 0.3);
    expect(a.placas[0].largura).toBeCloseTo(1.2, 9);
    expect(b.placas[0].largura).toBeCloseTo(1.2, 9);
    expect(a.placas[4].largura).toBeCloseTo(0.7, 9);
    expect(b.placas[4].largura).toBeCloseTo(0.7, 9);
  });
  it('apoio oblíquo: corda variável, placa oblíqua e maior corda', () => {
    // trapézio: lado de cima inclinado
    const c = [[0, 0], [6, 0], [6, 5], [0, 4]] as [number, number][];
    const p = paginarPlacas({ contorno: c, direcao: 90 }, 1.2, 0.3);
    expect(p.placas.every((x) => x.obliqua)).toBe(true);
    expect(p.placas[0].Lmax).toBeGreaterThan(p.placas[0].L - 1e-9);
    expect(cordaEm(c, [0, 1], -3)).toEqual([0, 4.5]); // t = −x para a direção y
  });
  it('apoio: viga de borda (30 cm): máximo da ficha; compartilhado: metade menos a junta; insuficiente abaixo do mínimo', () => {
    const p = fichaAlveolarPor(undefined, 'ex:alveolar')!.placas[0];
    expect(apoioDaPonta(p, 0.3, false)).toMatchObject({ adotado: 0.15, situacao: 'ok' });
    expect(apoioDaPonta(p, 0.3, true).adotado).toBeCloseTo(0.14, 12);
    expect(apoioDaPonta(p, 0.15, true).situacao).toBe('insuficiente');
    expect(apoioDaPonta(p, 0.3, false, 0.1).situacao).toBe('chanfrada');
    expect(apoioDaPonta(p, 0, false).disponivel).toBeNull();
  });
  it('comprimento da peça e quantitativos num pano de 5,5 m de largura', () => {
    const { r, d } = pav(ALV('A25-2'), { Lx: 5.5, carga: 2 });
    expect(r!.placas).toHaveLength(5);
    expect(r!.placas[0].comprimento).toBeCloseTo(4.7, 9); // 4,8 − 2·(0,40/2) + 2·0,15 (viga de borda de 40 cm: apoio máximo da ficha)
    expect(r!.quantitativo.lista).toEqual([
      { largura: 1.2, comprimento: 4.7, quantidade: 4, cortada: false, obliqua: false },
      { largura: 0.7, comprimento: 4.7, quantidade: 1, cortada: true, obliqua: false },
    ]);
    expect(r!.quantitativo.areaPlacas).toBeCloseTo(5.5 * 4.7, 6);
    expect(r!.quantitativo.pesoPlacas).toBeCloseTo(5.5 * 4.7 * 2.8, 6);
    expect(r!.quantitativo.concretoLocal).toBeCloseTo(5.5 * 4.8 * 0.05, 6);
    expect(r!.mensagens.some((m) => classificar(m).codigo === 'ALVEOLAR_BORDA')).toBe(true);
    // lista de placas com as repetições dos pavimentos do grupo (3)
    const lp = listaDePlacas(d.alveolares!);
    expect(lp.reduce((t, x) => t + x.quantidade, 0)).toBe(5 * r!.repeticoes);
  });
  it('apoio compartilhado em viga de 30 cm: 0,15 − 0,01 = 0,14 m; comprimento da peça = vão livre + apoios (4,74 m)', () => {
    const { rs } = pav(ALV('A25-3'), { meio: true, Ly: 2 * L, carga: 3, extra: (ok, s) => { const v = s.modelo.vigas.find((x) => x.pontos[0][1] === L && x.pontos[1][1] === L)!; ok('viga.editar', { id: v.id, secao: { b: 0.3, h: 2 } }); } });
    for (const r of rs) {
      expect(r.placas[0].apoios.map((a) => +a.adotado.toFixed(3)).sort()).toEqual([0.14, 0.15]);
      expect(r.placas[0].comprimento).toBeCloseTo(4.74, 9); // 4,8 − 0,40/2 − 0,30/2 + 0,15 + 0,14
    }
  });
  it('viga estreita no apoio comum (15 cm): apoio insuficiente (ALVEOLAR_APOIO)', () => {
    const { lajes } = pav(ALV('A25-3'), { meio: true, Ly: 2 * L, carga: 3, extra: (ok, s) => { const v = s.modelo.vigas.find((x) => x.pontos[0][1] === L && x.pontos[1][1] === L)!; ok('viga.editar', { id: v.id, secao: { b: 0.15, h: 1.2 } }); } });
    const m = lajes.flatMap((x) => x.mensagens).find((x) => /apoio insuficiente/.test(x))!;
    expect(classificar(m)).toMatchObject({ codigo: 'ALVEOLAR_APOIO', nivel: 'erro' });
  });
});

describe('E3e: fichas, catálogo, validação, exportação e comandos', () => {
  it('o catálogo da biblioteca de normas é só um gabarito (sem resistências) e os exemplos são fictícios', () => {
    const cat = fichasAlveolaresCatalogo();
    expect(cat).toHaveLength(1);
    expect(cat[0].placas[0].positivo).toBeUndefined();
    expect(cat[0].placas[0].VRd).toBeUndefined();
    expect(FICHAS_ALVEOLAR_EXEMPLO.every((f) => f.ficticio)).toBe(true);
    expect(validarFichaAlveolar(FICHAS_ALVEOLAR_EXEMPLO[0]).erros).toEqual([]);
    expect(validarFichaAlveolar(cat[0]).avisos.length).toBeGreaterThan(0);
  });
  it('geometria: peso = placa + 25 × volume (padrão: a capa); resistências por placa dividem pela largura', () => {
    const ge = geometriaAlveolar(undefined, { tipo: 'alveolar', ficha: 'ex:alveolar', placa: 'A25-1' });
    expect(ge.pp).toBeCloseTo(2.8 + 25 * 0.05, 12);
    expect(ge.h).toBe(0.25);
    const porPlaca: FichaAlveolar = { ...FICHAS_ALVEOLAR_EXEMPLO[0], base: 'placa' };
    const r = resistenciasPorMetro(porPlaca, porPlaca.placas[0]);
    expect(r.Mu).toBeCloseTo(40 / 1.2, 12);
    expect(r.VRd).toBeCloseTo(70 / 1.2, 12);
    expect(r.negativos[3].Mu).toBeCloseTo(52 / 1.2, 12);
    const ausente = geometriaAlveolar(undefined, { tipo: 'alveolar', ficha: 'nao-existe', placa: 'x' });
    expect(ausente.ausente).toMatch(/ficha "nao-existe" não existe/);
  });
  it('validação lógica recusa ficha incoerente', () => {
    const base = FICHAS_ALVEOLAR_EXEMPLO[0], p0 = base.placas[0];
    const com = (m: Partial<typeof p0>): FichaAlveolar => ({ ...base, placas: [{ ...p0, ...m }, base.placas[1]] });
    expect(validarFichaAlveolar(com({ positivo: { Mu: 20, Mfis: 28 } })).erros.join()).toMatch(/Mu deve ser maior que Mfis/);
    expect(validarFichaAlveolar(com({ apoioMin: 0.2 })).erros.join()).toMatch(/apoio mínimo maior que o máximo/);
    expect(validarFichaAlveolar(com({ capa: 0.3 })).erros.join()).toMatch(/capa deve ser menor/);
    expect(validarFichaAlveolar(com({ larguraMin: 2 })).erros.join()).toMatch(/largura mínima maior/);
    expect(validarFichaAlveolar(com({ servico: { Mdesc: 20, Mcompleta: 30, Mlimitada: 25 } })).erros.join()).toMatch(/crescer/);
    expect(validarFichaAlveolar(com({ negativos: [{ phi: 8, s: 0.2, Mu: 5, Mfis: 9 }] })).erros.join()).toMatch(/Mu deve ser maior que Mfis/);
    expect(validarFichaAlveolar(com({ id: 'A25-2' })).erros.join()).toMatch(/código repetido/);
    expect(validarFichaAlveolar({ ...base, placas: [] }).erros.join()).toMatch(/ao menos uma placa/);
  });
  it('exportar e importar são idempotentes; negativos da lista da tabela', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    expect(s.executar('ficha.alveolar', { acao: 'copiar', de: 'ex:alveolar', nome: 'Minha ficha' }).ok).toBe(true);
    const id = s.modelo.tiposLaje!.alveolares![0].id;
    const t1 = exportarFichasAlveolares(s.modelo);
    const lido = importarFichasAlveolares(t1);
    expect(lido.ok).toBe(true);
    const s2 = new Sessao();
    for (const c of comandosEdificioPadrao()) s2.executar(c.nome, c.params, 'sistema');
    expect(s2.executar('ficha.alveolar', { acao: 'importar', texto: t1 }).ok).toBe(true);
    expect(exportarFichasAlveolares(s2.modelo)).toBe(t1);
    expect(s2.modelo.tiposLaje!.alveolares![0].id).toBe(id);
    expect(s2.executar('ficha.alveolar', { acao: 'importar', texto: t1 }).ok).toBe(false); // id repetido
    expect(s2.executar('ficha.alveolar', { acao: 'importar', texto: t1, substituir: true }).ok).toBe(true);
    expect(importarFichasAlveolares('{').ok).toBe(false);
    expect(importarFichasAlveolares('{"formato":"x"}').ok).toBe(false);
    const neg = FICHAS_ALVEOLAR_EXEMPLO[0].placas[0].negativos!;
    expect(negativosDaLista(negativosParaLista(neg))).toEqual(neg);
  });
  it('comandos: ficha do usuário é editável, a copiada de fabricante não; remover recusa ficha em uso; ficha de exemplo vai para a obra', () => {
    const { s } = pav(ALV('A25-2'), { carga: 2 });
    const r1 = s.executar('ficha.alveolar', { acao: 'editar', id: 'ex:alveolar', ficha: { nome: 'x', placas: FICHAS_ALVEOLAR_EXEMPLO[0].placas } });
    expect(r1.ok).toBe(false);
    expect(s.modelo.tiposLaje!.alveolares!.map((f) => f.id)).toEqual(['ex:alveolar']); // copiada para a obra ao usar
    expect(s.executar('ficha.alveolar', { acao: 'remover', id: 'ex:alveolar' }).erros[0].codigo).toBe('FICHA_ALVEOLAR_EM_USO');
    expect(s.executar('ficha.alveolar', { acao: 'criar', id: 'ex:novo', ficha: { nome: 'n', placas: FICHAS_ALVEOLAR_EXEMPLO[0].placas } }).erros[0].codigo).toBe('FICHA_ALVEOLAR_EXISTENTE'); // id reservado
    expect(s.executar('ficha.alveolar', { acao: 'copiar', de: 'ex:alveolar', nome: 'Cópia' }).ok).toBe(true);
    const copiada = s.modelo.tiposLaje!.alveolares!.find((f) => f.nome === 'Cópia')!;
    expect(copiada.origem).toBe('usuario');
    const placas = copiada.placas.map((p) => ({ ...p, pesoM2: 3 }));
    expect(s.executar('ficha.alveolar', { acao: 'editar', id: copiada.id, ficha: { nome: 'Cópia', placas } }).ok).toBe(true);
    expect(s.executar('ficha.alveolar', { acao: 'editar', id: copiada.id, ficha: { nome: 'Cópia', placas: [{ ...placas[0], positivo: { Mu: 10, Mfis: 20 } }] } }).erros[0].codigo).toBe('FICHA_ALVEOLAR_INCOERENTE');
    expect(s.executar('laje.alveolar', { ids: [s.modelo.lajes[0].id], ficha: 'nao-existe' }).erros[0].codigo).toBe('FICHA_ALVEOLAR_INEXISTENTE');
    expect(s.executar('laje.alveolar', { ids: [s.modelo.lajes[0].id], placa: 'zzz' }).erros[0].codigo).toBe('FICHA_ALVEOLAR_INEXISTENTE');
    expect(s.executar('laje.alveolar', { ids: [s.modelo.lajes[0].id] }).erros[0].codigo).toBe('SEM_EDICAO');
    // trocar a placa a fixa; fixar: false volta ao automático
    expect(s.executar('laje.alveolar', { ids: [s.modelo.lajes[0].id], placa: 'A25-3' }).ok).toBe(true);
    expect(s.modelo.lajes[0].tipo).toEqual({ tipo: 'alveolar', ficha: 'ex:alveolar', placa: 'A25-3' });
    expect(s.modelo.lajes[0].alveolar?.fixa).toBe(true);
    expect(s.executar('laje.alveolar', { ids: [s.modelo.lajes[0].id], fixar: false }).ok).toBe(true);
    expect(s.modelo.lajes[0].alveolar).toBeUndefined();
  });
  it('laje.atribuir aceita o tipo alveolar e valida a ficha e a placa', () => {
    const { s } = pav({ tipo: 'macica', h: 0.12 });
    const id = s.modelo.lajes[0].id;
    expect(s.executar('laje.atribuir', { ids: [id], tipo: { tipo: 'alveolar', ficha: 'ex:alveolar', placa: 'A25-1' } }).ok).toBe(true);
    expect(s.executar('laje.atribuir', { ids: [id], tipo: { tipo: 'alveolar', ficha: 'ex:alveolar', placa: 'ZZ' } }).ok).toBe(false);
    expect(s.executar('laje.atribuir', { ids: [id], tipo: { tipo: 'alveolar', ficha: 'ex:alveolar', placa: 'A25-2' } }).ok).toBe(true);
  });
  it('todos os códigos novos têm sugestão e classificação', () => {
    for (const c of ['ALVEOLAR_FORA_TABELA', 'ALVEOLAR_PLACA', 'ALVEOLAR_TROCAR', 'ALVEOLAR_SEM_DADOS', 'ALVEOLAR_APOIO', 'ALVEOLAR_CHANFRO', 'ALVEOLAR_BORDA', 'ALVEOLAR_LARGURA', 'ALVEOLAR_CAPA', 'ALVEOLAR_RESUMO', 'ALVEOLAR_SEM_APOIO', 'FICHA_ALVEOLAR_INEXISTENTE', 'FICHA_ALVEOLAR_INCOERENTE'])
      expect(sugestaoDe(c), c).toBeTruthy();
  });
  it('capa abaixo do mínimo da opção: ALVEOLAR_CAPA', () => {
    const { lajes } = pav(ALV('A25-2'), { carga: 2, opcoes: { alveolarCapaMin: 6 } });
    expect(classificar(lajes[0].mensagens.find((m) => /capa de/.test(m))!).codigo).toBe('ALVEOLAR_CAPA');
  });
  it('resumos: MCP, aço dos negativos, memorial e quadro das placas', () => {
    const { s, d, rs } = pav(ALV('A25-3'), { meio: true, Ly: 2 * L, carga: 3 });
    const res = resumoAlveolar(rs[0]);
    expect(res).toMatchObject({ placa: 'A25-3', status: 'ok', placas: 5 });
    expect(res.negativos.filter((n) => n)).toHaveLength(1);
    const aco = resumoAcoAlveolares(rs, 10);
    expect(aco).toHaveLength(1);
    expect(aco[0].phi).toBe(16);
    const kg = rs.reduce((t, r) => t + r.quantitativo.negativos.reduce((u, n) => u + n.peso * r.repeticoes, 0), 0);
    expect(aco[0].peso).toBeCloseTo(kg, 6);
    expect(aco[0].pesoComPerdas).toBeCloseTo(kg * 1.1, 6);
    expect(d.resumoAcoAlveolares).toEqual(resumoAcoAlveolares(d.alveolares!, 10));
    const mem = alveolaresNoMemorial(rs);
    expect(mem[0]).toMatchObject({ placa: 'A25-3', ficha: 'Alveolar exemplo (fictícia)', marca: 'ficha fictícia (demonstração)' });
    const q = placasNoMemorial(s.modelo);
    expect(q.map((x) => [x.id, x.usada])).toEqual([['A25-1', false], ['A25-2', false], ['A25-3', true], ['A30-1', false]]);
    expect(q[0].marca).toBe('ficha fictícia (demonstração)');
  });
});

describe('E3e: cortante descomprimido, redistribuição, apoio lateral e dados faltantes', () => {
  const placaX = (o: Record<string, unknown>) => ({ id: 'X1', altura: 0.25, capa: 0.05, largura: 1.2, larguraMin: 0.3, apoioMin: 0.07, apoioMax: 0.15, pesoM2: 2.8, positivo: { Mu: 200, Mfis: 100, EI: 20000, EIfis: 9000 }, ...o });
  const comFicha = (p: Record<string, unknown>) => ({ antes: (ok: Ok) => ok('ficha.alveolar', { acao: 'criar', id: 'fx', ficha: { nome: 'X', placas: [placaX(p)] } }) });
  const FX = { tipo: 'alveolar', ficha: 'fx', placa: 'X1' };

  it('vrdPositivo: usa a coluna descomprimida quando o momento no apoio não passa do de descompressão', () => {
    const r = { VRd: 20, VRdDesc: 60, servico: { Mdesc: 10 } };
    expect(vrdPositivo(r, 0)).toBe(60);
    expect(vrdPositivo(r, 10)).toBe(60);
    expect(vrdPositivo(r, 10.5)).toBe(20);
    expect(vrdPositivo({ VRd: 20, VRdDesc: 60 }, 0)).toBe(20); // sem Mdesc: só o VRd
    expect(vrdPositivo({ VRd: 20 }, 0)).toBe(20);
    expect(vrdPositivo({}, 0)).toBeUndefined();
  });
  it('apoio simples: o momento no apoio é nulo e vale o cortante da seção descomprimida', () => {
    const a = pav(FX, { carga: 5, ...comFicha({ VRd: 20, VRdDesc: 60, servico: { Mdesc: 10 } }) });
    expect(a.r!.cortante[0]).toMatchObject({ VRd: 60, ok: true });
    expect(a.r!.status).toBe('ok');
    const b = pav(FX, { carga: 5, ...comFicha({ VRd: 20, VRdDesc: 60 }) }); // sem Mdesc na ficha
    expect(b.r!.cortante[0]).toMatchObject({ VRd: 20, ok: false });
  });
  it('a validação recusa VRd da seção descomprimida menor que o VRd', () => {
    const f: FichaAlveolar = { id: 'x', nome: 'x', origem: 'usuario', placas: [placaX({ VRd: 50, VRdDesc: 40 }) as FichaAlveolar['placas'][0]] };
    expect(validarFichaAlveolar(f).erros.join()).toMatch(/descomprimida/);
  });
  it('redistribuição dos negativos (opção): δ = 0,85 reduz o negativo e aumenta o positivo', () => {
    const base = pav(ALV('A25-3'), { meio: true, Ly: 2 * L, carga: 3 }), red = pav(ALV('A25-3'), { meio: true, Ly: 2 * L, carga: 3, opcoes: { alveolarRedistribuir: 1 } });
    const neg = (x: typeof base) => -Math.min(...x.rs[0].envoltoria.mNeg);
    expect(rel(neg(red), 0.85 * neg(base))).toBeLessThan(0.01);
    expect(red.rs[0].envoltoria.mPos).toBeGreaterThan(base.rs[0].envoltoria.mPos);
    expect(red.lajes[0].mensagens.some((m) => classificar(m).codigo === 'ALVEOLAR_REDISTRIB')).toBe(true);
  });
  it('apoio lateral das placas de borda (sobreposição sobre a viga paralela): ok com 40 cm; aviso com viga de 8 cm', () => {
    const a = pav(ALV('A25-2'), { carga: 2 });
    expect(a.r!.lateral.every((x) => x.ok && Math.abs(x.disponivel! - 0.38) < 1e-9)).toBe(true);
    const b = pav(ALV('A25-2'), { carga: 2, extra: (ok, s) => { const v = s.modelo.vigas.find((x) => x.pontos[0][0] === 0 && x.pontos[1][0] === 0)!; ok('viga.editar', { id: v.id, secao: { b: 0.08, h: 2 } }); } });
    expect(b.r!.lateral.some((x) => !x.ok)).toBe(true);
    expect(classificar(b.lajes[0].mensagens.find((m) => /apoio lateral/.test(m))!).codigo).toBe('ALVEOLAR_LATERAL');
  });
  it('ficha sem EI: a flecha não é verificada e o aviso diz o que faltou (K1.9.75)', () => {
    const { r, lajes } = pav(FX, { carga: 5, ...comFicha({ positivo: { Mu: 200, Mfis: 100 }, VRd: 80, servico: undefined }) });
    expect(lajes[0].limite).toBe(Infinity);
    expect(lajes[0].flecha).toBe(0);
    const m = lajes[0].mensagens.find((x) => /não informa/.test(x))!;
    expect(m).toMatch(/momentos de serviço \(ambiente\)/);
    expect(m).toMatch(/EI \(flecha\)/);
    expect(m).not.toMatch(/cortante resistente/);
    expect(classificar(m).codigo).toBe('ALVEOLAR_SEM_DADOS');
    expect(r!.servico).toBeNull();
    expect(r!.status).toBe('ok');
  });
});

describe('E3e: pano trapezoidal (placas com apoio oblíquo)', () => {
  it('a análise e o dimensionamento seguem: placas oblíquas pela maior corda, aviso de apoio oblíquo e canto chanfrado', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const ok: Ok = (n, p) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
    ok('vento.definir', { ativo: false });
    const cont: [number, number][] = [[0, 0], [6, 0], [6, 5.4], [0, 4.2]];
    ok('lote', { comandos: cont.map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.4, h: 0.4 } } })) });
    ok('lote', { comandos: cont.map((p, i) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [p, cont[(i + 1) % 4]], secao: { b: 0.4, h: 2 } } })) });
    ok('laje.detectarPanos', { grupo: 'g_3', tipo: ALV('A30-1') });
    ok('laje.alveolar', { ids: [s.modelo.lajes[0].id], direcao: 90 });
    const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)), r = d.alveolares![0];
    expect(r.placas).toHaveLength(5);
    expect(r.placas.every((p) => p.obliqua)).toBe(true);
    // a corda cresce de 4,2 a 5,4 m ao longo de x; sem ponto de inserção a numeração começa na menor posição transversal (x = 6):
    // o comprimento da peça de cada placa é a maior corda da faixa e decresce de uma placa à seguinte
    expect(r.placas[0].comprimento).toBeGreaterThan(r.placas[4].comprimento);
    expect(r.placas.map((p) => p.comprimento)).toEqual([...r.placas.map((p) => p.comprimento)].sort((a, z) => z - a));
    expect(r.placas[4].Lmax).toBeGreaterThan(r.placas[4].L);
    expect(r.vao).toBeGreaterThan(4.2);
    expect(r.mensagens.some((m) => classificar(m).codigo === 'ALVEOLAR_RESUMO')).toBe(true);
    expect(Number.isFinite(r.envoltoria.mPos)).toBe(true);
  });
});
