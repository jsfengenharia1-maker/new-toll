// Ferramentas de planta com o mouse (E5b): consolo na face, diagonal, linhas magenta, edição do plano e ábaco pelos caixotes.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import type { P } from '../geom/faces';
import { arranjoDaLaje } from './nervuradas';
import {
  abacoAjustadoAosCaixotes, consoloNaFace, linhasMagenta, moverPontoDoPlano, nervuradaSob, paramsDiagonalPlanta, pavimentoAcima, pontoDoPlanoSob,
  recortarReta, reescreverCotaDoPlano, reescreverInclinacaoDoPlano, retanguloNasNervuras, rotulosDoPlano,
} from './ferramentasMouse';
import { coeficientesPlano, zPlano } from './planos';
import type { Plano } from './types';

function sessao() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  return { s, ok };
}

describe('consolo pelo clique na face do pilar (C6.55)', () => {
  it('escolhe a viga que chega à face clicada, recusa clique fora e viga já com consolo', () => {
    const { s, ok } = sessao();
    ok('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[0.15, 0], [4, 0]], secao: { b: 0.2, h: 0.5 } });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 0.15], [0, 4]], secao: { b: 0.2, h: 0.5 } });
    const b = s.modelo, pil = b.pilares, vg = b.vigas.filter((v) => v.grupo === 'g_3');
    expect(vg.length).toBe(2);
    const dir = consoloNaFace(b, pil, vg, [0.2, 0.0]);
    expect(dir.ok && dir.viga).toBe(vg[0].id);
    const topo = consoloNaFace(b, pil, vg, [0, 0.2]);
    expect(topo.ok && topo.viga).toBe(vg[1].id);
    expect(consoloNaFace(b, pil, vg, [-0.2, 0])).toMatchObject({ ok: false });
    expect(consoloNaFace(b, pil, vg, [3, 3])).toEqual({ ok: false, motivo: 'Clique na face de um pilar.' });
    if (dir.ok) {
      expect(dir.ponta).toBe('ini');
      expect(dir.aresta).toEqual([[0.15, -0.15], [0.15, 0.15]]);
      ok('consolo.criar', { viga: dir.viga, ponta: dir.ponta, pilar: dir.pilar });
      const dep = consoloNaFace(s.modelo, pil, vg, [0.2, 0.0]);
      expect(dep.ok).toBe(true); // resta a viga do topo, na seção circular/única face livre
      expect(dep.ok && dep.viga).toBe(vg[1].id);
    }
  });
});

describe('diagonal por dois cliques (C6.42)', () => {
  it('a ponta final vai ao pavimento acima por padrão ou ao escolhido', () => {
    const { s } = sessao();
    const ps = [...s.modelo.pavimentos].sort((a, z) => a.cota - z.cota);
    expect(pavimentoAcima(s.modelo, ps[1].id)).toBe(ps[2].id);
    expect(pavimentoAcima(s.modelo, ps.at(-1)!.id)).toBeNull();
    const p = paramsDiagonalPlanta(s.modelo, ps[1].id, '', [0, 0], [4, 3], { b: 0.2, h: 0.3 });
    expect(p).toEqual({ pavIni: ps[1].id, pavFim: ps[2].id, pIni: [0, 0], pFim: [4, 3], secao: { b: 0.2, h: 0.3 } });
    expect(paramsDiagonalPlanta(s.modelo, ps[1].id, ps[3].id, [0, 0], [4, 3], { b: 0.2, h: 0.3 })!.pavFim).toBe(ps[3].id);
    expect(paramsDiagonalPlanta(s.modelo, ps.at(-1)!.id, '', [0, 0], [4, 3], { b: 0.2, h: 0.3 })).toBeNull();
  });
});

const caixaVigas = (ok: (n: string, p: Record<string, unknown>) => void) => {
  for (const p of [[[0, 0], [6, 0]], [[0, 4.5], [6, 4.5]], [[0, 0], [0, 4.5]], [[6, 0], [6, 4.5]]]) ok('viga.tracar', { grupo: 'g_3', pontos: p, secao: { b: 0.2, h: 0.5 } });
};

describe('linhas magenta dos planos (C6.58)', () => {
  it('recorta a reta na caixa', () => {
    expect(recortarReta([2.5, 0], [0, 1], [0, 0, 6, 4])).toEqual([[2.5, 0], [2.5, 4]]);
    expect(recortarReta([9, 0], [0, 1], [0, 0, 6, 4])).toBeNull();
  });
  it('interseção de dois planos (x = 2,5 m, solução analítica) e máxima declividade pelo 1º ponto', () => {
    const { s, ok } = sessao();
    caixaVigas(ok);
    ok('plano.criar', { grupo: 'g_3', tipo: 'tresPontos', pontos: [[0, 0, 0], [1, 0, 0.1], [0, 1, 0]] }); // z = 0,1·x
    ok('plano.criar', { grupo: 'g_3', tipo: 'tresPontos', pontos: [[0, 0, 0.5], [1, 0, 0.4], [0, 1, 0.5]] }); // z = 0,5 − 0,1·x
    const L = linhasMagenta(s.modelo, 'g_3');
    const inter = L.filter((l) => l.tipo === 'interseccao'), decl = L.filter((l) => l.tipo === 'declividade');
    expect(inter.length).toBe(1);
    expect(inter[0].a[0]).toBeCloseTo(2.5, 9);
    expect(inter[0].z[0]).toBeCloseTo(2.5, 9);
    expect(Math.abs(inter[0].z[1] - inter[0].a[1])).toBeCloseTo(4.5 + 1, 9); // caixa das vigas com folga de 0,5 m
    expect(decl.length).toBe(2);
    for (const d of decl) expect(d.a[1]).toBeCloseTo(d.z[1], 9); // gradiente ao longo de x
    expect(linhasMagenta(s.modelo, 'g_3', { plano: s.modelo.planos![0].id }).length).toBe(2);
    expect(linhasMagenta(s.modelo, 'g_inexistente')).toEqual([]);
  });
  it('planos paralelos não têm interseção', () => {
    const { s, ok } = sessao();
    caixaVigas(ok);
    ok('plano.criar', { grupo: 'g_3', tipo: 'tresPontos', pontos: [[0, 0, 0], [1, 0, 0.1], [0, 1, 0]] });
    ok('plano.criar', { grupo: 'g_3', tipo: 'tresPontos', pontos: [[0, 0, 0.3], [1, 0, 0.4], [0, 1, 0.3]] });
    expect(linhasMagenta(s.modelo, 'g_3').filter((l) => l.tipo === 'interseccao')).toEqual([]);
  });
});

const tres: Plano = { id: 'pl1', nome: 'P', grupo: 'g', def: { tipo: 'tresPontos', pontos: [[0, 0, 0], [4, 0, 0.4], [0, 3, 0]] } }; // 10 %
const maxd: Plano = { id: 'pl2', nome: 'M', grupo: 'g', def: { tipo: 'maximaDeclividade', pontos: [[0, 0], [4, 0]], desnivel: 0.1, inclinacao: 5 } };
const reta: Plano = { id: 'pl3', nome: 'R', grupo: 'g', def: { tipo: 'retaHorizontal', pontos: [[0, 0], [4, 0]], desnivel: 0.2, inclinacao: 8 } };

describe('edição do plano na planta (C7.67)', () => {
  it('rótulos: cotas dos pontos e inclinação', () => {
    const r = rotulosDoPlano(tres);
    expect(r.filter((x) => x.tipo === 'cota').map((x) => x.texto)).toEqual(['0,0 cm', '40,0 cm', '0,0 cm']);
    const inc = r.find((x) => x.tipo === 'inclinacao')!;
    expect(inc.texto).toBe('10,0 %');
    expect(inc.ponto[0]).toBeCloseTo(4 / 3, 9);
    expect(rotulosDoPlano(maxd).filter((x) => x.tipo === 'cota').map((x) => x.valor)).toEqual([0.1, 0.1 + 0.05 * 4]);
  });
  it('ponto sob o cursor e arrasto mantêm as cotas', () => {
    expect(pontoDoPlanoSob(tres, [4.05, 0.02], 0.1)).toBe(1);
    expect(pontoDoPlanoSob(tres, [2, 2], 0.1)).toBe(-1);
    expect(moverPontoDoPlano(tres, 1, [5, 1])).toEqual({ id: 'pl1', pontos: [[0, 0, 0], [5, 1, 0.4], [0, 3, 0]] });
    expect(moverPontoDoPlano(maxd, 1, [6, 0]).pontos).toEqual([[0, 0], [6, 0]]);
  });
  it('reescrever a cota', () => {
    expect(reescreverCotaDoPlano(tres, 2, 0.3)).toEqual({ id: 'pl1', pontos: [[0, 0, 0], [4, 0, 0.4], [0, 3, 0.3]] });
    expect(reescreverCotaDoPlano(reta, 1, 0.35)).toEqual({ id: 'pl3', desnivel: 0.35 });
    expect(reescreverCotaDoPlano(maxd, 0, 0.2)).toEqual({ id: 'pl2', desnivel: 0.2 });
    expect(reescreverCotaDoPlano(maxd, 1, 0.5)).toEqual({ id: 'pl2', inclinacao: 10 }); // (0,5 − 0,1)/4 m
    expect(reescreverCotaDoPlano(maxd, 5, 0.5)).toBeNull();
  });
  it('reescrever a inclinação: 10 % para 20 % no plano de três pontos gira em torno do 1º ponto', () => {
    const e = reescreverInclinacaoDoPlano(tres, 20)!;
    expect(e.pontos).toEqual([[0, 0, 0], [4, 0, 0.8], [0, 3, 0]]);
    const novo: Plano = { ...tres, def: { tipo: 'tresPontos', pontos: e.pontos as never } };
    expect(Math.hypot(coeficientesPlano(novo.def)!.a, coeficientesPlano(novo.def)!.b)).toBeCloseTo(0.2, 9);
    expect(zPlano(coeficientesPlano(novo.def)!, [4, 0])).toBeCloseTo(0.8, 9);
    expect(reescreverInclinacaoDoPlano(reta, 12)).toEqual({ id: 'pl3', inclinacao: 12 });
    expect(reescreverInclinacaoDoPlano({ ...tres, def: { tipo: 'tresPontos', pontos: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] } }, 5)).toBeNull();
  });
});

