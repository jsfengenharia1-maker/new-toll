// Gerador 3D das fundações (FU1 e FU2): sapata (base + tronco até a seção do pilar), bloco com as estacas, tubulão
// (fuste, tronco da base e rodapé) e vigas de equilíbrio/travamento. Precisa dos resultados do cálculo das fundações:
// sem eles a cena não tem fundações. A cota `cota` do resultado é a de assentamento (face inferior da sapata e do
// bloco, base do tubulão).
import { blockCoords } from '../piles';
import { cotaFundacao } from '../building/types';
import { geometriaVF, pontaVF } from '../building/vigasFundacao';
import type { ResultadoFundacao } from '../building/fundacao';
import { circulo, Malha, retangulo } from './malha';
import { PAV_FUNDACAO, registrarGerador3D, type Objeto3D } from './registro';
import type { P } from './triangular';

/** Comprimento de estaca desenhado quando o cálculo não informa (capacidade imposta), em m [a confirmar]. */
export const COMPRIMENTO_ESTACA_PADRAO = 5;

const cm = (v: number) => String(Math.round(v * 100));
const rot = (v: P, graus: number): P => { const a = (graus * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
const base = { pavimento: PAV_FUNDACAO, pavimentoNome: 'Fundação', grupo: '' };

function sapata(r: ResultadoFundacao): Objeto3D | null {
  const { A, B, h, h0 } = r.dims;
  if (!A || !B || !h) return null;
  const m = new Malha(), z0 = r.cota;
  if (h0 && h0 < h - 1e-6) {
    // base prismática de altura h0 e tronco até a seção do pilar (retângulo ap × bp, na excentricidade do cálculo)
    m.extrudar(r.contorno, [], z0, z0 + h0);
    const e = rot(r.excentricidade, r.angulo);
    const topo = retangulo([r.centro[0] + e[0], r.centro[1] + e[1]], Math.min(r.ap || A, A), Math.min(r.bp || B, B), r.angulo);
    m.tronco(r.contorno, z0 + h0, topo, z0 + h);
  } else m.extrudar(r.contorno, [], z0, z0 + h);
  return { id: `fundacao:${r.id}:${PAV_FUNDACAO}`, elemento: r.id, tipo: 'fundacao', subtipo: 'sapata', ...base, nome: r.nome, descricao: `${r.nome} · sapata ${cm(A)}×${cm(B)}×${cm(h)} cm`, pos: m.pos, idx: m.idx, linhas: m.linhas, volume: m.volume() };
}

function bloco(r: ResultadoFundacao, pds: ResultadoFundacao['projeto']): Objeto3D[] {
  const { A, B, h, n, D, L } = r.dims;
  if (!A || !B || !h) return [];
  const m = new Malha(), z0 = r.cota;
  m.extrudar(r.contorno, [], z0, z0 + h);
  const out: Objeto3D[] = [{ id: `fundacao:${r.id}:${PAV_FUNDACAO}`, elemento: r.id, tipo: 'fundacao', subtipo: 'bloco', ...base, nome: r.nome, descricao: `${r.nome} · bloco ${cm(A)}×${cm(B)}×${cm(h)} cm${n ? ` · ${n} estaca${n > 1 ? 's' : ''}` : ''}`, pos: m.pos, idx: m.idx, linhas: m.linhas, volume: m.volume() }];
  if (n && D) {
    const coords: P[] = pds?.pile?.loads.coords ?? pds?.pileFixed?.loads.coords ?? blockCoords(n, 3 * (D / 100), false);
    const comp = L ?? COMPRIMENTO_ESTACA_PADRAO, e = new Malha();
    for (const q of coords) {
      const l = rot(q, r.angulo);
      e.extrudar(circulo([r.centro[0] + l[0], r.centro[1] + l[1]], D / 200, 16), [], z0 - comp, z0, 4);
    }
    out.push({ id: `fundacao:${r.id}:${PAV_FUNDACAO}:estacas`, elemento: r.id, tipo: 'fundacao', subtipo: 'estaca', ...base, nome: `${r.nome} (estacas)`, descricao: `${r.nome} · ${coords.length} estaca${coords.length > 1 ? 's' : ''} φ${D} cm · L = ${comp.toFixed(1).replace('.', ',')} m${L ? '' : ' (nominal)'}`, pos: e.pos, idx: e.idx, linhas: e.linhas, volume: e.volume() });
  }
  return out;
}

function tubulao(r: ResultadoFundacao): Objeto3D | null {
  const { Df, Db, H, L } = r.dims;
  if (!Df || !L) return null;
  const m = new Malha(), z0 = r.cota, c = r.centro;
  const alargado = !!Db && Db > Df + 1e-6 && !!H && H > 0;
  const topo = z0 + Math.max(L, H ?? 0);
  if (alargado) {
    const rodape = Math.min(0.2, H! / 3), cone = H! - rodape; // rodapé cilíndrico de 20 cm (premissa da base)
    m.extrudar(circulo(c, Db! / 2), [], z0, z0 + rodape, 6);
    m.tronco(circulo(c, Db! / 2), z0 + rodape, circulo(c, Df / 2), z0 + rodape + cone);
    m.extrudar(circulo(c, Df / 2), [], z0 + H!, topo, 6);
  } else m.extrudar(circulo(c, Df / 2), [], z0, topo, 6);
  return { id: `fundacao:${r.id}:${PAV_FUNDACAO}`, elemento: r.id, tipo: 'fundacao', subtipo: 'tubulao', ...base, nome: r.nome, descricao: `${r.nome} · tubulão fuste φ${cm(Df)}${Db ? `, base φ${cm(Db)}` : ''} cm`, pos: m.pos, idx: m.idx, linhas: m.linhas, volume: m.volume() };
}

registrarGerador3D('fundacoes', ({ b, pavimentos, fundacoes, vigasFundacao }) => {
  const objetos: Objeto3D[] = [];
  if (!pavimentos.has(PAV_FUNDACAO)) return { objetos };
  for (const r of fundacoes) {
    if (!r.contorno.length) continue;
    if (r.tipo === 'sapata') { const o = sapata(r); if (o) objetos.push(o); }
    else if (r.tipo === 'bloco') objetos.push(...bloco(r, r.projeto));
    else { const o = tubulao(r); if (o) objetos.push(o); }
  }
  for (const rv of vigasFundacao) {
    const v = b.fundacao?.vigas?.find((x) => x.id === rv.id);
    if (!v) continue;
    const g = geometriaVF(b, v);
    if (g.erro) continue;
    // topo da viga = topo do elemento da ponta inicial (ou a cota de fundação + h, sem elemento calculado)
    const ini = pontaVF(b, v.ini), el = ini?.elemento ? fundacoes.find((x) => x.id === ini.elemento!.id) : undefined;
    const topo = el ? el.cota + (el.dims.h ?? rv.hAdot) : cotaFundacao(b) + rv.hAdot;
    const larg = rv.bAdot || v.b, alt = rv.hAdot || v.h;
    const t: P = [-g.u[1], g.u[0]], hl = larg / 2;
    const poly: P[] = [[g.a[0] - t[0] * hl, g.a[1] - t[1] * hl], [g.z[0] - t[0] * hl, g.z[1] - t[1] * hl], [g.z[0] + t[0] * hl, g.z[1] + t[1] * hl], [g.a[0] + t[0] * hl, g.a[1] + t[1] * hl]];
    const m = new Malha();
    m.extrudar(poly, [], topo - alt, topo);
    objetos.push({ id: `fundacao:${v.id}:${PAV_FUNDACAO}`, elemento: v.id, tipo: 'fundacao', subtipo: 'vigaFundacao', ...base, nome: v.nome, descricao: `${v.nome} · viga de ${v.tipo === 'equilibrio' ? 'equilíbrio' : 'travamento'} ${cm(larg)}×${cm(alt)} cm`, pos: m.pos, idx: m.idx, linhas: m.linhas, volume: m.volume() });
  }
  return { objetos };
});
