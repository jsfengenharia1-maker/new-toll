// Estado do módulo Edifícios na interface: uma Sessao do núcleo (comandos, desfazer, log) + persistência local.
import { create } from 'zustand';
import { comandosEdificioPadrao, Sessao, type Resultado } from '../../core/commands';
import { lerEdificio, type BuildingFile } from '../../core/building/file';
import { edificioVazio } from '../../core/building/types';
import type { Diagnostico } from '../../core/building/verify';
import { useStore } from '../store';

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

function persistir(s: Sessao) {
  try { localStorage.setItem(KEY, JSON.stringify({ building: s.modelo, buildingLog: s.log })); } catch { /* cheio ou indisponível */ }
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
}

const msg = (m: string) => useStore.getState().set({ message: m });

export const useBuilding = create<BState>((set, get) => {
  const atualizar = (s: Sessao, sujo = true) => {
    persistir(s);
    if (sujo) useStore.getState().setUnsaved(true);
    set({ sessao: s, rev: s.rev + Math.random(), diags: s.verificar() });
  };
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
    novo(vazio) { const s = vazio ? new Sessao(edificioVazio()) : padrao(); atualizar(s); msg(vazio ? 'Edifício vazio.' : 'Edifício padrão: térreo, 3 pavimentos-tipo e cobertura.'); },
    carregar(f) { atualizar(f ? new Sessao(f.building, f.buildingLog) : new Sessao(edificioVazio()), false); },
  };
});

/** Edifício para gravar no arquivo de trabalho (null se ainda não houver nada lançado). */
export function edificioParaArquivo(): BuildingFile | null {
  const s = useBuilding.getState().sessao;
  return s.modelo.pavimentos.length || s.log.length ? { building: s.modelo, buildingLog: s.log } : null;
}
