// Gerador 3D das escadas (E4e, C8.37): um sólido por lance com a laje inclinada de cada trecho (espessura perpendicular h, superfície no plano
// que passa pelos cantos internos dos degraus), os degraus como prismas triangulares sobre ela e os patamares como lajes horizontais. O objeto
// pertence ao pavimento de partida do lance, para os filtros por pavimento e grupo. Os degraus iniciais sobre o piso não entram (a laje começa na
// cota da base). Núcleo puro.
import { geometriaEscadas, type LanceGeo } from '../building/escadas';
import { pavimentosOrdenados } from '../building/types';
import { Malha } from './malha';
import { registrarGerador3D, type Objeto3D } from './registro';
import { areaComSinal, triangular, type P } from './triangular';

const cm = (v: number) => String(Math.round(v * 100));
const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

/**
 * Extrude um perfil (s, z), anti-horário, ao longo da largura: s segue a direção `dir` (unitária) a partir de `o` e a largura segue `larg`
 * (vetor da primeira à segunda borda). Acrescenta triângulos e arestas ao `m`; a orientação é corrigida pelo sinal do volume.
 */
function extrudarPerfil(m: Malha, perfil: P[], o: P, dir: P, larg: P): void {
  const ccw = areaComSinal(perfil) >= 0 ? perfil : perfil.slice().reverse();
  const q = (s: number, z: number, w: number): [number, number, number] => [o[0] + dir[0] * s + larg[0] * w, o[1] + dir[1] * s + larg[1] * w, z];
  const base = m.pos.length / 3, n = ccw.length;
  for (const w of [0, 1]) for (const [s, z] of ccw) m.pos.push(...q(s, z, w));
  const t = triangular(ccw, []);
  const ini = m.idx.length;
  // tampas (w = 0 e w = 1)
  for (let i = 0; i < t.idx.length; i += 3) {
    m.idx.push(base + t.idx[i], base + t.idx[i + 2], base + t.idx[i + 1]);
    m.idx.push(base + n + t.idx[i], base + n + t.idx[i + 1], base + n + t.idx[i + 2]);
  }
  // faixas laterais: aresta i do perfil entre as duas bordas
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = base + i, b = base + j, c = base + n + j, d = base + n + i;
    m.idx.push(a, b, c, a, c, d);
    const pa = q(ccw[i][0], ccw[i][1], 0), pb = q(ccw[j][0], ccw[j][1], 0), qa = q(ccw[i][0], ccw[i][1], 1), qb = q(ccw[j][0], ccw[j][1], 1);
    m.linhas.push(...pa, ...pb, ...qa, ...qb, ...pa, ...qa);
  }
  // orientação: o volume do trecho acrescentado precisa ser positivo
  const sub = m.idx.slice(ini);
  let v = 0;
  for (let i = 0; i < sub.length; i += 3) {
    const A = sub[i] * 3, B = sub[i + 1] * 3, C = sub[i + 2] * 3, p = m.pos;
    v += (p[A] * (p[B + 1] * p[C + 2] - p[B + 2] * p[C + 1]) - p[A + 1] * (p[B] * p[C + 2] - p[B + 2] * p[C]) + p[A + 2] * (p[B] * p[C + 1] - p[B + 1] * p[C])) / 6;
  }
  if (v < 0) for (let i = ini; i < m.idx.length; i += 3) { const x = m.idx[i + 1]; m.idx[i + 1] = m.idx[i + 2]; m.idx[i + 2] = x; }
}

/** Sólido do lance: lajes inclinadas, degraus (piso `piso`) e patamares. */
export function malhaDoLance(l: LanceGeo, piso: number, espelho: number): Malha {
  const m = new Malha();
  const h = l.espessura.valor, cosA = piso / Math.hypot(piso, espelho);
  for (const t of l.trechos) {
    if (t.tipo === 'patamar') { m.extrudar(t.planta, [], t.cotaIni - h, t.cotaIni); continue; }
    const [p0, p1, , p3] = t.poligono, R = t.comprimento, dz = t.cotaFim - t.cotaIni;
    if (R < 1e-9) continue;
    const o: P = [p0[0], p0[1]], dir: P = [(p1[0] - p0[0]) / R, (p1[1] - p0[1]) / R], larg: P = [p3[0] - p0[0], p3[1] - p0[1]], e = h / cosA;
    // laje inclinada: a face superior passa pelos cantos internos dos degraus
    extrudarPerfil(m, [[0, t.cotaIni], [R, t.cotaIni + dz], [R, t.cotaIni + dz - e], [0, t.cotaIni - e]], o, dir, larg);
    // degraus: prismas triangulares com o vale no plano da laje
    const n = Math.max(1, Math.round(R / piso)), passo = R / n, esp = dz / n;
    for (let j = 0; j < n; j++) { const s0 = j * passo, z0 = t.cotaIni + j * esp; extrudarPerfil(m, [[s0, z0], [s0 + passo, z0 + esp], [s0, z0 + esp]], o, dir, larg); }
  }
  return m;
}

registrarGerador3D('escadas', ({ b, pavimentos }) => {
  const objetos: Objeto3D[] = [];
  if (!b.escadas?.length) return { objetos };
  const ps = new Map(pavimentosOrdenados(b).map((p) => [p.id, p]));
  for (const g of geometriaEscadas(b)) {
    for (const l of g.lances) {
      const pav = l.pavimento ? ps.get(l.pavimento) : undefined;
      if (!pav || !pavimentos.has(pav.id) || !l.trechos.length) continue;
      const m = malhaDoLance(l, g.escada.piso, g.escada.espelho);
      const topo = l.pavimentoTopo ? ps.get(l.pavimentoTopo)?.nome : undefined;
      objetos.push({
        id: `escada:${g.escada.id}-${l.indice + 1}:${pav.id}`, elemento: g.escada.id, tipo: 'escada', subtipo: l.tipo?.tipologia, pavimento: pav.id, pavimentoNome: pav.nome, grupo: g.escada.grupo,
        nome: `${g.escada.nome} · lance ${l.indice + 1}`,
        descricao: `${g.escada.nome} · lance ${l.indice + 1} · ${l.tipo?.nome ?? 'lance'} · ${l.degraus.total} degraus · h ${cm(l.espessura.valor)} cm · ${pav.nome}${topo ? ` a ${topo}` : ''} · desnível ${fmt(l.desnivel, 3)} m`,
        pos: m.pos, idx: m.idx, linhas: m.linhas, volume: m.volume(),
      });
    }
  }
  return { objetos };
});
