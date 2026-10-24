// Memória de cálculo detalhada (frente MD): registrador de passos por contexto, opt-in.
// As funções de cálculo consultam `memoriaAtiva()`; com a memória desligada (o padrão) a consulta devolve null e nada é
// registrado nem calculado a mais. Os valores registrados (`entradas` e `resultado`) são os números de ponto flutuante
// usados no cálculo, sem arredondamento; só a `expressao` (texto) é formatada para leitura.

export type EtapaMemoria = 'cargas' | 'combinacoes' | 'analise' | 'esforcos' | 'dimensionamento' | 'detalhamento';

export const ETAPAS_MEMORIA: { id: EtapaMemoria; titulo: string }[] = [
  { id: 'cargas', titulo: 'Cargas' },
  { id: 'combinacoes', titulo: 'Combinações' },
  { id: 'analise', titulo: 'Análise estrutural' },
  { id: 'esforcos', titulo: 'Esforços de cálculo' },
  { id: 'dimensionamento', titulo: 'Dimensionamento' },
  { id: 'detalhamento', titulo: 'Detalhamento' },
];

export type ValorMemoria = number | string;

export interface PassoMemoria {
  /** Sequencial (P0001…), na ordem do cálculo. */
  id: string;
  etapa: EtapaMemoria;
  /** Elemento a que o passo se refere ("Edifício", "Viga V1", "Pilar P1 · Pavimento 2"…). */
  elemento: string;
  /** Tópico dentro do elemento (ex.: "Flexão – armadura inferior"). */
  topico: string;
  descricao: string;
  /** Fórmula simbólica. */
  formula: string;
  /** Fórmula com os valores substituídos (texto formatado; os números exatos estão em `entradas`). */
  expressao: string;
  resultado: ValorMemoria;
  unidade: string;
  /** Referência normativa (item), com `aConfirmar` quando a numeração ou o critério ainda não foi conferido. */
  norma?: string;
  aConfirmar?: boolean;
  /** Entradas usadas, com os valores exatos do cálculo (unidades da fórmula). */
  entradas: Record<string, ValorMemoria>;
  observacao?: string;
}

export interface OpcoesRegistrador {
  /** Só registra os elementos aceitos (padrão: todos). */
  filtro?: (elemento: string) => boolean;
  /** Limite de passos (proteção de memória; padrão 200 000). */
  maxPassos?: number;
}

export class Registrador {
  readonly passos: PassoMemoria[] = [];
  truncado = false;
  private readonly filtro?: (elemento: string) => boolean;
  private readonly max: number;
  constructor(o: OpcoesRegistrador = {}) { this.filtro = o.filtro; this.max = o.maxPassos ?? 200000; }
  /** O elemento entra na memória? (os chamadores pulam o trabalho de registro quando não). */
  aceita(elemento: string): boolean { return !this.filtro || this.filtro(elemento); }
  /** Registra um passo e devolve o resultado (para encadear). */
  passo<T extends ValorMemoria>(p: Omit<PassoMemoria, 'id' | 'resultado'> & { resultado: T }): T {
    if (!this.aceita(p.elemento)) return p.resultado;
    if (this.passos.length >= this.max) { this.truncado = true; return p.resultado; }
    this.passos.push({ id: `P${String(this.passos.length + 1).padStart(4, '0')}`, ...p });
    return p.resultado;
  }
}

let ativo: Registrador | null = null;

/** Registrador em uso (null com a memória desligada). */
export function memoriaAtiva(): Registrador | null { return ativo; }

/** Executa `fn` com o registrador ativo e o desliga ao terminar (inclusive com erro). */
export function comMemoria<T>(reg: Registrador, fn: () => T): T {
  const ant = ativo;
  ativo = reg;
  try { return fn(); } finally { ativo = ant; }
}

// ---------------- formatação (só para o texto da expressão) ----------------

/** Número com vírgula decimal e `sig` algarismos significativos (sem notação científica até 1e-4). */
export function fm(x: number, sig = 4): string {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : '—';
  if (x === 0) return '0';
  const a = Math.abs(x);
  let s: string;
  if (a >= 1e-4 && a < 1e7) {
    const dec = Math.max(0, sig - 1 - Math.floor(Math.log10(a)));
    s = String(+x.toFixed(Math.min(12, dec)));
  } else s = x.toExponential(sig - 1).replace('e', '×10^').replace('+', '');
  return s.replace('-', '−').replace('.', ',');
}
/** Número entre parênteses quando negativo (para substituição em somas). */
export const fp = (x: number, sig = 4) => (x < 0 ? `(${fm(x, sig)})` : fm(x, sig));
/** m² → "x,xx cm²". */
export const cm2 = (m2: number) => `${fm(m2 * 1e4, 4)} cm²`;
