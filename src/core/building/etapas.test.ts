import { describe, expect, it } from 'vitest';
import { Sessao, comandosEdificioPadrao } from '../commands';
import { edificioVazio } from './types';
import { cargasDefinidas, contarReprovados, ETAPAS_ORDEM, etapasDaObra, proximaEtapa } from './etapas';
import { edificioExemplo } from '../sheets/exemplo';

const estados = (et: ReturnType<typeof etapasDaObra>) => et.map((x) => [x.id, x.estado]);
const porId = (et: ReturnType<typeof etapasDaObra>, id: string) => et.find((x) => x.id === id)!;
const padrao = () => { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; };

describe('etapasDaObra (8 etapas, na ordem da obra)', () => {
  it('ordem, números e rótulos fixos', () => {
    const et = etapasDaObra(edificioVazio());
    expect(et.map((x) => x.id)).toEqual(ETAPAS_ORDEM);
    expect(et.map((x) => x.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(et.map((x) => x.rotulo)).toEqual(['Obra', 'Pilares', 'Vigas e lajes', 'Cargas', 'Fundação', 'Calcular', 'Resultados', 'Pranchas e memorial']);
  });

  it('obra vazia: lançamento pendente, resultados e pranchas indisponíveis; a próxima é a Obra', () => {
    const et = etapasDaObra(edificioVazio());
    expect(estados(et)).toEqual([
      ['obra', 'pendente'], ['pilares', 'pendente'], ['vigasLajes', 'pendente'], ['cargas', 'pendente'], ['fundacao', 'pendente'],
      ['calcular', 'pendente'], ['resultados', 'indisponivel'], ['pranchas', 'indisponivel'],
    ]);
    expect(proximaEtapa(et)!.id).toBe('obra');
  });

  it('edifício padrão: só a obra está feita; a sobrecarga padrão das categorias NÃO conta como cargas; a próxima é Pilares', () => {
    const s = padrao();
    const et = etapasDaObra(s.modelo);
    expect(porId(et, 'obra')).toMatchObject({ estado: 'feito' });
    expect(porId(et, 'obra').detalhe).toContain('5 pavimento(s) em 3 grupo(s)');
    expect(porId(et, 'cargas').estado).toBe('pendente');
    expect(cargasDefinidas(s.modelo)).toEqual({ lancadas: 0, gruposEditados: 0 });
    expect(proximaEtapa(et)!.id).toBe('pilares');
  });

  it('cargas: feita com carga lançada OU com a sobrecarga de um grupo diferente do padrão da categoria', () => {
    const s = padrao();
    const g = s.modelo.grupos[1];
    const r = s.executar('grupo.editar', { id: g.id, q: 4 });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    expect(cargasDefinidas(s.modelo)).toEqual({ lancadas: 0, gruposEditados: 1 });
    expect(porId(etapasDaObra(s.modelo), 'cargas').estado).toBe('feito');
    // voltar ao padrão da categoria desfaz
    s.executar('grupo.editar', { id: g.id, q: s.modelo.grupos[1].uso === 'residencial' ? 1.5 : 3 });
    expect(porId(etapasDaObra(s.modelo), 'cargas').estado).toBe('pendente');
    // carga lançada
    const m = structuredClone(padrao().modelo);
    m.cargas.push({ id: 'c1' } as never);
    expect(porId(etapasDaObra(m), 'cargas')).toMatchObject({ estado: 'feito', detalhe: '1 carga(s) lançada(s); sobrecarga editada em 0 grupo(s)' });
  });

  it('edifício de exemplo calculado: lançamento feito, calcular e resultados feitos; pranchas pendentes até o carimbo', () => {
    const { modelo } = edificioExemplo();
    for (const id of ['pilares', 'vigasLajes']) expect(porId(etapasDaObra(modelo), id).estado).toBe('feito');
    const et = etapasDaObra(modelo, { calculado: true });
    expect(porId(et, 'calcular').estado).toBe('feito');
    expect(porId(et, 'resultados').estado).toBe('feito');
    expect(porId(et, 'pranchas').estado).toBe('pendente');
    expect(porId(etapasDaObra(modelo, { calculado: true, carimbo: true }), 'pranchas').estado).toBe('feito');
    // a forma antiga (boolean) continua valendo
    expect(porId(etapasDaObra(modelo, true), 'calcular').estado).toBe('feito');
    expect(porId(etapasDaObra(modelo, false), 'calcular').estado).toBe('pendente');
  });

  it('erro: análise que falhou, erros de lançamento e elementos reprovados', () => {
    const { modelo } = edificioExemplo();
    expect(porId(etapasDaObra(modelo, { calculado: true, erroAnalise: 'estrutura instável' }), 'calcular')).toMatchObject({ estado: 'erro', detalhe: 'A análise falhou: estrutura instável' });
    expect(porId(etapasDaObra(modelo, { erros: 2 }), 'calcular')).toMatchObject({ estado: 'erro' });
    const rep = etapasDaObra(modelo, { calculado: true, reprovados: 3 });
    expect(porId(rep, 'resultados')).toMatchObject({ estado: 'erro' });
    expect(porId(rep, 'resultados').detalhe).toContain('3 elemento(s) não atendem');
    // com erro a etapa continua sendo a próxima (mesmo calculada)
    expect(proximaEtapa(etapasDaObra(modelo, { calculado: true, reprovados: 3 }))).toBeDefined();
  });

  it('contarReprovados soma só status fail de vigas, pilares, lajes e fundações', () => {
    expect(contarReprovados(null)).toBe(0);
    expect(contarReprovados({ vigas: [{ status: 'ok' }, { status: 'fail' }], pilares: [{ status: 'review' }, { status: 'fail' }], lajes: [{ status: 'armadura' }], fundacoes: [{ status: 'fail' }] })).toBe(3);
  });

  it('arranques não contam como pilares; pilar-parede conta', () => {
    const s = new Sessao(edificioVazio());
    expect(s.executar('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' }).ok).toBe(true);
    expect(porId(etapasDaObra(s.modelo), 'pilares').estado).toBe('pendente');
    const m = structuredClone(s.modelo);
    m.pilaresParede = [{ id: 'pp1' } as never];
    expect(porId(etapasDaObra(m), 'pilares')).toMatchObject({ estado: 'feito' });
  });

  it('fundação é opcional: pendente sem elementos, mas não é a próxima etapa; Vigas e lajes pedem vigas E lajes', () => {
    const { modelo } = edificioExemplo();
    const et = etapasDaObra(modelo);
    expect(porId(et, 'fundacao').opcional).toBe(true);
    const prox = proximaEtapa(et)!;
    expect(prox.id).not.toBe('fundacao');
    const so = structuredClone(modelo);
    so.lajes = [];
    expect(porId(etapasDaObra(so), 'vigasLajes').estado).toBe('pendente');
  });

  it('muros, paredes e escadas entram no detalhe de Vigas e lajes (opcionais)', () => {
    const s = padrao();
    const [p0, p1] = s.modelo.pavimentos;
    const r = s.executar('parede.criar', { pontos: [[0, 0], [3, 0]], espessura: 0.2, tipo: 'concreto', nasce: p0.id, morre: p1.id });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    expect(porId(etapasDaObra(s.modelo), 'vigasLajes').detalhe).toContain('1 parede(s), 0 muro(s) de arrimo, 0 escada(s) (opcionais)');
  });
});
