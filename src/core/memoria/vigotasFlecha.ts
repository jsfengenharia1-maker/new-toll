// Memória detalhada (MD fase 3b): flecha de cada alinhamento das vigotas (e das faixas das alveolares) com a rigidez fissurada de
// Branson. Chamada por `flechasDosAlinhamentos` (`dimensionamento.ts`) só com a memória ligada, com os mesmos números do cálculo.
import { passoFase1, type DetFase1 } from './flechaBranson';
import { registrarLajeFlecha, type CtxLajeFlecha } from './lajeMacica';
import { fm, type Registrador } from './registrador';

export interface CtxFlechaAlinhamento {
  indice: number; t: number; L: number; el: number; cr: number; kappa: number; fase1: DetFase1 | null;
  /** Flechas elásticas por categoria de carga (a de G e a quase permanente já com a fase 1) e o restante da cadeia da flecha. */
  flecha: Omit<CtxLajeFlecha, 'topico' | 'fissN' | 'fase1' | 'kappa' | 'fiss'>;
}

/** Flecha de um alinhamento: elástica e fissurada relativas aos apoios, κ, e a mesma cadeia da flecha da laje (instantânea, diferida, total, ativa, variáveis). */
export function registrarFlechaAlinhamento(mem: Registrador, el: string, topico: string, x: CtxFlechaAlinhamento) {
  mem.passo({ etapa: 'dimensionamento', elemento: el, topico, descricao: `Alinhamento ${x.indice + 1} (t = ${fm(x.t)} m, vão ${fm(x.L)} m): flecha quase permanente da grelha elástica e da grelha com Iz × Ie/Ic (Branson), relativas à reta entre as pontas, e o fator de fissuração do alinhamento`, formula: 'f = máx(−(w(n) − reta entre as pontas)) em Σ fator·caso; κ = máx(1; f,fissurada / f,elástica)', expressao: `f,el = ${fm(x.el * 1000)} mm; f,fis = ${fm(x.cr * 1000)} mm; κ = máx(1; ${fm(x.cr * 1000)}/${fm(x.el * 1000)}) = ${fm(x.kappa)}`, resultado: x.kappa, unidade: '', norma: 'NBR 6118:2023, 17.3.2.1.1', aConfirmar: true, entradas: { t: x.t, L: x.L, el: x.el, cr: x.cr, kappa: x.kappa } });
  if (x.fase1) passoFase1(mem, el, topico, x.fase1);
  registrarLajeFlecha(mem, el, { ...x.flecha, kappa: x.kappa, topico, fase1: undefined });
}
