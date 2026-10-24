// Fichas das lajes alveolares (frente E3e), dentro do grupo "Tipos de laje": biblioteca da obra (criar, copiar, editar, remover),
// fichas do catálogo e de exemplo (somente leitura), placas com geometria, positivo, serviço, cortante e negativos, arquivo .json
// e biblioteca do usuário. O dado de ficha é do fabricante: o programa só confere a coerência lógica. Comando: `ficha.alveolar`.
import { useEffect, useState } from 'react';
import {
  exportarFichasAlveolares, fichasAlveolaresDisponiveis, importarFichasAlveolares, MARCA_FABRICANTE_ALVEOLAR, resistenciasPorMetro, validarFichaAlveolar,
  type FichaAlveolar, type NegativoPlaca, type PlacaAlveolar,
} from '../../core/building/alveolares';
import type { BuildingModel } from '../../core/building/types';
import { Button, FilePick, Hint, NumField, OptNumField, Pill, Seg, Select, TextField, download } from '../ui';
import { deleteFromLibrary, listLibrary, loadFromLibrary, saveToLibrary, type LibraryItem } from '../storage';
import { useStore } from '../store';
import { useBuilding } from './store';

type Aba = 'geometria' | 'positivo' | 'servico' | 'cortante' | 'negativos' | 'resumo';
const ABAS: { v: Aba; label: string }[] = [
  { v: 'geometria', label: 'Geometria' }, { v: 'positivo', label: 'Positivo' }, { v: 'servico', label: 'Serviço' },
  { v: 'cortante', label: 'Cortante' }, { v: 'negativos', label: 'Negativos' }, { v: 'resumo', label: 'Resumo' },
];
const FONTE_ROTULO = { obra: 'da obra', catalogo: 'catálogo interno', exemplo: 'exemplo fictício' } as const;
const cm = (m: number) => +(m * 100).toFixed(2);
const f2 = (x: number | undefined) => (x === undefined ? '—' : String(+x.toFixed(3)).replace('.', ','));
const limpo = <T,>(t: T): T => JSON.parse(JSON.stringify(t)) as T;
const marcaDe = (f: FichaAlveolar) => (f.ficticio ? 'ficha fictícia (demonstração)' : f.origem === 'fabricante' ? MARCA_FABRICANTE_ALVEOLAR : 'ficha do usuário, não verificada pelo programa');
const NEGATIVO_NOVO: NegativoPlaca = { phi: 10, s: 0.2, Mu: 20 };

