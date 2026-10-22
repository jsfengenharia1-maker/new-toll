// Modelos de teste das paredes (E1d): obra de dois pavimentos (Térreo e Tipo 1) e duas paredes de subsolo sob empuxo.
import { expect } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';

export function padrao(prof = 1): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: prof });
  for (const n of ['Cobertura', 'Tipo 3', 'Tipo 2']) s.executar('pavimento.remover', { id: s.modelo.pavimentos.find((p) => p.nome === n)!.id });
  return s;
}
export const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
export const nomePav = (s: Sessao, nome: string) => s.modelo.pavimentos.find((p) => p.nome === nome)!.id;

/** Duas paredes de 12 m (y = 0 e y = 6), da fundação (−1) ao Tipo 1 (+3), terreno por fora, laje do Tipo 1 entre elas. */
export function caixa() {
  const s = padrao(1);
  ok(s, 'empuxo.tipo', { nome: 'Aterro', metodo: 'repouso', estratos: [{ espessura: 20, gama: 18, phi: 30 }], cotaAterro: 3 });
  ok(s, 'caso.criar', { nome: 'Empuxo', natureza: 'H', empuxo: s.modelo.empuxos![0].id });
  const caso = s.modelo.casos!.find((c) => c.nome === 'Empuxo')!.id, t1 = nomePav(s, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
  ok(s, 'parede.criar', { pontos: [[0, 0], [12, 0]], espessura: 0.2, morre: t1 });
  ok(s, 'parede.criar', { pontos: [[0, 6], [12, 6]], espessura: 0.2, morre: t1 });
  const [a, z] = s.modelo.paredes!;
  ok(s, 'parede.empuxo', { parede: a.id, empuxos: [{ caso, lado: 'dir' }] });
  ok(s, 'parede.empuxo', { parede: z.id, empuxos: [{ caso, lado: 'esq' }] });
  ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [12, 0], [12, 6], [0, 6]] });
  return { s, caso, t1 };
}

