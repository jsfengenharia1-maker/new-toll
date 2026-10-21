// Gerador 3D dos pilares: um prisma por lance (retângulo girado, círculo de 24 lados), da laje de baixo ao topo da
// laje do pavimento do lance, com a seção do lance. Arranques (pilar de altura zero) aparecem como um toco acima da
// cota de fundação quando as fundações entram na cena.
import { contornoNoLance, contornoPilar, cotaFundacao, dimsSecao, ehArranque, lancesDoPilar, peDireito, secaoNoLance } from '../building/types';
import { Malha } from './malha';
import { PAV_FUNDACAO, registrarGerador3D, type Objeto3D } from './registro';

/** Altura do toco que representa o arranque (m) [a confirmar]. */
export const ALTURA_ARRANQUE = 0.4;

const cm = (v: number) => String(Math.round(v * 100));

registrarGerador3D('pilares', ({ b, pavimentos }) => {
  const objetos: Objeto3D[] = [];
  for (const p of b.pilares) {
    if (ehArranque(p)) {
      if (!pavimentos.has(PAV_FUNDACAO)) continue;
      const m = new Malha(), z0 = cotaFundacao(b);
      m.extrudar(contornoPilar(p, p.secao), [], z0, z0 + ALTURA_ARRANQUE, 6);
      const [w, h] = dimsSecao(p.secao);
      objetos.push({ id: `pilar:${p.id}:${PAV_FUNDACAO}`, elemento: p.id, tipo: 'pilar', subtipo: 'arranque', pavimento: PAV_FUNDACAO, pavimentoNome: 'Fundação', grupo: '', nome: p.nome, descricao: `${p.nome} (arranque) · ${cm(w)}×${cm(h)} cm`, pos: m.pos, idx: m.idx, linhas: m.linhas, volume: m.volume() });
      continue;
    }
    for (const pav of lancesDoPilar(b, p)) {
      if (!pavimentos.has(pav.id)) continue;
      const sec = secaoNoLance(p, pav.id), [w, h] = dimsSecao(sec);
      const z1 = pav.cota, z0 = z1 - peDireito(b, pav.id);
      if (!(z1 > z0)) continue;
      const m = new Malha();
      m.extrudar(contornoNoLance(p, pav.id), [], z0, z1, sec.tipo === 'circ' ? 6 : 1);
      objetos.push({
        id: `pilar:${p.id}:${pav.id}`, elemento: p.id, tipo: 'pilar', pavimento: pav.id, pavimentoNome: pav.nome, grupo: pav.grupo, nome: p.nome,
        descricao: `${p.nome} · ${sec.tipo === 'circ' ? `φ${cm(sec.d)}` : `${cm(w)}×${cm(h)}`} cm · ${pav.nome}`,
        pos: m.pos, idx: m.idx, linhas: m.linhas, volume: m.volume(),
      });
    }
  }
  return { objetos };
});
