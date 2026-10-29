// Barra de etapas (fluxo por etapas, na ordem da obra): numerada, com o estado de cada etapa e a próxima destacada. Estilo em design/global.css (.stepbar, .steps, .step, .step-n, .step-l, .step-prox).
import { useRef } from 'react';
import { useIndicioRolagem } from './teclado';
import { Button } from './index';

export interface StepDef { id: string; numero: number; rotulo: string; estado: 'feito' | 'pendente' | 'erro' | 'indisponivel'; detalhe: string }

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export const TEXTO_ESTADO: Record<StepDef['estado'], string> = { feito: 'feito', pendente: 'pendente', erro: 'com erro', indisponivel: 'indisponível' };
const MARCA: Record<StepDef['estado'], string> = { feito: '✓', pendente: '', erro: '!', indisponivel: '' };

/** Barra de etapas. `ativo` = etapa da aba aberta na faixa; `proximo` = etapa sugerida (destacada, com o texto "Próximo: …" no fim). */
export function StepBar({ label, etapas, ativo, proximo, onSelect }: { label: string; etapas: StepDef[]; ativo?: string; proximo?: string; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLOListElement>(null);
  useIndicioRolagem(ref);
  const prox = etapas.find((e) => e.id === proximo);
  return (
    <nav className="stepbar" aria-label={label}>
      <ol className="steps" ref={ref}>
        {etapas.map((e) => (
          <li key={e.id}>
            <Button variant="nenhuma" className={cx('step', e.estado, e.id === proximo && 'proxima', e.id === ativo && 'on')} data-etapa={e.id} data-estado={e.estado}
              aria-current={e.id === ativo ? 'step' : undefined} aria-label={`${e.numero}. ${e.rotulo}: ${TEXTO_ESTADO[e.estado]}`} title={`${e.rotulo} (${TEXTO_ESTADO[e.estado]}): ${e.detalhe}`} onClick={() => onSelect(e.id)}>
              <span className="step-n" aria-hidden="true">{MARCA[e.estado] || e.numero}</span>
              <span className="step-l">{e.rotulo}</span>
            </Button>
          </li>
        ))}
      </ol>
      <span className="step-prox" data-proxima={prox?.id ?? ''}>{prox ? <>Próximo: <b>{prox.rotulo}</b></> : 'Etapas concluídas'}</span>
    </nav>
  );
}
