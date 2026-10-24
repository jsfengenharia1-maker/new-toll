// Escadas (E4d): resumo da armadura por lance (ferramenta `dimensionar` do MCP e da linha de comando) e linhas do capítulo "Escadas"
// do memorial (critérios, posições, ancoragens, esperas e passadores, verificações e aço). Núcleo puro.
import type { ArmaduraEscadas, ResultadoArmaduraLance } from './escadasArmadura';
import { opcoesEmUso, perfilDe } from './opcoes';
import type { BuildingModel } from './types';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const r3 = (v: number) => +v.toFixed(3);

export interface ResumoArmaduraLance {
  escada: string; lance: number; status: 'ok' | 'fail'; bloqueado: boolean; pesoKg: number;
  /** Posições de cada trecho: tipo, face, φ, espaçamento (cm), quantidade, comprimento (m) e áreas (cm²/m) necessária e efetiva. */
  trechos: { trecho: string; barras: { pos: string; tipo: string; face: string; phi: number; sCm: number; n: number; comprimento: number; AsNec: number; AsEf: number; bloqueada?: true }[]; cortante: { VSd: number; VRd1: number; Asw: number; ok: boolean }; wk: number }[];
  ligacoes: { tipo: string; rotulo: string; descricao: string; ancoragem?: string }[];
  flecha: { totalMm: number; limiteMm: number; ok: boolean };
  mensagens: string[]; erro?: string;
}

/** Resumo da armadura por lance. */
export function resumoArmaduraEscadas(arm: ResultadoArmaduraLance[]): ResumoArmaduraLance[] {
  return arm.map((l) => ({
    escada: l.nome, lance: l.lance, status: l.status, bloqueado: l.bloqueado, pesoKg: +l.peso.toFixed(2),
    trechos: l.trechos.map((t) => ({
      trecho: t.chave,
      barras: t.barras.map((x) => ({ pos: x.pos, tipo: x.tipo, face: x.face, phi: x.phi, sCm: +(x.s * 100).toFixed(1), n: x.n, comprimento: +x.comprimento.toFixed(2), AsNec: r3(x.AsNec), AsEf: r3(x.AsEf), ...(x.bloqueada ? { bloqueada: true as const } : {}) })),
      cortante: { VSd: r3(t.cortante.VSd), VRd1: r3(t.cortante.VRd1), Asw: r3(t.cortante.Asw), ok: t.cortante.ok }, wk: r3(t.wk),
    })),
    ligacoes: l.ligacoes.map((x) => ({ tipo: x.tipo, rotulo: x.rotulo, descricao: x.descricao, ...(x.ancoragem ? { ancoragem: `${x.ancoragem.tipo}, lb,nec ${fmt(x.ancoragem.lbNec * 100, 0)} cm, disponível ${fmt(x.ancoragem.disponivel * 100, 0)} cm` } : {}) })),
    flecha: { totalMm: r3(l.flecha.total), limiteMm: r3(l.flecha.limite), ok: l.flecha.ok },
    mensagens: l.mensagens, ...(l.erro ? { erro: l.erro } : {}),
  }));
}

export interface LinhaMemorialArmaduraEscada { escada: string; lance?: number; secao: 'Critérios' | 'Posições' | 'Ligações' | 'Verificações' | 'Resumo do aço' | 'Avisos'; rotulo: string; valor: string; aConfirmar?: boolean }

