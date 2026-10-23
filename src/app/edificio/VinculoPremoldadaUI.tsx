// Vínculo externo e pré-moldada no editor da viga (E2e, interface): topo de muro (engaste, articulação ou deslizante), viga
// pré-moldada armada (içamento) ou pré-fabricada de ficha do fabricante (EI, peso, MRd, VRd). Só comandos `viga.editar`; os
// resultados do içamento e da ficha saem na janela da viga e no memorial.
import { useState } from 'react';
import { Button, Hint, NumField, OptNumField, Select, TextField } from '../ui';
import type { FichaPremoldada, Viga } from '../../core/building/types';
import { useBuilding } from './store';

const VINCULOS = [
  { v: 'nenhum', label: 'nenhum (viga comum)' }, { v: 'engaste', label: 'engaste (topo de muro)' },
  { v: 'articulacao', label: 'articulação (topo de muro)' }, { v: 'deslizante', label: 'articulação com deslizamento horizontal' },
] as const;
const TIPOS = [{ v: 'nenhuma', label: 'nenhuma' }, { v: 'armada', label: 'armada (NBR 9062)' }, { v: 'ficha', label: 'pré-fabricada de ficha' }] as const;
const CLASSES = [{ v: 'protendida', label: 'protendida' }, { v: 'trelicada', label: 'treliçada' }, { v: 'outra', label: 'outra' }] as const;

function EditorFicha({ v, aplicar }: { v: Viga; aplicar: (f: FichaPremoldada) => void }) {
  const f0 = v.premoldada?.ficha;
  const [nome, setNome] = useState(f0?.nome ?? 'Ficha'), [classe, setClasse] = useState<'protendida' | 'trelicada' | 'outra'>(f0?.classe ?? 'protendida');
  const [EI, setEI] = useState<number | undefined>(f0?.EI), [peso, setPeso] = useState<number | undefined>(f0?.peso);
  const [mp, setMp] = useState(f0?.MRdPos ?? 100), [mn, setMn] = useState<number | undefined>(f0?.MRdNeg), [vr, setVr] = useState(f0?.VRd ?? 100), [tr, setTr] = useState<number | undefined>(f0?.TRd);
  return (
    <div data-ficha-premoldada>
      <div className="row wrap u-items-end">
        <TextField label="Ficha da viga: nome" value={nome} onChange={setNome} />
        <Select label="Ficha da viga: classe" value={classe} options={[...CLASSES]} onChange={setClasse} />
        <OptNumField label="Ficha da viga: rigidez EI (vazio = seção bruta)" unit="kN·m²" width={290} value={EI} onChange={setEI} />
        <OptNumField label="Ficha da viga: peso (vazio = seção)" unit="kN/m" width={220} value={peso} onChange={setPeso} />
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Ficha da viga: momento resistente positivo" unit="kN·m" width={290} value={mp} onChange={setMp} />
        <OptNumField label="Ficha da viga: momento resistente negativo" unit="kN·m" width={290} value={mn} onChange={setMn} />
        <NumField label="Ficha da viga: cortante resistente" unit="kN" width={240} value={vr} onChange={setVr} />
        <OptNumField label="Ficha da viga: torçor resistente" unit="kN·m" width={240} value={tr} onChange={setTr} />
        <Button onClick={() => aplicar({ nome: nome.trim() || 'Ficha', classe, ...(EI ? { EI } : {}), ...(peso !== undefined ? { peso } : {}), MRdPos: mp, ...(mn ? { MRdNeg: mn } : {}), VRd: vr, ...(tr ? { TRd: tr } : {}) })}>Aplicar a ficha da viga</Button>
      </div>
    </div>
  );
}

/** Vínculo externo e pré-moldada da seleção de vigas (o primeiro elemento mostra o valor; a edição vale para todos). */
export function VinculoEPremoldada({ vigas }: { vigas: Viga[] }) {
  const { exec } = useBuilding();
  const v0 = vigas[0];
  if (!v0) return null;
  const lote = (params: Record<string, unknown>) => exec('lote', { comandos: vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, ...params } })) });
  const tipo = v0.premoldada?.tipo ?? 'nenhuma';
  return (
    <div data-vinculo-premoldada>
      <p className="small"><b>Vínculo externo e pré-moldada {vigas.length > 1 ? `de ${vigas.length} vigas` : `de ${v0.nome}`}</b></p>
      <div className="row wrap u-items-end">
        <Select label="Vínculo externo da viga" value={v0.vinculoExterno ?? 'nenhum'} options={[...VINCULOS]} onChange={(x) => lote({ vinculoExterno: x })} />
        <Select label="Viga pré-moldada" value={tipo} options={[...TIPOS]} onChange={(t) => lote({ premoldada: t === 'ficha' && !v0.premoldada?.ficha ? { tipo: 'ficha', ficha: { nome: 'Ficha', MRdPos: 100, VRd: 100 } } : { tipo: t } })} />
        {tipo === 'armada' && <OptNumField label="Içamento: distância dos pontos às extremidades (vazio = opção)" unit="cm" width={380} value={v0.premoldada?.icamento === undefined ? undefined : +(v0.premoldada.icamento * 100).toFixed(1)} onChange={(x) => lote({ premoldada: { tipo: 'armada', ...(x ? { icamento: x / 100 } : {}) } })} />}
      </div>
      {tipo === 'ficha' && <EditorFicha key={v0.id + (v0.premoldada?.ficha?.nome ?? '')} v={v0} aplicar={(f) => lote({ premoldada: { tipo: 'ficha', ficha: f } })} />}
      <Hint>Vínculo externo: a viga simula o topo de um muro, com apoios em todos os nós de discretização (EI × 100); pilares coincidentes devem ser desligados no grupo. Pré-moldada armada: γc do controle pré-moldado, ligações articuladas por padrão e verificação de içamento. Ficha: viga protendida ou treliçada pré-fabricada, só verificada contra os valores do fabricante.</Hint>
    </div>
  );
}
