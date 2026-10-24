// Estilo de desenho, símbolos dos pilares e saídas das pranchas (V5, K1.4.57, K1.4.90, K1.11.54): tabela de camadas
// (nome, cor ACI, pena), tamanho de texto por tipo, símbolos do pilar que passa, nasce ou morre, detalhes e modelo de
// moldura importados de DXF. Os comandos são `prancha.definir`; a matemática vem de src/core/sheets.
import { useRef, useState } from 'react';
import { useBuilding } from './store';
import { useStore } from '../store';
import { Button, Group, Hint, NumField, Select, TextField } from '../ui';
import { PRANCHA_PADRAO, SIMBOLOS_PADRAO } from '../../core/building/types';
import { CAMADAS, LIMITES_FOLHA, margens, FORMATOS, type Camada } from '../../core/sheets/prancha';
import { camadaEstilo, resolverEstilo, salvarEstilo, abrirEstilo, ESTILO_PADRAO, PENAS_NBR16861, TIPOS_TEXTO, type TipoTexto } from '../../core/sheets/estilo';
import { primitivasDoSimbolo, SIMBOLOS, simbolosEmUso, tracoDaPrimitiva } from '../../core/sheets/simbolos';
import type { SimboloPilar } from '../../core/building/types';
import { download } from '../ui';

const CAMADAS_OPC = (Object.keys(CAMADAS) as Camada[]).map((c) => ({ v: c, label: c }));
const TEXTOS_OPC = (Object.keys(TIPOS_TEXTO) as TipoTexto[]).map((t) => ({ v: t, label: TIPOS_TEXTO[t].rotulo }));

const TIPOS_LINHA = [{ v: 'cont', label: 'Contínua' }, { v: 'trac', label: 'Tracejada' }, { v: 'eixo', label: 'Traço e ponto' }] as const;
const CLASSE_TRACO = { preenchido: 'simb-solido', hachurado: 'simb-hach', tracejado: 'simb-trac', fino: 'simb-fino', contorno: 'simb-contorno' } as const;
const QUADRADO: [number, number][] = [[6, 6], [38, 6], [38, 38], [6, 38]];

/** Amostra do símbolo (as mesmas primitivas da planta de formas). */
function SimboloPrevia({ simbolo, rotulo }: { simbolo: SimboloPilar; rotulo: string }) {
  return (
    <figure data-simbolo-previa={simbolo}>
      <svg viewBox="0 0 44 44" role="img" aria-label={`Amostra do símbolo ${rotulo}`}>
        {primitivasDoSimbolo(simbolo, QUADRADO).map((q, i) => {
          const pts = q.t === 'pl' || q.t === 'hach' ? q.pts.map((p) => p.join(',')).join(' ') : '', cl = CLASSE_TRACO[tracoDaPrimitiva(q)];
          return q.t === 'pl' && !q.fechada ? <polyline key={i} className={cl} points={pts} /> : <polygon key={i} className={cl} points={pts} />;
        })}
      </svg>
      <figcaption>{rotulo}</figcaption>
    </figure>
  );
}

/** Teto do DXF importado como fundo (o texto fica no modelo; biblioteca e artifact aceitam 240 KB). */
export const DXF_MAX_BYTES = 200 * 1024;

