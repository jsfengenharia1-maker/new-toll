// Relatório das escadas (E4e, C8.54): dados gerais, dados comuns e, por lance, reações, esforços em cada seção, armaduras e verificações.
import { describe, expect, it } from 'vitest';
import { edificioExemplo } from '../sheets/exemplo';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { relatorioEscadas, relatorioEscadasCsv } from './escadasRelatorio';

function comEscada() {
  const s = edificioExemplo();
  const r = s.executar('escada.criar', { id: 'e1', grupo: 'g_3', origem: [2, 1], angulo: 90, piso: 0.2967, espelho: 0.5 / 3, lances: [{ tipo: 'pre:meia-volta-9-9' }] });
  expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
  return s.modelo;
}

describe('E4e: relatório das escadas', () => {
  const b = comEscada(), an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false });
  const r = relatorioEscadas(b, dim);

  it('três níveis: dados gerais (norma e materiais), dados comuns e lances', () => {
    expect(r.avisos).toEqual([]);
    expect(r.gerais.map((x) => x.rotulo)).toEqual(expect.arrayContaining(['Norma', 'Concreto', 'Aço', 'Cobrimento e classe de agressividade', 'Combinações']));
    expect(r.gerais.find((x) => x.rotulo === 'Concreto')!.valor).toContain('C30');
    expect(r.escadas).toHaveLength(1);
    const e = r.escadas[0];
    expect(e.nome).toBe('E1');
    expect(e.comuns.map((x) => x.rotulo)).toEqual(expect.arrayContaining(['Largura, piso e espelho', 'Corrimão, revestimento e sobrecarga']));
    expect(e.lances).toHaveLength(dim.escadas!.length);
  });

  it('reações do relatório = reações do dimensionamento; armaduras = barras do detalhamento; esforços por faixa', () => {
    const l = r.escadas[0].lances[0], calc = dim.escadas![0], arm = dim.escadasArmadura![0];
    expect(l.reacoes.linhas).toHaveLength(calc.reacoes.length);
    const somaG = l.reacoes.linhas.reduce((s, x) => s + Number(x[2].replace(',', '.')), 0), somaGcalc = calc.reacoes.reduce((s, x) => s + x.G, 0);
    expect(Math.abs(somaG - somaGcalc)).toBeLessThan(0.01 * calc.reacoes.length);
    expect(l.armaduras.linhas).toHaveLength(arm.trechos.reduce((s, t) => s + t.barras.length, 0));
    expect(l.esforcos.linhas).toHaveLength(arm.trechos.reduce((s, t) => s + t.faixas.length, 0));
    expect(l.esforcos.linhas.length).toBeGreaterThanOrEqual(arm.trechos.length);
    expect(l.verificacoes.some((x) => x.rotulo === 'Flecha')).toBe(true);
    expect(l.verificacoes.find((x) => x.rotulo === 'Peso de aço (sem perdas)')!.valor).toBe(`${arm.peso.toFixed(1).replace('.', ',')} kg`);
    expect(l.dados.length).toBeGreaterThan(3);
  });

  it('sem dimensionamento, traz só os dados e avisa; sem escada, vazio', () => {
    const sem = relatorioEscadas(b, null);
    expect(sem.avisos[0]).toMatch(/calcule/i);
    expect(sem.escadas[0].lances.length).toBeGreaterThan(0);
    expect(sem.escadas[0].lances[0].reacoes.linhas).toHaveLength(0);
    const vazio = relatorioEscadas(edificioExemplo().modelo, dim);
    expect(vazio.escadas).toHaveLength(0);
    expect(vazio.gerais).toHaveLength(0);
  });

  it('CSV: BOM, separador ; e as seções do relatório', () => {
    const csv = relatorioEscadasCsv(r);
    expect(csv.startsWith('﻿Relatório das escadas')).toBe(true);
    for (const t of ['DADOS GERAIS', 'ESCADA E1', 'Reações dos apoios', 'Esforços de cálculo em cada seção', 'Armaduras', 'Verificações']) expect(csv).toContain(t);
    expect(csv.split('\r\n').length).toBeGreaterThan(40);
  });
});
