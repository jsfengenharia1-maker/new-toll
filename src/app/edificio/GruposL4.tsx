// Cópia entre grupos, união de pavimentos, sugestão de grupos e áreas do grupo (L4: C3.7, C3.22, C3.25, C3.27).
// A lógica está em core/building/gruposCopia.ts e nos comandos `grupo.copiarConteudo` e `pavimento.unir`.
import { useState } from 'react';
import { Button, Check, Group, Hint, Modal, Note, Select } from '../ui';
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
import { areasDoGrupo, conteudoDoGrupo, resumoUniao, ROTULO_CONTEUDO, sugerirGrupos, TIPOS_CONTEUDO, type ModoCopia, type TipoConteudo } from '../../core/building/gruposCopia';
import { useBuilding } from './store';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const corGrupo = (b: BuildingModel, id: string) => `grupo-c${Math.max(0, b.grupos.findIndex((g) => g.id === id)) % 8}`;
const nomeGrupo = (b: BuildingModel, id: string) => b.grupos.find((g) => g.id === id)?.nome ?? id;

export type DialogoGrupos = null | 'copiarGrupo' | 'unirPavimentos';

/** Grupo "Grupos: cópia, união e áreas" da barra lateral. */
export function GruposCopiaGrupo({ b, abrir }: { b: BuildingModel; abrir: (d: DialogoGrupos) => void }) {
  const { exec } = useBuilding();
  const sug = sugerirGrupos(b);
  const nomePav = (id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;
  return (
    <Group title="Grupos: cópia, união e áreas" open={false}>
      <div className="row wrap">
        <Button onClick={() => abrir('copiarGrupo')}>Copiar de outro grupo…</Button>
        <Button onClick={() => abrir('unirPavimentos')}>Unir pavimentos…</Button>
      </div>
      <table className="data" data-areas-grupos>
        <caption className="small muted">Áreas da planta de cada grupo (m²)</caption>
        <thead><tr><th>Grupo</th><th>Pav.</th><th>Lajes</th><th>Vigas</th><th>Pilares</th><th>Muros</th><th>Total</th><th>Total do grupo</th></tr></thead>
        <tbody>
          {b.grupos.map((g) => { const a = areasDoGrupo(b, g.id); return (
            <tr key={g.id} data-grupo={g.id}>
              <td className={`grupo-marca ${corGrupo(b, g.id)}`}>{g.nome}</td>
              <td className="num">{a.pavimentos}</td><td className="num">{fmt(a.lajes)}</td><td className="num">{fmt(a.vigas)}</td><td className="num">{fmt(a.pilares)}</td><td className="num">{fmt(a.muros)}</td>
              <td className="num">{fmt(a.total)}</td><td className="num">{fmt(a.totalGrupo)}</td>
            </tr>
          ); })}
        </tbody>
      </table>
      <Hint>O total soma lajes, vigas, pilares e muros da planta de um pavimento (sem descontar a sobreposição do contorno da laje com as vigas) [a confirmar]; o total do grupo multiplica pelo número de pavimentos.</Hint>
      <div data-sugestoes-grupos>
        {sug.quebras.length === 0 && sug.juncoes.length === 0 && <p className="hint">Sugestão de grupos: os grupos atuais já separam onde os elementos verticais nascem e morrem.</p>}
        {sug.quebras.map((q) => <Note key={q.entre.join('|')} tone="bad"><b>Separar:</b> {q.motivo}</Note>)}
        {sug.juncoes.map((j) => (
          <div key={j.pavimentos.join('|')} className="row wrap">
            <span className="small">{j.motivo}</span>
            <Button variant="mini" aria-label={`Unir ${j.pavimentos.map(nomePav).join(' e ')}`} onClick={() => exec('pavimento.unir', { ids: j.pavimentos })}>Unir</Button>
          </div>
        ))}
      </div>
    </Group>
  );
}

/** Esquema dos pavimentos do edifício, de cima para baixo, com a cor do grupo e a marca de origem e destino. */
function Esquema({ b, de, para }: { b: BuildingModel; de?: string; para?: string }) {
  return (
    <ul className="esq-grupos" aria-label="Esquema de grupos">
      {[...pavimentosOrdenados(b)].reverse().map((p) => (
        <li key={p.id} className={`esq-pav ${corGrupo(b, p.grupo)}${p.grupo === de ? ' origem' : ''}${p.grupo === para ? ' destino' : ''}`} data-pav={p.id}>
          <span>{p.nome}</span><span className="muted">{nomeGrupo(b, p.grupo)}</span>
          {p.grupo === de && <span className="esq-marca">origem</span>}
          {p.grupo === para && <span className="esq-marca">destino</span>}
        </li>
      ))}
    </ul>
  );
}

export function CopiarGrupoDialogo({ b, onClose }: { b: BuildingModel; onClose: () => void }) {
  const { exec } = useBuilding();
  const [de, setDe] = useState(b.grupos[1]?.id ?? b.grupos[0]?.id ?? '');
  const [para, setPara] = useState(b.grupos[0]?.id ?? '');
  const [tipos, setTipos] = useState<TipoConteudo[]>(TIPOS_CONTEUDO);
  const [modo, setModo] = useState<ModoCopia>('somar');
  const co = b.grupos.some((g) => g.id === de) ? conteudoDoGrupo(b, de) : null;
  const cd = b.grupos.some((g) => g.id === para) ? conteudoDoGrupo(b, para) : null;
  const opts = b.grupos.map((g) => ({ v: g.id, label: g.nome }));
  const copiar = () => { const r = exec('grupo.copiarConteudo', { de, para, tipos, modo }); if (r.ok) onClose(); };
  return (
    <Modal titulo="Copiar de outro grupo" onClose={onClose} ajuda="janela:copiarGrupo" info="Copia para o grupo de destino o conteúdo do grupo de origem; a operação inteira vale um passo no histórico.">
      <Esquema b={b} de={de} para={para} />
      <div className="row wrap">
        <Select label="Grupo de origem" value={de} options={opts} onChange={setDe} />
        <Select label="Grupo de destino" value={para} options={opts} onChange={setPara} />
        <Select label="Modo da cópia" value={modo} options={[{ v: 'somar', label: 'Somar (ignora o que já existe igual)' }, { v: 'substituir', label: 'Substituir (apaga antes o do destino)' }]} onChange={(v) => setModo(v as ModoCopia)} />
      </div>
      <div className="row wrap">
        {TIPOS_CONTEUDO.map((t) => (
          <Check key={t} label={`Copiar ${ROTULO_CONTEUDO[t].toLowerCase()}${co ? ` (${co[t]})` : ''}`} checked={tipos.includes(t)} onChange={(v) => setTipos(v ? TIPOS_CONTEUDO.filter((x) => x === t || tipos.includes(x)) : tipos.filter((x) => x !== t))} />
        ))}
      </div>
      {modo === 'substituir' && cd && <Note tone="bad">Substituir apaga do destino os elementos dos tipos escolhidos: {TIPOS_CONTEUDO.filter((t) => tipos.includes(t)).map((t) => `${cd[t]} ${ROTULO_CONTEUDO[t].toLowerCase()}`).join(', ')}.</Note>}
      <Hint>Os pavimentos do destino correspondem aos da origem pela ordem. Pilares já existentes na mesma posição ficam como estão; armaduras bloqueadas e detalhes editados não são copiados.</Hint>
      <div className="row"><Button variant="primary" disabled={!de || !para || de === para || !tipos.length} onClick={copiar}>Copiar conteúdo do grupo</Button></div>
    </Modal>
  );
}

export function UnirPavimentosDialogo({ b, onClose }: { b: BuildingModel; onClose: () => void }) {
  const { exec } = useBuilding();
  const [ids, setIds] = useState<string[]>([]);
  const [grupo, setGrupo] = useState('');
  const r = ids.length >= 2 || (ids.length >= 1 && grupo) ? resumoUniao(b, ids, grupo || undefined) : null;
  const unir = () => { const x = exec('pavimento.unir', { ids, ...(grupo ? { grupo } : {}) }); if (x.ok) onClose(); };
  return (
    <Modal titulo="Unir pavimentos" onClose={onClose} ajuda="janela:unirPavimentos" info="Reúne os pavimentos escolhidos num só grupo, que passam a compartilhar a planta.">
      <Esquema b={b} de={r?.grupo} />
      <div className="row wrap">
        {[...pavimentosOrdenados(b)].reverse().map((p) => (
          <Check key={p.id} label={`Unir ${p.nome}`} checked={ids.includes(p.id)} onChange={(v) => setIds(v ? [...ids, p.id] : ids.filter((x) => x !== p.id))} />
        ))}
      </div>
      <Select label="Grupo que recebe os pavimentos" value={grupo} options={[{ v: '', label: 'O do pavimento mais baixo da seleção' }, ...b.grupos.map((g) => ({ v: g.id, label: g.nome }))]} onChange={setGrupo} />
      {r && r.movidos.length === 0 && <Note>Os pavimentos escolhidos já estão no mesmo grupo.</Note>}
      {r?.gruposEsvaziados.map((g) => (
        <Note key={g.id} tone="bad">O grupo “{g.nome}” ficará sem pavimentos e será removido, com {g.conteudo.vigas} viga(s), {g.conteudo.lajes} laje(s) e {g.conteudo.cargas} carga(s).</Note>
      ))}
      <div className="row"><Button variant="primary" disabled={!r || r.movidos.length === 0} onClick={unir}>Unir pavimentos</Button></div>
    </Modal>
  );
}
