// Tipos de lance (E4a, interface): lista dos tipos da obra e predefinidos, criação, edição, cópia e remoção (tipo em uso é
// recusado pelo comando). Os campos seguem `TipoLance` em core/building/escadas.ts; a validação é a do comando.
import { useEffect, useState } from 'react';
import { Button, FilePick, Group, Hint, Note, NumField, OptNumField, Pill, Select, TextField, download } from '../ui';
import { TIPOLOGIAS, TIPOS_LANCE_PREDEFINIDOS, tipoLanceBloqueado, tipologiaInfo, type Tipologia, type TipoLance } from '../../core/building/escadas';
import { exportarTiposLance, lerBibliotecaTiposLance } from '../../core/building/escadasEdicao';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { BuildingModel } from '../../core/building/types';
import { deleteFromLibrary, listLibrary, loadFromLibrary, saveToLibrary, type LibraryItem } from '../storage';
import { useBuilding } from './store';

type Campos = Omit<TipoLance, 'id'>;
const lerTrechos = (t: string) => t.split(/[+;,\s]+/).filter(Boolean).map((x) => parseInt(x, 10));

function Editor({ t, aoSalvar, rotulo, bloqueado }: { t: Campos; aoSalvar: (t: Campos) => string[]; rotulo: string; bloqueado?: boolean }) {
  const [nome, setNome] = useState(t.nome), [tip, setTip] = useState<Tipologia>(t.tipologia), [trechos, setTrechos] = useState(t.trechos.join(' + '));
  const [esp, setEsp] = useState<number | undefined>(t.espessura), [des, setDes] = useState(t.desnivelInicial ?? 0), [ini, setIni] = useState(t.degrausIniciais ?? 0);
  const [poco, setPoco] = useState(t.poco ?? 0), [pat, setPat] = useState(t.degrausPatamar ?? 0), [msg, setMsg] = useState<string[]>([]);
  const salvar = () => setMsg(aoSalvar({
    nome, tipologia: tip, trechos: lerTrechos(trechos), ...(esp ? { espessura: esp } : {}), ...(des ? { desnivelInicial: des } : {}),
    ...(ini ? { degrausIniciais: ini } : {}), ...(poco ? { poco } : {}), ...(pat ? { degrausPatamar: pat } : {}),
  }));
  return (
    <div>
      <fieldset className="fs-livre" disabled={bloqueado}>
      <div className="row wrap u-items-end">
        <TextField label="Referência do tipo" value={nome} onChange={setNome} />
        <Select label="Tipologia" value={tip} options={TIPOLOGIAS.map((x) => ({ v: x.v, label: x.rotulo }))} onChange={setTip} />
        <TextField label="Degraus de cada trecho" value={trechos} onChange={setTrechos} />
        <OptNumField label="Espessura (vazio = vão/30)" unit="m" width={150} value={esp} onChange={setEsp} />
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Desnível no início do lance" unit="m" width={160} value={des} onChange={setDes} />
        <NumField label="Degraus iniciais sobre o piso" width={170} value={ini} onChange={(v) => setIni(Math.max(0, Math.round(v)))} />
        <NumField label="Degraus sobre o patamar" width={150} value={pat} onChange={(v) => setPat(Math.max(0, Math.round(v)))} />
        <NumField label="Largura do vão central (poço)" unit="m" width={170} value={poco} onChange={setPoco} disabled={!tipologiaInfo(tip).poco} />
      </div>
      </fieldset>
      <div className="row wrap"><Button variant="primary" onClick={salvar}>{rotulo}</Button></div>
      {msg.map((m, i) => <Note key={i} tone="bad">{m}</Note>)}
    </div>
  );
}

/** Lances de escada da obra que usam o tipo (um lance com "lances iguais consecutivos" conta uma vez). */
const lancesComTipo = (b: BuildingModel, id: string) => (b.escadas ?? []).reduce((n, e) => n + e.lances.filter((l) => l.tipo === id).length, 0);

