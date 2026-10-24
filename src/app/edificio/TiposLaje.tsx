// Grupo "Tipos de laje" da barra lateral (frente E3a): fichas de vigotas (armada, protendida, moldada e treliçada),
// enchimentos, tipos genéricos por geometria, importação e exportação em JSON e biblioteca do usuário. O dado de ficha
// é do fabricante: o programa só confere a coerência lógica (erros em vermelho, avisos de campos recomendados).
import { useEffect, useState } from 'react';
import {
  enchimentoPorOuExemplo, ENCHIMENTOS_EXEMPLO, enchimentosDisponiveis, exportarTiposLaje, FAMILIAS_VIGOTA, fichasDisponiveis, geometriaNervurada, importarTiposLaje,
  MARCA_FABRICANTE, MATERIAIS_ENCHIMENTO, muPorMetro, trelicasDe, validarFicha, type Enchimento, type FamiliaVigota, type FichaVigota, type MaterialEnchimento, type SerieFicha,
} from '../../core/building/tiposLaje';
import type { BuildingModel } from '../../core/building/types';
import { Button, FilePick, Group, Hint, NumField, OptNumField, Pill, Seg, Select, TextField, download } from '../ui';
import { deleteFromLibrary, listLibrary, loadFromLibrary, saveToLibrary, type LibraryItem } from '../storage';
import { useStore } from '../store';
import { useBuilding } from './store';
import { FichasAlveolaresUI } from './FichasAlveolares';
import { FormasLajeUI } from './FormasLaje';

type Aba = 'geometria' | 'positivo' | 'negativo' | 'cortante' | 'protensao' | 'resumo';
const ABAS: { v: Aba; label: string }[] = [
  { v: 'geometria', label: 'Geometria' }, { v: 'positivo', label: 'Positivo' }, { v: 'negativo', label: 'Negativo' },
  { v: 'cortante', label: 'Cortante' }, { v: 'protensao', label: 'Protensão' }, { v: 'resumo', label: 'Resumo' },
];
const FONTE_ROTULO = { obra: 'da obra', catalogo: 'catálogo interno', exemplo: 'exemplo fictício' } as const;
const cm = (m: number) => +(m * 100).toFixed(2);
const clone = <T,>(t: T): T => JSON.parse(JSON.stringify(t)) as T;
const f2 = (x: number | undefined) => (x === undefined ? '—' : String(+x.toFixed(3)).replace('.', ','));

