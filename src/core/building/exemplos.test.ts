import { describe, expect, it } from 'vitest';
import { replay } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { revisarEdificio } from './revisao';
import { verificar } from './verify';
import { edificioVazio } from './types';
import { criarExemplo, EXEMPLOS_OBRA, type IdExemplo } from './exemplos';

const IDS = EXEMPLOS_OBRA.map((e) => e.id) as IdExemplo[];

describe('obras de exemplo', () => {
  it.each(IDS)('%s: origem, descrição, 12 pilares e sem erro de lançamento', (id) => {
    const s = criarExemplo(id);
    expect(s.modelo.obra.origem).toBe('exemplo');
    expect(s.modelo.obra.descricao?.length).toBe(2);
    expect(s.modelo.pilares.length).toBe(12);
    expect(verificar(s.modelo).filter((d) => d.severidade === 'erro')).toEqual([]);
  });

  it('contagens de pavimentos e lajes por exemplo', () => {
    expect(criarExemplo('predio').modelo.pavimentos.length).toBe(5);
    const sub = criarExemplo('subsolo').modelo;
    expect(sub.pavimentos.length).toBe(5);
    const menor = [...sub.pavimentos].sort((a, b) => a.cota - b.cota)[0];
    expect(menor.nome).toBe('Subsolo');
    const vig = criarExemplo('vigotas').modelo;
    expect(vig.pavimentos.length).toBe(4);
    const grupoTipo = new Set(vig.grupos.filter((g) => g.nome === 'Tipo').map((g) => g.id));
    const lajesTipo = vig.lajes.filter((l) => grupoTipo.has(l.grupo));
    expect(lajesTipo.length).toBe(6);
    expect(lajesTipo.every((l) => l.tipo.tipo === 'trelicada')).toBe(true);
    expect(vig.lajes.filter((l) => !grupoTipo.has(l.grupo)).every((l) => l.tipo.tipo === 'macica')).toBe(true);
  });

  it.each(IDS)('%s: cálculo e revisão sem erro', { timeout: 120000 }, (id) => {
    const s = criarExemplo(id);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const dim = dimensionarEdificio(s.modelo, an);
    expect(revisarEdificio(s.modelo, an, dim).itens.filter((i) => i.nivel === 'erro')).toEqual([]);
  });

  it.each(IDS)('%s: replay do log reproduz o modelo', (id) => {
    const s = criarExemplo(id);
    expect(replay(s.log, edificioVazio())).toEqual(s.modelo);
  });

  it('duas chamadas dão modelos iguais e instâncias diferentes', () => {
    const a = criarExemplo('predio');
    const b = criarExemplo('predio');
    expect(a).not.toBe(b);
    expect(a.modelo).toEqual(b.modelo);
  });
});