/** Linhas do capítulo "Escadas" do memorial (armadura). */
export function escadasArmaduraNoMemorial(b: BuildingModel, arm: ArmaduraEscadas): LinhaMemorialArmaduraEscada[] {
  const o = opcoesEmUso(b.opcoes, perfilDe(b)), out: LinhaMemorialArmaduraEscada[] = [];
  const nomes = [...new Set(arm.lances.map((l) => l.nome))];
  const sim = (v: number) => (v ? 'sim' : 'não');
  const phiTxt = (p: number) => fmt(p, p % 1 ? 1 : 0);
  for (const nome of nomes) {
    const add = (secao: LinhaMemorialArmaduraEscada['secao'], rotulo: string, valor: string, aConfirmar?: boolean) => out.push({ escada: nome, secao, rotulo, valor, ...(aConfirmar ? { aConfirmar } : {}) });
    add('Critérios', 'Dimensionamento', 'como laje maciça (NBR 6118, 17.2 e 19): momentos de cada elemento da casca em γg·G + γq·Q e γg·G, Wood-Armer nas direções do trecho (x no sentido da subida) e flexão de faixa de 1 m; armadura mínima das lajes (opção); esforço normal desprezado (apoio móvel em cima)', true);
    add('Critérios', 'Faixas e armadura contínua', 'cada trecho é dividido em faixas de ≈ 0,6 m; a armadura principal inferior é contínua e vale a maior faixa; a distribuição e as barras superiores seguem cada faixa', true);
    add('Critérios', 'Distribuição mínima', `${fmt(o.escadaDistribuicao, 0)} % da principal, ≥ 0,9 cm²/m e ≥ 0,5·As,mín, espaçamento ≤ 33 cm (NBR 6118, 20.1)`, true);
    add('Critérios', 'Igualações', `armaduras superior e inferior iguais: ${sim(o.escadaIgualarSupInf)}; espaçamentos múltiplos: ${sim(o.escadaEspacamentoMultiplo)}; todas as seções iguais: ${sim(o.escadaIgualarSecoes)}`, true);
    add('Critérios', 'Ligações', `esperas no início: ${sim(o.escadaEsperas)}; passadores no fim: ${sim(o.escadaPassadores)}; comprimento disponível em viga chata ${fmt(o.escadaAncoragemViga, 0)} cm (a largura da viga prevalece se maior); profundidade da fundação ${fmt(o.escadaProfundidadeFundacao, 0)} cm; cobrimento ${o.escadaCobrimento > 0 ? `${fmt(o.escadaCobrimento, 1)} cm` : 'das lajes (classe de agressividade)'}`, true);
    add('Critérios', 'Quinas entre trechos e patamares', 'as barras tracionadas não passam retas pela face côncava: toda barra que chega à quina cruza a linha e se ancora lb,nec do outro lado (NBR 6118, 18.3.2.4 [a confirmar o item])', true);
    add('Critérios', 'Ancoragem', 'lb = (φ/4)·fyd/fbd (boa aderência); reta se couber; com gancho de 90° 0,7·lb,nec (≥ 8φ e 6 cm); com dobra (perna prolongada) se faltar espaço; esperas por traspasse l0 = α0t·lb,nec com α0t = 2,0 (todas na mesma seção)', true);
  }
  for (const l of arm.lances) {
    const add = (secao: LinhaMemorialArmaduraEscada['secao'], rotulo: string, valor: string, aConfirmar?: boolean) => out.push({ escada: l.nome, lance: l.lance, secao, rotulo, valor, ...(aConfirmar ? { aConfirmar } : {}) });
    const r = `Lance ${l.lance}`;
    if (l.erro) { add('Avisos', r, l.erro); continue; }
    for (const t of l.trechos) {
      for (const x of t.barras) add('Posições', `${r}, ${t.chave}: ${x.pos}`, `${x.tipo}${x.bloqueada ? ' (bloqueada)' : ''}, face ${x.face === 'inf' ? 'inferior' : 'superior'}, ${x.n} φ${phiTxt(x.phi)} c/${fmt(x.s * 100, 0)} cm, C = ${fmt(x.comprimento)} m (As necessária ${fmt(x.AsNec)}, efetiva ${fmt(x.AsEf)} cm²/m)`);
      add('Verificações', `${r}, ${t.chave}: cortante`, `VSd ${fmt(t.cortante.VSd, 1)} kN/m; VRd1 ${fmt(t.cortante.VRd1, 1)} kN/m; ${t.cortante.Asw > 0 ? `armadura transversal ${fmt(t.cortante.Asw)} cm²/m²` : t.cortante.ok ? 'sem armadura transversal' : 'não atende'}`);
      add('Verificações', `${r}, ${t.chave}: fissuração`, `wk ${fmt(t.wk)} mm (limite ${fmt(t.wkLim)} mm), combinação frequente`);
    }
    for (const x of l.ligacoes) add('Ligações', `${r}: ${x.rotulo}`, `${x.descricao}${x.ancoragem ? `; ancoragem ${x.ancoragem.tipo}: lb,nec ${fmt(x.ancoragem.lbNec * 100, 0)} cm, disponível ${fmt(x.ancoragem.disponivel * 100, 0)} cm, perna ${fmt(x.ancoragem.perna * 100, 0)} cm` : ''}${x.traspasse ? `; traspasse ${fmt(x.traspasse * 100, 0)} cm` : ''}`, true);
    add('Verificações', `${r}: flecha`, `${fmt(l.flecha.total, 1)} mm com fator ${fmt(l.flecha.fator, 2)} sobre a flecha elástica (G + ψ2·Q) para o vão de ${fmt(l.flecha.vao)} m; limite ${fmt(l.flecha.limite, 1)} mm`);
    add('Resumo do aço', r, `${fmt(l.peso, 1)} kg (sem perdas)`);
    for (const m of l.mensagens) add('Avisos', r, m);
  }
  if (arm.resumoAco.length) out.push({ escada: 'Todas', secao: 'Resumo do aço', rotulo: 'Aço das escadas', valor: arm.resumoAco.map((a) => `${a.aco} φ${phiTxt(a.phi)}: ${fmt(a.comprimento, 1)} m, ${fmt(a.peso, 1)} kg (${fmt(a.pesoComPerdas, 1)} kg com perdas)`).join('; ') });
  return out;
}
