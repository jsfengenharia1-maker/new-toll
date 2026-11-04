// Aba Modificar (inspirada na do Revit): corresponder propriedades, filtro da seleção por tipo, selecionar iguais, fixar (alfinete)
// e criar semelhante. A faixa (Edição e abas do elemento) usa os grupos daqui; as janelas ficam no `ModificarHost`.
import { useEffect, useState } from 'react';
import { CAMPOS, tipoCorresp, type TipoCorresp } from '../../core/building/corresponder';
import { ehFixo, elementoDe } from '../../core/building/fixacao';
import { pavimentosOrdenados } from '../../core/building/types';
import { Button, Check, Dropdown, Hint, Modal, Note, RibbonButton, RibbonGroup } from '../ui';
import { useStore } from '../store';
import { criarSemelhanteSelecionado } from './ModificarAcoes';
import { agruparPorTipo, comandosApagar, iguaisA, resumoPorTipo, TIPOS_FILTRO, tipoDaOrigem, useModificar } from './modificarStore';
import { grupoDaPlanta, usePlanta, type Restringir } from './plantaStore';
import { useBuilding } from './store';
import { useEdifUI } from './uiStore';

const msg = (m: string) => useStore.getState().set({ message: m });
const NOME_TIPO: Record<TipoCorresp, string> = { pilar: 'pilar', viga: 'viga', laje: 'laje', fundacao: 'fundação' };

/** Janelas da aba Modificar e o ciclo da ferramenta Corresponder (a origem some ao sair da ferramenta; vinda de uma seleção única, já abre os campos). */
export function ModificarHost() {
  const M = useModificar();
  const ferramenta = usePlanta((s) => s.ferramenta);
  const b = useBuilding((s) => s.sessao.modelo);
  useEffect(() => {
    const m = useModificar.getState();
    if (ferramenta !== 'corresponder') { if (m.corrOrigem || m.corrJanela) m.set({ corrOrigem: null, corrJanela: false }); return; }
    if (m.corrOrigem) return;
    const sel = [...usePlanta.getState().selecao];
    if (sel.length === 1 && tipoCorresp(useBuilding.getState().sessao.modelo, sel[0])) m.set({ corrOrigem: sel[0], corrJanela: true });
  }, [ferramenta]);
  return (
    <>
      {M.corrJanela && M.corrOrigem && tipoDaOrigem(b) && <JanelaCorresponder />}
      {M.filtro && <JanelaFiltro />}
    </>
  );
}

/** Campos a copiar do elemento de origem (lembrados por tipo). */
function JanelaCorresponder() {
  const M = useModificar();
  const b = useBuilding((s) => s.sessao.modelo);
  const origem = M.corrOrigem!, tipo = tipoDaOrigem(b)!;
  const nome = b.pilares.find((x) => x.id === origem)?.nome ?? b.vigas.find((x) => x.id === origem)?.nome ?? b.lajes.find((x) => x.id === origem)?.nome ?? b.fundacao?.elementos.find((x) => x.id === origem)?.nome ?? origem;
  const marcados = new Set(M.corrCampos[tipo]);
  const fechar = () => M.set({ corrJanela: false });
  const troca = (id: string, v: boolean) => { const s = new Set(marcados); if (v) s.add(id); else s.delete(id); M.escolherCampos(tipo, CAMPOS[tipo].filter((c) => s.has(c.id)).map((c) => c.id)); };
  return (
    <Modal titulo="Corresponder propriedades" onClose={fechar}>
      <div className="lanc">
        <p>Origem: <strong>{nome}</strong> ({NOME_TIPO[tipo]}). Marque os campos a copiar; depois clique nos {NOME_TIPO[tipo]}s de destino na planta (um clique por destino).</p>
        <div className="lanc-amb">
          {CAMPOS[tipo].map((c) => <Check key={c.id} label={c.rotulo} checked={marcados.has(c.id)} onChange={(v) => troca(c.id, v)} />)}
        </div>
        {!marcados.size && <Note>Nenhum campo marcado: nada será copiado.</Note>}
        <Hint>A posição e a geometria nunca são copiadas. Os campos marcados ficam lembrados para a próxima vez.</Hint>
        <div className="row wrap">
          <Button onClick={() => M.escolherCampos(tipo, CAMPOS[tipo].map((c) => c.id))}>Todos</Button>
          <Button onClick={() => M.escolherCampos(tipo, [])}>Nenhum</Button>
          <Button variant="primary" onClick={() => { fechar(); msg(`Clique nos ${NOME_TIPO[tipo]}s de destino (Esc volta a Selecionar).`); }}>Concluir</Button>
        </div>
      </div>
    </Modal>
  );
}