export function EstiloPranchas() {
  const { sessao, exec } = useBuilding();
  const msg = (m: string) => useStore.getState().set({ message: m });
  const cfg = { ...PRANCHA_PADRAO, ...(sessao.modelo.prancha ?? {}) };
  const simb = simbolosEmUso(cfg.simbolos), est = resolverEstilo(cfg.estilo);
  const [camada, setCamada] = useState<Camada>('PILAR');
  const [texto, setTexto] = useState<TipoTexto>('cotas');
  const ce = camadaEstilo({ estilo: est }, camada);
  const alteradas = (Object.keys(CAMADAS) as Camada[]).filter((c) => (['nome', 'cor', 'pena', 'tipo'] as const).some((k) => est.camadas[c][k] !== ESTILO_PADRAO.camadas[c][k]));
  const padraoMargem = margens(cfg.formato === 'auto' || cfg.formato === 'livre' ? 'A3' : cfg.formato).outras;
  const folha = { largura: cfg.folha?.largura ?? FORMATOS.livre[0], altura: cfg.folha?.altura ?? FORMATOS.livre[1], margemEsq: cfg.folha?.margemEsq ?? margens('A3').esq, margem: cfg.folha?.margem ?? padraoMargem };
  const refEstilo = useRef<HTMLInputElement>(null), refDxf = useRef<HTMLInputElement>(null);
  const [alvoDxf, setAlvoDxf] = useState<'detalhe' | 'moldura'>('detalhe');
  const [pos, setPos] = useState({ x: 10, y: 10, escala: 1 });
  const ok = (r: { ok: boolean; erros: { mensagem: string }[] }) => { if (!r.ok) msg(r.erros[0]?.mensagem ?? 'Não foi possível aplicar.'); };
  const camadaPatch = (p: { nome?: string; cor?: number; pena?: number; tipo?: 'cont' | 'trac' | 'eixo' }) => ok(exec('prancha.definir', { estilo: { camadas: { [camada]: p } } }));
  const dxf = async (f: File) => {
    if (f.size > DXF_MAX_BYTES) { msg(`DXF de ${(f.size / 1024).toFixed(0)} KB recusado: o limite é ${DXF_MAX_BYTES / 1024} KB (o modelo guarda o texto do DXF e a biblioteca aceita 240 KB). Simplifique o desenho.`); return; }
    const t = await f.text();
    ok(exec('prancha.definir', alvoDxf === 'moldura' ? { moldura: { dxf: t, nome: f.name, ...pos, modo: 'moldura' } } : { detalhe: { dxf: t, nome: f.name, ...pos } }));
  };
  return (
    <Group title="Estilo de desenho, símbolos e saídas">
      <div data-estilo-pranchas>
        <div className="row wrap">
          <Select label="Símbolo do pilar que passa" value={simb.passa} options={SIMBOLOS.map((s) => ({ v: s.v, label: s.rotulo }))} onChange={(v) => ok(exec('prancha.definir', { simbolos: { passa: v } }))} />
          <Select label="Símbolo do pilar que nasce" value={simb.nasce} options={SIMBOLOS.map((s) => ({ v: s.v, label: s.rotulo }))} onChange={(v) => ok(exec('prancha.definir', { simbolos: { nasce: v } }))} />
          <Select label="Símbolo do pilar que morre" value={simb.morre} options={SIMBOLOS.map((s) => ({ v: s.v, label: s.rotulo }))} onChange={(v) => ok(exec('prancha.definir', { simbolos: { morre: v } }))} />
          <Button onClick={() => ok(exec('prancha.definir', { simbolos: { ...SIMBOLOS_PADRAO } }))}>Símbolos padrão</Button>
        </div>
        <div className="simb-previa" data-simbolos-previa={`${simb.passa}|${simb.nasce}|${simb.morre}`}>
          <SimboloPrevia simbolo={simb.passa} rotulo="Passa" /><SimboloPrevia simbolo={simb.nasce} rotulo="Nasce" /><SimboloPrevia simbolo={simb.morre} rotulo="Morre" />
        </div>
        <div className="row wrap">
          <Select label="Camada do estilo" value={camada} options={CAMADAS_OPC} onChange={setCamada} />
          <TextField label="Nome da camada" value={ce.nome} onChange={(v) => camadaPatch({ nome: v.trim().toUpperCase() })} />
          <NumField label="Cor ACI da camada" value={ce.cor} step="1" onChange={(v) => camadaPatch({ cor: Math.round(v) })} />
          <NumField label="Pena da camada" unit="mm" value={ce.pena} onChange={(v) => camadaPatch({ pena: v })} />
          <Select label="Pena da série NBR 16861" value={PENAS_NBR16861.includes(ce.pena) ? ce.pena : -1} options={[...(PENAS_NBR16861.includes(ce.pena) ? [] : [{ v: -1, label: `${ce.pena} mm (fora da série)` }]), ...PENAS_NBR16861.map((v) => ({ v, label: `${v} mm` }))]} onChange={(v) => { if (v > 0) camadaPatch({ pena: v }); }} />
          <Select label="Tipo de linha da camada" value={ce.tipo} options={TIPOS_LINHA.map((t) => ({ v: t.v, label: t.label }))} onChange={(v) => camadaPatch({ tipo: v })} />
        </div>
        <div className="row wrap">
          <Select label="Tipo de texto" value={texto} options={TEXTOS_OPC} onChange={setTexto} />
          <NumField label="Fator do tamanho do texto" value={est.textos[texto]} onChange={(v) => ok(exec('prancha.definir', { estilo: { textos: { [texto]: v } } }))} />
          <Button onClick={() => ok(exec('prancha.definir', { estiloPadrao: true }))}>Voltar ao estilo padrão</Button>
          <Button onClick={() => { void download('estilo-de-desenho.json', salvarEstilo('Estilo', cfg.estilo ?? {}), 'application/json'); }}>Salvar estilo em arquivo</Button>
          <Button onClick={() => refEstilo.current?.click()}>Abrir estilo de arquivo</Button>
          <input ref={refEstilo} type="file" accept=".json" hidden aria-label="Arquivo de estilo" onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            const r = abrirEstilo(await f.text());
            if ('erro' in r) msg(r.erro); else ok(exec('prancha.definir', { estiloPadrao: true, estilo: r.estilo }));
          }} />
        </div>
        {alteradas.length > 0 && (
          <div className="tablewrap" data-estilo-resumo={alteradas.length}>
            <table className="data quadro">
              <thead><tr><th>Camada</th><th>Nome</th><th>Cor ACI</th><th>Pena (mm)</th><th>Linha</th></tr></thead>
              <tbody>{alteradas.map((c) => <tr key={c}><td className="tl">{c}</td><td className="tl">{est.camadas[c].nome}</td><td className="num">{est.camadas[c].cor}</td><td className="num">{est.camadas[c].pena}</td><td className="tl">{TIPOS_LINHA.find((t) => t.v === est.camadas[c].tipo)?.label}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        <div className="row wrap" data-folha-usuario={`${folha.largura}x${folha.altura}|${folha.margemEsq}|${folha.margem}`}>
          <NumField label="Largura da folha livre" unit="mm" min={LIMITES_FOLHA.lado[0]} value={folha.largura} onChange={(v) => ok(exec('prancha.definir', { folha: { largura: v } }))} />
          <NumField label="Altura da folha livre" unit="mm" min={LIMITES_FOLHA.lado[0]} value={folha.altura} onChange={(v) => ok(exec('prancha.definir', { folha: { altura: v } }))} />
          <NumField label="Margem esquerda" unit="mm" min={0} value={folha.margemEsq} onChange={(v) => ok(exec('prancha.definir', { folha: { margemEsq: v } }))} />
          <NumField label="Margem dos outros lados" unit="mm" min={0} value={folha.margem} onChange={(v) => ok(exec('prancha.definir', { folha: { margem: v } }))} />
          <Button disabled={!cfg.folha} onClick={() => ok(exec('prancha.definir', { folhaPadrao: true }))}>Folha e margens padrão</Button>
        </div>
        <div className="row wrap">
          <Select label="DXF importado como" value={alvoDxf} options={[{ v: 'detalhe', label: 'Detalhe na folha' }, { v: 'moldura', label: 'Modelo de moldura' }]} onChange={setAlvoDxf} />
          <NumField label="Posição X do DXF na folha" unit="mm" value={pos.x} onChange={(x) => setPos({ ...pos, x })} />
          <NumField label="Posição Y do DXF na folha" unit="mm" value={pos.y} onChange={(y) => setPos({ ...pos, y })} />
          <NumField label="Escala do DXF" value={pos.escala} onChange={(escala) => setPos({ ...pos, escala: escala > 0 ? escala : 1 })} />
          <Button onClick={() => refDxf.current?.click()}>Importar DXF</Button>
          <input ref={refDxf} type="file" accept=".dxf" hidden aria-label="Arquivo DXF" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) await dxf(f); }} />
          <Button disabled={!cfg.moldura && !cfg.detalhes?.length} onClick={() => ok(exec('prancha.definir', { removerMoldura: true, removerDetalhes: (cfg.detalhes ?? []).map((d) => d.id) }))}>Remover DXF importados</Button>
        </div>
        <Hint>Estilo padrão: NBR 16861. {cfg.detalhes?.length ?? 0} detalhe(s) DXF{cfg.moldura ? ' e modelo de moldura' : ''} na obra. Penas e cores fora do padrão: a confirmar. Folha livre: lados de {LIMITES_FOLHA.lado[0]} a {LIMITES_FOLHA.lado[1]} mm (escolha o formato "livre" na lista de formatos); as margens valem para todos os formatos.</Hint>
      </div>
    </Group>
  );
}
