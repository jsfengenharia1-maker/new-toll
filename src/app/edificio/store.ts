// Estado do módulo Edifícios na interface: uma Sessao do núcleo (comandos, desfazer, log) + persistência local.
import { create } from 'zustand';
import { comandosEdificioPadrao, Sessao, type Resultado } from '../../core/commands';
import { compactarLog, lerEdificio, type BuildingFile } from '../../core/building/file';
import { edificioVazio } from '../../core/building/types';
import type { Diagnostico } from '../../core/building/verify';
import { useStore } from '../store';
import type { AnaliseEdificio } from '../../core/building/analitico';
import { calcular as calcularNoWorker, calcularFundacoesNoWorker, type DimEdificio } from './calculo';

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
  /** Analisa e dimensiona; `semFundacao` deixa as fundações de fora (a obra sem fundação). */
  calcular(semFundacao?: boolean): Promise<void>;
  /** `Sessao.revFundacao` em que as fundações foram calculadas (difere = fundações desatualizadas). */
  revFund: number;
  calculandoFund: boolean;
  /** Calcula só as fundações com a análise em vigor (a estrutura não é refeita). */
  calcularFundacao(): Promise<void>;
}

/** As fundações calculadas valem para o modelo atual (estrutura e dados de fundação)? */
export const fundacaoAtual = (st: Pick<BState, 'dim' | 'analise' | 'revAnalise' | 'revFund' | 'sessao'>): boolean => !!st.dim && calculoAtual(st) && st.revFund === st.sessao.revFundacao;

/** A análise e o dimensionamento valem para o modelo atual? */
export const calculoAtual = (st: Pick<BState, 'analise' | 'revAnalise' | 'sessao'>): boolean => !!st.analise && st.revAnalise === st.sessao.revCalculo;

const msg = (m: string) => useStore.getState().set({ message: m });

export const useBuilding = create<BState>((set, get) => {
  const atualizar = (s: Sessao, sujo = true) => {
    persistir(s);
    if (sujo) useStore.getState().setUnsaved(true);
    set({ sessao: s, rev: s.rev + Math.random(), diags: s.verificar() });
  };
  const semCalculo = { analise: null, dim: null, revAnalise: -1, idCalculo: null, revFund: -1 };
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
    revFund: -1,
    calculandoFund: false,
    async calcular(semFundacao = false) {
      const s = get().sessao, rev = s.revCalculo, revF = s.revFundacao;
      set({ calculando: true });
      msg('Calculando…');
      try {
        const { analise: a, dim, id } = await calcularNoWorker(s.modelo, { anteriores: get().dim?.fundacoes, semFundacao });
        // a sessão pode ter sido trocada (abrir, novo) durante o cálculo: o resultado não vale para ela
        if (get().sessao !== s) { set({ calculando: false }); return; }
        set({ analise: a, dim, revAnalise: rev, revFund: semFundacao ? -1 : revF, idCalculo: id, calculando: false });
        msg(a.erro ? (dim && dim.fundacoes ? `Obra só com arranques: ${dim.fundacoes.length} fundação(ões) calculada(s) em ${Math.round(dim.ms)} ms.` : `Análise: ${a.erro}`) : `Análise concluída: ${a.gdl} gdl em ${Math.round(a.ms)} ms${dim ? `; dimensionamento em ${Math.round(dim.ms)} ms` : ''}.`);
      } catch (e) {
        set({ calculando: false });
        msg(`Falha no cálculo: ${(e as Error).message}`);
      }
    },
    async calcularFundacao() {
      const s = get().sessao, { dim, idCalculo } = get(), revF = s.revFundacao;
      if (!dim || idCalculo === null || !calculoAtual(get())) { msg('Calcule o edifício (aba Dimensionamento) antes das fundações: elas usam as reações da análise em vigor.'); return; }
      set({ calculandoFund: true });
      msg('Calculando as fundações…');
      try {
        const t0 = performance.now();
        const fundacoes = await calcularFundacoesNoWorker(s.modelo, idCalculo, dim.fundacoes);
        if (get().sessao !== s || get().idCalculo !== idCalculo) { set({ calculandoFund: false }); return; }
        set({ dim: { ...dim, fundacoes }, revFund: revF, calculandoFund: false });
        const falhas = fundacoes.filter((f) => f.status === 'fail').length;
        msg(`Fundações calculadas: ${fundacoes.length} elemento(s)${falhas ? `, ${falhas} com erro` : ''}, em ${Math.round(performance.now() - t0)} ms (a análise da estrutura não foi refeita).`);
      } catch (e) {
        set({ calculandoFund: false });
        msg(`Falha no cálculo das fundações: ${(e as Error).message}`);
      }
    },
  };
});

/** Edifício para gravar no arquivo de trabalho (null se ainda não houver nada lançado). */
export function edificioParaArquivo(): BuildingFile | null {
  const s = useBuilding.getState().sessao;
  return s.modelo.pavimentos.length || s.log.length ? { building: s.modelo, buildingLog: compactarLog(s.modelo, s.log) } : null;
}