/** Seleção atual contada por tipo; as caixas dizem o que fica. */
function JanelaFiltro() {
  const M = useModificar();
  const b = useBuilding((s) => s.sessao.modelo);
  const sel = usePlanta((s) => s.selecao);
  const { porTipo, outros } = agruparPorTipo(b, sel);
  const presentes = TIPOS_FILTRO.filter((t) => porTipo[t.chave].length);
  const [marcados, setMarcados] = useMarcados(presentes.map((t) => t.chave));
  const fechar = () => M.set({ filtro: false });
  const aplicar = () => {
    const ficam = new Set<string>([...presentes.filter((t) => marcados.has(t.chave)).flatMap((t) => porTipo[t.chave]), ...(marcados.has('outros') ? outros : [])]);
    const sai = sel.size - ficam.size;
    usePlanta.getState().set({ selecao: ficam });
    fechar();
    msg(`Filtro aplicado: ${ficam.size} elemento(s) na seleção (${sai} retirado(s)).`);
  };
  return (
    <Modal titulo="Filtrar seleção" onClose={fechar}>
      <div className="lanc">
        {!sel.size ? <Note>Nada selecionado: selecione com a janela da planta e abra o filtro de novo.</Note> : (
          <>
            <p>{sel.size} elemento(s) selecionado(s): {resumoPorTipo(porTipo)}{outros.length ? `${presentes.length ? ', ' : ''}${outros.length} de outros tipos` : ''}. Marque os tipos que ficam na seleção.</p>
            <div className="lanc-amb">
              {presentes.map((t) => <Check key={t.chave} label={`${t.rotulo} (${porTipo[t.chave].length})`} checked={marcados.has(t.chave)} onChange={(v) => setMarcados(t.chave, v)} />)}
              {!!outros.length && <Check label={`Outros (${outros.length})`} checked={marcados.has('outros')} onChange={(v) => setMarcados('outros', v)} />}
            </div>
          </>
        )}
        <div className="row wrap">
          <Button variant="primary" disabled={!sel.size} onClick={aplicar}>Aplicar</Button>
          <Button onClick={fechar}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  );
}

function useMarcados(iniciais: string[]): [Set<string>, (k: string, v: boolean) => void] {
  const [m, setM] = useState<Set<string>>(() => new Set([...iniciais, 'outros']));
  return [m, (k, v) => setM((a) => { const n = new Set(a); if (v) n.add(k); else n.delete(k); return n; })];
}

// ---------- grupos da faixa ----------

/** Espaço reservado para o grupo Alinhar e Deslocar (ferramentas `alinhar` e `deslocar`), criado em outra frente. */
export function GrupoAlinharDeslocar() { return null; }

/** Seleção: filtrar por tipo e selecionar todos os iguais. */
export function GrupoSelecao() {
  const sel = usePlanta((s) => s.selecao);
  const pav = usePlanta((s) => s.pavimento);
  const b = useBuilding((s) => s.sessao.modelo);
  const um = sel.size === 1 ? [...sel][0] : null;
  const grupo = grupoDaPlanta(b, pav)?.id ?? '';
  const pavId = pav === 'fundacao' ? null : (pavimentosOrdenados(b).find((p) => p.id === pav) ?? pavimentosOrdenados(b)[Math.min(1, b.pavimentos.length - 1)])?.id ?? null;
  const iguais = (escopo: 'pavimento' | 'obra') => {
    if (!um) return;
    const ids = iguaisA(b, um, escopo, pavId, grupo);
    if (!ids.length) { msg('Esse tipo de elemento não tem como procurar iguais.'); return; }
    usePlanta.getState().set({ selecao: new Set(ids) });
    msg(`${ids.length} elemento(s) igual(is) selecionado(s) ${escopo === 'obra' ? 'na obra' : 'no pavimento'}.`);
  };
  const algo = !!um && !!iguaisA(b, um, 'obra', pavId, grupo).length;
  return (
    <RibbonGroup label="Seleção">
      <RibbonButton icon="camadas" label="Filtrar seleção…" title="Conta a seleção por tipo (pilares, vigas, lajes…) e deixa escolher os tipos que ficam" disabled={!sel.size} onClick={() => useModificar.getState().set({ filtro: true })} />
      <RibbonButton icon="selecionar" label="Iguais no pavimento" title="Com um elemento selecionado, seleciona os de mesma seção ou tipo no pavimento aberto" disabled={!algo} onClick={() => iguais('pavimento')} />
      <RibbonButton icon="selecionar" label="Iguais na obra" title="Com um elemento selecionado, seleciona os de mesma seção ou tipo em toda a obra" disabled={!algo} onClick={() => iguais('obra')} />
    </RibbonGroup>
  );
}

