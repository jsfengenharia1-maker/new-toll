// Grupo "Tabelas de armadura" da barra lateral (frente R7a): bitolas, espaçamentos e tipologias que o cálculo pode
// usar em vigas, estribos, pilares e lajes. Tabelas de fábrica + tabelas do usuário (criar, editar, duplicar,
// remover, restaurar, importar e exportar), atribuídas aos elementos selecionados na planta.
import { useEffect, useRef, useState } from 'react';
import {
  BITOLAS_TABELA, ESPACAMENTOS_PILAR, ID_PADRAO, RAMOS_ESTRIBO, SEM_LIMITE, TIPOS_TABELA, bitolasTxt, exportarTabelas, lerArquivoTabelas, tabelaDe, tabelasAlteradas, tabelasDoTipo, validarTabela,
  MODOS_GRAMPOS, type GrupoBarras, type ModoGrampos, type Tabela, type TabelaEstribos, type TabelaLajes, type TabelaPilares, type TabelaVigas, type TipoTabela,
} from '../../core/building/tabelasArmadura';
import type { BuildingModel } from '../../core/building/types';
import { Button, Chip, Dropdown, Group, Hint, NumCell, Pill, Seg, Select, TextField, download } from '../ui';
import { usePlanta } from './plantaStore';
import { useStore } from '../store';
import { useBuilding } from './store';

const clone = <T,>(t: T): T => JSON.parse(JSON.stringify(t)) as T;
const f1 = (x: number) => String(+x.toFixed(2)).replace('.', ',');

/** Alterna uma bitola (ou valor) numa lista, mantendo a ordem da lista comercial. */
function alterna(lista: number[], ref: number[], v: number): number[] {
  const nova = lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];
  return ref.filter((x) => nova.includes(x));
}

function Escolha({ valor, ref_, rotulo, onChange }: { valor: number[]; ref_: number[]; rotulo: string; onChange: (v: number[]) => void }) {
  return (
    <span className="chips" role="group" aria-label={rotulo}>
      {ref_.map((p) => <Chip key={p} on={valor.includes(p)} aria-pressed={valor.includes(p)} title={`${rotulo}: ${f1(p)}`} onClick={() => onChange(alterna(valor, ref_, p))}>{f1(p)}</Chip>)}
    </span>
  );
}

const lim = (x: number) => (x >= SEM_LIMITE ? 0 : x);
const deLim = (x: number) => (x > 0 ? x : SEM_LIMITE);

