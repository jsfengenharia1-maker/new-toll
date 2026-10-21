// Estado do módulo Edifícios na interface: uma Sessao do núcleo (comandos, desfazer, log) + persistência local.
import { create } from 'zustand';
import { comandosEdificioPadrao, Sessao, type Resultado } from '../../core/commands';
import { compactarLog, lerEdificio, type BuildingFile } from '../../core/building/file';
import { edificioVazio } from '../../core/building/types';
import type { Diagnostico } from '../../core/building/verify';
import { useStore } from '../store';
import type { AnaliseEdificio } from '../../core/building/analitico';
import type { BuildingModel } from '../../core/building/types';
import { calcular as calcularNoWorker, calcularFundacoesNoWorker, rearmarNoWorker, type DimEdificio } from './calculo';

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
  /** `Sessao.revDetalhe` em que o dimensionamento e o detalhamento foram feitos (difere = é preciso rearmar). */
  revDet: number;
  /** `Sessao.revEsforcos` em que a análise foi feita (igual ao atual = os esforços guardados ainda servem para rearmar). */
  revEsf: number;
  /** Quantas análises e quantos rearmes (sem análise) já rodaram na sessão da interface: os testes de interface conferem que um detalhe não refaz a análise. */
  nAnalises: number;
  nRearmes: number;
  /** Modelo para o qual o dimensionamento mostrado foi feito (contar os elementos alterados desde então). */
  modeloDim: BuildingModel | null;
  /**
   * Refaz só o dimensionamento e o detalhamento com a análise em vigor (a análise não é refeita). `todos`: todos os
   * elementos; `alterados`: só os que mudaram desde o último dimensionamento. Depois de mudar só seções, usa os
   * esforços da análise antiga (aviso ESFORCO_ANTIGO).
   */
  rearmar(modo?: 'todos' | 'alterados'): Promise<void>;
  /** Atualiza o que está desatualizado: rearma se só o detalhe mudou, calcula de novo se a análise não vale. */
  atualizar(): Promise<void>;
}

