// Folhas da V5: cargas especiais por caso e grupo (K1.11.62, a prancha de cargas que a E4e usa para as reações das
// escadas) e perspectiva axonométrica da estrutura 3D (K1.11.62, vista V1). Mesmos escritores das demais pranchas.
import { classeDoCaso, legendaDeCargas } from '../resultados/cargasCaso';
import { contornoPilar, geometriaViga, lancesDoPilar, pavimentosDoGrupo, type BuildingModel, type Carga } from '../building/types';
import { eixosDaCamera, type V3 } from '../vista3d/camera';
import { construirCena } from '../vista3d/cena';
import { pontoInterno } from '../geom/faces';
import { areaArmacao, cfgArmacao, montarFolha, nf, plantaNaFolha, type BlocoTabela } from './armacao';
import { caixa, type Camada, type P, type Prancha, type Prim } from './prancha';
import type { OpcoesArmacao } from './armacaoVigas';

/** Camada da carga: por natureza e, nos casos adicionais, a camada dos adicionais. */
export function camadaDaCarga(b: BuildingModel, caso: string): Camada {
  const c = classeDoCaso(b, caso);
  if (c.includes('adic')) return 'CARGA-ADIC';
  return ({ 'carga-caso-g': 'CARGA-G', 'carga-caso-q': 'CARGA-Q', 'carga-caso-w': 'CARGA-W', 'carga-caso-e': 'CARGA-E', 'carga-caso-h': 'CARGA-H' } as Record<string, Camada>)[c] ?? 'CARGA-Q';
}

const unidade = (c: Carga) => (c.tipo === 'ponto' ? 'kN' : c.tipo === 'linha' ? 'kN/m' : 'kN/m²');

/** Uma prancha por grupo com cargas lançadas: planta fina da estrutura, cargas por caso (camada por natureza) e a tabela de casos. */
export function montarPranchasCargas(b: BuildingModel, o: OpcoesArmacao = {}): Prancha[] {
  const grupos = b.grupos.filter((g) => b.cargas.some((c) => c.grupo === g.id) && (!o.grupo || g.id === o.grupo || g.nome === o.grupo));
  const cfg = cfgArmacao(b);
  return grupos.map((g, ig) => {
    const cargas = b.cargas.filter((c) => c.grupo === g.id), pavs = pavimentosDoGrupo(b, g.id), ref = pavs[0];
    const pilares = b.pilares.filter((p) => ref && lancesDoPilar(b, p).some((x) => x.id === ref.id));
    const vigas = b.vigas.filter((v) => v.grupo === g.id), lajes = b.lajes.filter((l) => l.grupo === g.id);
    const geo: P[] = [...lajes.flatMap((l) => l.contorno), ...vigas.flatMap((v) => v.pontos), ...cargas.flatMap((c) => c.pontos), ...pilares.flatMap((p) => contornoPilar(p, p.secao))];
    const cx = caixa(geo.length ? geo : [[0, 0], [1, 1]]);
    const pl = plantaNaFolha(cx, b.prancha?.formato ?? 'auto', cfg.escalaLocacao || b.prancha?.escala || 0, 30);
    const k = pl.escala / 1000;
    const modelo: Prim[] = [];
    for (const l of lajes) modelo.push({ t: 'pl', c: 'LAJE', pts: l.contorno, fechada: true });
    for (const v of vigas) { const gv = geometriaViga(v); modelo.push({ t: 'pl', c: 'FORMA-FINA', pts: [...gv.esq, ...[...gv.dir].reverse()], fechada: true }); }
    for (const p of pilares) modelo.push({ t: 'pl', c: 'PILAR', pts: contornoPilar(p, p.secao), fechada: true });
    for (const c of cargas) {
      const cam = camadaDaCarga(b, c.caso), txt = `${nf(c.valor, 2)} ${unidade(c)}`;
      if (c.tipo === 'ponto') {
        const [x, y] = c.pontos[0];
        modelo.push({ t: 'circ', c: cam, centro: [x, y], r: 1.2 * k }, { t: 'pl', c: cam, pts: [[x - 1.2 * k, y], [x + 1.2 * k, y]] }, { t: 'pl', c: cam, pts: [[x, y - 1.2 * k], [x, y + 1.2 * k]] },
          { t: 'txt', c: cam, p: [x + 1.6 * k, y + 0.6 * k], h: 2 * k, s: txt });
      } else if (c.tipo === 'linha') {
        modelo.push({ t: 'pl', c: cam, pts: c.pontos });
        const i = Math.floor((c.pontos.length - 1) / 2), a = c.pontos[i], z = c.pontos[i + 1];
        let ang = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI;
        if (ang > 90.01 || ang < -89.99) ang += ang > 0 ? -180 : 180;
        modelo.push({ t: 'txt', c: cam, p: [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2 + 0.8 * k], h: 2 * k, s: txt, ang, ah: 'c' });
      } else {
        modelo.push({ t: 'pl', c: cam, pts: c.pontos, fechada: true });
        modelo.push({ t: 'txt', c: cam, p: pontoInterno(c.pontos), h: 2.2 * k, s: txt, ah: 'c', av: 'meio' });
      }
    }
    const leg = legendaDeCargas(b, g.id);
    const tabela: BlocoTabela = {
      titulo: `CARGAS POR CASO — ${g.nome.toUpperCase()}`,
      cols: [{ w: 22, rot: 'CASO' }, { w: 16, rot: 'NATUREZA' }, { w: 16, rot: 'CARGAS' }, { w: 30, rot: 'CAMADA' }, { w: 30, rot: 'TOTAL (kN)' }],
      linhas: leg.map((e) => [e.nome, e.natureza, String(e.n), camadaDaCarga(b, e.caso), nf(cargas.filter((c) => c.caso === e.caso && c.tipo === 'ponto').reduce((t, c) => t + c.valor, 0))]),
    };
    return montarFolha({
      b, formato: pl.formato, tipo: 'cargas', titulo: `Cargas — ${g.nome}`, conteudo: `CARGAS POR CASO — ${g.nome.toUpperCase()}`, escala: `1:${pl.escala}`, escalaNum: pl.escala, carimbo: o.carimbo, numero: ig + 1,
      desenho: [], tabelas: [tabela], legenda: `ESCALA 1:${pl.escala} · cargas em kN, kN/m e kN/m² · total só das concentradas`, avisos: pl.avisos, modelo, janela: pl.janela, elementos: leg.map((e) => e.nome),
    } as Parameters<typeof montarFolha>[0]);
  });
}

