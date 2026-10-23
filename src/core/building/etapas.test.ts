import { describe, expect, it } from 'vitest';
import { Sessao, comandosEdificioPadrao } from '../commands';
import { edificioVazio } from './types';
import { etapasDaObra, proximaEtapa } from './etapas';
import { edificioExemplo } from '../sheets/exemplo';

const estados = (et: ReturnType<typeof etapasDaObra>) => et.map((x) => [x.id, x.estado]);
const porId = (et: ReturnType<typeof etapasDaObra>, id: string) => et.find((x) => x.id === id)!;

describe('etapasDaObra', () => {
  it('obra vazia: todas pendentes, exceto as indisponíveis', () => {
    const et = etapasDaObra(edificioVazio());
    expect(estados(et)).toEqual([
      ['obra', 'pendente'], ['pavimentos', 'pendente'], ['gabarito', 'pendente'], ['pilares', 'pendente'], ['pilaresParede', 'pendente'],
      ['muros', 'indisponivel'], ['vigas', 'pendente'], ['lajes', 'pendente'], ['cargas', 'pendente'], ['escadas', 'pendente'], ['calculo', 'pendente'],
    ]);
    expect(proximaEtapa(et)!.id).toBe('obra');
  });

  it('edifício padrão: obra, pavimentos e cargas feitos; próxima é o gabarito', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const et = etapasDaObra(s.modelo);
    expect(porId(et, 'obra').estado).toBe('feito');
    expect(porId(et, 'pavimentos')).toMatchObject({ estado: 'feito', detalhe: '5 pavimento(s) em 3 grupo(s)' });
    expect(porId(et, 'cargas').estado).toBe('feito');
    expect(porId(et, 'pilares').estado).toBe('pendente');
    expect(proximaEtapa(et)!.id).toBe('gabarito');
  });

  it('edifício de exemplo: tudo lançado; calculado marca o cálculo', () => {
    const { modelo } = edificioExemplo();
    for (const id of ['pilares', 'vigas', 'lajes', 'gabarito']) expect(porId(etapasDaObra(modelo), id).estado).toBe('feito');
    const et = etapasDaObra(modelo, true);
    expect(porId(et, 'calculo').estado).toBe('feito');
    expect(proximaEtapa(et)!.id).toBe('pilaresParede');
  });

  it('arranques não contam como pilares', () => {
    const s = new Sessao(edificioVazio());
    expect(s.executar('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' }).ok).toBe(true);
    expect(porId(etapasDaObra(s.modelo), 'pilares').estado).toBe('pendente');
  });

  it('muros indisponíveis (o detalhe cita a E1c); escadas pendentes até lançar a primeira (E4b)', () => {
    const et = etapasDaObra(edificioVazio());
    expect(porId(et, 'escadas').estado).toBe('pendente');
    expect(porId(et, 'muros').detalhe).toContain('E1c');
  });
});
