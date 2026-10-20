// Gerador 3D das vigas: um prisma por trecho do traçado, com a largura e a altura da seção. O topo fica no topo da laje
// do pavimento mais o desnível (`nivel`); a viga invertida sobe a partir dessa cota.
import { pavimentosOrdenados, trechosViga } from '../building/types';
import { Malha } from './malha';
import { registrarGerador3D, type Objeto3D } from './registro';

const cm = (v: number) => String(Math.round(v * 100));

registrarGerador3D('vigas', ({ b, pavimentos }) => {
  const objetos: Objeto3D[] = [];
  for (const pav of pavimentosOrdenados(b)) {
    if (!pavimentos.has(pav.id)) continue;
    for (const v of b.vigas) {
      if (v.grupo !== pav.grupo) continue;
      const ref = pav.cota + (v.nivel ?? 0), h = v.secao.h;
      const z0 = v.invertida ? ref : ref - h, z1 = v.invertida ? ref + h : ref;
      const m = new Malha();
      for (const t of trechosViga(v)) m.extrudar(t, [], z0, z1);
      if (!m.idx.length) continue;
      objetos.push({
        id: `viga:${v.id}:${pav.id}`, elemento: v.id, tipo: 'viga', pavimento: pav.id, pavimentoNome: pav.nome, grupo: pav.grupo, nome: v.nome,
        descricao: `${v.nome} · ${cm(v.secao.b)}×${cm(v.secao.h)} cm${v.invertida ? ' · invertida' : ''} · ${pav.nome}`,
        pos: m.pos, idx: m.idx, linhas: m.linhas, volume: m.volume(),
      });
    }
  }
  return { objetos };
});
