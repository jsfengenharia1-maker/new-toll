// Vigotas por pano (frente E3b): classe de agressividade ambiental do pano (nível de protensão das vigotas protendidas,
// NBR 6118, Tabela 13.4 a confirmar) e momentos mínimos por tipo de vão. Usado no grupo "Vínculos e engastes" para as lajes
// nervuradas selecionadas na planta. Os comandos são `laje.exposicao` e `laje.momentosMin`.
import { useState } from 'react';
import { useBuilding } from './store';
import { Button, Hint, NumField, Select } from '../ui';
import { TIPOS_VAO, type Laje, type TipoVao } from '../../core/building/types';
import { OPCOES_PADRAO_CALCULO } from '../../core/building/opcoes';

type Caa = 'obra' | 'I' | 'II' | 'III' | 'IV';
const CAA: { v: Caa; label: string }[] = [{ v: 'obra', label: 'a da obra' }, { v: 'I', label: 'I (fraca)' }, { v: 'II', label: 'II (moderada)' }, { v: 'III', label: 'III (forte)' }, { v: 'IV', label: 'IV (muito forte)' }];

/** Divisores dos momentos mínimos do tipo de vão (campos reiniciados ao trocar o tipo ou a laje pela `key` do chamador). */
function MomentosMinimos({ lajes, tipo }: { lajes: Laje[]; tipo: TipoVao }) {
  const { exec } = useBuilding();
  const ids = lajes.map((l) => l.id), atual = lajes[0].momentosMin?.[tipo];
  const [pos, setPos] = useState(atual?.pos ?? OPCOES_PADRAO_CALCULO.vigotaMomentoMinPositivo);
  const [neg, setNeg] = useState(atual?.neg ?? OPCOES_PADRAO_CALCULO.vigotaMomentoMinNegativo);
  return (
    <>
      <div className="row wrap">
        <NumField label="Divisor do positivo mínimo (p·ℓ² / …)" width={210} value={pos} onChange={(v) => setPos(Math.max(0, Math.min(50, v)))} />
        <NumField label="Divisor do negativo mínimo (p·ℓ² / …)" width={210} value={neg} onChange={(v) => setNeg(Math.max(0, Math.min(50, v)))} />
      </div>
      <div className="row wrap">
        <Button onClick={() => exec('laje.momentosMin', { ids, tipo, pos, neg })}>Aplicar os momentos mínimos ao pano</Button>
        <Button disabled={!atual} onClick={() => exec('laje.momentosMin', { ids, tipo, limpar: true })}>Voltar aos momentos mínimos da obra</Button>
      </div>
    </>
  );
}

export function VigotasPano({ lajes }: { lajes: Laje[] }) {
  const { exec } = useBuilding();
  const ids = lajes.map((l) => l.id), l0 = lajes[0];
  const [tipo, setTipo] = useState<TipoVao>('isolado');
  return (
    <div data-vigotas-pano>
      <div className="row wrap">
        <Select label="Classe de agressividade do pano" value={(l0.exposicao ?? 'obra') as Caa} options={CAA} onChange={(c: Caa) => exec('laje.exposicao', { ids, caa: c })} />
        <Button onClick={() => exec('laje.exposicao', { grupo: l0.grupo, caa: l0.exposicao ?? 'obra' })}>Estender a classe a todos os panos do grupo</Button>
        <Select label="Tipo de vão dos momentos mínimos" value={tipo} options={TIPOS_VAO.map((t) => ({ v: t.v, label: t.rotulo }))} onChange={setTipo} />
      </div>
      <MomentosMinimos key={`${ids.join(',')}|${tipo}|${JSON.stringify(l0.momentosMin?.[tipo] ?? null)}`} lajes={lajes} tipo={tipo} />
      <Hint>0 desliga o momento mínimo do tipo de vão. Sem valor do pano vale o da obra (opções “Vigotas: momento positivo/negativo mínimo”). A classe do pano define o nível de protensão das vigotas protendidas.</Hint>
    </div>
  );
}