export function TiposLajeGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [fid, setFid] = useState('cat:trelicadas');
  const [sid, setSid] = useState('');
  const [aba, setAba] = useState<Aba>('geometria');
  const [eid, setEid] = useState('');
  const [msg, setMsg] = useState<string[]>([]);
  const todas = fichasDisponiveis(b);
  const atual = todas.find((x) => x.ficha.id === fid) ?? todas[0];
  const ficha = atual.ficha;
  const editavel = atual.fonte === 'obra' && ficha.origem !== 'fabricante';
  const serie: SerieFicha = ficha.series.find((s) => s.id === sid) ?? ficha.series[0];
  const v = validarFicha(ficha, b);
  const ench = enchimentosDisponiveis(b);
  const enchOpcoes = [...ench, ...ENCHIMENTOS_EXEMPLO.filter((e) => !ench.some((x) => x.id === e.id))];
  const trelicas = Object.keys(trelicasDe(b));
  const roda = (nome: string, params: Record<string, unknown>) => { const r = exec(nome, params); setMsg(r.ok ? [] : r.erros.map((e) => e.mensagem)); return r.ok; };

  const salvar = (nova: FichaVigota) => roda('tipoLaje.ficha', { acao: 'editar', id: ficha.id, ficha: nova });
  const mudaFicha = (patch: Partial<FichaVigota>) => salvar({ ...clone(ficha), ...patch });
  const mudaSerie = (patch: Partial<SerieFicha>) => {
    const nova = clone(ficha);
    nova.series = nova.series.map((s) => (s.id === serie.id ? { ...s, ...patch } : s));
    if (patch.id) setSid(patch.id);
    salvar(nova);
  };
  const mudaBloco = <K extends 'positivo' | 'negativo' | 'cortante' | 'protensao'>(k: K, base: NonNullable<SerieFicha[K]>, patch: Partial<NonNullable<SerieFicha[K]>>) => mudaSerie({ [k]: { ...(serie[k] ?? base), ...patch } } as Partial<SerieFicha>);
  const novaSerie = () => {
    const nova = clone(ficha), id = `S${nova.series.length + 1}`;
    nova.series.push({ ...clone(serie), id });
    if (salvar(nova)) setSid(id);
  };
  const removeSerie = () => { const nova = clone(ficha); nova.series = nova.series.filter((s) => s.id !== serie.id); setSid(''); salvar(nova); };
  const copiar = () => {
    const antes = new Set((b.tiposLaje?.fichas ?? []).map((f) => f.id));
    if (roda('tipoLaje.ficha', { acao: 'copiar', de: ficha.id })) {
      const nova = useBuilding.getState().sessao.modelo.tiposLaje?.fichas?.find((f) => !antes.has(f.id));
      if (nova) { setFid(nova.id); setSid(''); }
    }
  };
  const porGeometria = () => {
    const id = `geo_${(b.tiposLaje?.fichas ?? []).length + 1}`;
    if (roda('tipoLaje.ficha', { acao: 'criar', geometria: { id, nome: `Genérica ${(b.tiposLaje?.fichas ?? []).length + 1}`, familia: 'armada', capa: 0.04, hEnch: 0.12, intereixo: 0.5, bwMin: 0.1, enchimento: 'eps', trelica: 'TR 12645' } })) { setFid(id); setSid(''); }
  };
  const remover = () => { if (roda('tipoLaje.ficha', { acao: 'remover', id: ficha.id })) { setFid('cat:trelicadas'); setSid(''); } };

  const g = geometriaNervurada({ ...b, tiposLaje: { ...b.tiposLaje, fichas: [ficha, ...(b.tiposLaje?.fichas ?? []).filter((f) => f.id !== ficha.id)] } }, { tipo: 'vigotas', ficha: ficha.id, serie: serie.id });
  const pos = serie.positivo, neg = serie.negativo, cor = serie.cortante, pro = serie.protensao;
  const so = !editavel;

  return (
    <div data-grupo-tipos-laje>
      <Group title={`Tipos de laje${(b.tiposLaje?.fichas?.length ?? 0) + (b.tiposLaje?.enchimentos?.length ?? 0) + (b.tiposLaje?.formas?.length ?? 0) ? ` (${b.tiposLaje?.fichas?.length ?? 0} ficha(s), ${b.tiposLaje?.enchimentos?.length ?? 0} enchimento(s), ${b.tiposLaje?.formas?.length ?? 0} forma(s))` : ''}`} open={false}>
        <div className="row wrap">
          <Select label="Ficha de vigotas" value={ficha.id} options={todas.map((x) => ({ v: x.ficha.id, label: `${x.ficha.nome} · ${FONTE_ROTULO[x.fonte]}` }))} onChange={(x) => { setFid(x); setSid(''); }} />
          <Select label="Laje da série" value={serie.id} options={ficha.series.map((s) => ({ v: s.id, label: `${s.id} · h ${cm(s.altura)} · i ${cm(s.intereixo)}${s.tipo ? ` · ${s.tipo}` : ''}` }))} onChange={setSid} />
        </div>
        <p className="small" data-selos-ficha>
          <Pill tone={editavel ? 'ok' : 'na'}>{editavel ? 'editável' : 'somente leitura'}</Pill>
          {ficha.origem === 'fabricante' && <Pill tone="warn">{ficha.ficticio ? 'fictícia' : 'fabricante'}</Pill>}
          {ficha.origem === 'geometria' && <Pill tone="ok">genérica por geometria</Pill>}
          {v.erros.length > 0 && <Pill tone="bad">{v.erros.length} erro(s) lógico(s)</Pill>}
          <span className="muted"> {FAMILIAS_VIGOTA.find((x) => x.v === ficha.familia)?.rotulo}{ficha.fabricante ? ` · ${ficha.fabricante}` : ''}</span>
        </p>
        <div className="row wrap">
          <Button onClick={copiar}>Copiar ficha</Button>
          <Button onClick={porGeometria}>Nova ficha por geometria</Button>
          <Button variant="danger" disabled={atual.fonte !== 'obra'} onClick={remover}>Remover ficha</Button>
        </div>
        <Seg small value={aba} options={ABAS.map((a) => ({ v: a.v, label: a.label }))} onChange={setAba} />

        {aba === 'geometria' && (
          <div data-aba-ficha="geometria">
            <div className="row wrap">
              <TextField label="Nome da ficha" value={ficha.nome} disabled={so} onChange={(x) => x.trim() && mudaFicha({ nome: x.trim() })} />
              <TextField label="Fabricante da ficha" value={ficha.fabricante ?? ''} disabled={so} onChange={(x) => mudaFicha({ fabricante: x.trim() || undefined })} />
              <TextField label="Referência da ficha" value={ficha.referencia ?? ''} disabled={so} onChange={(x) => mudaFicha({ referencia: x.trim() || undefined })} />
              <Select label="Família da vigota" value={ficha.familia} disabled={so} options={FAMILIAS_VIGOTA.map((x) => ({ v: x.v, label: x.rotulo }))} onChange={(x: FamiliaVigota) => mudaFicha({ familia: x })} />
            </div>
            <div className="row wrap">
              <TextField label="Identificador da laje da série" value={serie.id} disabled={so} onChange={(x) => x.trim() && mudaSerie({ id: x.trim() })} />
              <TextField label="Tipo da vigota" value={serie.tipo ?? ''} disabled={so} onChange={(x) => mudaSerie({ tipo: x.trim() || undefined })} />
              <NumField label="Altura total" unit="cm" width={90} disabled={so} value={cm(serie.altura)} onChange={(x) => mudaSerie({ altura: x / 100 })} />
              <NumField label="Intereixo" unit="cm" width={90} disabled={so} value={cm(serie.intereixo)} onChange={(x) => mudaSerie({ intereixo: x / 100 })} />
              <NumField label="Capa da série" unit="cm" width={90} disabled={so} value={cm(serie.capa)} onChange={(x) => mudaSerie({ capa: x / 100 })} />
              <NumField label="Altura do enchimento" unit="cm" width={90} disabled={so} value={cm(serie.hEnch)} onChange={(x) => mudaSerie({ hEnch: x / 100 })} />
              <NumField label="Largura mínima da nervura" unit="cm" width={90} disabled={so} value={cm(serie.bwMin)} onChange={(x) => mudaSerie({ bwMin: x / 100 })} />
            </div>
            <div className="row wrap">
              <Select label="Enchimento da série" value={serie.enchimento} disabled={so} options={enchOpcoes.map((e) => ({ v: e.id, label: e.nome }))} onChange={(x) => mudaSerie({ enchimento: x })} />
              <Select label="Treliça da série" value={serie.trelica ?? ''} disabled={so} options={[{ v: '', label: '— sem treliça —' }, ...trelicas.map((t) => ({ v: t, label: t }))]} onChange={(x) => mudaSerie({ trelica: x || undefined })} />
              <OptNumField label="Peso por m² informado" unit="kN/m²" width={110} value={serie.pesoM2} onChange={(x) => mudaSerie({ pesoM2: x })} />
              <NumField label="Acréscimo de largura da nervura" unit="cm" width={110} disabled={so} value={cm(ficha.bwExtra ?? 0)} onChange={(x) => mudaFicha({ bwExtra: x > 0 ? x / 100 : undefined })} />
            </div>
            <div className="row wrap">
              <Select label="Vigotas lado a lado (máximo da ficha)" value={ficha.multipla?.n ?? 1} disabled={so} options={[{ v: 1, label: 'simples' }, { v: 2, label: 'dupla' }, { v: 3, label: 'tripla' }]}
                onChange={(x) => mudaFicha({ multipla: x === 1 ? undefined : { n: x as 2 | 3, larguraVigota: ficha.multipla?.larguraVigota ?? 0.12 } })} />
              {ficha.multipla && <NumField label="Largura da vigota" unit="cm" width={90} disabled={so} value={cm(ficha.multipla.larguraVigota)} onChange={(x) => mudaFicha({ multipla: { n: ficha.multipla!.n, larguraVigota: x / 100 } })} />}
              <OptNumField label="Relação EI fissurado/total da ficha" width={140} value={ficha.relacaoFis} onChange={(x) => mudaFicha({ relacaoFis: x })} />
            </div>
            <div className="row wrap">
              <Button disabled={so} onClick={novaSerie}>Adicionar laje à série</Button>
              <Button variant="danger" disabled={so || ficha.series.length < 2} onClick={removeSerie}>Remover laje da série</Button>
            </div>
          </div>
        )}

        {aba === 'positivo' && (
          <div className="row wrap" data-aba-ficha="positivo">
            <NumField label="Mu positivo" unit="kN·m" width={100} disabled={so} value={pos?.Mu ?? 0} onChange={(x) => mudaBloco('positivo', { Mu: 0, Mfis: 0 }, { Mu: x })} />
            <NumField label="Mfis positivo" unit="kN·m" width={100} disabled={so} value={pos?.Mfis ?? 0} onChange={(x) => mudaBloco('positivo', { Mu: 0, Mfis: 0 }, { Mfis: x })} />
            <OptNumField label="EI total positivo" unit="kN·m²" width={110} value={pos?.EI} onChange={(x) => mudaBloco('positivo', { Mu: 0, Mfis: 0 }, { EI: x })} />
            <OptNumField label="EI fissurado positivo" unit="kN·m²" width={110} value={pos?.EIfis} onChange={(x) => mudaBloco('positivo', { Mu: 0, Mfis: 0 }, { EIfis: x })} />
            <OptNumField label="GJ positivo" unit="kN·m²" width={110} value={pos?.GJ} onChange={(x) => mudaBloco('positivo', { Mu: 0, Mfis: 0 }, { GJ: x })} />
          </div>
        )}
        {aba === 'negativo' && (
          <div className="row wrap" data-aba-ficha="negativo">
            <NumField label="Mu negativo" unit="kN·m" width={100} disabled={so} value={neg?.Mu ?? 0} onChange={(x) => mudaBloco('negativo', { Mu: 0 }, { Mu: x })} />
            <OptNumField label="Mu negativo da seção maciça" unit="kN·m" width={120} value={neg?.MuMacico} onChange={(x) => mudaBloco('negativo', { Mu: 0 }, { MuMacico: x })} />
            <OptNumField label="Mfis negativo" unit="kN·m" width={100} value={neg?.Mfis} onChange={(x) => mudaBloco('negativo', { Mu: 0 }, { Mfis: x })} />
            <OptNumField label="EI total negativo" unit="kN·m²" width={110} value={neg?.EI} onChange={(x) => mudaBloco('negativo', { Mu: 0 }, { EI: x })} />
            <OptNumField label="EI fissurado negativo" unit="kN·m²" width={110} value={neg?.EIfis} onChange={(x) => mudaBloco('negativo', { Mu: 0 }, { EIfis: x })} />
          </div>
        )}
        {aba === 'cortante' && (
          <div className="row wrap" data-aba-ficha="cortante">
            <NumField label="VRd1 da ficha" unit="kN" width={100} disabled={so} value={cor?.VRd1 ?? 0} onChange={(x) => mudaBloco('cortante', { VRd1: 0 }, { VRd1: x })} />
            <OptNumField label="VRd1 acima da descompressão" unit="kN" width={130} value={cor?.VRd1Descomprimida} onChange={(x) => mudaBloco('cortante', { VRd1: 0 }, { VRd1Descomprimida: x })} />
          </div>
        )}
        {aba === 'protensao' && (
          <div className="row wrap" data-aba-ficha="protensao">
            <NumField label="Momento de descompressão" unit="kN·m" width={120} disabled={so} value={pro?.Mdesc ?? 0} onChange={(x) => mudaBloco('protensao', { Mdesc: 0 }, { Mdesc: x })} />
            <OptNumField label="Mserviço protensão parcial" unit="kN·m" width={120} value={pro?.Mparcial} onChange={(x) => mudaBloco('protensao', { Mdesc: 0 }, { Mparcial: x })} />
            <OptNumField label="Mserviço protensão limitada" unit="kN·m" width={120} value={pro?.Mlimitada} onChange={(x) => mudaBloco('protensao', { Mdesc: 0 }, { Mlimitada: x })} />
            <OptNumField label="Mserviço protensão completa" unit="kN·m" width={120} value={pro?.Mcompleta} onChange={(x) => mudaBloco('protensao', { Mdesc: 0 }, { Mcompleta: x })} />
          </div>
        )}
        {aba === 'resumo' && (
          <div data-aba-ficha="resumo">
            <table className="data quadro" data-resumo-ficha>
              <tbody>
                <tr><td className="l">Altura total / capa / enchimento (cm)</td><td>{cm(g.h)} / {cm(g.capa)} / {cm(g.hEnch)}</td></tr>
                <tr><td className="l">Intereixo / nervura / nervura na rigidez (cm)</td><td>{cm(g.intereixo)} / {cm(g.bw)} / {cm(g.bwRigidez)}</td></tr>
                <tr><td className="l">Peso próprio (kN/m²)</td><td data-pp-ficha>{f2(g.pp)}</td></tr>
                <tr><td className="l">Mu positivo por metro (kN·m/m)</td><td>{f2(muPorMetro(serie))}</td></tr>
                <tr><td className="l">EI total / fissurado (kN·m²)</td><td>{f2(pos?.EI)} / {f2(pos?.EIfis)}</td></tr>
                <tr><td className="l">Enchimento</td><td>{enchimentoPorOuExemplo(b, serie.enchimento)?.nome ?? '—'}</td></tr>
              </tbody>
            </table>
            <Hint>{MARCA_FABRICANTE}.{ficha.ficticio ? ' Ficha fictícia, só para demonstração.' : ''}</Hint>
          </div>
        )}
        {v.erros.length > 0 && <p className="small bad" role="alert" data-erros-ficha>{v.erros.join(' ')}</p>}
        {v.avisos.length > 0 && <p className="small muted" data-avisos-ficha>{v.avisos.join(' ')}</p>}
        {msg.length > 0 && <p className="small bad" role="alert" data-erros-tipos-laje>{msg.join(' ')}</p>}

        <EnchimentosUI b={b} eid={eid} setEid={setEid} roda={roda} />
        <FormasLajeUI b={b} roda={roda} />
        <FichasAlveolaresUI b={b} roda={roda} />
        <ArquivoTiposLaje b={b} roda={roda} setMsg={setMsg} />
        <BibliotecaTiposLaje b={b} roda={roda} />
        <Hint>Dados de ficha são do fabricante: o programa só confere a coerência lógica. Fichas de catálogo e de exemplo são copiadas para a obra ao atribuir; copie uma ficha para editá-la. O catálogo das treliçadas fica na biblioteca de normas.</Hint>
      </Group>
    </div>
  );
}