/** Dá para rearmar? Há cálculo e os esforços guardados ainda servem (nada além de seção, detalhe ou fundação mudou desde a análise). */
export const podeRearmar = (st: Pick<BState, 'dim' | 'analise' | 'idCalculo' | 'revEsf' | 'sessao'>): boolean => !!st.dim && !!st.analise && st.idCalculo !== null && st.revEsf === st.sessao.revEsforcos;
/** O dimensionamento e o detalhamento valem para o modelo atual (análise em vigor e nada de detalhe mudou depois)? */
export const dimAtual = (st: Pick<BState, 'dim' | 'analise' | 'revAnalise' | 'revDet' | 'sessao'>): boolean => !!st.dim && calculoAtual(st) && st.revDet === st.sessao.revDetalhe;

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
  // só o detalhe mudou e a análise vale: rearma sozinho, sem refazer a análise (R7f)
  const sincronizar = () => { const st = get(); if (!st.calculando && st.dim && st.idCalculo !== null && calculoAtual(st) && st.revDet !== st.sessao.revDetalhe) void st.rearmar('todos'); };
  let emVoo: Promise<void> | null = null, refazerDepois: 'todos' | 'alterados' | null = null;
  const semCalculo = { analise: null, dim: null, revAnalise: -1, idCalculo: null, revFund: -1, revDet: -1, revEsf: -1, modeloDim: null };
  const inicial = carregarLocal();
  return {
    sessao: inicial,
    rev: 0,
    diags: inicial.verificar(),
    exec(nome, params) {
      const s = get().sessao;
      const r = s.executar(nome, params, 'usuario');
      if (r.ok) { atualizar(s); msg(r.mensagem ?? `${nome} aplicado.`); sincronizar(); }
      else msg(r.erros.map((e) => e.mensagem).join(' '));
      return r;
    },
    desfazer() { const e = get().sessao.desfazer(); if (e) { atualizar(get().sessao); msg(`Desfeito: ${e.nome}.`); sincronizar(); } },
    refazer() { const e = get().sessao.refazer(); if (e) { atualizar(get().sessao); msg(`Refeito: ${e.nome}.`); sincronizar(); } },
    novo(vazio) { const s = vazio ? new Sessao(edificioVazio()) : padrao(); atualizar(s); set(semCalculo); msg(vazio ? 'Edifício vazio.' : 'Edifício padrão: térreo, 3 pavimentos-tipo e cobertura.'); },
    carregar(f) { atualizar(f ? new Sessao(f.building, f.buildingLog) : new Sessao(edificioVazio()), false); set(semCalculo); },
    analise: null,
    dim: null,
    revAnalise: -1,
    idCalculo: null,
    calculando: false,
    revFund: -1,
    calculandoFund: false,
    revDet: -1,
    revEsf: -1,
    nAnalises: 0,
    nRearmes: 0,
    modeloDim: null,
    async calcular(semFundacao = false) {
      const s = get().sessao, rev = s.revCalculo, revF = s.revFundacao, revD = s.revDetalhe, revE = s.revEsforcos;
      set({ calculando: true });
      msg('Calculando…');
      try {
        const { analise: a, dim, id } = await calcularNoWorker(s.modelo, { anteriores: get().dim?.fundacoes, semFundacao, esforcosRev: rev });
        // a sessão pode ter sido trocada (abrir, novo) durante o cálculo: o resultado não vale para ela
        if (get().sessao !== s) { set({ calculando: false }); return; }
        set({ analise: a, dim, revAnalise: rev, revFund: semFundacao ? -1 : revF, revDet: revD, revEsf: revE, modeloDim: s.modelo, idCalculo: id, calculando: false, nAnalises: get().nAnalises + 1 });
        sincronizar();
        msg(a.erro ? (dim && dim.fundacoes ? `Obra só com arranques: ${dim.fundacoes.length} fundação(ões) calculada(s) em ${Math.round(dim.ms)} ms.` : `Análise: ${a.erro}`) : `Análise concluída: ${a.gdl} gdl em ${Math.round(a.ms)} ms${dim ? `; dimensionamento em ${Math.round(dim.ms)} ms` : ''}.`);
      } catch (e) {
        set({ calculando: false });
        msg(`Falha no cálculo: ${(e as Error).message}`);
      }
    },
    async rearmar(modo = 'todos') {
      if (emVoo) { refazerDepois = modo === 'todos' || refazerDepois === 'todos' ? 'todos' : modo; return emVoo; }
      emVoo = (async () => {
        let m: 'todos' | 'alterados' | null = modo;
        while (m) {
          refazerDepois = null;
          const st = get(), s = st.sessao, revD = s.revDetalhe, id = st.idCalculo;
          if (!podeRearmar(st) || id === null || st.calculando) { msg(st.calculando ? 'Aguarde o cálculo em andamento.' : 'Os esforços guardados não valem mais (algo além de seções e detalhes mudou): calcule de novo.'); return; }
          set({ calculando: true });
          msg('Rearmando com a análise em vigor…');
          try {
            const t0 = performance.now();
            const r = await rearmarNoWorker(s.modelo, id, m);
            if (get().sessao !== s) { set({ calculando: false }); return; }
            set({ dim: r.dim, idCalculo: r.id, revDet: revD, modeloDim: s.modelo, calculando: false, nRearmes: get().nRearmes + 1 });
            const re = r.dim.rearme;
            msg(`Rearmado: dimensionamento em ${Math.round(performance.now() - t0)} ms (a análise não foi refeita)${re?.antigos ? `; esforços da revisão ${re.esforcosRev}: ${re.variacoes.length} elemento(s) com inércia muito diferente (refaça a análise)` : ''}${re?.modo === 'alterados' ? `; ${re.refeitos.length} elemento(s) alterado(s), ${re.mantidos} mantido(s)` : ''}.`);
          } catch (e) {
            set({ calculando: false });
            msg(`Falha ao rearmar: ${(e as Error).message}`);
            return;
          }
          m = refazerDepois ?? (get().dim && podeRearmar(get()) && calculoAtual(get()) && get().revDet !== get().sessao.revDetalhe ? 'todos' : null);
        }
      })().finally(() => { emVoo = null; });
      return emVoo;
    },
    async atualizar() {
      const st = get();
      if (emVoo) { await emVoo; return; }
      if (st.dim && calculoAtual(st)) { if (st.revDet !== st.sessao.revDetalhe) await get().rearmar('todos'); return; }
      await get().calcular();
    },
    async calcularFundacao() {
      const s = get().sessao, { dim, idCalculo } = get(), revF = s.revFundacao;
      if (!dim || idCalculo === null || !calculoAtual(get())) { msg('Calcule o edifício (aba Dimensionamento) antes das fundações: elas usam as reações da análise em vigor.'); return; }
      set({ calculandoFund: true });
      msg('Calculando as fundações…');
      try {
        const t0 = performance.now();
        const f = await calcularFundacoesNoWorker(s.modelo, idCalculo, dim.fundacoes);
        if (get().sessao !== s || get().idCalculo !== idCalculo) { set({ calculandoFund: false }); return; }
        const fundacoes = f.fundacoes ?? [], vigasF = f.vigasFundacao ?? [];
        set({ dim: { ...dim, vigasFundacao: undefined, avisosFundacao: undefined, corridas: undefined, ...f }, revFund: revF, calculandoFund: false });
        const falhas = fundacoes.filter((x) => x.status === 'fail').length + vigasF.filter((x) => x.status === 'fail').length;
        msg(`Fundações calculadas: ${fundacoes.length} elemento(s)${vigasF.length ? ` e ${vigasF.length} viga(s) de fundação` : ''}${falhas ? `, ${falhas} com erro` : ''}, em ${Math.round(performance.now() - t0)} ms (a análise da estrutura não foi refeita).`);
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
