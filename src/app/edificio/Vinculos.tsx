// Grupo "Vínculos e engastes" da barra lateral (frente N1a): coeficientes por elemento da seleção da planta.
import { pavimentosOrdenados, engasteNoLance, lancesDoPilar, casosDaObra, type BuildingModel } from '../../core/building/types';
import { vigaTocaPilar } from '../../core/building/vigas';
import { flambagemLance } from '../../core/building/materiais';
import { useState } from 'react';
import { Button, Check, Group, Hint, NumField, OptNumField, Select } from '../ui';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';
import { LanceDoPilar } from './Transicao';

const fmt = (v: number) => String(+v.toFixed(2)).replace('.', ',');
const VAZIA = { N: 0, Hx: 0, Hy: 0, Mx: 0, My: 0 };
type Esforcos = typeof VAZIA;

/** Cargas concentradas no pilar (ou no arranque, com `pavId` = "fundacao"): tabela e campos para adicionar. */
export function CargasNoPilar({ b, p0, pavId, pavNome }: { b: BuildingModel; p0: { id: string; nome: string }; pavId: string; pavNome: string }) {
  const { exec } = useBuilding();
  const [caso, setCaso] = useState('Q');
  const [alt, setAlt] = useState<number | undefined>(undefined);
  const [esf, setEsf] = useState<Esforcos>(VAZIA);
  const pav = { id: pavId, nome: pavNome };
  const cps = (b.cargasPilar ?? []).filter((c) => c.pilar === p0.id);
  const nomeCaso = (id: string) => b.casos?.find((x) => x.id === id)?.nome ?? id;
  const nomePav = (id: string) => b.pavimentos.find((x) => x.id === id)?.nome ?? id;
  return (
    <>
      <p className="small"><b>Cargas no pilar {p0.nome}</b> (eixos globais; N &gt; 0 = compressão)</p>
      {cps.length > 0 && (
        <table className="data quadro">
          <thead><tr><th>Lance</th><th>Caso</th><th>Altura (m)</th><th>N</th><th>Hx</th><th>Hy</th><th>Mx</th><th>My</th><th /></tr></thead>
          <tbody>{cps.map((c) => (
            <tr key={c.id}><td className="tl">{nomePav(c.pavimento)}</td><td className="tl">{nomeCaso(c.caso)}</td><td className="num">{c.altura === undefined ? 'topo' : fmt(c.altura)}</td>
              <td className="num">{fmt(c.N)}</td><td className="num">{fmt(c.Hx)}</td><td className="num">{fmt(c.Hy)}</td><td className="num">{fmt(c.Mx)}</td><td className="num">{fmt(c.My)}</td>
              <td><Button variant="danger" aria-label={`Remover carga ${c.id}`} onClick={() => exec('carga.pilarRemover', { ids: [c.id] })}>×</Button></td></tr>
          ))}</tbody>
        </table>
      )}
      <div className="row wrap">
        <Select label={`Caso (lance ${pav.nome})`} value={caso} options={casosDaObra(b).map((c) => ({ v: c.id, label: c.nome }))} onChange={setCaso} />
        <OptNumField label="Altura da base (vazio = topo)" unit="m" width={150} value={alt} onChange={setAlt} />
      </div>
      <div className="row wrap">
        {(['N', 'Hx', 'Hy', 'Mx', 'My'] as const).map((k) => <NumField key={k} label={k === 'N' ? 'N (kN)' : k.startsWith('H') ? `${k} (kN)` : `${k} (kN·m)`} width={86} value={esf[k]} onChange={(v) => setEsf({ ...esf, [k]: v })} />)}
      </div>
      <div className="row wrap">
        <Button disabled={!Object.values(esf).some((v) => v)} onClick={() => { exec('carga.pilar', { pilar: p0.id, pavimento: pav.id, caso, ...(alt !== undefined ? { altura: alt } : {}), ...esf }); setEsf(VAZIA); }}>Adicionar carga no lance</Button>
      </div>
      <Hint>Carga concentrada no topo do lance de {pav.nome} ou a uma altura da base; entra no pórtico espacial como ação do caso escolhido.</Hint>
    </>
  );
}

