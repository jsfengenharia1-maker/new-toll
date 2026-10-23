// Gerador 3D das lajes: polígono triangulado com furos e a espessura do tipo (maciça: h; treliçada: capa + enchimento,
// e em detalhe alto só a capa com as vigotas em linhas). Panos fechados pelas vigas sem laje lançada (C7.18) viram um
// polígono translúcido tracejado com a marca "?".
import { propriedadesLaje, panosDoGrupo, TRELICADAS, direcaoMenorVao } from '../building/lajes';
import { pavimentosOrdenados, type Laje } from '../building/types';
import { dentroPoligono, pontoInterno } from '../geom/faces';
import { Malha } from './malha';
import { registrarGerador3D, type Objeto3D, type Rotulo3D } from './registro';
import { areaComSinal, type P } from './triangular';

const cm = (v: number) => String(Math.round(v * 100));
/** Espessura do polígono do pano a definir (m): só para ter volume e aceitar o clique. */
export const ESPESSURA_PANO = 0.02;

/** Vigotas: linhas na direção `graus`, a cada `intereixo`, recortadas pelo contorno e pelos furos (z fixo). */
export function linhasDeVigotas(contorno: P[], furos: P[][], graus: number, intereixo: number, z: number): number[] {
  const t = (graus * Math.PI) / 180, dx = Math.cos(t), dy = Math.sin(t), nx = -dy, ny = dx;
  const aneis = [contorno, ...furos];
  const ss = contorno.map((q) => q[0] * nx + q[1] * ny);
  const smin = Math.min(...ss), smax = Math.max(...ss);
  const out: number[] = [];
  for (let s = smin + intereixo / 2; s < smax; s += intereixo) {
    const ts: number[] = [];
    for (const r of aneis) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      const sa = a[0] * nx + a[1] * ny, sb = b[0] * nx + b[1] * ny;
      if ((sa <= s) === (sb <= s)) continue;
      const ta = a[0] * dx + a[1] * dy, tb = b[0] * dx + b[1] * dy;
      ts.push(ta + ((s - sa) / (sb - sa)) * (tb - ta));
    }
    ts.sort((p, q) => p - q);
    for (let k = 0; k + 1 < ts.length; k += 2) out.push(ts[k] * dx + s * nx, ts[k] * dy + s * ny, z, ts[k + 1] * dx + s * nx, ts[k + 1] * dy + s * ny, z);
  }
  return out;
}

registrarGerador3D('lajes', ({ b, pavimentos, detalhe }) => {
  const objetos: Objeto3D[] = [], auxiliares: { objeto: string; linhas: number[] }[] = [], rotulos: Rotulo3D[] = [];
  for (const pav of pavimentosOrdenados(b)) {
    if (!pavimentos.has(pav.id)) continue;
    const doGrupo = b.lajes.filter((l) => l.grupo === pav.grupo);
    for (const l of doGrupo) {
      const { h } = propriedadesLaje(l.tipo, b);
      const z1 = pav.cota + (l.nivel ?? 0);
      const trel = l.tipo.tipo === 'trelicada' ? l.tipo : null;
      const alto = detalhe === 'alto' && !!trel;
      const espessura = alto ? trel!.capa : h;
      const m = new Malha();
      m.extrudar(l.contorno, l.furos ?? [], z1 - espessura, z1);
      const id = `laje:${l.id}:${pav.id}`;
      if (alto) {
        const c = TRELICADAS[trel!.modelo] ?? TRELICADAS.H12;
        auxiliares.push({ objeto: id, linhas: linhasDeVigotas(l.contorno, l.furos ?? [], l.direcao ?? direcaoMenorVao(l.contorno), c.intereixo, z1 - h) });
      }
      objetos.push({
        id, elemento: l.id, tipo: 'laje', pavimento: pav.id, pavimentoNome: pav.nome, grupo: pav.grupo, nome: l.nome,
        descricao: `${l.nome} · ${descricaoTipo(l)} · ${cm(h)} cm · ${pav.nome}`,
        pos: m.pos, idx: m.idx, linhas: m.linhas, volume: m.volume(),
      });
    }
    // panos fechados pelas vigas que ainda não têm laje: polígono translúcido com "?"
    panosDoGrupo(b, pav.grupo).forEach((pano, i) => {
      const ip = pontoInterno(pano);
      if (doGrupo.some((l) => dentroPoligono(ip, l.contorno))) return;
      if (Math.abs(areaComSinal(pano)) < 0.05) return;
      const z1 = pav.cota, m = new Malha();
      m.extrudar(pano, [], z1 - ESPESSURA_PANO, z1);
      const id = `laje:pano${pav.grupo}-${i}:${pav.id}`;
      objetos.push({
        id, elemento: `pano:${pav.grupo}:${i}`, tipo: 'laje', subtipo: 'definir', pendente: true, pavimento: pav.id, pavimentoNome: pav.nome, grupo: pav.grupo,
        nome: 'Pano a definir', descricao: `Pano a definir · ${Math.abs(areaComSinal(pano)).toFixed(2).replace('.', ',')} m² · ${pav.nome}`,
        pos: m.pos, idx: m.idx, linhas: m.linhas, volume: m.volume(),
      });
      rotulos.push({ objeto: id, x: ip[0], y: ip[1], z: z1 + 0.05, texto: '?' });
    });
  }
  return { objetos, auxiliares, rotulos };
});

function descricaoTipo(l: Laje): string {
  return propriedadesLaje(l.tipo).descricao;
}
