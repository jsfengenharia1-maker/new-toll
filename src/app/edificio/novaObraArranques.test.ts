import { describe, expect, it } from 'vitest';
import { importarArranques, lerTabela, sugerirMapeamento } from '../../core/building/importarArranques';
import { useBuilding } from './store';

describe('novaObraArranques', () => {
  it('arranques importados geram fundações e o desfazer reverte', () => {
    const t = 'Pilar;Caso;N;Hx;Hy;Mx;My;bx;by\nP1;G;500,5;0;0;0;0;30;40\nP1;Q;100;0;0;0;0;30;40\nP2;G;300;0;0;0;0;25;25\n';
    const res = importarArranques(t, sugerirMapeamento(lerTabela(t).linhas[0]));
    const r = useBuilding.getState().novaObraArranques('Teste', res);
    expect(r.ok).toBe(true);
    const f = useBuilding.getState().sessao.modelo.fundacao?.elementos ?? [];
    expect(f.length).toBeGreaterThanOrEqual(2);
    useBuilding.getState().desfazer();
    expect((useBuilding.getState().sessao.modelo.fundacao?.elementos ?? []).length).toBe(0);
  });
});