export function VinculosGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const ps = pavimentosOrdenados(b);
  const pav = ps.find((p) => p.id === pl.pavimento) ?? ps[Math.min(1, ps.length - 1)];
  const pilares = b.pilares.filter((p) => pl.selecao.has(p.id));
  const vigas = b.vigas.filter((v) => pl.selecao.has(v.id));
  const lajes = b.lajes.filter((l) => pl.selecao.has(l.id));
  const lote = (comandos: { nome: string; params: Record<string, unknown> }[]) => exec('lote', { comandos });
  const nada = !pilares.length && !vigas.length && !lajes.length;
  const p0 = pilares[0], v0 = vigas[0], l0 = lajes[0];
  const e0 = p0 && pav ? engasteNoLance(p0, pav.id) : { topo: 1, base: 1 };
  const doLance = p0 && pav && lancesDoPilar(b, p0).some((x) => x.id === pav.id);
  const fl0 = p0 && pav ? p0.flambagem?.find((x) => x.pavimento === pav.id) : undefined;
  const le = doLance ? flambagemLance(b, p0, pav.id) : null;
  return (
    <Group title="Vínculos, flambagem e cobrimento (seleção)" open={false}>
      {nada && <Hint>Selecione pilares, vigas ou lajes na planta para editar os coeficientes de engaste (0 = rótula, 1 = engaste).</Hint>}

      {p0 && pav && (<>
        <p className="small"><b>{pilares.length > 1 ? `${pilares.length} pilares` : p0.nome}</b> — lance que chega a {pav.nome}{doLance ? '' : ' (o pilar não passa aqui)'}</p>
        <div className="row wrap">
          <NumField label="Engaste no topo" width={110} value={e0.topo} onChange={(v) => exec('pilar.engaste', { ids: pilares.map((p) => p.id), pavimentos: [pav.id], topo: v })} disabled={!doLance} />
          <NumField label="Engaste na base" width={110} value={e0.base} onChange={(v) => exec('pilar.engaste', { ids: pilares.map((p) => p.id), pavimentos: [pav.id], base: v })} disabled={!doLance} />
        </div>
        <div className="row wrap">
          <Button onClick={() => exec('pilar.engaste', { ids: pilares.map((p) => p.id), topo: e0.topo, base: e0.base })}>Aplicar a todos os lances</Button>
        </div>
        {p0 && pilares.length === 1 && doLance && <LanceDoPilar b={b} p={p0} pavId={pav.id} pavNome={pav.nome} />}
        {p0 && pilares.length === 1 && doLance && <CargasNoPilar b={b} p0={p0} pavId={pav.id} pavNome={pav.nome} />}
        <Hint>No topo do último lance o coeficiente multiplica o das opções de cálculo. Base 0 na fundação = pilar articulado.</Hint>
        <div className="row wrap">
          <NumField label="α flambagem (b)" width={110} value={fl0?.au ?? 1} onChange={(v) => exec('pilar.flambagem', { ids: pilares.map((p) => p.id), pavimentos: [pav.id], au: v })} disabled={!doLance} />
          <NumField label="α flambagem (h)" width={110} value={fl0?.av ?? 1} onChange={(v) => exec('pilar.flambagem', { ids: pilares.map((p) => p.id), pavimentos: [pav.id], av: v })} disabled={!doLance} />
          <NumField label={`α do pavimento ${pav.nome}`} width={130} value={pav.alfaFlambagem ?? 1} onChange={(v) => exec('pavimento.editar', { id: pav.id, alfaFlambagem: v })} />
          <NumField label="Cobrimento" unit="cm" width={100} value={p0.cobrimento ?? b.norma.cobrimento.pilar} onChange={(v) => lote(pilares.map((p) => ({ nome: 'pilar.editar', params: { id: p.id, cobrimento: v === b.norma.cobrimento.pilar ? 0 : v } })))} />
        </div>
        {le && <Hint>ℓe = mín(ℓ0 + h; ℓ) × α (NBR 6118, 15.6): {fmt(le.leU)} m (b) e {fmt(le.leV)} m (h), com ℓ = {fmt(le.l)} m e ℓ0 = {fmt(le.l0)} m. Pilar destravado em vários pavimentos: α &gt; 1.</Hint>}
      </>)}

      {v0 && (<>
        <p className="small"><b>{vigas.length > 1 ? `${vigas.length} vigas` : v0.nome}</b></p>
        <div className="row wrap">
          <NumField label="Engaste no início" width={110} value={v0.engasteIni ?? (v0.vinculoIni === 'articulado' ? 0 : 1)} onChange={(v) => lote(vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, engasteIni: v } })))} />
          <NumField label="Engaste no fim" width={110} value={v0.engasteFim ?? (v0.vinculoFim === 'articulado' ? 0 : 1)} onChange={(v) => lote(vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, engasteFim: v } })))} />
          <NumField label="Engaste das lajes" width={110} value={v0.engasteLajes ?? 1} onChange={(v) => lote(vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, engasteLajes: v } })))} />
          <NumField label="Cobrimento" unit="cm" width={100} value={v0.cobrimento ?? b.norma.cobrimento.viga} onChange={(v) => lote(vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, cobrimento: v === b.norma.cobrimento.viga ? 0 : v } })))} />
        </div>
        <div className="row wrap">
          <Check label="Torção de equilíbrio (seção bruta)" checked={!!v0.torcaoEquilibrio} onChange={(c) => lote(vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, torcaoEquilibrio: c } })))} />
          <Check label="Fora do diafragma rígido" checked={!!v0.foraDiafragma} onChange={(c) => lote(vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, foraDiafragma: c } })))} />
        </div>
        {vigas.length === 1 && pav && (() => {
          const pavG = ps.find((p) => p.grupo === v0.grupo) ?? pav;
          const apoios = b.pilares.filter((p) => lancesDoPilar(b, p).some((x) => x.id === pavG.id) && vigaTocaPilar(v0, p, pavG.id));
          if (!apoios.length) return null;
          const art = new Set(v0.articulacoes ?? []);
          return (
            <div className="row wrap">
              <span className="muted small">Rótula na viga sobre:</span>
              {apoios.map((p) => <Check key={p.id} label={p.nome} checked={art.has(p.id)} onChange={(c) => exec('viga.editar', { id: v0.id, articulacoes: c ? [...art, p.id] : [...art].filter((x) => x !== p.id) })} />)}
            </div>
          );
        })()}
        <Hint>Engaste das lajes multiplica o da borda de cada laje apoiada nesta viga. Viga fora do diafragma: seus nós exclusivos não seguem o corpo rígido do pavimento.</Hint>
      </>)}

      {l0 && (<>
        <p className="small"><b>{lajes.length > 1 ? `${lajes.length} lajes` : l0.nome}</b> — engaste das bordas</p>
        <div className="row wrap">
          <NumField label="Todas as bordas" width={110} value={l0.engasteBordas?.[0] ?? 1} onChange={(v) => lote(lajes.map((l) => ({ nome: 'laje.editar', params: { id: l.id, engasteBordas: l.contorno.map(() => v) } })))} />
          <NumField label="Cobrimento" unit="cm" width={100} value={l0.cobrimento ?? b.norma.cobrimento.laje} onChange={(v) => lote(lajes.map((l) => ({ nome: 'laje.editar', params: { id: l.id, cobrimento: v === b.norma.cobrimento.laje ? 0 : v } })))} />
        </div>
        {lajes.length === 1 && (
          <div className="row wrap">
            {l0.contorno.map((a, k) => {
              const z = l0.contorno[(k + 1) % l0.contorno.length];
              const atual = l0.contorno.map((_, i) => l0.engasteBordas?.[i] ?? 1);
              return <NumField key={k} label={`Borda ${k + 1} (${fmt(Math.hypot(z[0] - a[0], z[1] - a[1]))} m)`} width={110} value={atual[k]}
                onChange={(v) => exec('laje.editar', { id: l0.id, engasteBordas: atual.map((x, i) => (i === k ? v : x)) })} />;
            })}
          </div>
        )}
        <Hint>Bordas numeradas a partir do primeiro vértice do contorno, no sentido anti-horário. Bordas que tocam pilares ficam sempre engastadas.</Hint>
      </>)}
    </Group>
  );
}
