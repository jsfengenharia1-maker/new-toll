// Memória detalhada (MD fase 7): base das paredes e dos pilares-parede (apoio direto, molas de Winkler da sapata corrida,
// viga de fundação sobre base elástica, FU7c/FU7d) e a parcela axial separada das paredes (E6d). Registrado uma vez por
// elemento (elemento "Parede P1 · Base"), depois do dimensionamento, com os números do modelo analisado: as molas são as
// do pórtico (nós da base da casca) e a parcela axial usa o EA/Δz de cada faixa guardado na análise.
import type { AnaliseEdificio } from '../building/analitico';
import type { Dimensionamento } from '../building/dimensionamento';
import { corridasEfetivas } from '../building/corridaParede';
import { ehAlvenaria } from '../building/alvenaria';
import type { BuildingModel } from '../building/types';
import { elementoParede } from './paredes';
import { elementoCorrida } from './sapataCorrida';
import { fm, type Registrador } from './registrador';

const TXT_BASE: Record<string, string> = { apoio: 'apoio direto (nós da base engastados ou rotulados pelo vínculo)', sapataCorrida: 'sapata corrida sob a parede, com molas de Winkler nos nós da base da casca', viga: 'viga de fundação sobre base elástica sob o eixo da parede, ligada aos nós da base da casca' };

