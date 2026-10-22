// Grupos "Etapas da obra" e "Arquivo e versões" (L1): guia de etapas e controles do que o arquivo inclui.
import { useState } from 'react';
import { useBuilding, calculoAtual } from './store';
import { Button, Check, Group, Hint, Note, NumField, Pill, Select } from '../ui';
import { etapasDaObra, proximaEtapa, type EtapaId } from '../../core/building/etapas';
import type { BuildingModel } from '../../core/building/types';

const TOM: Record<string, 'ok' | 'warn' | 'na'> = { feito: 'ok', pendente: 'warn', indisponivel: 'na' };
const TEXTO: Record<string, string> = { feito: 'feito', pendente: 'pendente', indisponivel: 'indisponível' };

export function EtapasGrupo({ b, aoIr }: { b: BuildingModel; aoIr(id: EtapaId): void }) {
  const calculado = useBuilding((s) => calculoAtual(s));
  const et = etapasDaObra(b, calculado);
  const prox = proximaEtapa(et);
  return (
    <Group title="Etapas da obra">
      <div className="etapas">
        {et.map((e) => (
          <div key={e.id} className={`etapa ${e.estado}`} data-etapa={e.id}>
            <Pill tone={TOM[e.estado]}>{TEXTO[e.estado]}</Pill>
            <span className="etapa-rotulo">{e.rotulo}</span>
            <span className="etapa-detalhe">{e.detalhe}</span>
            {e.estado !== 'indisponivel' && (
              <Button variant="ghost" aria-label={`Ir para ${e.rotulo}`} onClick={() => aoIr(e.id)}>Ir</Button>
            )}
          </div>
        ))}
      </div>
      <Hint>{prox ? `Próxima etapa: ${prox.rotulo}.` : 'Todas as etapas disponíveis estão feitas.'}</Hint>
    </Group>
  );
}

export function ArquivoGrupo() {
  const { opcoesArquivo, setOpcoesArquivo, versoesArquivo, avisosArquivo, recuperarVersao } = useBuilding();
  const [escolhida, setEscolhida] = useState<number>(versoesArquivo.length ? versoesArquivo[versoesArquivo.length - 1].indice : 0);
  return (
    <Group title="Arquivo e versões" open={false}>
      <NumField label="Versões anteriores no arquivo" value={opcoesArquivo.versoes} onChange={(v) => setOpcoesArquivo({ versoes: Math.min(20, Math.max(0, Math.round(v))) })} />
      <Check label="Incluir os resultados do último cálculo" checked={opcoesArquivo.resultados} onChange={(v) => setOpcoesArquivo({ resultados: v })} />
      <Hint>Vale para o próximo Arquivo › Salvar no computador. Versões = a obra logo antes de cada um dos últimos comandos (até 20); o arquivo cresce com elas (limite de 3 MB para versões e 5 MB para resultados, com aviso).</Hint>
      {avisosArquivo.map((a, i) => <Note key={i}>{a}</Note>)}
      {versoesArquivo.length ? (
        <>
          <h4>Versões do arquivo aberto</h4>
          <Select<number>
            label="Recuperar versão"
            value={escolhida}
            options={versoesArquivo.map((v) => ({ v: v.indice, label: `${v.indice + 1} — antes de ${v.rotulo}` }))}
            onChange={setEscolhida}
          />
          <Button onClick={() => recuperarVersao(escolhida)}>Recuperar</Button>
        </>
      ) : (
        <Hint>O arquivo aberto não traz versões anteriores.</Hint>
      )}
    </Group>
  );
}
