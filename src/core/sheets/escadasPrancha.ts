// Escadas nas pranchas de formas e de locação (E4b): contorno, degraus em traço fino, seta de subida e referência (nome).
// Vêm de `desenhoPlantaEscada` (o mesmo desenho da planta); a camada ESCADAS leva contornos, setas e nome, e os degraus
// vão na camada fina das formas. Sem escadas no grupo, não acrescenta nada (as pranchas das obras sem escada não mudam).
import { geometriaEscada, tiposLanceDisponiveis } from '../building/escadas';
import { desenhoPlantaEscada } from '../building/escadasEdicao';
import type { BuildingModel } from '../building/types';
import type { Prim } from './prancha';

/** Primitivas das escadas dos `grupos` (todas as escadas se omitido); `k` = metros do modelo por milímetro do papel. */
export function primitivasEscadas(b: BuildingModel, k: number, grupos?: string[]): Prim[] {
  const tipos = tiposLanceDisponiveis(b), out: Prim[] = [];
  for (const e of b.escadas ?? []) {
    if (grupos && !grupos.includes(e.grupo)) continue;
    const d = desenhoPlantaEscada(geometriaEscada(e, tipos, b));
    for (const pts of d.contornos) if (pts.length >= 3) out.push({ t: 'pl', c: 'ESCADAS', pts, fechada: true });
    for (const [a, z] of d.degraus) out.push({ t: 'pl', c: 'FORMA-FINA', pts: [a, z] });
    for (const [a, z] of d.setas) out.push({ t: 'pl', c: 'ESCADAS', pts: [a, z] });
    if (d.rotulo && d.nome) out.push({ t: 'txt', c: 'ESCADAS', p: d.rotulo, h: 3 * k, s: d.nome, ah: 'c', av: 'meio' });
  }
  return out;
}