export function registrarBasesParedes(mem: Registrador, b: BuildingModel, an: AnaliseEdificio, dim: Dimensionamento) {
  const op = an.opcoes, md = an.portico.modelo, molas = md.molas ?? [];
  const alvos = [
    ...(b.pilaresParede ?? []).map((pp) => ({ id: pp.id, nome: pp.nome, kind: 'pilarParede' as const, tipoBase: pp.vinculoBase === 'molas' ? 'sapataCorrida' : 'apoio', vinculo: pp.vinculoBase ?? 'engaste', largura: undefined as number | undefined, altura: undefined as number | undefined, kBase: undefined as number | undefined })),
    ...(b.paredes ?? []).filter((w) => w.nasce === 'fundacao').map((w) => ({ id: w.id, nome: w.nome, kind: (ehAlvenaria(w) ? w.tipo : 'parede') as 'parede' | 'alvenaria' | 'blocos', tipoBase: w.base?.tipo ?? 'apoio', vinculo: w.vinculoBase ?? 'engaste', largura: w.base?.largura, altura: w.base?.altura, kBase: w.base?.k })),
  ];
  for (const a of alvos) {
    const nos = an.paredes?.base[a.id] ?? [];
    const axial = (an.paredes?.axial ?? []).filter((x) => x.pp === a.id);
    if (!nos.length && !axial.length) continue;
    const el = elementoParede(a.kind, a.nome, 'Base');
    if (!mem.aceita(el)) continue;
    // ligação das barras à casca no plano (25/10/2026, opção ligacaoBarraCasca)
    const ligs = (an.paredes?.ligacoes ?? []).filter((x) => x.pp === a.id);
    mem.passo({
      etapa: 'analise', elemento: el, topico: 'Ligação das barras à casca (no plano)',
      descricao: op.ligacaoBarraCasca ? `Ligação rígida: em ${ligs.length} nó(s) da casca de onde saem barras (vigas que chegam à parede, lado curto em barra, vigas perpendiculares; barras ao longo da casca não ligam), o giro em torno da normal segue o giro de corpo rígido dos nós vizinhos da casca a até R (altura da viga; mínimo: nós mais próximos), do lado de baixo do nível` : 'Ligação pelo giro no plano da casca (estabilização fraca γ·∫(θn − ω)²; quase rótula)',
      formula: 'θ·n = ω̄ = Σ(n × rₖ)·uₖ / Σ|rₖ|² (rₖ a partir do centroide dos vizinhos); penalidade k = 10³·E·h·R²',
      expressao: op.ligacaoBarraCasca ? (ligs.map((x) => `nó ${x.no}: ${x.viz} vizinhos, R = ${fm(x.R)} m`).join('; ') || 'nenhuma barra ligada à casca') : `opção ligacaoBarraCasca = ${fm(op.ligacaoBarraCasca)}`,
      resultado: op.ligacaoBarraCasca ? ligs.length : 0, unidade: 'ligações', norma: 'NBR 6118 não trata; padrão esperado do programa de referência (ligação rígida)', aConfirmar: true,
      entradas: { ligacaoBarraCasca: op.ligacaoBarraCasca, ligacoes: JSON.stringify(ligs.map((x) => [x.no, x.viz, x.R])) },
      observacao: 'ligacoes = [nó, nº de vizinhos, raio (m)]; as forças da ligação são autoequilibradas (não prendem ao chão).',
    });
    const T = 'Base e vinculação externa';
    const set = new Set(nos);
    const sm = molas.filter((m) => set.has(m.no));
    const kz = sm.filter((m) => m.gdl === 2).reduce((s, m) => s + m.k, 0), krx = sm.filter((m) => m.gdl === 3).reduce((s, m) => s + m.k, 0), kry = sm.filter((m) => m.gdl === 4).reduce((s, m) => s + m.k, 0);
    const comMolas = sm.length > 0;
    mem.passo({
      etapa: 'analise', elemento: el, topico: T,
      descricao: `Base: ${TXT_BASE[a.tipoBase] ?? a.tipoBase}; vínculo ${a.vinculo}; ${nos.length} nós de base na casca`,
      formula: comMolas ? 'kz = k·B·Lt (vertical); kr = k·B³·Lt/12 (giro em torno do eixo da parede), Lt = comprimento de influência do nó' : 'nós da base presos (engaste) ou com giros livres (rótula)',
      expressao: comMolas ? `k = ${fm(a.kBase ?? op.fundParedeK)} kN/m³ (opção da obra ${fm(op.fundParedeK)}; aba ${fm(op.fundParedeAba)} cm); Σkz = ${fm(kz)} kN/m; Σkrx = ${fm(krx)}; Σkry = ${fm(kry)} kN·m/rad (${sm.length} molas)` : `${nos.length} nós de base`,
      resultado: comMolas ? kz : nos.length, unidade: comMolas ? 'kN/m' : 'nós', norma: 'Modelo de Winkler (NBR 6122:2019; k a confirmar com o geotécnico)', aConfirmar: comMolas,
      entradas: { tipoBase: a.tipoBase, vinculo: a.vinculo, nosBase: nos.length, k: a.kBase ?? op.fundParedeK, fundParedeK: op.fundParedeK, fundParedeAba: op.fundParedeAba, ...(a.largura !== undefined ? { largura: a.largura } : {}), ...(a.altura !== undefined ? { altura: a.altura } : {}), kz, krx, kry, molas: JSON.stringify(sm.map((m) => [m.no, m.gdl, m.k])) },
    });
    if (a.tipoBase === 'sapataCorrida') {
      const cs = corridasEfetivas(b).filter((c) => c.parede === a.id).map((c) => elementoCorrida(c.nome));
      if (cs.length) mem.passo({ etapa: 'analise', elemento: el, topico: T, descricao: `A sapata corrida calculada para a base da parede está na memória como: ${cs.join('; ')}`, formula: 'reações dos nós da base por janela de 1 m → sapata corrida (fase 5)', expressao: cs.join('; '), resultado: cs.length, unidade: 'elementos', entradas: { sapatas: cs.join('; ') } });
    }
    if (a.tipoBase === 'viga') {
      const vs = (dim.vigasElasticas ?? []).filter((v) => v.parede === a.id).map((v) => `Viga sobre base elástica ${v.nome}`);
      mem.passo({ etapa: 'analise', elemento: el, topico: T, descricao: `Base em viga de fundação sobre base elástica sob o eixo; o cálculo da viga está na memória como: ${vs.join('; ') || '(não calculada)'}`, formula: 'viga sobre molas de Winkler com os nós compartilhados com a casca', expressao: vs.join('; ') || '—', resultado: vs.length, unidade: 'elementos', entradas: { vigas: vs.join('; ') } });
    }
    if (a.kind === 'pilarParede' && op.fundParedeBarraMola) mem.passo({ etapa: 'analise', elemento: el, topico: T, descricao: 'Lados curtos (barras) do pilar-parede em molas: molas de Winkler nas barras com a largura da sapata calculada (FU7d)', formula: 'kz = k·B·L; krx, kry = k·B·L³/12', expressao: `opção fundParedeBarraMola = ${fm(op.fundParedeBarraMola)}; B das molas iterado com a sapata calculada (fundBaseIterada = ${fm(op.fundBaseIterada)})`, resultado: op.fundParedeBarraMola, unidade: '', aConfirmar: true, entradas: { fundParedeBarraMola: op.fundParedeBarraMola, fundBaseIterada: op.fundBaseIterada } });
    // parcela axial separada (E6d)
    if (axial.length) {
      const f = op.axialPilares, modo = op.axialParedeSeparado;
      const ks = axial.map((x) => [x.EAporDz, x.cascas, (f - 1) * x.EAporDz]);
      mem.passo({
        etapa: 'analise', elemento: el, topico: 'Rigidez axial da parede (parcela axial separada, E6d)',
        descricao: modo === 2 ? `Cargas verticais: o multiplicador axial ${fm(f)} atua só na rigidez axial média de ${axial.length} faixa(s) horizontal(is) da malha, sem tocar na flexão no plano, no cisalhamento nem na placa` : modo === 1 ? 'Cargas verticais: multiplicador axial aplicado à membrana ortótropa (E_y × fator; E5j)' : 'Cargas verticais: multiplicador axial aplicado como na isótropa (E × fator em toda a casca)',
        formula: 'k = (f − 1)·EA/Δz sobre o alongamento médio uz da faixa (média ponderada por E·t); o modo uniforme fica com f·EA',
        expressao: modo === 2 ? ks.map(([ea, nc, k]) => `EA/Δz = ${fm(ea)} kN/m (${nc} cascas) → k = ${fm(k)} kN/m`).join('; ') : `modo ${modo}; f = ${fm(f)}`,
        resultado: modo === 2 ? ks.reduce((s, q) => s + q[2], 0) : f, unidade: modo === 2 ? 'kN/m' : '', norma: 'Premissa 25 do programa (EA dos pilares/paredes); NBR 6118:2023, 15.7.3', aConfirmar: true,
        entradas: { axialParedeSeparado: modo, axialPilares: f, faixas: JSON.stringify(ks) },
        observacao: 'faixas = [EA/Δz, nº de cascas, k] de cada faixa horizontal; o excedente volta às cascas como Ny uniforme e às reações.',
      });
    }
  }
}
