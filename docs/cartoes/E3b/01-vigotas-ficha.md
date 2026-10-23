# E3b — cartão 1: vigotas por ficha na aba Vigotas (planta das vigotas reais, lista vigota a vigota, painéis e editor das selecionadas)

Classe: Haiku (interface sobre núcleo pronto; segue o padrão de `Vigotas.tsx`: planta SVG, tabela, `KV`, editor com `NumField`, `Select` e `Button`).

## Arquivos (2)
1. **Novo** `src/app/edificio/VigotasFicha.tsx` com o conteúdo exato abaixo (validado: `npx tsc -b`, `design.test.ts` e e2e `E3b`, `E3a` e `R6` verdes depois dos três cartões).
2. `src/app/edificio/Vigotas.tsx`: importar `VigotasPorFicha` e usá-lo na janela da laje; esconder o editor da armadura bloqueada das treliçadas nas lajes por ficha (diff abaixo).

## Núcleo usado (já existe)
`ResultadoVigotas.lista` (`VigotaIndividual`: índice, grupo, tipo, armadura, esforços, cortantes por metro, flecha de Branson, situação e mensagens), `GrupoVigotas.ficha` (`DadosFichaGrupo`: positivo, parcelas, serviço das protendidas, moldadas), `NegativoVigota.parcelas`, `fichaPor` (`tiposLaje.ts`) e os comandos `vigota.editar`, `vigota.multipla`, `vigota.momentos` e `armadura.desbloquear` (todos `mcp: false`). A seleção vale da primeira à última vigota (`de`/`ate`) ou por lista (`indices`).

## Regras
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Rótulos únicos na tela. Sem CSS novo, sem cor literal, sem botão na barra da planta. Nos testes de interface (`e2e/flows.mjs`), `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField` e `Select`, cujo rótulo vem com texto extra: nesses, regex ancorada (`/^Tipo da série/`). O núcleo e os comandos (`vigota.*`, `laje.exposicao`, `laje.momentosMin`, `armadura.desbloquear`) já existem e estão testados; não altere nada de `src/core/`.

Rótulos desta tela: abas do painel "Positivo", "Negativo", "Cortante", "Protensão", "Flecha"; "Tipo da série", "Adicional inferior (barras)", "Bitola do adicional", "Parcial do adicional", "Negativo sobre os apoios (barras)", "Bitola do negativo", "Bitola do estribo da vigota", "Espaçamento do estribo da vigota", "Aplicar às vigotas selecionadas", "Apagar a edição das selecionadas", "Desbloquear a laje", "Vigotas lado a lado", "Aplicar à primeira vigota selecionada", "Md+ atribuído", "Md− atribuído (início)", "Md− atribuído (fim)", "Vsd atribuído (início)", "Vsd atribuído (fim)", "Atribuir esforços às selecionadas", "Voltar aos esforços calculados". Atributos de teste: `data-vigotas-ficha`, `data-vigotas-individuais`, `data-n-vigotas`, `data-vigota`, `data-tabela-vigotas`, `data-vigota-linha`, `data-status`, `data-painel-vigota`, `data-editor-vigotas-ficha`, `data-vigotas-com-erro`, `data-vigota-multipla`, `data-esforcos-manuais`. Vigota com erro: linha da tabela com a classe `bad` (vermelho) e `Pill tone="bad"`; na planta, a linha da vigota usa `member st-fail`.

