// Estado do módulo Edifícios na interface: uma Sessao do núcleo (comandos, desfazer, log) + persistência local.
import { create } from 'zustand';
import { comandosEdificioPadrao, Sessao, type Resultado } from '../../core/commands';
import { compactarLog, lerEdificio, type BuildingFile } from '../../core/building/file';
import { edificioVazio } from '../../core/building/types';
import type { Diagnostico } from '../../core/building/verify';
import { useStore } from '../store';
import type { AnaliseEdificio } from '../../core/building/analitico';
import { calcular as calcularNoWorker, type DimEdificio } from './calculo';

const KEY = 'statikos:building';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}

function carregarLocal(): Sessao {
  try {
    const f = lerEdificio(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
    if (f) return new Sessao(f.building, f.buildingLog);
  } catch { /* armazenamento indisponível ou corrompido */ }
  return padrao();
}

let gravacao: ReturnType<typeof setTimeout> | undefined;
/** Grava no navegador com um pequeno atraso (máscaras grandes custam alguns ms para serializar). */
function persistir(s: Sessao) {
  clearTimeout(gravacao);
  gravacao = setTimeout(() => persistirJa(s), 250);
}
function persistirJa(s: Sessao) {
  try { localStorage.setItem(KEY, JSON.stringify({ building: s.modelo, buildingLog: compactarLog(s.modelo, s.log) })); } catch { /* cheio ou indisponível: o arquivo .statikos continua sendo a cópia completa */ }
}

interface BState {
  sessao: Sessao;
  /** Muda a cada alteração (a Sessao é mutável; os componentes dependem deste número). */
  rev: number;
  diags: Diagnostico[];
  exec(nome: string, params: Record<string, unknown>): Resultado;
  desfazer(): void;
  refazer(): void;
  novo(vazio: boolean): void;
  /** Troca pelo edifício de um arquivo (null = edifício vazio). */
  carregar(f: BuildingFile | null): void;
  analise: AnaliseEdificio | null;
  /** Dimensionamento feito com a mesma análise. */
  dim: DimEdificio | null;
  /** Revisão de cálculo em que a análise foi feita (difere de sessao.revCalculo = desatualizada; dados de prancha não contam). */
  revAnalise: number;
  /** Identificador do cálculo no worker (as pranchas de armação são montadas lá, com estes resultados). */
  idCalculo: number | null;
  calculando: boolean;
  calcular(): Promise<void>;
}

/** A análise e o dimensionamento valem para o modelo atual? */
export const calculoAtual = (st: Pick<BState, 'analise' | 'revAnalise' | 'sessao'>): boolean => !!st.analise && st.revAnalise === st.sessao.revCalculo;

const msg = (m: string) => useStore.getState().set({ message: m });

export const useBuilding = create<BState>((set, get) => {
  const atualizar = (s: Sessao, sujo = true) => {
    persistir(s);
    if (sujo) useStore.getState().setUnsaved(true);
    set({ sessao: s, rev: s.rev + Math.random(), diags: s.verificar() });
  };
  const semCalculo = { analise: null, dim: null, revAnalise: -1, idCalculo: null };
  const inicial = carregarLocal();
  return {
    sessao: inicial,
    rev: 0,
    diags: inicial.verificar(),
    exec(nome, params) {
      const s = get().sessao;
      const r = s.executar(nome, params, 'usuario');
      if (r.ok) { atualizar(s); msg(r.mensagem ?? `${nome} aplicado.`); }
      else msg(r.erros.map((e) => e.mensagem).join(' '));
      return r;
    },
    desfazer() { const e = get().sessao.desfazer(); if (e) { atualizar(get().sessao); msg(`Desfeito: ${e.nome}.`); } },
    refazer() { const e = get().sessao.refazer(); if (e) { atualizar(get().sessao); msg(`Refeito: ${e.nome}.`); } },
    novo(vazio) { const s = vazio ? new Sessao(edificioVazio()) : padrao(); atualizar(s); set(semCalculo); msg(vazio ? 'Edifício vazio.' : 'Edifício padrão: térreo, 3 pavimentos-tipo e cobertura.'); },
    carregar(f) { atualizar(f ? new Sessao(f.building, f.buildingLog) : new Sessao(edificioVazio()), false); set(semCalculo); },
    analise: null,
    dim: null,
    revAnalise: -1,
    idCalculo: null,
    calculando: false,
    async calcular() {
      const s = get().sessao, rev = s.revCalculo;
      set({ calculando: true });
      msg('Calculando…');
      try {
        const { analise: a, dim, id } = await calcularNoWorker(s.modelo);
        // a sessão pode ter sido trocada (abrir, novo) durante o cálculo: o resultado não vale para ela
        if (get().sessao !== s) { set({ calculando: false }); return; }
        set({ analise: a, dim, revAnalise: rev, idCalculo: id, calculando: false });
        msg(a.erro ? `Análise: ${a.erro}` : `Análise concluída: ${a.gdl} gdl em ${Math.round(a.ms)} ms${dim ? `; dimensionamento em ${Math.round(dim.ms)} ms` : ''}.`);
      } catch (e) {
        set({ calculando: false });
        msg(`Falha no cálculo: ${(e as Error).message}`);
      }
    },
  };
});

/** Edifício para gravar no arquivo de trabalho (null se ainda não houver nada lançado). */
export function edificioParaArquivo(): BuildingFile | null {
  const s = useBuilding.getState().sessao;
  return s.modelo.pavimentos.length || s.log.length ? { building: s.modelo, buildingLog: compactarLog(s.modelo, s.log) } : null;
}