export function FichasAlveolaresUI({ b, roda }: { b: BuildingModel; roda: (n: string, p: Record<string, unknown>) => boolean }) {
  const [fid, setFid] = useState('');
  const [pid, setPid] = useState('');
  const [ni, setNi] = useState(0);
  const [aba, setAba] = useState<Aba>('geometria');
  const todas = fichasAlveolaresDisponiveis(b);
  const atual = todas.find((x) => x.ficha.id === fid) ?? todas[0];
  const ficha = atual.ficha;
  const editavel = atual.fonte === 'obra' && ficha.origem !== 'fabricante';
  const placa: PlacaAlveolar = ficha.placas.find((p) => p.id === pid) ?? ficha.placas[0];
  const v = validarFichaAlveolar(ficha);
  const sufixo = ficha.base === 'placa' ? 'por placa' : 'por metro';
  const salvar = (nova: FichaAlveolar) => {
    const { id: _id, origem: _origem, ...resto } = limpo(nova);
    return roda('ficha.alveolar', { acao: 'editar', id: ficha.id, ficha: resto });
  };
  const mudaFicha = (patch: Partial<FichaAlveolar>) => salvar({ ...limpo(ficha), ...patch });
  const mudaPlaca = (patch: Partial<PlacaAlveolar>) => {
    if (patch.id) setPid(patch.id);
    return mudaFicha({ placas: ficha.placas.map((p) => (p.id === placa.id ? { ...limpo(p), ...patch } : limpo(p))) });
  };
  const negs = placa.negativos ?? [];
  const neg = negs[Math.min(ni, Math.max(0, negs.length - 1))];
  const mudaNeg = (patch: Partial<NegativoPlaca>) => mudaPlaca({ negativos: negs.map((n) => (n === neg ? { ...n, ...patch } : n)) });
  const nova = () => {
    const id = `fa_${(b.tiposLaje?.alveolares ?? []).length + 1}_n`;
    if (roda('ficha.alveolar', { acao: 'criar', id, ficha: { nome: 'Nova ficha alveolar', base: 'metro', placas: [{ id: 'P1', altura: 0.25, capa: 0.05, largura: 1.2, larguraMin: 0.3, apoioMin: 0.07, apoioMax: 0.15, pesoM2: 2.8 }] } })) { setFid(id); setPid(''); }
  };
  const copiar = () => {
    const antes = new Set((b.tiposLaje?.alveolares ?? []).map((x) => x.id));
    if (roda('ficha.alveolar', { acao: 'copiar', de: ficha.id })) {
      const c = useBuilding.getState().sessao.modelo.tiposLaje?.alveolares?.find((x) => !antes.has(x.id));
      if (c) { setFid(c.id); setPid(''); }
    }
  };
  const novaPlaca = () => {
    const id = `P${ficha.placas.length + 1}`;
    if (mudaFicha({ placas: [...limpo(ficha.placas), { ...limpo(placa), id }] })) setPid(id);
  };
  const resumo = resistenciasPorMetro(ficha, placa);
  const pp = placa.pesoM2 + 25 * (placa.volume ?? placa.capa);
  const abaVis: Aba = editavel ? aba : 'resumo';
  return (
    <div data-fichas-alveolares>
      <p className="small"><b>Fichas das lajes alveolares</b></p>
      <div className="row wrap">
        <Select label="Ficha alveolar da biblioteca" value={ficha.id} options={todas.map((x) => ({ v: x.ficha.id, label: `${x.ficha.nome} · ${FONTE_ROTULO[x.fonte]}` }))} onChange={(x) => { setFid(x); setPid(''); }} />
        <Select label="Placa da ficha alveolar" value={placa.id} options={ficha.placas.map((p) => ({ v: p.id, label: `${p.id} · h ${cm(p.altura)} cm` }))} onChange={(x) => { setPid(x); setNi(0); }} />
      </div>
      <p className="small" data-selos-alveolar>
        <Pill tone={editavel ? 'ok' : 'na'}>{editavel ? 'editável' : 'somente leitura'}</Pill>
        <Pill tone="warn">{marcaDe(ficha)}</Pill>
        {v.erros.length > 0 && <Pill tone="bad">{v.erros.length} erro(s) lógico(s)</Pill>}
        <span className="muted"> {ficha.fabricante ?? '—'} · resistências {sufixo}</span>
      </p>
      <div className="row wrap">
        <Button onClick={nova}>Nova ficha alveolar</Button>
        <Button onClick={copiar}>Copiar ficha alveolar</Button>
        <Button variant="danger" disabled={atual.fonte !== 'obra'} onClick={() => { if (roda('ficha.alveolar', { acao: 'remover', id: ficha.id })) { setFid(''); setPid(''); } }}>Remover ficha alveolar</Button>
        <Button disabled={!editavel} onClick={novaPlaca}>Nova placa alveolar</Button>
        <Button variant="danger" disabled={!editavel || ficha.placas.length < 2} onClick={() => { if (mudaFicha({ placas: ficha.placas.filter((p) => p.id !== placa.id) })) setPid(''); }}>Remover placa alveolar</Button>
      </div>
      {editavel ? <Seg small value={aba} options={ABAS.map((a) => ({ v: a.v, label: a.label }))} onChange={setAba} /> : <Hint>Ficha do catálogo ou de exemplo: somente leitura. Copie a ficha para editar os valores.</Hint>}

      {abaVis === 'geometria' && (
        <div data-aba-alveolar="geometria">
          <div className="row wrap">
            <TextField label="Nome da ficha alveolar" value={ficha.nome} onChange={(x) => x.trim() && mudaFicha({ nome: x.trim() })} />
            <TextField label="Fabricante da ficha alveolar" value={ficha.fabricante ?? ''} onChange={(x) => mudaFicha({ fabricante: x.trim() || undefined })} />
            <Select label="Base das resistências da ficha alveolar" value={ficha.base ?? 'metro'} options={[{ v: 'metro', label: 'por metro de largura' }, { v: 'placa', label: 'por placa' }]} onChange={(x) => mudaFicha({ base: x })} />
          </div>
          <div className="row wrap">
            <TextField label="Código da placa alveolar" value={placa.id} onChange={(x) => x.trim() && x.trim() !== placa.id && mudaPlaca({ id: x.trim() })} />
            <TextField label="Descrição da placa alveolar" value={placa.descricao ?? ''} onChange={(x) => mudaPlaca({ descricao: x.trim() || undefined })} />
          </div>
          <div className="row wrap">
            <NumField label="Altura total da placa alveolar" unit="cm" width={110} value={cm(placa.altura)} onChange={(x) => mudaPlaca({ altura: x / 100 })} />
            <NumField label="Capa da placa alveolar" unit="cm" width={110} value={cm(placa.capa)} onChange={(x) => mudaPlaca({ capa: x / 100 })} />
            <NumField label="Largura da placa alveolar" unit="cm" width={110} value={cm(placa.largura)} onChange={(x) => mudaPlaca({ largura: x / 100 })} />
            <NumField label="Largura mínima da placa alveolar cortada" unit="cm" width={110} value={cm(placa.larguraMin)} onChange={(x) => mudaPlaca({ larguraMin: x / 100 })} />
            <NumField label="Apoio mínimo da placa alveolar" unit="cm" width={110} value={cm(placa.apoioMin)} onChange={(x) => mudaPlaca({ apoioMin: x / 100 })} />
            <NumField label="Apoio máximo da placa alveolar" unit="cm" width={110} value={cm(placa.apoioMax)} onChange={(x) => mudaPlaca({ apoioMax: x / 100 })} />
            <NumField label="Peso da placa alveolar" unit="kN/m²" width={110} value={placa.pesoM2} onChange={(x) => mudaPlaca({ pesoM2: x })} />
            <OptNumField label="Volume moldado no local da placa alveolar" unit="m³/m²" width={130} value={placa.volume} onChange={(x) => mudaPlaca({ volume: x })} />
          </div>
        </div>
      )}
      {abaVis === 'positivo' && (
        <div className="row wrap" data-aba-alveolar="positivo">
          <NumField label="Mu positivo da placa alveolar" unit={`kN·m ${sufixo}`} width={130} value={placa.positivo?.Mu ?? 0} onChange={(x) => mudaPlaca({ positivo: x > 0 ? { ...placa.positivo, Mu: x } : undefined })} />
          <OptNumField label="Mfis positivo da placa alveolar" unit={`kN·m ${sufixo}`} width={130} value={placa.positivo?.Mfis} onChange={(x) => placa.positivo && mudaPlaca({ positivo: { ...placa.positivo, Mfis: x } })} />
          <OptNumField label="EI positivo da placa alveolar" unit={`kN·m² ${sufixo}`} width={130} value={placa.positivo?.EI} onChange={(x) => placa.positivo && mudaPlaca({ positivo: { ...placa.positivo, EI: x } })} />
          <OptNumField label="EI fissurado positivo da placa alveolar" unit={`kN·m² ${sufixo}`} width={130} value={placa.positivo?.EIfis} onChange={(x) => placa.positivo && mudaPlaca({ positivo: { ...placa.positivo, EIfis: x } })} />
        </div>
      )}
      {abaVis === 'servico' && (
        <div className="row wrap" data-aba-alveolar="servico">
          <OptNumField label="Momento de descompressão da placa alveolar" unit={`kN·m ${sufixo}`} width={140} value={placa.servico?.Mdesc} onChange={(x) => mudaPlaca({ servico: { ...placa.servico, Mdesc: x } })} />
          <OptNumField label="Momento de serviço, protensão parcial" unit={`kN·m ${sufixo}`} width={140} value={placa.servico?.Mparcial} onChange={(x) => mudaPlaca({ servico: { ...placa.servico, Mparcial: x } })} />
          <OptNumField label="Momento de serviço, protensão limitada" unit={`kN·m ${sufixo}`} width={140} value={placa.servico?.Mlimitada} onChange={(x) => mudaPlaca({ servico: { ...placa.servico, Mlimitada: x } })} />
          <OptNumField label="Momento de serviço, protensão completa" unit={`kN·m ${sufixo}`} width={140} value={placa.servico?.Mcompleta} onChange={(x) => mudaPlaca({ servico: { ...placa.servico, Mcompleta: x } })} />
        </div>
      )}
      {abaVis === 'cortante' && (
        <div className="row wrap" data-aba-alveolar="cortante">
          <OptNumField label="VRd da placa alveolar" unit={`kN ${sufixo}`} width={130} value={placa.VRd} onChange={(x) => mudaPlaca({ VRd: x })} />
          <OptNumField label="VRd da seção descomprimida da placa alveolar" unit={`kN ${sufixo}`} width={130} value={placa.VRdDesc} onChange={(x) => mudaPlaca({ VRdDesc: x })} />
        </div>
      )}
      {abaVis === 'negativos' && (
        <div data-aba-alveolar="negativos">
          <div className="row wrap">
            <Select label="Linha de negativo da placa alveolar" value={negs.length ? Math.min(ni, negs.length - 1) : -1} options={negs.length ? negs.map((n, i) => ({ v: i, label: `φ${f2(n.phi)} c/${cm(n.s)} · Mu ${f2(n.Mu)}` })) : [{ v: -1, label: '(sem linhas: calculado pela seção)' }]} onChange={setNi} />
            <Button onClick={() => { if (mudaPlaca({ negativos: [...negs, { ...NEGATIVO_NOVO, phi: 8 + negs.length * 2 }] })) setNi(negs.length); }}>Nova linha de negativo</Button>
            <Button variant="danger" disabled={!neg} onClick={() => { if (mudaPlaca({ negativos: negs.filter((n) => n !== neg) })) setNi(0); }}>Remover linha de negativo</Button>
          </div>
          {neg && (
            <div className="row wrap">
              <NumField label="φ do negativo da placa alveolar" unit="mm" width={100} value={neg.phi} onChange={(x) => mudaNeg({ phi: x })} />
              <NumField label="Espaçamento do negativo da placa alveolar" unit="cm" width={110} value={cm(neg.s)} onChange={(x) => mudaNeg({ s: x / 100 })} />
              <NumField label="Mu do negativo da placa alveolar" unit={`kN·m ${sufixo}`} width={130} value={neg.Mu} onChange={(x) => mudaNeg({ Mu: x })} />
              <OptNumField label="Mfis do negativo da placa alveolar" unit={`kN·m ${sufixo}`} width={130} value={neg.Mfis} onChange={(x) => mudaNeg({ Mfis: x })} />
              <OptNumField label="EI do negativo da placa alveolar" unit={`kN·m² ${sufixo}`} width={130} value={neg.EI} onChange={(x) => mudaNeg({ EI: x })} />
              <OptNumField label="EI fissurado do negativo da placa alveolar" unit={`kN·m² ${sufixo}`} width={130} value={neg.EIfis} onChange={(x) => mudaNeg({ EIfis: x })} />
              <OptNumField label="VRd do negativo da placa alveolar" unit={`kN ${sufixo}`} width={130} value={neg.VRd} onChange={(x) => mudaNeg({ VRd: x })} />
            </div>
          )}
          <div className="row wrap">
            <OptNumField label="Espessura do banzo inferior da placa alveolar" unit="m" width={140} value={placa.hfInf} onChange={(x) => mudaPlaca({ hfInf: x })} />
            <OptNumField label="Soma das almas por metro da placa alveolar" unit="m/m" width={140} value={placa.bwAlma} onChange={(x) => mudaPlaca({ bwAlma: x })} />
          </div>
        </div>
      )}
      {abaVis === 'resumo' && (
        <div data-aba-alveolar="resumo">
          <table className="data quadro" data-resumo-alveolar>
            <tbody>
              <tr><td className="l">Marca da ficha</td><td data-marca-alveolar>{marcaDe(ficha)}</td></tr>
              <tr><td className="l">Altura total / capa (cm)</td><td>{f2(cm(placa.altura))} / {f2(cm(placa.capa))}</td></tr>
              <tr><td className="l">Largura padrão / mínima (cm)</td><td>{f2(cm(placa.largura))} / {f2(cm(placa.larguraMin))}</td></tr>
              <tr><td className="l">Apoio mínimo / máximo (cm)</td><td>{f2(cm(placa.apoioMin))} / {f2(cm(placa.apoioMax))}</td></tr>
              <tr><td className="l">Peso próprio da laje (kN/m²)</td><td data-pp-alveolar>{f2(pp)}</td></tr>
              <tr><td className="l">Mu positivo (kN·m/m)</td><td>{f2(resumo.Mu)}</td></tr>
              <tr><td className="l">VRd (kN/m)</td><td>{f2(resumo.VRd)}</td></tr>
              <tr><td className="l">Linhas de negativo</td><td>{resumo.negativos.length}</td></tr>
            </tbody>
          </table>
        </div>
      )}
      {v.erros.length > 0 && <p className="small bad" role="alert" data-erros-alveolar>{v.erros.join(' ')}</p>}
      {v.avisos.length > 0 && <p className="small muted" data-avisos-alveolar>{v.avisos.join(' ')}</p>}
      <ArquivoAlveolares b={b} roda={roda} />
      <BibliotecaAlveolares b={b} roda={roda} />
    </div>
  );
}