/** Perspectiva axonométrica (projeção ortográfica) dos contornos da estrutura 3D, ajustada à área da folha A3. */
export function montarPranchaPerspectiva(b: BuildingModel, o: OpcoesArmacao & { azimute?: number; elevacao?: number } = {}): Prancha | null {
  const cena = construirCena(b);
  if (!cena.objetos.length) return null;
  const az = ((o.azimute ?? -55) * Math.PI) / 180, el = ((o.elevacao ?? 28) * Math.PI) / 180;
  const { direita, cima } = eixosDaCamera({ alvo: [0, 0, 0], dist: 1, azimute: az, elevacao: el, fov: 45, projecao: 'isometrica' });
  const dot = (a: V3, p: number[], i: number) => a[0] * p[i] + a[1] * p[i + 1] + a[2] * p[i + 2];
  const CAM: Record<string, Camada> = { pilar: 'PILAR', viga: 'VIGA', laje: 'LAJE', fundacao: 'FUNDACAO', parede: 'PILAR', escada: 'VIGA' };
  const segs: { c: Camada; a: P; z: P }[] = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const ob of cena.objetos) for (let i = 0; i + 5 < ob.linhas.length; i += 6) {
    const a: P = [dot(direita, ob.linhas, i), dot(cima, ob.linhas, i)], z: P = [dot(direita, ob.linhas, i + 3), dot(cima, ob.linhas, i + 3)];
    for (const q of [a, z]) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    segs.push({ c: CAM[ob.tipo] ?? 'FORMA-FINA', a, z });
  }
  const area = areaArmacao('A3'), w = area.x1 - area.x0, h = area.y1 - area.y0;
  const f = Math.min(w / Math.max(x1 - x0, 1e-6), h / Math.max(y1 - y0, 1e-6)) * 0.95;
  const ox = area.x0 + (w - (x1 - x0) * f) / 2 - x0 * f, oy = area.y0 + (h - (y1 - y0) * f) / 2 - y0 * f;
  const desenho: Prim[] = segs.map((s) => ({ t: 'pl', c: s.c, pts: [[ox + s.a[0] * f, oy + s.a[1] * f], [ox + s.z[0] * f, oy + s.z[1] * f]] }));
  return montarFolha({
    b, formato: 'A3', tipo: 'perspectiva', titulo: 'Perspectiva axonométrica', conteudo: 'PERSPECTIVA AXONOMÉTRICA DA ESTRUTURA', escala: 'S/E', escalaNum: 100, carimbo: o.carimbo,
    desenho, tabelas: [], legenda: `AXONOMETRIA ORTOGRÁFICA · azimute ${o.azimute ?? -55}° · elevação ${o.elevacao ?? 28}° · sem escala`, avisos: cena.avisos, elementos: [`${cena.contagens.total} elementos`],
  } as Parameters<typeof montarFolha>[0]);
}