describe('ábaco desenhado na planta (K1.9.97, K1.9.99)', () => {
  function nerv() {
    const { s, ok } = sessao();
    ok('laje.criar', { grupo: 'g_3', contorno: [[0, 0], [12.5, 0], [12.5, 12.5], [0, 12.5]], tipo: { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } });
    return { s, ok, l: s.modelo.lajes[0] };
  }
  it('acha o pano nervurado sob o ponto e fecha o retângulo nas nervuras', () => {
    const { s, l } = nerv();
    expect(nervuradaSob(s.modelo, 'g_3', [3, 3])?.id).toBe(l.id);
    expect(nervuradaSob(s.modelo, 'g_3', [30, 3])).toBeNull();
    expect(retanguloNasNervuras({ contorno: l.contorno, direcao: l.direcao }, [1, 1], [2, 2]).map((q) => q.map((v) => +v.toFixed(6)))).toEqual([[1, 1], [2, 1], [2, 2], [1, 2]]);
  });
  it('o número de caixotes sai do intereixo e a zona cresce até os eixos das nervuras', () => {
    const { s, l } = nerv();
    const i = arranjoDaLaje(s.modelo, l)!.g.i;
    const r = abacoAjustadoAosCaixotes(s.modelo, l, retanguloNasNervuras(l, [1, 1], [2, 2]));
    expect(r.ok).toBe(true);
    const nx = Math.ceil(2 / i[1] - 1e-9) - Math.floor(1 / i[1] + 1e-9), ny = Math.ceil(2 / i[0] - 1e-9) - Math.floor(1 / i[0] + 1e-9);
    expect(r.caixotes).toEqual([nx, ny]);
    const xs = r.poligono.map((q: P) => q[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(nx * i[1], 6);
    expect(abacoAjustadoAosCaixotes(s.modelo, l, [[20, 20], [21, 20], [21, 21], [20, 21]]).ok).toBe(false);
  });
});