function ArquivoAlveolares({ b, roda }: { b: BuildingModel; roda: (n: string, p: Record<string, unknown>) => boolean }) {
  const importar = async (f: File) => {
    const texto = await f.text();
    const r = importarFichasAlveolares(texto);
    if (!r.ok) { useStore.getState().set({ message: r.erros.join(' ') }); return; }
    if (roda('ficha.alveolar', { acao: 'importar', texto, substituir: true })) useStore.getState().set({ message: `${r.fichas.length} ficha(s) alveolar(es) importada(s).` });
  };
  return (
    <div className="row wrap">
      <Button disabled={!b.tiposLaje?.alveolares?.length} onClick={() => { void download('fichas-alveolares.json', exportarFichasAlveolares(b), 'application/json'); }}>Exportar fichas alveolares</Button>
      <FilePick label="Importar JSON de fichas alveolares" accept=".json,application/json" onFile={(f) => { void importar(f); }} />
    </div>
  );
}

function BibliotecaAlveolares({ b, roda }: { b: BuildingModel; roda: (n: string, p: Record<string, unknown>) => boolean }) {
  const [itens, setItens] = useState<LibraryItem[]>([]);
  const [sel, setSel] = useState('');
  const [nome, setNome] = useState('');
  const [aviso, setAviso] = useState('');
  const recarregar = () => listLibrary().then((r) => setItens(r.items.filter((i) => i.kind === 'fichasAlveolares'))).catch(() => {});
  useEffect(() => { recarregar(); }, []);
  const gravar = async () => {
    try {
      const arq = JSON.parse(exportarFichasAlveolares(b));
      await saveToLibrary('fichasAlveolares', nome.trim(), `${arq.fichas.length} ficha(s) alveolar(es)`, arq);
      setNome(''); recarregar(); setAviso(`Fichas alveolares “${nome.trim()}” gravadas.`);
    } catch (e) { setAviso((e as Error).message); }
  };
  const trazer = async () => {
    const e = sel ? await loadFromLibrary(sel) : null;
    if (!e) { setAviso('Documento não encontrado na biblioteca.'); return; }
    if (roda('ficha.alveolar', { acao: 'importar', texto: JSON.stringify(e.payload), substituir: true })) setAviso(`“${e.name}” trazida para a obra.`);
  };
  return (
    <details className="small" data-biblioteca-alveolares>
      <summary>Biblioteca de fichas alveolares</summary>
      <div className="row wrap">
        <TextField label="Nome na biblioteca de fichas alveolares" value={nome} onChange={setNome} />
        <Button disabled={!nome.trim() || !b.tiposLaje?.alveolares?.length} onClick={gravar}>Gravar fichas alveolares da obra</Button>
      </div>
      <div className="row wrap">
        <Select label="Fichas alveolares gravadas" value={sel} options={[{ v: '', label: itens.length ? '— escolha —' : '(vazia)' }, ...itens.map((i) => ({ v: i.id, label: `${i.name} · ${i.summary}` }))]} onChange={setSel} />
        <Button disabled={!sel} onClick={trazer}>Trazer fichas alveolares para a obra</Button>
        <Button variant="danger" disabled={!sel} onClick={async () => { await deleteFromLibrary(sel); setSel(''); recarregar(); }}>Excluir da biblioteca de fichas alveolares</Button>
      </div>
      {aviso && <span className="hint" data-aviso-biblioteca-alveolares>{aviso}</span>}
      <Hint>Grava as fichas alveolares da obra para reutilizar em outras obras (arquivo versionado, o mesmo do botão Exportar).</Hint>
    </details>
  );
}