/** Fixar (alfinete): fixa ou solta a seleção; atalho para fixar os eixos e o gabarito. */
export function GrupoFixar() {
  const sel = usePlanta((s) => s.selecao);
  const { exec, sessao } = useBuilding();
  const b = sessao.modelo;
  const ids = [...sel].filter((id) => elementoDe(b, id));
  const todosFixos = ids.length > 0 && ids.every((id) => ehFixo(b, id));
  const algumFixo = ids.some((id) => ehFixo(b, id));
  return (
    <RibbonGroup label="Fixar">
      <RibbonButton icon="apoio" label="Fixar" title="Fixa os elementos selecionados: não podem ser movidos, girados, espelhados, alinhados nem apagados até serem soltos" disabled={!ids.length || todosFixos}
        onClick={() => exec('elemento.fixar', { ids: ids.filter((id) => !ehFixo(b, id)) })} />
      <RibbonButton icon="abrir" label="Soltar" title="Solta os elementos fixados da seleção" disabled={!algumFixo} onClick={() => exec('elemento.soltar', { ids: ids.filter((id) => ehFixo(b, id)) })} />
      <RibbonButton icon="eixo" label="Fixar eixos e gabarito" title="Fixa todos os eixos e gabaritos (DXF/DWG) da obra: o uso mais comum do alfinete" disabled={!b.eixos.length && !b.mascaras.length}
        onClick={() => exec('elemento.fixar', { tipos: ['eixos', 'mascaras'] })} />
      {!!b.fixados?.length && <RibbonButton icon="remover" label="Soltar tudo" title={`Solta os ${b.fixados.length} elementos fixados da obra`} onClick={() => exec('elemento.soltar', { todos: true })} />}
    </RibbonGroup>
  );
}

/** Opções de mover e copiar lembradas: restringir a uma direção (as cópias, o ângulo e o espelhar com cópia aparecem na barra da ferramenta). */
export function GrupoOpcoesMover() {
  const restringir = usePlanta((s) => s.restringir);
  return (
    <RibbonGroup label="Mover e copiar">
      <Dropdown aria-label="Restringir o deslocamento" title="Mover e Copiar: restringe o deslocamento a uma direção (lembrado)" value={restringir} onChange={(e) => usePlanta.getState().set({ restringir: e.target.value as Restringir })}>
        <option value="livre">Deslocamento livre</option><option value="horizontal">Só horizontal</option><option value="vertical">Só vertical</option>
      </Dropdown>
    </RibbonGroup>
  );
}

/** Criar semelhante e Corresponder (botões; a ferramenta Corresponder em si é `Ferr` na faixa). */
export function BotaoSemelhante() {
  const n = usePlanta((s) => s.selecao.size);
  return <RibbonButton icon="copiar" label="Criar semelhante" title="Abre a ferramenta do elemento selecionado com as mesmas propriedades (Shift+S)" disabled={n !== 1} onClick={() => criarSemelhanteSelecionado()} />;
}

/** Apagar a seleção (cada tipo no seu comando); elementos fixados são recusados com aviso. */
export function BotaoApagar() {
  const sel = usePlanta((s) => s.selecao);
  const { exec, sessao } = useBuilding();
  return (
    <RibbonButton icon="remover" label="Apagar" title="Apaga os elementos selecionados (Del); elementos fixados não são apagados" disabled={!sel.size} onClick={() => {
      const cmds = comandosApagar(sessao.modelo, sel);
      if (!cmds.length) { msg('Nada a apagar na seleção.'); return; }
      const r = exec('lote', { comandos: cmds });
      if (r.ok) usePlanta.getState().set({ selecao: new Set() });
    }} />
  );
}

/** Ponto fixo do pilar selecionado (aba contextual): onde a seção se prende ao ponto de inserção. */
const PONTOS_FIXOS: [string, string][] = [['c', 'Centro'], ['n', 'Meio da face norte'], ['s', 'Meio da face sul'], ['l', 'Meio da face leste'], ['o', 'Meio da face oeste'], ['ne', 'Canto nordeste'], ['no', 'Canto noroeste'], ['se', 'Canto sudeste'], ['so', 'Canto sudoeste']];
export function PontoFixoPilar() {
  const sel = usePlanta((s) => s.selecao);
  const { exec, sessao } = useBuilding();
  const pilares = sessao.modelo.pilares.filter((p) => sel.has(p.id));
  if (!pilares.length) return null;
  const atual = new Set(pilares.map((p) => p.ajuste));
  return (
    <RibbonGroup label="Ponto fixo">
      <Dropdown aria-label="Ponto fixo do pilar" title="Ponto da seção que fica no ponto de inserção do pilar" value={atual.size === 1 ? [...atual][0] : ''} onChange={(e) => { if (e.target.value) exec('lote', { comandos: pilares.map((p) => ({ nome: 'pilar.editar', params: { id: p.id, ajuste: e.target.value } })) }); }}>
        {atual.size > 1 && <option value="">Vários</option>}
        {PONTOS_FIXOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
      </Dropdown>
    </RibbonGroup>
  );
}

/** Tipo do pano das lajes selecionadas: abre a janela de tipos (a mesma da lista de pendências). */
export function BotaoTipoPano() {
  const sel = usePlanta((s) => s.selecao);
  const b = useBuilding((s) => s.sessao.modelo);
  const ids = b.lajes.filter((l) => sel.has(l.id)).map((l) => l.id);
  return <RibbonButton icon="laje" label="Tipo do pano…" title="Atribui o tipo (maciça, treliçada, nervurada…) às lajes selecionadas" disabled={!ids.length} onClick={() => useEdifUI.getState().set({ tipoLajes: ids })} />;
}

