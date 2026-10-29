// Grupo "Arquivo e versões" (L1): controles do que o arquivo inclui. O guia de etapas virou a barra de etapas (BarraEtapas.tsx).
import { useState } from 'react';
import { useBuilding } from './store';
import { Button, Check, Group, Hint, Note, NumField, Select } from '../ui';


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