function TabelaDeVigas({ t, grava }: { t: TabelaVigas; grava: (t: Tabela) => void }) {
  const set = (i: number, f: (l: TabelaVigas['linhas'][number]) => void) => { const c = clone(t); f(c.linhas[i]); grava(c); };
  const grupo = (i: number, face: 'pos' | 'neg', g: GrupoBarras) => (
    <td className="tl">
      <Escolha valor={g.bitolas} ref_={BITOLAS_TABELA.vigas} rotulo={`${face === 'pos' ? 'Positivos' : 'Negativos'} do grupo ${i + 1}`} onChange={(v) => set(i, (l) => { l[face].bitolas = v; })} />
      <span className="row">
        <span className="small">n ≥</span><NumCell label={`n mínimo ${face === 'pos' ? 'positivos' : 'negativos'} do grupo ${i + 1}`} value={g.nMin} onChange={(v) => set(i, (l) => { l[face].nMin = Math.round(v); })} />
        <span className="small">camadas ≤</span><NumCell label={`Camadas ${face === 'pos' ? 'positivos' : 'negativos'} do grupo ${i + 1}`} value={g.camadas} onChange={(v) => set(i, (l) => { l[face].camadas = Math.round(v); })} />
      </span>
    </td>
  );
  return (
    <>
      <div className="tablewrap">
      <table className="data quadro" data-tabela="vigas">
        <thead><tr><th>Grupo</th><th>b até (cm)</th><th>h até (cm)</th><th>Positivos (φ mm)</th><th>Negativos (φ mm)</th><th>Passante (%)</th><th>Montagem (φ mm)</th><th>Adicional (φ mm)</th><th /></tr></thead>
        <tbody>
          {t.linhas.map((l, i) => (
            <tr key={i}>
              <td className="num">{i + 1}</td>
              <td><NumCell label={`b até do grupo ${i + 1}`} value={lim(l.bAte)} onChange={(v) => set(i, (x) => { x.bAte = deLim(v); })} /></td>
              <td><NumCell label={`h até do grupo ${i + 1}`} value={lim(l.hAte)} onChange={(v) => set(i, (x) => { x.hAte = deLim(v); })} /></td>
              {grupo(i, 'pos', l.pos)}{grupo(i, 'neg', l.neg)}
              <td><NumCell label={`Passante do grupo ${i + 1}`} value={+(l.passante * 100).toFixed(1)} onChange={(v) => set(i, (x) => { x.passante = v / 100; })} /></td>
              {(['montagem', 'adicional'] as const).map((k) => (
                <td key={k} className="tl"><Escolha valor={l[k] ?? BITOLAS_TABELA.vigas} ref_={BITOLAS_TABELA.vigas} rotulo={`${k === 'montagem' ? 'Montagem' : 'Adicional'} do grupo ${i + 1}`} onChange={(v) => set(i, (x) => { if (v.length === BITOLAS_TABELA.vigas.length) delete x[k]; else x[k] = v; })} /></td>
              ))}
              <td><Button variant="danger" aria-label={`Remover grupo ${i + 1}`} disabled={t.linhas.length < 2} onClick={() => { const c = clone(t); c.linhas.splice(i, 1); grava(c); }}>×</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="row wrap"><Button onClick={() => { const c = clone(t), u = c.linhas.at(-1)!; c.linhas.push(clone({ ...u, bAte: SEM_LIMITE })); if (c.linhas.length > 1) c.linhas[c.linhas.length - 2].bAte = Math.min(c.linhas[c.linhas.length - 2].bAte, 40); grava(c); }}>Adicionar grupo</Button></div>
      <Hint>Cada grupo vale para a primeira faixa que contém b e h da viga (0 = sem limite). As barras são as de menor número de camadas, depois menor área, entre as bitolas marcadas; n ≥ é o mínimo de barras. Passante: fração das barras inferiores que vai de apoio a apoio (NBR 6118, 18.3.2.4: ≥ 1/3 do vão positivo). Sem solução na tabela: φ25 e erro FORA_TABELA. Montagem: bitolas permitidas ao porta-estribos; adicional: às barras dos reforços inferiores (todas marcadas = sem restrição); bitola das opções fora da lista: aviso “Fora de tabela” e troca pela maior da lista que não a supera.</Hint>
    </>
  );
}

function TabelaDeEstribos({ t, grava }: { t: TabelaEstribos; grava: (t: Tabela) => void }) {
  const set = (i: number, f: (l: TabelaEstribos['linhas'][number]) => void) => { const c = clone(t); f(c.linhas[i]); grava(c); };
  return (
    <>
      <div className="tablewrap">
      <table className="data quadro" data-tabela="estribos">
        <thead><tr><th>Grupo</th><th>b até (cm)</th><th>Bitolas (φ mm)</th><th>s mín (cm)</th><th>s máx (cm)</th><th>Ramos</th><th /></tr></thead>
        <tbody>
          {t.linhas.map((l, i) => (
            <tr key={i}>
              <td className="num">{i + 1}</td>
              <td><NumCell label={`b até do grupo de estribos ${i + 1}`} value={lim(l.bAte)} onChange={(v) => set(i, (x) => { x.bAte = deLim(v); })} /></td>
              <td className="tl"><Escolha valor={l.bitolas} ref_={BITOLAS_TABELA.estribos} rotulo={`Bitolas do grupo ${i + 1}`} onChange={(v) => set(i, (x) => { x.bitolas = v; })} /></td>
              <td><NumCell label={`s mín dos estribos do grupo ${i + 1}`} value={l.sMin} onChange={(v) => set(i, (x) => { x.sMin = v; })} /></td>
              <td><NumCell label={`s máx dos estribos do grupo ${i + 1}`} value={l.sMax} onChange={(v) => set(i, (x) => { x.sMax = v; })} /></td>
              <td className="tl"><Escolha valor={l.ramos} ref_={RAMOS_ESTRIBO} rotulo={`Ramos do grupo ${i + 1}`} onChange={(v) => set(i, (x) => { x.ramos = v; })} /></td>
              <td><Button variant="danger" aria-label={`Remover grupo ${i + 1}`} disabled={t.linhas.length < 2} onClick={() => { const c = clone(t); c.linhas.splice(i, 1); grava(c); }}>×</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="row wrap"><Button onClick={() => { const c = clone(t); c.linhas.at(-1)!.bAte = Math.min(c.linhas.at(-1)!.bAte, 40); c.linhas.push({ ...clone(c.linhas.at(-1)!), bAte: SEM_LIMITE }); grava(c); }}>Adicionar grupo</Button></div>
      <Hint>Ramos 2 = estribo simples, 4 = duplo, 6 = triplo. Para cada número de ramos, do menor ao maior, vale a menor bitola cujo espaçamento (até o máximo da tabela e da NBR 6118, 17.4.1.1.1 e 18.3.3.2; 0 = só a norma) fica a partir do mínimo. Sem solução: erro FORA_TABELA.</Hint>
    </>
  );
}

function TabelaDePilares({ t, grava }: { t: TabelaPilares; grava: (t: Tabela) => void }) {
  const set = (f: (p: TabelaPilares) => void) => { const c = clone(t); f(c); grava(c); };
  return (
    <>
      <div data-tabela="pilares">
        <p className="small"><b>Bitolas longitudinais (φ mm)</b></p>
        <Escolha valor={t.bitolas} ref_={BITOLAS_TABELA.pilares} rotulo="Bitolas dos pilares" onChange={(v) => set((p) => { p.bitolas = v; })} />
        <p className="small"><b>Espaçamentos entre barras (cm)</b></p>
        <Escolha valor={t.espacamentos} ref_={ESPACAMENTOS_PILAR} rotulo="Espaçamentos dos pilares" onChange={(v) => set((p) => { p.espacamentos = v; })} />
      </div>
      <div className="tablewrap">
      <table className="data quadro">
        <thead><tr><th>Estribo para φ longitudinal até (mm)</th><th>φt (mm)</th><th>s máx (cm)</th><th /></tr></thead>
        <tbody>
          {t.estribos.map((e, i) => (
            <tr key={i}>
              <td><NumCell label={`φ longitudinal até do estribo ${i + 1}`} value={e.phiAte} onChange={(v) => set((p) => { p.estribos[i].phiAte = v; })} /></td>
              <td><Dropdown aria-label={`φt da linha ${i + 1}`} value={e.phiT} onChange={(ev) => set((p) => { p.estribos[i].phiT = Number(ev.target.value); })}>{BITOLAS_TABELA.estribos.map((x) => <option key={x} value={x}>{f1(x)}</option>)}</Dropdown></td>
              <td><NumCell label={`s máx do estribo ${i + 1}`} value={e.sMax} onChange={(v) => set((p) => { p.estribos[i].sMax = v; })} /></td>
              <td><Button variant="danger" aria-label={`Remover estribo ${i + 1}`} onClick={() => set((p) => { p.estribos.splice(i, 1); })}>×</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="row wrap"><Button onClick={() => set((p) => { p.estribos.push({ phiAte: 25, phiT: 6.3, sMax: 0 }); })}>Adicionar linha de estribo</Button></div>
      <h4>Faixas de seção (R7g)</h4>
      <div className="tablewrap" data-tabela-secoes>
      <table className="data quadro">
        <thead><tr><th>Menor lado até (cm)</th><th>Maior lado até (cm)</th><th>Bitolas (φ mm)</th><th>Espaçamentos (cm)</th><th /></tr></thead>
        <tbody>
          {(t.secoes ?? []).map((x, i) => (
            <tr key={i}>
              <td><NumCell label={`Menor lado até da faixa ${i + 1}`} value={x.ladoMenorAte} onChange={(v) => set((p) => { p.secoes![i].ladoMenorAte = v; })} /></td>
              <td><NumCell label={`Maior lado até da faixa ${i + 1}`} value={x.ladoMaiorAte} onChange={(v) => set((p) => { p.secoes![i].ladoMaiorAte = v; })} /></td>
              <td><Escolha valor={x.bitolas ?? t.bitolas} ref_={BITOLAS_TABELA.pilares} rotulo={`Bitolas da faixa ${i + 1}`} onChange={(v) => set((p) => { p.secoes![i].bitolas = v; })} /></td>
              <td><Escolha valor={x.espacamentos ?? t.espacamentos} ref_={ESPACAMENTOS_PILAR} rotulo={`Espaçamentos da faixa ${i + 1}`} onChange={(v) => set((p) => { p.secoes![i].espacamentos = v; })} /></td>
              <td><Button variant="danger" aria-label={`Remover faixa de seção ${i + 1}`} onClick={() => set((p) => { p.secoes!.splice(i, 1); })}>×</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="row wrap"><Button onClick={() => set((p) => { (p.secoes ??= []).push({ ladoMenorAte: 40, ladoMaiorAte: SEM_LIMITE, bitolas: [...p.bitolas], espacamentos: [...p.espacamentos] }); })}>Adicionar faixa de seção</Button></div>
      <Hint>A primeira faixa que contém o menor e o maior lado da seção (diâmetro, no círculo) substitui as bitolas e os espaçamentos acima; fora de todas, valem os gerais.</Hint>
      <h4>Grampos (R7g)</h4>
      <div className="tablewrap" data-tabela-grampos>
      <table className="data quadro">
        <thead><tr><th>φ longitudinal até (mm)</th><th>Maior lado até (cm)</th><th>Grampos</th><th /></tr></thead>
        <tbody>
          {(t.grampos ?? []).map((x, i) => (
            <tr key={i}>
              <td><NumCell label={`φ longitudinal até dos grampos ${i + 1}`} value={x.phiAte} onChange={(v) => set((p) => { p.grampos![i].phiAte = v; })} /></td>
              <td><NumCell label={`Maior lado até dos grampos ${i + 1}`} value={x.ladoMaiorAte} onChange={(v) => set((p) => { p.grampos![i].ladoMaiorAte = v; })} /></td>
              <td><Select<ModoGrampos> label={`Modo dos grampos ${i + 1}`} value={x.modo} options={MODOS_GRAMPOS.map((m) => ({ v: m.v, label: m.rotulo }))} onChange={(v) => set((p) => { p.grampos![i].modo = v; })} /></td>
              <td><Button variant="danger" aria-label={`Remover grampos ${i + 1}`} onClick={() => set((p) => { p.grampos!.splice(i, 1); })}>×</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="row wrap"><Button onClick={() => set((p) => { (p.grampos ??= []).push({ phiAte: 25, ladoMaiorAte: SEM_LIMITE, modo: 'norma' }); })}>Adicionar linha de grampos</Button></div>
      <Hint>Sem linha, vale a NBR 6118 (18.2.4: grampos nas barras a mais de 20φt de um canto). “Só o estribo perimetral” dispensa os grampos e gera o aviso GRAMPOS_TABELA quando a norma os pede; “todas” coloca um grampo em cada barra intermediária.</Hint>
      <Hint>Em cada bitola, as disposições são testadas do menor ao maior número de barras (espaçamentos marcados); vale a primeira que atende, com a simetria da opção “Simetria da armadura dos pilares”. Estribo: o φt da tabela é o mínimo (além de φℓ/4 e φ5) e o s máx limita o espaçamento da NBR 6118, 18.4.2; sem linha, vale só a norma e os grampos da 18.2.4 são automáticos. Sem disposição na tabela: armadura própria (aviso) ou ARM_MANUAL.</Hint>
    </>
  );
}

function TabelaDeLajes({ t, grava }: { t: TabelaLajes; grava: (t: Tabela) => void }) {
  const set = (i: number, f: (l: TabelaLajes['linhas'][number]) => void) => { const c = clone(t); f(c.linhas[i]); grava(c); };
  return (
    <>
      <div className="tablewrap">
      <table className="data quadro" data-tabela="lajes">
        <thead><tr><th>Faixa</th><th>h até (cm)</th><th>Bitolas (φ mm)</th><th>s mín (cm)</th><th>s máx (cm)</th><th /></tr></thead>
        <tbody>
          {t.linhas.map((l, i) => (
            <tr key={i}>
              <td className="num">{i + 1}</td>
              <td><NumCell label={`h até da faixa ${i + 1}`} value={lim(l.hAte)} onChange={(v) => set(i, (x) => { x.hAte = deLim(v); })} /></td>
              <td className="tl"><Escolha valor={l.bitolas} ref_={BITOLAS_TABELA.lajes} rotulo={`Bitolas da faixa ${i + 1}`} onChange={(v) => set(i, (x) => { x.bitolas = v; })} /></td>
              <td><NumCell label={`s mín da faixa ${i + 1}`} value={l.sMin} onChange={(v) => set(i, (x) => { x.sMin = v; })} /></td>
              <td><NumCell label={`s máx da faixa ${i + 1}`} value={l.sMax} onChange={(v) => set(i, (x) => { x.sMax = v; })} /></td>
              <td><Button variant="danger" aria-label={`Remover faixa ${i + 1}`} disabled={t.linhas.length < 2} onClick={() => { const c = clone(t); c.linhas.splice(i, 1); grava(c); }}>×</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="row wrap"><Button onClick={() => { const c = clone(t); c.linhas.at(-1)!.hAte = Math.min(c.linhas.at(-1)!.hAte, 20); c.linhas.push({ ...clone(c.linhas.at(-1)!), hAte: SEM_LIMITE }); grava(c); }}>Adicionar faixa</Button></div>
      <Hint>Faixas de espessura da laje maciça (h até; 0 = sem limite). s mín e s máx 0 = pelas opções de lajes e pela NBR 6118, 20.1 (mín(2h; 20 cm)). As faixas de espessura são premissa a confirmar. Armadura que não cabe: aviso FORA_TABELA_LAJE.</Hint>
    </>
  );
}

const nomeTipo = (t: TipoTabela) => TIPOS_TABELA.find((x) => x.v === t)!.rotulo;

export function TabelasGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const foco = usePlanta((s) => s.tabelaFoco);
  const selecao = usePlanta((s) => s.selecao);
  const [tipo, setTipo] = useState<TipoTabela>('vigas');
  const [ids, setIds] = useState<Record<TipoTabela, string>>({ vigas: ID_PADRAO, estribos: ID_PADRAO, pilares: ID_PADRAO, lajes: ID_PADRAO });
  const [aberto, setAberto] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const arq = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!foco) return;
    setTipo(foco.tipo); setIds((x) => ({ ...x, [foco.tipo]: foco.id })); setAberto(true);
    document.querySelector('[data-grupo-tabelas]')?.scrollIntoView?.({ block: 'start' });
  }, [foco]);
  const lista = tabelasDoTipo(b, tipo) as Tabela[];
  const id = lista.some((t) => t.id === ids[tipo]) ? ids[tipo] : ID_PADRAO;
  const t = tabelaDe(b, tipo, id) as Tabela;
  const alteradas = tabelasAlteradas(b);
  const padraoAlterada = alteradas.some((x) => x.tipo === tipo && x.tabela.id === ID_PADRAO);
  const grava = (nova: Tabela) => exec('tabela.definir', { tipo, tabela: nova });
  const errosT = validarTabela(tipo, t);
  const usos = (tipo === 'vigas' ? b.vigas.filter((v) => v.tabela === id) : tipo === 'estribos' ? b.vigas.filter((v) => v.tabelaEstribo === id) : tipo === 'pilares' ? b.pilares.filter((p) => p.tabela === id) : b.lajes.filter((l) => l.tabela === id)).length;
  const selTipo = tipo === 'pilares' ? b.pilares.filter((p) => selecao.has(p.id)) : tipo === 'lajes' ? b.lajes.filter((l) => selecao.has(l.id)) : b.vigas.filter((v) => selecao.has(v.id));
  const atribuir = (alvo: string) => {
    const campo = tipo === 'estribos' ? 'tabelaEstribo' : 'tabela', cmd = tipo === 'pilares' ? 'pilar.editar' : tipo === 'lajes' ? 'laje.editar' : 'viga.editar';
    exec('lote', { comandos: selTipo.map((e) => ({ nome: cmd, params: { id: e.id, [campo]: alvo } })) });
  };
  const nova = () => {
    const c = clone(t), n = lista.length + 1;
    let novoId = `t${n}`;
    while (lista.some((x) => x.id === novoId)) novoId = `t${Number(novoId.slice(1)) + 1}`;
    c.id = novoId; c.nome = `${t.nome} (cópia)`;
    exec('tabela.definir', { tipo, tabela: c });
    setIds((x) => ({ ...x, [tipo]: novoId }));
  };
  const remover = () => { exec('tabela.definir', { tipo, remover: id }); setIds((x) => ({ ...x, [tipo]: ID_PADRAO })); };
  const importar = async (f: File) => {
    const r = lerArquivoTabelas(await f.text());
    setErros(r.erros);
    if (r.itens.length) exec('lote', { comandos: r.itens.map((x) => ({ nome: 'tabela.definir', params: { tipo: x.tipo, tabela: x.tabela } })) });
    if (r.itens.length) useStore.getState().set({ message: `${r.itens.length} tabela(s) importada(s).` });
  };
  const exportar = () => { void download('tabelas-armadura.json', exportarTabelas(b, alteradas.length ? undefined : [{ tipo, tabela: t }]), 'application/json'); };
  return (
    <div data-grupo-tabelas>
      <Group title={`Tabelas de armadura${alteradas.length ? ` (${alteradas.length} alterada${alteradas.length > 1 ? 's' : ''})` : ''}`} open={aberto}>
        <Seg value={tipo} options={TIPOS_TABELA.map((x) => ({ v: x.v, label: x.rotulo }))} onChange={setTipo} />
        <div className="row wrap">
          <Select label={`Tabela de ${nomeTipo(tipo).toLowerCase()}`} value={id} options={lista.map((x) => ({ v: x.id, label: `${x.nome}${x.id === ID_PADRAO ? ' (padrão da obra)' : ''}` }))} onChange={(v) => setIds((x) => ({ ...x, [tipo]: v }))} />
          <TextField label="Nome" value={t.nome} onChange={(v) => { if (v.trim() && v !== t.nome) grava({ ...clone(t), nome: v.trim() }); }} />
        </div>
        {tipo === 'vigas' && <TabelaDeVigas t={t as TabelaVigas} grava={grava} />}
        {tipo === 'estribos' && <TabelaDeEstribos t={t as TabelaEstribos} grava={grava} />}
        {tipo === 'pilares' && <TabelaDePilares t={t as TabelaPilares} grava={grava} />}
        {tipo === 'lajes' && <TabelaDeLajes t={t as TabelaLajes} grava={grava} />}
        {errosT.length > 0 && <p className="small bad" role="alert">{errosT.join('; ')}.</p>}
        <div className="row wrap">
          <Button onClick={nova}>Duplicar como nova tabela</Button>
          <Button variant="danger" disabled={id === ID_PADRAO} onClick={remover}>Remover tabela</Button>
          <Button disabled={!padraoAlterada} title="Volta a padrão da obra à de fábrica; as tabelas criadas ficam" onClick={() => exec('tabela.restaurar', { tipos: [tipo] })}>Restaurar a padrão de fábrica</Button>
        </div>
        <div className="row wrap">
          <Button disabled={!selTipo.length} onClick={() => atribuir(id)}>Atribuir a {selTipo.length} {tipo === 'pilares' ? 'pilar(es)' : tipo === 'lajes' ? 'laje(s)' : 'viga(s)'} selecionada(s)</Button>
          <span className="small muted">{usos ? `${usos} elemento(s) usam esta tabela.` : id === ID_PADRAO ? 'Vale para os elementos sem tabela própria.' : 'Nenhum elemento usa esta tabela.'}</span>
        </div>
        <div className="row wrap">
          <Button onClick={exportar} title="Salva as tabelas alteradas e criadas (ou a atual, se nenhuma) num arquivo JSON">Exportar JSON</Button>
          <Button onClick={() => arq.current?.click()}>Importar JSON</Button>
          <input ref={arq} type="file" accept=".json,application/json" hidden aria-label="Arquivo de tabelas de armadura" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = ''; }} />
        </div>
        {erros.length > 0 && <p className="small bad" role="alert" data-erros-importacao>{erros.join(' ')}</p>}
        {alteradas.length > 0 && (
          <p className="small" data-tabelas-alteradas>
            {alteradas.map((x, k) => <Pill key={k} tone={x.criada ? 'ok' : 'warn'}>{nomeTipo(x.tipo)}: {x.tabela.nome}</Pill>)}
          </p>
        )}
        <Hint>As tabelas de fábrica (id “padrao”) reproduzem a escolha por todas as bitolas comerciais (NBR 7480) e pelos limites da NBR 6118. Altere a padrão para valer na obra toda, ou crie outra e atribua aos elementos selecionados na planta. Depois de editar, recalcule o dimensionamento. Bitolas padrão: {bitolasTxt(BITOLAS_TABELA[tipo])} mm.</Hint>
      </Group>
    </div>
  );
}