export function TiposLanceAba({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [edit, setEdit] = useState<string | null>(null), [msg, setMsg] = useState<string[]>([]), [copia, setCopia] = useState<{ id: string; nome: string } | null>(null);
  const obra = b.tiposLance ?? [];
  const roda = (nome: string, p: Record<string, unknown>) => { const r = exec(nome, p); setMsg(r.ok ? [] : r.erros.map((e) => e.mensagem)); return r; };
  return (
    <div data-escada-tipos>
      <Group title="Da obra">
        {!obra.length && <Hint>Nenhum tipo na obra: os predefinidos viram tipos da obra ao serem usados num lance.</Hint>}
        {obra.map((t) => {
          const n = lancesComTipo(b, t.id), bloq = tipoLanceBloqueado(b, t.id);
          return (
            <div key={t.id} data-tipo-lance={t.nome} data-bloqueado={bloq || undefined}>
              <div className="row wrap u-items-end">
                <span><b>{t.nome}</b> — {tipologiaInfo(t.tipologia).rotulo}, {t.trechos.join(' + ')} degraus</span>
                {n > 0 && <Pill tone={bloq ? 'warn' : undefined}>Em uso por {n} lance(s){bloq ? ' · bloqueado' : ''}</Pill>}
                <Button variant="mini" onClick={() => setEdit(edit === t.id ? null : t.id)}>Editar {t.nome}</Button>
                {n > 0 && <Button variant="mini" onClick={() => roda('tipoLance.desbloquear', { id: t.id, desbloquear: bloq })}>{bloq ? 'Desbloquear' : 'Bloquear'} {t.nome}</Button>}
                <Button variant="mini" onClick={() => setCopia(copia?.id === t.id ? null : { id: t.id, nome: `${t.nome} (cópia)` })}>Copiar com nova referência: {t.nome}</Button>
                <Button variant="mini" disabled={n > 0} onClick={() => roda('tipoLance.remover', { id: t.id })}>Remover {t.nome}</Button>
              </div>
              {bloq && <Hint>Bloqueado: o tipo é usado em outro lance. Desbloqueie para editar ou copie com nova referência.</Hint>}
              {copia?.id === t.id && (
                <div className="row wrap u-items-end">
                  <TextField label="Nova referência do tipo" value={copia.nome} onChange={(v) => setCopia({ id: t.id, nome: v })} />
                  <Button variant="primary" disabled={!copia.nome.trim()} onClick={() => { if (roda('tipoLance.copiar', { de: t.id, nome: copia.nome.trim() }).ok) setCopia(null); }}>Criar a cópia</Button>
                </div>
              )}
              {edit === t.id && <Editor t={t} bloqueado={bloq} rotulo="Salvar alterações do tipo" aoSalvar={(m) => { const r = exec('tipoLance.editar', { id: t.id, tipo: m }); if (r.ok) setEdit(null); return r.ok ? [] : r.erros.map((e) => e.mensagem); }} />}
            </div>
          );
        })}
      </Group>
      <Group title="Predefinidos" open={false}>
        {TIPOS_LANCE_PREDEFINIDOS.map((t) => (
          <div key={t.id} className="row wrap u-items-end"><span>{t.nome}</span><Button variant="mini" onClick={() => roda('tipoLance.copiar', { de: t.id })}>Copiar para a obra: {t.nome}</Button></div>
        ))}
      </Group>
      <Group title="Novo tipo de lance">
        <Editor t={{ nome: 'Novo tipo', tipologia: 'reto', trechos: [18] }} rotulo="Criar tipo de lance" aoSalvar={(m) => { const r = exec('tipoLance.criar', { tipo: m }); return r.ok ? [] : r.erros.map((e) => e.mensagem); }} />
      </Group>
      <BibliotecaTiposLance b={b} />
      {msg.map((m, i) => <Note key={i} tone="bad">{m}</Note>)}
    </div>
  );
}

/** Exportar e importar `.json` (C8.44) e biblioteca do usuário (C8.17) dos tipos de lance. */
function BibliotecaTiposLance({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [erros, setErros] = useState<string[]>([]), [aviso, setAviso] = useState('');
  const [itens, setItens] = useState<LibraryItem[]>([]), [sel, setSel] = useState(''), [nome, setNome] = useState('');
  const recarregar = () => listLibrary().then((r) => setItens(r.items.filter((i) => i.kind === 'tiposLance'))).catch(() => {});
  useEffect(() => { recarregar(); }, []);
  const opcoes = opcoesEmUso(b.opcoes, perfilDe(b));
  /** Lê o texto (arquivo ou biblioteca), mostra os erros linha a linha e importa os tipos válidos. */
  const importar = (texto: string | unknown) => {
    const r = lerBibliotecaTiposLance(texto, opcoes);
    setErros(r.erros); setAviso('');
    if (!r.tipos.length) return;
    const x = exec('tipoLance.importar', { tipos: r.tipos });
    if (x.ok) setAviso(x.mensagem ?? ''); else setErros([...r.erros, ...x.erros.map((e) => e.mensagem)]);
  };
  const gravar = async () => {
    const bib = exportarTiposLance(b);
    try { await saveToLibrary('tiposLance', nome.trim(), `${bib.tipos.length} tipo(s) de lance`, bib); setNome(''); recarregar(); setAviso(`Tipos de lance “${nome.trim()}” guardados na biblioteca do usuário.`); } catch (e) { setErros([(e as Error).message]); }
  };
  const trazer = async () => {
    const e = sel ? await loadFromLibrary(sel) : null;
    if (!e) { setErros(['Documento não encontrado na biblioteca.']); return; }
    importar(e.payload);
  };
  return (
    <Group title="Biblioteca de tipos de lance" open={false}>
      <div data-biblioteca-tipos-lance>
        <div className="row wrap u-items-end">
          <Button disabled={!obra(b).length} onClick={() => { void download('tipos-de-lance.json', JSON.stringify(exportarTiposLance(b), null, 2), 'application/json'); }}>Exportar da obra (.json)</Button>
          <FilePick label="Importar (.json)" accept=".json,application/json" onFile={(f) => { void f.text().then(importar); }} />
        </div>
        <div className="row wrap u-items-end">
          <TextField label="Nome na biblioteca do usuário" value={nome} onChange={setNome} />
          <Button disabled={!nome.trim() || !obra(b).length} onClick={() => { void gravar(); }}>Guardar na biblioteca do usuário</Button>
        </div>
        <div className="row wrap u-items-end">
          <Select label="Tipos de lance guardados" value={sel} options={[{ v: '', label: itens.length ? '— escolha —' : '(vazia)' }, ...itens.map((i) => ({ v: i.id, label: `${i.name} · ${i.summary}` }))]} onChange={setSel} />
          <Button disabled={!sel} onClick={() => { void trazer(); }}>Trazer da biblioteca do usuário</Button>
          <Button variant="danger" disabled={!sel} onClick={() => { void deleteFromLibrary(sel).then(() => { setSel(''); recarregar(); }); }}>Excluir da biblioteca do usuário</Button>
        </div>
        {erros.map((m, i) => <Note key={i} tone="bad">{m}</Note>)}
        {aviso && <span className="hint" data-aviso-tipos-lance>{aviso}</span>}
      </div>
    </Group>
  );
}
const obra = (b: BuildingModel) => b.tiposLance ?? [];
