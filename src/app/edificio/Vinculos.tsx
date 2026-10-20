// Grupo "Vínculos e engastes" da barra lateral (frente N1a): coeficientes por elemento da seleção da planta.
import { pavimentosOrdenados, engasteNoLance, lancesDoPilar, type BuildingModel } from '../../core/building/types';
import { vigaTocaPilar } from '../../core/building/vigas';
import { Button, Check, Group, Hint, NumField } from '../ui';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';

const fmt = (v: number) => String(+v.toFixed(2)).replace('.', ',');

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
  return (
    <Group title="Vínculos e engastes (seleção)" open={false}>
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
        <Hint>No topo do último lance o coeficiente multiplica o das opções de cálculo. Base 0 na fundação = pilar articulado.</Hint>
      </>)}

      {v0 && (<>
        <p className="small"><b>{vigas.length > 1 ? `${vigas.length} vigas` : v0.nome}</b></p>
        <div className="row wrap">
          <NumField label="Engaste no início" width={110} value={v0.engasteIni ?? (v0.vinculoIni === 'articulado' ? 0 : 1)} onChange={(v) => lote(vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, engasteIni: v } })))} />
          <NumField label="Engaste no fim" width={110} value={v0.engasteFim ?? (v0.vinculoFim === 'articulado' ? 0 : 1)} onChange={(v) => lote(vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, engasteFim: v } })))} />
          <NumField label="Engaste das lajes" width={110} value={v0.engasteLajes ?? 1} onChange={(v) => lote(vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, engasteLajes: v } })))} />
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