function EnchimentosUI({ b, eid, setEid, roda }: { b: BuildingModel; eid: string; setEid: (v: string) => void; roda: (n: string, p: Record<string, unknown>) => boolean }) {
  const lista = enchimentosDisponiveis(b);
  const e = lista.find((x) => x.id === eid) ?? lista[0];
  const daObra = !!b.tiposLaje?.enchimentos?.some((x) => x.id === e.id);
  const muda = (patch: Partial<Enchimento>) => roda('tipoLaje.enchimento', { acao: 'editar', id: e.id, enchimento: { ...clone(e), ...patch } });
  const novo = () => { if (roda('tipoLaje.enchimento', { acao: 'criar', id: `enc_${(b.tiposLaje?.enchimentos ?? []).length + 1}`, enchimento: { nome: 'Novo enchimento', material: 'generico', pesoM2: 0.5 } })) setEid(`enc_${(b.tiposLaje?.enchimentos ?? []).length + 1}`); };
  return (
    <div data-enchimentos>
      <div className="row wrap">
        <Select label="Enchimento da biblioteca" value={e.id} options={lista.map((x) => ({ v: x.id, label: `${x.nome}${b.tiposLaje?.enchimentos?.some((y) => y.id === x.id) ? '' : ' · catálogo'}` }))} onChange={setEid} />
        <Button onClick={novo}>Novo enchimento</Button>
        <Button onClick={() => roda('tipoLaje.enchimento', { acao: 'copiar', de: e.id })}>Copiar enchimento</Button>
        <Button variant="danger" disabled={!daObra} onClick={() => { if (roda('tipoLaje.enchimento', { acao: 'remover', id: e.id })) setEid(''); }}>Remover enchimento</Button>
      </div>
      {daObra && (
        <div className="row wrap">
          <TextField label="Nome do enchimento" value={e.nome} onChange={(x) => x.trim() && muda({ nome: x.trim() })} />
          <Select label="Material do enchimento" value={e.material} options={MATERIAIS_ENCHIMENTO.map((m) => ({ v: m.v, label: m.rotulo }))} onChange={(x: MaterialEnchimento) => muda({ material: x, gama: x === 'concreto' ? 25 : x === 'eps' ? 0.2 : undefined, pesoM2: x === 'generico' ? e.pesoM2 ?? 0.5 : undefined, pesoPeca: x === 'ceramica' ? e.pesoPeca ?? 0.07 : undefined, comprimentoPeca: x === 'ceramica' ? e.comprimentoPeca ?? 0.2 : undefined })} />
          {(e.material === 'concreto' || e.material === 'eps') && <NumField label="Peso específico do enchimento" unit="kN/m³" width={110} value={e.gama ?? 0} onChange={(x) => muda({ gama: x })} />}
          {e.material === 'ceramica' && <NumField label="Peso da peça cerâmica" unit="kN" width={110} value={e.pesoPeca ?? 0} onChange={(x) => muda({ pesoPeca: x })} />}
          {e.material === 'ceramica' && <NumField label="Comprimento da peça cerâmica" unit="m" width={110} value={e.comprimentoPeca ?? 0} onChange={(x) => muda({ comprimentoPeca: x })} />}
          {e.material === 'generico' && <NumField label="Peso do enchimento genérico" unit="kN/m²" width={110} value={e.pesoM2 ?? 0} onChange={(x) => muda({ pesoM2: x })} />}
        </div>
      )}
    </div>
  );
}

