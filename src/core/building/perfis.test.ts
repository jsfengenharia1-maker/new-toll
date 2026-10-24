import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { OPCOES_DIFERENTES_NBR, opcoesAlteradas, opcoesEmUso, perfilDe } from './opcoes';

describe('perfis de padrões das opções: sistema × NBR 6118', () => {
  it('troca de perfil muda os padrões, mantém valores próprios e desfaz', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const ok = (n: string, p: Record<string, unknown>) => expect(s.executar(n, p).ok, n).toBe(true);
    expect(OPCOES_DIFERENTES_NBR.map((o) => o.chave).sort()).toEqual(['alvenariaCumprimento', 'alveolarProcesso', 'arredondamentoApoio', 'axialPilares', 'continuidadePilares', 'cortanteBarrasLaje', 'cortanteVarredura', 'criterioLinear', 'engasteTopoUltimo', 'engasteTransicao', 'fatorFlechaAtiva', 'fatorFlechaAtivaTrelicada', 'fatorFlechaConforto', 'fatorFlechaConfortoTrelicada', 'fatorFlechaLaje', 'flechaQInstantanea', 'fundParedeBarraMola', 'fundParedeK', 'inerciaHomogeneizada', 'lajeNegativoVao', 'mesaDimensionamento', 'modeloGlobal', 'nervuradaInercia', 'nervuradaTorcao', 'paredeCumprimento', 'paredeVigaEmbutida', 'pilarInsuficienteSemDesenho', 'pilarLancesDesligados', 'pilarOrdemTaxa', 'pilarSimetria', 'puncaoNervCortante', 'redistribuicao', 'redistribuicaoFaces', 'vigaAncoragemEixo', 'vigaAncoragemFolga', 'vigaApoioLongVao', 'vigaCortesInf', 'vigaEstriboExtensao', 'vigaFundCortes', 'vigaGruposSup', 'vigaNegativoVao', 'vigaNegativosUnir', 'vigaReducaoLb', 'vigaSimetriaNegativos', 'vigotaIgualacaoPonto', 'vigotaMomentoMinNegativo', 'vigotaMomentoMinPositivo', 'vigotaNegativoVao', 'vigotaRigidezFicha']);
    expect(opcoesEmUso(s.modelo.opcoes, perfilDe(s.modelo)).redistribuicao).toBe(15);
    ok('opcoes.definir', { valores: { malha: 0.5, redistribuicao: 0 } });
    ok('opcoes.definir', { perfil: 'nbr' });
    expect(s.modelo.perfilOpcoes).toBe('nbr');
    // redistribuição 0 é o padrão NBR: deixa de ser alteração; malha 0,5 continua
    expect(s.modelo.opcoes).toEqual({ malha: 0.5 });
    const op = opcoesEmUso(s.modelo.opcoes, 'nbr');
    expect([op.redistribuicao, op.fatorFlechaLaje, op.engasteTopoUltimo, op.axialPilares, op.malha]).toEqual([0, 0, 1, 1, 0.5]);
    expect(opcoesAlteradas(s.modelo.opcoes, 'nbr').map((o) => o.chave)).toEqual(['malha']);
    s.desfazer();
    expect(s.modelo.perfilOpcoes).toBeUndefined();
    expect(s.modelo.opcoes).toEqual({ malha: 0.5, redistribuicao: 0 });
  });
});
