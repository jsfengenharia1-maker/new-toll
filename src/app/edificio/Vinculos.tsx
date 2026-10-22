// Grupo "Vínculos e engastes" da barra lateral (frente N1a): coeficientes por elemento da seleção da planta.
import { pavimentosOrdenados, engasteNoLance, lancesDoPilar, casosDaObra, type BuildingModel, type Pilar, type VinculoBasePilar } from '../../core/building/types';
import { vigaTocaPilar } from '../../core/building/vigas';
import { flambagemLance, travamentoNoTopo } from '../../core/building/materiais';
import { useState } from 'react';
import { Button, Check, Group, Hint, NumField, OptNumField, Select } from '../ui';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';
import { LanceDoPilar } from './Transicao';
import { SecaoDaViga } from './SecaoVigaUI';

const fmt = (v: number) => String(+v.toFixed(2)).replace('.', ',');
/** O traçado de uma viga toca o da outra (cruzamento ou apoio) sem serem colineares? */
function cruza(a: { pontos: [number, number][] }, b2: { pontos: [number, number][] }): boolean {
  const seg = (p: [number, number][]) => p.slice(0, -1).map((q, i) => [q, p[i + 1]] as const);
  const ccw = (p: readonly number[], q: readonly number[], r: readonly number[]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  for (const [p1, p2] of seg(a.pontos)) for (const [q1, q2] of seg(b2.pontos)) {
    const d1 = ccw(p1, p2, q1), d2 = ccw(p1, p2, q2), d3 = ccw(q1, q2, p1), d4 = ccw(q1, q2, p2), e = 1e-9;
    if (Math.abs(d1) < e && Math.abs(d2) < e) continue; // colineares
    if (d1 * d2 <= e && d3 * d4 <= e) return true;
  }
  return false;
}
const VAZIA = { N: 0, Hx: 0, Hy: 0, Mx: 0, My: 0, T: 0 };
type Esforcos = typeof VAZIA;

/** Cargas concentradas no pilar (ou no arranque, com `pavId` = "fundacao"): tabela e campos para adicionar. */
export function CargasNoPilar({ b, p0, pavId, pavNome }: { b: BuildingModel; p0: { id: string; nome: string }; pavId: string; pavNome: string }) {
  const { exec } = useBuilding();
  const [caso, setCaso] = useState('Q');
  const [alt, setAlt] = useState<number | undefined>(undefined);
  const [esf, setEsf] = useState<Esforcos>(VAZIA);
  const [tipo, setTipo] = useState<'concentrada' | 'uniforme' | 'faixa'>('concentrada');
  const [eixos, setEixos] = useState<'global' | 'local'>('global');
  const [ate, setAte] = useState<number | undefined>(undefined);
  const arranque = pavId === 'fundacao';
  const pav = { id: pavId, nome: pavNome };
  const dist = tipo !== 'concentrada';
  const cps = (b.cargasPilar ?? []).filter((c) => c.pilar === p0.id);
  const nomeCaso = (id: string) => b.casos?.find((x) => x.id === id)?.nome ?? id;
  const nomePav = (id: string) => b.pavimentos.find((x) => x.id === id)?.nome ?? id;
  return (
    <>
      <p className="small"><b>Cargas no pilar {p0.nome}</b> (N &gt; 0 = compressão; local: x ao longo de b)</p>
      {cps.length > 0 && (
        <table className="data quadro">
          <thead><tr><th>Lance</th><th>Caso</th><th>Tipo</th><th>Eixos</th><th>Altura (m)</th><th>N</th><th>Hx</th><th>Hy</th><th>Mx</th><th>My</th><th>T</th><th /></tr></thead>
          <tbody>{cps.map((c) => (
            <tr key={c.id} data-carga-pilar={c.tipo ?? 'concentrada'}><td className="tl">{nomePav(c.pavimento)}</td><td className="tl">{nomeCaso(c.caso)}</td><td className="tl">{TIPO_TXT[c.tipo ?? 'concentrada']}</td><td className="tl">{c.eixos === 'local' ? 'local' : 'global'}</td>
              <td className="num">{c.tipo === 'uniforme' ? 'lance' : c.tipo === 'faixa' ? `${fmt(c.altura ?? 0)}–${fmt(c.ate ?? 0)}` : c.altura === undefined ? 'topo' : fmt(c.altura)}</td>
              <td className="num">{fmt(c.N)}</td><td className="num">{fmt(c.Hx)}</td><td className="num">{fmt(c.Hy)}</td><td className="num">{fmt(c.Mx)}</td><td className="num">{fmt(c.My)}</td><td className="num">{fmt(c.T ?? 0)}</td>
              <td><Button variant="danger" aria-label={`Remover carga ${c.id}`} onClick={() => exec('carga.pilarRemover', { ids: [c.id] })}>×</Button></td></tr>
          ))}</tbody>
        </table>
      )}
      <div className="row wrap">
        <Select label={`Caso (lance ${pav.nome})`} value={caso} options={casosDaObra(b).map((c) => ({ v: c.id, label: c.nome }))} onChange={setCaso} />
        {!arranque && <Select label="Tipo" value={tipo} options={(['concentrada', 'uniforme', 'faixa'] as const).map((v) => ({ v, label: TIPO_TXT[v] }))} onChange={setTipo} />}
        <Select label="Eixos" value={eixos} options={[{ v: 'global' as const, label: 'globais (X, Y)' }, { v: 'local' as const, label: 'locais (b, h)' }]} onChange={setEixos} />
      </div>
      <div className="row wrap">
        {tipo !== 'uniforme' && <OptNumField label={tipo === 'faixa' ? 'Início da faixa' : 'Altura da base (vazio = topo)'} unit="m" width={150} value={alt} onChange={setAlt} />}
        {tipo === 'faixa' && <OptNumField label="Fim da faixa" unit="m" width={120} value={ate} onChange={setAte} />}
      </div>
      <div className="row wrap">
        {(dist ? (['N', 'Hx', 'Hy'] as const) : (['N', 'Hx', 'Hy', 'Mx', 'My', 'T'] as const)).map((k) => <NumField key={k} label={dist ? `${k} (kN/m)` : k === 'N' ? 'N (kN)' : k.startsWith('H') ? `${k} (kN)` : `${k} (kN·m)`} width={86} value={esf[k]} onChange={(v) => setEsf({ ...esf, [k]: v })} />)}
      </div>
      <div className="row wrap">
        <Button disabled={!Object.values(esf).some((v) => v) || (tipo === 'faixa' && (alt === undefined || ate === undefined || ate <= alt))} onClick={() => {
          const e = dist ? { N: esf.N, Hx: esf.Hx, Hy: esf.Hy } : esf;
          exec('carga.pilar', { pilar: p0.id, pavimento: pav.id, caso, ...(tipo !== 'concentrada' ? { tipo } : {}), ...(eixos === 'local' ? { eixos } : {}), ...(alt !== undefined && tipo !== 'uniforme' ? { altura: alt } : {}), ...(tipo === 'faixa' && ate !== undefined ? { ate } : {}), ...e });
          setEsf(VAZIA);
        }}>Adicionar carga no lance</Button>
      </div>
      <Hint>Concentrada no topo do lance de {pav.nome} ou a uma altura da base (com torção T); uniforme em todo o lance ou em faixa (por metro). Entra no pórtico espacial como ação do caso escolhido; com carga horizontal ao longo do lance, o pilar é verificado também nas seções intermediárias.</Hint>
    </>
  );
}

const TIPO_TXT = { concentrada: 'concentrada', uniforme: 'uniforme', faixa: 'em faixa' } as const;
const MOLAS = [['kx', 'kx', 'kN/m'], ['ky', 'ky', 'kN/m'], ['kz', 'kz', 'kN/m'], ['krx', 'kθx', 'kN·m/rad'], ['kry', 'kθy', 'kN·m/rad'], ['krz', 'kθz', 'kN·m/rad']] as const;

/** Vínculo externo da base, cota própria do pé e travamento intermediário do lance (N2c). */
function VinculoExterno({ b, pilares, pav, doLance }: { b: BuildingModel; pilares: Pilar[]; pav: { id: string; nome: string }; doLance: boolean }) {
  const { exec } = useBuilding();
  const p0 = pilares[0], ids = pilares.map((p) => p.id), naFundacao = pilares.every((p) => p.nasce === 'fundacao');
  const vb: VinculoBasePilar = p0.vinculoBase ?? { tipo: 'engaste' };
  const ap = p0.apoiosIntermediarios?.find((x) => x.pavimento === pav.id);
  const tr = doLance ? travamentoNoTopo(b, p0, pav.id) : null;
  return (
    <div data-vinculo-externo>
      {naFundacao && (<>
        <div className="row wrap">
          <Select label="Vínculo da base" value={vb.tipo} options={[{ v: 'engaste' as const, label: 'engaste' }, { v: 'rotula' as const, label: 'rótula' }, { v: 'molas' as const, label: 'molas' }]}
            onChange={(t) => exec('pilar.vinculo', { ids, base: t === 'molas' ? { tipo: 'molas', krx: 0, kry: 0 } : { tipo: t } })} />
          <OptNumField label="Cota da base (vazio = fundação)" unit="m" width={170} value={p0.cotaBase} onChange={(v) => exec('pilar.vinculo', { ids, ...(v === undefined ? { cotaFundacao: true } : { cotaBase: v }) })} />
        </div>
        {vb.tipo === 'molas' && (
          <div className="row wrap">
            {MOLAS.map(([k, rot, un]) => <OptNumField key={k} label={rot} unit={un} width={110} value={vb[k]} onChange={(v) => { const nv: VinculoBasePilar = { ...vb }; if (v === undefined) delete nv[k]; else nv[k] = v; exec('pilar.vinculo', { ids, base: nv }); }} />)}
          </div>
        )}
      </>)}
      <div className="row wrap">
        <OptNumField label={`Travamento intermediário no lance de ${pav.nome}`} unit="m da base" width={210} value={ap?.altura} onChange={(v) => exec('pilar.vinculo', { ids, apoio: { pavimento: pav.id, altura: v ?? 0, ...(ap?.direcao ? { direcao: ap.direcao } : {}) } })} />
        {ap && <Select label="Direção" value={ap.direcao ?? 'ambas'} options={[{ v: 'ambas', label: 'b e h' }, { v: 'u', label: 'b (u)' }, { v: 'v', label: 'h (v)' }]} onChange={(d) => exec('pilar.vinculo', { ids, apoio: { pavimento: pav.id, altura: ap.altura, ...(d !== 'ambas' ? { direcao: d } : {}) } })} />}
      </div>
      <Hint>Molas em eixos globais: gdl vazio fica preso, 0 = livre (rótula). Cota da base: pé do pilar em cota própria (desnível). O travamento intermediário divide o lance para a flambagem.{tr ? ` Topo do lance ${tr[0] && tr[1] ? 'travado nas duas direções' : tr[0] ? 'travado só na direção b' : tr[1] ? 'travado só na direção h' : 'sem travamento (lance desligado: soma-se ao de cima na flambagem)'}.` : ''}</Hint>
    </div>
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
        <VinculoExterno b={b} pilares={pilares} pav={pav} doLance={!!doLance} />
        <div className="row wrap">
          <NumField label="α flambagem (b)" width={110} value={fl0?.au ?? 1} onChange={(v) => exec('pilar.flambagem', { ids: pilares.map((p) => p.id), pavimentos: [pav.id], au: v })} disabled={!doLance} />
          <NumField label="α flambagem (h)" width={110} value={fl0?.av ?? 1} onChange={(v) => exec('pilar.flambagem', { ids: pilares.map((p) => p.id), pavimentos: [pav.id], av: v })} disabled={!doLance} />
          <NumField label={`α do pavimento ${pav.nome}`} width={130} value={pav.alfaFlambagem ?? 1} onChange={(v) => exec('pavimento.editar', { id: pav.id, alfaFlambagem: v })} />
          <NumField label="Cobrimento" unit="cm" width={100} value={p0.cobrimento ?? b.norma.cobrimento.pilar} onChange={(v) => lote(pilares.map((p) => ({ nome: 'pilar.editar', params: { id: p.id, cobrimento: v === b.norma.cobrimento.pilar ? 0 : v } })))} />
        </div>
        {le && <Hint>ℓe = mín(ℓ0 + h; ℓ) × α (NBR 6118, 15.6): {fmt(le.leU)} m (b) e {fmt(le.leV)} m (h), com ℓ = {fmt(le.l)} m e ℓ0 = {fmt(le.l0)} m.{le.desligados[0] > 1 || le.desligados[1] > 1 ? ` Lances desligados somados: ${le.desligados[0]} (b) e ${le.desligados[1]} (h).` : ''}{le.apoio !== undefined ? ` Travamento intermediário a ${fmt(le.apoio)} m.` : ''} Pilar destravado em vários pavimentos: α &gt; 1 ou a soma automática dos lances desligados (opções).</Hint>}
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
        <SecaoDaViga b={b} vigas={vigas} />
        {vigas.length === 1 && pav && (() => {
          const pavG = ps.find((p) => p.grupo === v0.grupo) ?? pav;
          const apoios = b.pilares.filter((p) => lancesDoPilar(b, p).some((x) => x.id === pavG.id) && vigaTocaPilar(v0, p, pavG.id));
          const art = new Set(v0.articulacoes ?? []);
          // N2e (K1.9.41): vigas do grupo que cruzam esta (o eixo de uma toca o traçado da outra)
          const cruzadas = b.vigas.filter((q) => q.id !== v0.id && q.grupo === v0.grupo && cruza(v0, q));
          if (!apoios.length && !cruzadas.length) return null;
          return (
            <div className="row wrap" data-rotulas>
              <span className="muted small">Rótula na viga sobre:</span>
              {apoios.map((p) => <Check key={p.id} label={p.nome} checked={art.has(p.id)} onChange={(c) => exec('viga.editar', { id: v0.id, articulacoes: c ? [...art, p.id] : [...art].filter((x) => x !== p.id) })} />)}
              {cruzadas.map((q) => <Check key={q.id} label={`cruzamento com ${q.nome}`} checked={art.has(q.id)} onChange={(c) => exec('viga.editar', { id: v0.id, articulacoes: c ? [...art, q.id] : [...art].filter((x) => x !== q.id) })} />)}
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
        {lajes.some((l) => l.tipo.tipo === 'trelicada') && (
          <div className="row wrap">
            <Check label="Vigotas biapoiadas (sem continuidade nas bordas)" checked={lajes.filter((l) => l.tipo.tipo === 'trelicada').every((l) => !!l.vigotasBiapoiadas)}
              onChange={(c) => lote(lajes.filter((l) => l.tipo.tipo === 'trelicada').map((l) => ({ nome: 'laje.editar', params: { id: l.id, vigotasBiapoiadas: c } })))} />
          </div>
        )}
        <Hint>Bordas numeradas a partir do primeiro vértice do contorno, no sentido anti-horário. Bordas que tocam pilares ficam sempre engastadas.</Hint>
      </>)}
    </Group>
  );
}