## Conteúdo de `src/app/edificio/VigotasFicha.tsx`
```tsx
// Vigotas por ficha e moldadas no local (frente E3b): parte da janela da laje (aba Vigotas) com a planta das vigotas reais
// (erro em vermelho), a lista vigota a vigota com seleção em intervalo, os painéis Positivo, Negativo, Cortante, Protensão e
// Flecha da vigota selecionada, e o editor das vigotas selecionadas (tipo da série, armaduras, parciais em percentual,
// estribo, vigota dupla ou tripla e esforços atribuídos). O cálculo e os comandos são do núcleo (`vigotasFichas.ts`, `commands/vigotas.ts`).
import { useMemo, useState } from 'react';
import { useBuilding } from './store';
import { executarERecalcular } from './Armadura';
import { fmt, phiTxt } from './Detalhamento';
import { Mensagens } from './Revisao';
import { Button, Hint, KV, NumField, Pill, Select, Seg } from '../ui';
import { fichaPor } from '../../core/building/tiposLaje';
import type { GrupoVigotas, ResultadoVigotas, VigotaIndividual } from '../../core/building/vigotas';

const num = (v: number, d = 2) => fmt(v, d);
const BITOLAS = [6.3, 8, 10, 12.5, 16, 20, 25].map((v) => ({ v, label: `φ${String(v).replace('.', ',')}` }));
const BITOLAS_ESTRIBO = [5, 6.3, 8, 10].map((v) => ({ v, label: `φ${String(v).replace('.', ',')}` }));
type Painel = 'pos' | 'neg' | 'cort' | 'prot' | 'flecha';
const PAINEIS: { v: Painel; label: string }[] = [
  { v: 'pos', label: 'Positivo' }, { v: 'neg', label: 'Negativo' }, { v: 'cort', label: 'Cortante' }, { v: 'prot', label: 'Protensão' }, { v: 'flecha', label: 'Flecha' },
];

/** Intervalo contínuo [de, ate] se a seleção é contínua; senão null (usa a lista). */
function intervalo(sel: number[]): { de: number; ate: number } | null {
  const s = [...sel].sort((a, z) => a - z);
  return s.length && s.every((x, i) => x === s[0] + i) ? { de: s[0], ate: s.at(-1)! } : null;
}
const paramsSel = (id: string, sel: number[]) => { const iv = intervalo(sel); return iv ? { id, de: iv.de, ate: iv.ate } : { id, indices: [...sel].sort((a, z) => a - z) }; };

// ---------------------------------------------------------------- planta das vigotas reais

function PlantaIndividual({ r, sel, onSel }: { r: ResultadoVigotas; sel: number[]; onSel: (i: number, estende: boolean) => void }) {
  const l = useBuilding((s) => s.sessao.modelo.lajes.find((x) => x.id === r.laje));
  if (!l || !r.lista) return null;
  const W = 960, m = 40, xs = l.contorno.map((p) => p[0]), ys = l.contorno.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const esc = Math.min((W - 2 * m) / Math.max(x1 - x0, 0.5), 360 / Math.max(y1 - y0, 0.5)), H = (y1 - y0) * esc + 2 * m;
  const X = (v: number) => +(m + (v - x0) * esc).toFixed(1), Y = (v: number) => +(m + (y1 - v) * esc).toFixed(1);
  const anel = l.contorno.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join('') + 'Z';
  return (
    <svg className="det det-laje" viewBox={`0 0 ${W} ${H.toFixed(0)}`} role="img" aria-label={`Vigotas reais da laje ${r.nome}`} data-vigotas-individuais={r.laje} data-n-vigotas={r.lista.length}>
      <path d={anel} className="det-contorno" />
      {r.lista.map((v) => {
        const f = r.faixas[v.faixa], L = Math.hypot(f.z[0] - f.a[0], f.z[1] - f.a[1]) || 1, ux = (f.z[0] - f.a[0]) / L, uy = (f.z[1] - f.a[1]) / L;
        const d = v.t - f.t, nx = -uy * d, ny = ux * d;
        return (
          <g key={v.indice} data-vigota={v.indice} data-status={v.status} data-selecionada={sel.includes(v.indice) ? 'sim' : 'nao'} onClick={(e) => onSel(v.indice, e.shiftKey)}>
            <line x1={X(f.a[0] + nx)} y1={Y(f.a[1] + ny)} x2={X(f.z[0] + nx)} y2={Y(f.z[1] + ny)} className={`member st-${v.status === 'fail' ? 'fail' : 'ok'}${sel.includes(v.indice) ? ' sel' : ''}`} />
          </g>
        );
      })}
      <text x={W - 8} y={H - 4} textAnchor="end" className="det-txt cota">vigotas reais a partir da borda do ponto de inserção · vermelho = com erro · clique seleciona, Shift+clique estende</text>
    </svg>
  );
}

// ---------------------------------------------------------------- lista de vigotas

function ListaVigotas({ r, sel, onSel }: { r: ResultadoVigotas; sel: number[]; onSel: (i: number, estende: boolean) => void }) {
  return (
    <div className="tablewrap">
      <table className="data quadro" data-tabela-vigotas>
        <thead><tr><th>Vigota</th><th>Grupo</th><th>Tipo</th><th>Armadura</th><th>Md+ (kN·m)</th><th>V início / fim (kN/m)</th><th>Flecha total (mm)</th><th>Situação</th></tr></thead>
        <tbody>
          {r.lista!.map((v) => (
            <tr key={v.indice} data-vigota-linha={v.indice} data-status={v.status} className={`click${sel.includes(v.indice) ? ' sel' : ''}${v.status === 'fail' ? ' bad' : ''}`} onClick={(e) => onSel(v.indice, e.shiftKey)}>
              <td className="tl">{v.indice + 1}{v.multipla > 1 ? (v.multipla === 3 ? ' (tripla)' : ' (dupla)') : ''}{v.editada ? ' ✎' : ''}</td>
              <td className="tl">G{v.grupo + 1}</td><td className="tl">{v.tipo ?? '—'}</td><td className="tl">{v.armadura ?? '—'}</td>
              <td className="num">{num(v.esforcos.mPos)}</td><td className="num">{num(v.cortantePorMetro[0], 1)} / {num(v.cortantePorMetro[1], 1)}</td>
              <td className="num">{v.flecha ? `${num(v.flecha.total * 1000, 1)} / ${num(v.flecha.limites.total * 1000, 1)}` : '—'}</td>
              <td className="tl">{v.status === 'fail' ? <Pill tone="bad">com erro</Pill> : <Pill tone="ok">ok</Pill>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- painéis de uma vigota

const barrasTxt = (b: { n: number; phi: number } | null | undefined) => (b && b.n > 0 ? `${b.n} ${phiTxt(b.phi)}` : '—');
function linhasPainel(r: ResultadoVigotas, v: VigotaIndividual, g: GrupoVigotas, painel: Painel): [string, string][] {
  const f = g.ficha;
  if (painel === 'pos') {
    return [
      ['Tipo da série', g.tipo ? `${g.tipo}${g.tipoAtribuido ? ' (atribuído)' : ''}` : r.familia === 'moldada' ? 'moldada no local' : '—'],
      ['Momento de cálculo Md+', `${num(g.esforcos.mPos)} kN·m por nervura`],
      ['Momento último Mu da vigota', f ? `${num(f.positivo.Mu)} kN·m${f.positivo.fonte === 'ficha' ? ' (ficha)' : ' (calculado)'}` : '—'],
      ['Mu com o adicional', f ? `${num(f.positivo.MuTotal)} kN·m · aproveitamento ${num(f.positivo.aprov * 100, 0)} %` : '—'],
      ['Momento de fissuração Mfis', f?.positivo.Mfis !== undefined ? `${num(f.positivo.Mfis)} kN·m` : '—'],
      ['Rigidez total / fissurada', f?.positivo.EI !== undefined ? `${num(f.positivo.EI, 0)} / ${f.positivo.EIfis !== undefined ? num(f.positivo.EIfis, 0) : '—'} kN·m²` : '—'],
      ['Armadura adicional', f && f.parcelas.length ? f.parcelas.map((p) => `${p.n} ${phiTxt(p.phi)} (${num(p.percentual, 0)} % do comprimento, ${p.tipo})`).join(' + ') : '—'],
      ...(f?.moldada ? [['Armadura inferior da nervura', `${barrasTxt(f.moldada.bars)} · As nec. ${num(f.moldada.AsNec)} cm² · largura mínima ${num(f.moldada.larguraMin * 100, 1)} cm de ${num(f.moldada.bw * 100, 1)} cm`] as [string, string]] : []),
    ];
  }
  if (painel === 'neg') {
    return g.negativos.flatMap((n, k): [string, string][] => (n
      ? [[`Negativo ${k ? 'fim' : 'início'}`, `${barrasTxt(n.barras)} · As nec. ${num(n.AsNec)} cm²`],
        [`Parcelas ${k ? 'fim' : 'início'}`, (n.parcelas ?? []).map((p) => `${p.n} ${phiTxt(p.phi)} C = ${num(p.comprimento)} m (${num(p.percentual, 0)} %)`).join(' + ') || '—'],
        [`Mu da seção típica / maciça ${k ? 'fim' : 'início'}`, `${num(n.MRdNervura)} / ${n.MuMacico !== undefined ? num(n.MuMacico) : '—'} kN·m (${n.fonteLimite === 'ficha' ? 'ficha' : 'calculado'})`],
        [`Mfis e rigidezes ${k ? 'fim' : 'início'}`, `${n.Mfis !== undefined ? num(n.Mfis) : '—'} kN·m · ${n.EI !== undefined ? num(n.EI, 0) : '—'} / ${n.EIfis !== undefined ? num(n.EIfis, 0) : '—'} kN·m²`],
        [`Maciçamento ${k ? 'fim' : 'início'}`, `${num(n.macico * 100, 0)} cm`]]
      : [[`Negativo ${k ? 'fim' : 'início'}`, 'sem momento negativo']]));
  }
  if (painel === 'cort') {
    return g.cortante.flatMap((c, k): [string, string][] => [[`Cortante ${k ? 'fim' : 'início'}`, `Vsd ${num(c.Vsd, 1)} kN · VRd1 ${num(c.VRd1, 1)} kN (${c.fonte === 'ficha' ? 'ficha' : 'calculado'}) · VRd2 ${num(c.VRd2, 1)} kN`],
      ...(c.estribo ? [[`Estribos ${k ? 'fim' : 'início'}`, `${phiTxt(c.estribo.phi)} c/${num(c.estribo.s * 100, 0)} cm · zona ${num(c.estribo.zona * 100, 0)} cm · ${c.estribo.barras} barras`] as [string, string]] : [])]);
  }
  if (painel === 'prot') {
    const s = f?.servico;
    return r.protensao && s
      ? [['Classe de agressividade / nível', `CAA ${r.protensao.caa} · protensão ${r.protensao.nivel}`], ['Combinação de serviço', r.protensao.combinacao],
        ['Momento de serviço', `${num(s.Mserv)} kN·m por nervura`], ['Admissível da ficha', s.Madm === null ? 'a ficha não informa' : `${num(s.Madm)} kN·m`], ['Momento de descompressão', `${num(s.Mdesc)} kN·m`], ['Situação do serviço', s.ok ? 'atende' : 'não atende']]
      : [['Protensão', 'vigota sem protensão']];
  }
  const fl = v.flecha;
  return fl
    ? [['Flecha instantânea / diferida', `${num(fl.instantanea * 1000, 1)} / ${num(fl.diferida * 1000, 1)} mm`], ['Flecha total', `${num(fl.total * 1000, 1)} mm (limite ${fl.textos.total} = ${num(fl.limites.total * 1000, 1)} mm)`],
      ['Flecha ativa', `${num(fl.ativa * 1000, 1)} mm (limite ${fl.textos.ativa} = ${num(fl.limites.ativa * 1000, 1)} mm)`], ['Flecha das variáveis', `${num(fl.variavel * 1000, 1)} mm (limite ${fl.textos.variavel} = ${num(fl.limites.variavel * 1000, 1)} mm)`],
      ['Fissuração (Branson)', `δ fissurada / elástica = ${num(fl.kappa)}`]]
    : [['Flecha', 'sem resultado para esta vigota']];
}

function PainelVigota({ r, v }: { r: ResultadoVigotas; v: VigotaIndividual }) {
  const [painel, setPainel] = useState<Painel>('pos');
  const g = r.grupos[v.grupo];
  if (!g) return null;
  return (
    <section data-painel-vigota={v.indice}>
      <h4>Vigota {v.indice + 1} · grupo G{v.grupo + 1} · {v.multipla > 1 ? (v.multipla === 3 ? 'tripla · ' : 'dupla · ') : ''}vão {v.tipoVao} · peso próprio {num(v.pesoLinear)} kN/m</h4>
      <Seg value={painel} options={PAINEIS} onChange={setPainel} small />
      <KV rows={linhasPainel(r, v, g, painel)} />
      {v.mensagens.length > 0 && <Mensagens msgs={v.mensagens} />}
    </section>
  );
}

// ---------------------------------------------------------------- editor das vigotas selecionadas

function EditorSelecionadas({ r, sel }: { r: ResultadoVigotas; sel: number[] }) {
  const calculando = useBuilding((s) => s.calculando);
  const ficha = useBuilding((s) => (r.ficha ? fichaPor(s.sessao.modelo, r.ficha) : undefined));
  const tipos = useMemo(() => [...new Set((ficha?.series ?? []).filter((s) => s.positivo && Math.abs(s.altura - r.h) < 1e-6 && Math.abs(s.intereixo - r.intereixo) < 1e-6).map((s) => s.tipo ?? s.id))], [ficha, r.h, r.intereixo]);
  const [tipo, setTipo] = useState('');
  const [inf, setInf] = useState({ n: 0, phi: 8, pct: 100 });
  const [sup, setSup] = useState({ n: 0, phi: 8 });
  const [est, setEst] = useState({ phi: 5, s: 20 });
  const [mult, setMult] = useState(1);
  const [man, setMan] = useState({ pos: 0, n0: 0, n1: 0, v0: 0, v1: 0 });
  const id = r.laje, vazia = sel.length === 0, max = ficha?.multipla?.n ?? 1;
  const aplicar = () => executarERecalcular('vigota.editar', {
    ...paramsSel(id, sel), ...(tipo ? { tipo } : {}), ...(inf.n > 0 ? { inf: { n: inf.n, phi: inf.phi, ...(inf.pct < 100 ? { percentual: inf.pct } : {}) } } : {}),
    ...(sup.n > 0 ? { sup: { n: sup.n, phi: sup.phi } } : {}), ...(est.s > 0 ? { transversal: { phi: est.phi, s: est.s / 100 } } : {}),
  });
  return (
    <section data-editor-vigotas-ficha>
      <h4>Editar as vigotas selecionadas ({sel.length})</h4>
      <p className="small">Da primeira à última vigota selecionada (clique e Shift+clique na lista ou na planta). A vigota editada sai da igualação e fica bloqueada até “Desbloquear”.</p>
      <div className="row wrap">
        {tipos.length > 0 && <Select label="Tipo da série" value={tipo} options={[{ v: '', label: 'calculado' }, ...tipos.map((t) => ({ v: t, label: t }))]} onChange={setTipo} />}
        <NumField label="Adicional inferior (barras)" width={170} value={inf.n} onChange={(q) => setInf({ ...inf, n: Math.max(0, Math.min(2, Math.round(q))) })} />
        <Select label="Bitola do adicional" value={inf.phi} options={BITOLAS} onChange={(p) => setInf({ ...inf, phi: p })} />
        <NumField label="Parcial do adicional" unit="% do comprimento" width={170} value={inf.pct} onChange={(q) => setInf({ ...inf, pct: Math.max(10, Math.min(100, q)) })} />
      </div>
      <div className="row wrap">
        <NumField label="Negativo sobre os apoios (barras)" width={190} value={sup.n} onChange={(q) => setSup({ ...sup, n: Math.max(0, Math.min(6, Math.round(q))) })} />
        <Select label="Bitola do negativo" value={sup.phi} options={BITOLAS} onChange={(p) => setSup({ ...sup, phi: p })} />
        <Select label="Bitola do estribo da vigota" value={est.phi} options={BITOLAS_ESTRIBO} onChange={(p) => setEst({ ...est, phi: p })} />
        <NumField label="Espaçamento do estribo da vigota" unit="cm" width={190} value={est.s} onChange={(q) => setEst({ ...est, s: Math.max(0, q) })} />
      </div>
      <div className="row wrap">
        <Button variant="primary" disabled={calculando || vazia} onClick={aplicar}>Aplicar às vigotas selecionadas</Button>
        <Button disabled={calculando || vazia} onClick={() => executarERecalcular('vigota.editar', { ...paramsSel(id, sel), limpar: true })}>Apagar a edição das selecionadas</Button>
        <Button disabled={calculando} onClick={() => executarERecalcular('armadura.desbloquear', { ids: [id] })}>Desbloquear a laje</Button>
      </div>
      {max > 1 && (
        <div className="row wrap" data-vigota-multipla>
          <Select label="Vigotas lado a lado" value={mult} options={[{ v: 1, label: 'simples (apaga a marcação)' }, { v: 2, label: 'dupla' }, ...(max > 2 ? [{ v: 3, label: 'tripla' }] : [])]} onChange={setMult} />
          <Button disabled={calculando || vazia} onClick={() => executarERecalcular('vigota.multipla', { id, indice: Math.min(...sel), n: mult })}>Aplicar à primeira vigota selecionada</Button>
        </div>
      )}
      <div className="row wrap" data-esforcos-manuais>
        <NumField label="Md+ atribuído" unit="kN·m" width={130} value={man.pos} onChange={(q) => setMan({ ...man, pos: Math.max(0, q) })} />
        <NumField label="Md− atribuído (início)" unit="kN·m" width={150} value={man.n0} onChange={(q) => setMan({ ...man, n0: Math.min(0, q) })} />
        <NumField label="Md− atribuído (fim)" unit="kN·m" width={150} value={man.n1} onChange={(q) => setMan({ ...man, n1: Math.min(0, q) })} />
        <NumField label="Vsd atribuído (início)" unit="kN" width={140} value={man.v0} onChange={(q) => setMan({ ...man, v0: Math.max(0, q) })} />
        <NumField label="Vsd atribuído (fim)" unit="kN" width={140} value={man.v1} onChange={(q) => setMan({ ...man, v1: Math.max(0, q) })} />
      </div>
      <div className="row wrap">
        <Button disabled={calculando || vazia} onClick={() => executarERecalcular('vigota.momentos', { ...paramsSel(id, sel), pos: man.pos, neg: [man.n0, man.n1], v: [man.v0, man.v1] })}>Atribuir esforços às selecionadas</Button>
        <Button disabled={calculando || vazia} onClick={() => executarERecalcular('vigota.momentos', { ...paramsSel(id, sel), limpar: true })}>Voltar aos esforços calculados</Button>
      </div>
      {calculando && <p className="muted small">Recalculando…</p>}
    </section>
  );
}

// ---------------------------------------------------------------- aba Vigotas das lajes por ficha e moldadas

export function VigotasPorFicha({ r }: { r: ResultadoVigotas }) {
  const [sel, setSel] = useState<number[]>([0]);
  const [ancora, setAncora] = useState(0);
  const lista = r.lista ?? [];
  const seleciona = (i: number, estende: boolean) => {
    if (estende) { const a = Math.min(ancora, i), z = Math.max(ancora, i); setSel(Array.from({ length: z - a + 1 }, (_, k) => a + k)); } else { setSel([i]); setAncora(i); }
  };
  const v = lista.find((x) => x.indice === sel[0]) ?? lista[0];
  const nFalha = lista.filter((x) => x.status === 'fail').length;
  return (
    <div data-vigotas-ficha={r.laje}>
      <p className="small">Vigota a vigota: cada vigota real recebe os esforços do alinhamento da grelha mais próximo (momentos mínimos por tipo de vão, igualação ponto a ponto) e é verificada contra a ficha ({r.fichaNome ?? 'nervurada moldada no local'}). Vigotas duplas e triplas, editadas ou com esforços atribuídos ficam à parte.</p>
      <p className="small">{lista.length} vigota(s) · {nFalha ? <b className="bad" data-vigotas-com-erro>{nFalha} com erro</b> : 'nenhuma com erro'}</p>
      <PlantaIndividual r={r} sel={sel} onSel={seleciona} />
      <ListaVigotas r={r} sel={sel} onSel={seleciona} />
      <Hint>Esforços por nervura; cortantes por metro de largura ao lado do cortante majorado (ELU). O erro da vigota aparece em vermelho na lista e na planta.</Hint>
      {v && <PainelVigota r={r} v={v} />}
      <EditorSelecionadas key={`${r.laje}|${r.ficha}`} r={r} sel={sel} />
    </div>
  );
}
```

