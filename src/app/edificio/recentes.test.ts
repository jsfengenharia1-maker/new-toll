import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buscarRecentes, CHAVE_RECENTES, LIMITE_HISTORICO, lerRecentes, limparRecentes, registrarRecente, ultimasObras, type ObraRecente } from './recentes';
import { salvarEdificioNaBiblioteca } from '../storage';
import { edificioVazio } from '../../core/building/types';

let mem: Map<string, string>;
let falhaGravar = false;

beforeEach(() => {
  mem = new Map();
  falhaGravar = false;
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => { if (falhaGravar) throw new Error('cheio'); mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() { return mem.size; },
  };
});

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

const obra = (nome: string, descricao = '', abertaEm = '2026-10-01T00:00:00Z'): ObraRecente => ({ nome, descricao, origem: 'assistente', pavimentos: 3, abertaEm });

describe('histórico de obras recentes', () => {
  it('vazio e corrompido dão lista vazia', () => {
    expect(lerRecentes()).toEqual([]);
    mem.set(CHAVE_RECENTES, '{x');
    expect(lerRecentes()).toEqual([]);
  });

  it('mais recente primeiro; ultimasObras pega as distintas', () => {
    registrarRecente(obra('A', '', '2026-10-01T10:00:00Z'));
    registrarRecente(obra('B', '', '2026-10-01T11:00:00Z'));
    registrarRecente(obra('A', '', '2026-10-01T12:00:00Z'));
    const lista = lerRecentes();
    expect(lista.map((o) => o.nome)).toEqual(['A', 'B', 'A']);
    expect(ultimasObras(lista).map((o) => o.nome)).toEqual(['A', 'B']);
  });

  it('ultimasObras limita a 6 por padrão e aceita n', () => {
    let lista: ObraRecente[] = [];
    for (let i = 0; i < 8; i++) lista = registrarRecente(obra(`O${i}`, '', `2026-10-01T0${i}:00:00Z`));
    expect(ultimasObras(lista)).toHaveLength(6);
    expect(ultimasObras(lista, 3)).toHaveLength(3);
  });

  it('busca sem acento, sem maiúsculas e com várias palavras', () => {
    const lista = [obra('Edifício Açaí', 'Fase de anteprojeto')];
    expect(buscarRecentes(lista, 'acai')).toHaveLength(1);
    expect(buscarRecentes(lista, 'ANTEPROJETO')).toHaveLength(1);
    expect(buscarRecentes(lista, 'acai fase')).toHaveLength(1);
    expect(buscarRecentes(lista, 'acai xyz')).toHaveLength(0);
    expect(buscarRecentes(lista, '')).toEqual(lista);
  });

  it('guarda no máximo 500 aberturas', () => {
    for (let i = 0; i < LIMITE_HISTORICO + 5; i++) registrarRecente(obra(`N${i}`));
    expect(lerRecentes()).toHaveLength(LIMITE_HISTORICO);
  });

  it('falha de gravação não lança e devolve a lista em memória', () => {
    falhaGravar = true;
    const lista = registrarRecente(obra('Z'));
    expect(lista[0].nome).toBe('Z');
    limparRecentes();
    expect(lerRecentes()).toEqual([]);
  });
});

describe('biblioteca de edifício', () => {
  it('recusa obra acima de 240 KB sem gravar', async () => {
    const arquivo = { building: edificioVazio(), buildingLog: Array.from({ length: 30000 }, () => ({ t: '', nome: 'x', params: {}, autor: 'usuario' as const })) };
    const r = await salvarEdificioNaBiblioteca('X', 'r', arquivo);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.aviso).toContain('240 KB');
  });
});