function ArquivoTiposLaje({ b, roda, setMsg }: { b: BuildingModel; roda: (n: string, p: Record<string, unknown>) => boolean; setMsg: (m: string[]) => void }) {
  const importar = async (f: File) => {
    const texto = await f.text();
    const r = importarTiposLaje(texto);
    if (!r.ok) { setMsg(r.erros); return; }
    if (roda('tipoLaje.importar', { texto, substituir: true })) useStore.getState().set({ message: `${r.fichas.length} ficha(s), ${r.enchimentos.length} enchimento(s) e ${r.formas.length} forma(s) importados.` });
  };
  return (
    <div className="row wrap">
      <Button onClick={() => { void download('tipos-laje.json', exportarTiposLaje(b), 'application/json'); }}>Exportar tipos de laje</Button>
      <FilePick label="Importar JSON de tipos de laje" accept=".json,application/json" onFile={(f) => { void importar(f); }} />
    </div>
  );
}

function BibliotecaTiposLaje({ b, roda }: { b: BuildingModel; roda: (n: string, p: Record<string, unknown>) => boolean }) {
  const [itens, setItens] = useState<LibraryItem[]>([]);
  const [sel, setSel] = useState('');
  const [nome, setNome] = useState('');
  const [aviso, setAviso] = useState('');
  const recarregar = () => listLibrary().then((r) => setItens(r.items.filter((i) => i.kind === 'tiposLaje'))).catch(() => {});
  useEffect(() => { recarregar(); }, []);
  const temAlgo = (b.tiposLaje?.fichas?.length ?? 0) + (b.tiposLaje?.enchimentos?.length ?? 0) + (b.tiposLaje?.formas?.length ?? 0) > 0;
  const gravar = async () => {
    try {
      const arq = JSON.parse(exportarTiposLaje(b));
      await saveToLibrary('tiposLaje', nome.trim(), `${arq.fichas.length} ficha(s), ${arq.enchimentos.length} enchimento(s), ${(arq.formas ?? []).length} forma(s)`, arq);
      setNome(''); recarregar(); setAviso(`Tipos de laje “${nome.trim()}” gravados.`);
    } catch (e) { setAviso((e as Error).message); }
  };
  const trazer = async () => {
    const e = sel ? await loadFromLibrary(sel) : null;
    if (!e) { setAviso('Documento não encontrado na biblioteca.'); return; }
    const r = importarTiposLaje(JSON.stringify(e.payload));
    if (!r.ok) { setAviso(r.erros.join(' ')); return; }
    if (roda('tipoLaje.importar', { texto: JSON.stringify(e.payload), substituir: true })) setAviso(`“${e.name}” trazida para a obra.`);
  };
  return (
    <details className="small" data-biblioteca-tipos-laje>
      <summary>Biblioteca de tipos de laje</summary>
      <div className="row wrap">
        <TextField label="Nome na biblioteca de tipos de laje" value={nome} onChange={setNome} />
        <Button disabled={!nome.trim() || !temAlgo} onClick={gravar}>Gravar tipos de laje da obra</Button>
      </div>
      <div className="row wrap">
        <Select label="Tipos de laje gravados" value={sel} options={[{ v: '', label: itens.length ? '— escolha —' : '(vazia)' }, ...itens.map((i) => ({ v: i.id, label: `${i.name} · ${i.summary}` }))]} onChange={setSel} />
        <Button disabled={!sel} onClick={trazer}>Trazer tipos de laje para a obra</Button>
        <Button variant="danger" disabled={!sel} onClick={async () => { await deleteFromLibrary(sel); setSel(''); recarregar(); }}>Excluir da biblioteca de tipos de laje</Button>
      </div>
      {aviso && <span className="hint" data-aviso-biblioteca-tipos-laje>{aviso}</span>}
      <Hint>Grava as fichas e os enchimentos da obra para reutilizar em outras obras (arquivo versionado, o mesmo do botão Exportar).</Hint>
    </details>
  );
}