## Diff de `src/app/edificio/Vigotas.tsx`
```diff
diff --git a/src/app/edificio/Vigotas.tsx b/src/app/edificio/Vigotas.tsx
index f23fe6b..5191d55 100644
--- a/src/app/edificio/Vigotas.tsx
+++ b/src/app/edificio/Vigotas.tsx
@@ -7,6 +7,7 @@ import { fmt, phiTxt } from './Detalhamento';
 import { Diagrama, Mensagens, ST_TXT } from './Revisao';
 import { Button, Check, Hint, KV, NumField, Pill, Select } from '../ui';
 import { faixasVisiveis, larguraGrupo } from './vigotasFaixas';
+import { VigotasPorFicha } from './VigotasFicha';
 import type { GrupoVigotas, ResultadoVigotas } from '../../core/building/vigotas';
 
 const NCORES = 6;
@@ -160,6 +161,7 @@ export function JanelaVigotas({ id }: { id: string }) {
       {r.faixas.length > 0 && <Check label="Mostrar todas as faixas" checked={todas} onChange={setTodas} />}
       {r.faixas.length > 0 && <PlantaVigotas r={r} sel={i} onSel={setSel} todas={todas} />}
       {r.faixas.length > 0 && <DiagramasVigota r={r} i={i} />}
+      {r.familia && r.lista && <VigotasPorFicha r={r} />}
       <h4>Grupos de igualação (esforços e armadura por nervura)</h4>
       <div className="tablewrap">
         <table className="data quadro" data-tabela-grupos-vigotas>
@@ -181,16 +183,16 @@ export function JanelaVigotas({ id }: { id: string }) {
       <Hint>Esforços e armadura por nervura (vigota), após momentos mínimos e igualação. O As necessário já considera a seção T e o mínimo de 0,15 %; o banzo inferior da treliça entra descontado (CA-60 convertido ao aço da armadura).</Hint>
       <h4>Dados da laje</h4>
       <KV rows={[
-        ['Modelo / treliça', `${r.modelo} · ${r.trelica} (banzo inferior ${barrasTxt({ n: 2, phi: r.banzoInf.phi })})`], ['Altura h / capa', `${num(r.h * 100, 0)} / ${num(r.capa * 100, 1)} cm`],
+        r.familia ? ['Ficha / série', `${r.fichaNome ?? 'nervurada moldada no local'}${r.serie ? ` · ${r.serie}` : ''}`] : ['Modelo / treliça', `${r.modelo} · ${r.trelica} (banzo inferior ${barrasTxt({ n: 2, phi: r.banzoInf.phi })})`], ['Altura h / capa', `${num(r.h * 100, 0)} / ${num(r.capa * 100, 1)} cm`],
         ['Intereixo / nervura bw', `${num(r.intereixo * 100, 0)} / ${num(r.bw * 100, 0)} cm`], ['Vigotas / comprimento total', `${r.vigotas} / ${num(r.comprimentoVigotas)} m`],
         ['Distribuição na capa', `${phiTxt(r.distribuicao.phi)} c/${num(r.distribuicao.s * 100, 0)} cm (${r.distribuicao.aco}; As nec. ${num(r.distribuicao.AsNec)} cm²/m)`],
         ['Capa (13.2.4.2)', `${num(r.capa * 100, 1)} cm ≥ ${num(r.verificacaoCapa.minima * 100, 1)} cm: ${r.verificacaoCapa.ok ? 'atende' : 'não atende'}`],
-        ['Peso das barras (por pavimento)', `${num(r.peso)} kg`], ['Peso da treliça (por pavimento)', `${num(r.pesoTrelica)} kg`],
+        ['Peso das barras (por pavimento)', `${num(r.peso)} kg`], ...(r.familia && !r.trelica ? [] : [['Peso da treliça (por pavimento)', `${num(r.pesoTrelica)} kg`] as [string, string]]),
         ['Armadura', r.bloqueada ? 'bloqueada' : 'calculada'], ['Situação', ST_TXT[r.status]],
       ]} />
       <h4>Mensagens</h4>
       <Mensagens msgs={r.mensagens} />
-      <EditorVigotas key={`${r.laje}|${r.bloqueada}|${JSON.stringify(r.grupos.map((g) => g.positiva.barras))}`} r={r} />
+      {!r.familia && <EditorVigotas key={`${r.laje}|${r.bloqueada}|${JSON.stringify(r.grupos.map((g) => g.positiva.barras))}`} r={r} />}
     </div>
   );
 }
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; e2e: o fluxo `E3b` só fecha com os três cartões, mas `npm run e2e -- R6` e `-- E3a` já têm de passar.
