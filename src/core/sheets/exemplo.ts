// Edifício de exemplo para os testes das pranchas (fictício): 3 × 2 vãos, vigas, lajes e eixos.
import { comandosEdificioPadrao, Sessao } from '../commands';

export function edificioExemplo() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); if (!r.ok) throw new Error(`${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`); };
  const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
  ok('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } });
  ok('lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  ok('eixo.malha', { dx: [5, 5, 5], dy: [4.5, 4.5] });
  return s;
}
