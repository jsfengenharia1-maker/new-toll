// Dados do memorial das paredes, pilares-parede e muros de arrimo (E1d): tabelas prontas (colunas e linhas de texto, vírgula
// decimal) para a interface e para a exportação em HTML. Sem JSX: o memorial só desenha as tabelas.
import type { Dimensionamento } from './dimensionamento';
import { OPCOES_INFO, opcoesEmUso, padraoDe, perfilDe } from './opcoes';
import type { BuildingModel } from './types';

export interface TabelaMemorial { id: string; titulo: string; colunas: string[]; linhas: string[][] }

const n = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',');
const phi = (x: { phi: number; s: number } | null) => (x ? `φ${n(x.phi, 1)} c/${n(x.s * 100, 1)}` : '—');
const sit = (s: string) => (s === 'ok' ? 'atende' : s === 'review' ? 'revisar' : 'não atende');

/** Tabelas do memorial das paredes (vazio sem paredes, pilares-parede ou muros). */
export function memorialParedes(b: BuildingModel, dim: Dimensionamento): TabelaMemorial[] {
  const out: TabelaMemorial[] = [];
  const ws = dim.armaduraParedes ?? [];
  if (ws.length) {
    const op = opcoesEmUso(b.opcoes, perfilDe(b)), perfil = perfilDe(b);
    out.push({
      id: 'opcoes', titulo: 'Opções da armadura das paredes em uso', colunas: ['Opção', 'Valor', 'Padrão do perfil', 'Fonte'],
      linhas: OPCOES_INFO.filter((o) => o.chave.startsWith('parede')).map((o) => [o.rotulo, `${n(op[o.chave])}${o.unidade ? ` ${o.unidade}` : ''}`, n(padraoDe(o, perfil)), `${o.fonte}${o.aConfirmar ? ' [a confirmar]' : ''}`]),
    });
    out.push({
      id: 'panos', titulo: 'Armadura por pano (iguais nas duas faces)', colunas: ['Elemento', 'Trecho', 'Lance', 'Pano', 's (m)', 't (cm)', 'Necessária V/H (cm²/m)', 'Vertical', 'Horizontal', 'Cumprimento', 'Origem', 'Situação'],
      linhas: ws.flatMap((w) => w.panos.map((p) => [w.nome, p.nomeLado, p.nomePav, String(p.pano + 1), `${n(p.s0)} a ${n(p.s1)}`, n(p.t * 100, 1), `${n(p.req.vert)} / ${n(p.req.hor)}`, phi(p.vert), phi(p.hor), `${n(p.cumprimento * 100, 1)} % (exigido ${n(p.exigido * 100, 0)} %)`, p.bloqueada ? 'bloqueada' : p.armada ? 'calculada' : 'sem armadura', sit(p.status)])),
    });
    out.push({
      id: 'locais', titulo: 'Pontos que não atendem e reforços locais', colunas: ['Elemento', 'Trecho', 'Lance', 'Direção / ponto', 'Faixa (m)', 'Armadura adicional'],
      linhas: ws.flatMap((w) => w.panos.flatMap((p) => [
        ...p.reforcos.map((r) => [w.nome, p.nomeLado, p.nomePav, r.direcao === 'vertical' ? 'vertical' : 'horizontal', `${n(r.de)} a ${n(r.ate)}`, `${r.n} φ${n(r.phi, 1)} (${n(r.As)} cm²)`]),
        ...p.pontos.slice(0, 5).map((q) => [w.nome, p.nomeLado, p.nomePav, `ponto (${n(q.s)}; ${n(q.z)}) — ${q.motivo}`, `${n(q.area)} m²`, `+${n(q.dv)} V / +${n(q.dh)} H cm²/m`]),
      ])),
    });
    out.push({
      id: 'esforcos', titulo: 'Combinações e esforços mais desfavoráveis do trecho', colunas: ['Elemento', 'Trecho', 'Lance', 'Vertical', 'Horizontal', 'Concreto', 'Cortante', 'Esforços no ponto crítico (nx, ny, nxy, my kN/m, kN·m/m)'],
      linhas: ws.flatMap((w) => w.panos.map((p) => { const f = p.governa.pior?.forcas; return [w.nome, p.nomeLado, p.nomePav, p.governa.vert ?? '—', p.governa.hor ?? '—', `${p.governa.concreto ?? '—'} (${n(p.tensoes.utilConcreto)})`, `${p.governa.cortante ?? '—'} (${n(p.cortante.V, 1)} / VRd1 ${n(p.cortante.VRd1, 1)} kN/m)`, f ? `${n(f.nx, 1)}; ${n(f.ny, 1)}; ${n(f.nxy, 1)}; ${n(f.my, 1)}` : '—']; })),
    });
    out.push({
      id: 'esbeltez', titulo: 'Esbeltez e verificação global dos lados', colunas: ['Elemento', 'Trecho', 'Lance', 'Modelo', 'λ', 'ℓe (m)', 'Utilização global', 'Combinação', 'Situação'],
      linhas: ws.flatMap((w) => w.lados.map((l) => { const pano = w.panos.find((p) => p.nomeLado === l.nome && p.nomePav === l.nomePav); return [w.nome, l.nome, l.nomePav, l.modelo === 'casca' ? 'casca' : 'barra (pilar)', n(pano?.esbeltez.lambda ?? Math.max(l.barra?.lambdaP ?? 0, l.barra?.lambdaO ?? 0), 0), n(pano?.esbeltez.le ?? 0), n(l.util), l.combo || '—', sit(l.status)]; })),
    });
    out.push({
      id: 'aberturas', titulo: 'Aberturas: verga, peitoril, montantes e cantos', colunas: ['Elemento', 'Abertura', 'Lance', 'Largura × altura (m)', 'Necessária verga / peitoril / montante (cm²)', 'Verga', 'Estribos', 'Peitoril', 'Montantes (cada lado)', 'Cantos', 'Origem', 'Situação'],
      linhas: ws.flatMap((w) => w.aberturas.map((a) => [w.nome, a.tipo, a.nomePav, `${n(a.largura)} × ${n(a.altura)}`, `${n(a.necessaria.verga)} / ${n(a.necessaria.peitoril)} / ${n(a.necessaria.montante)}`, `${a.armadura.verga.n} φ${n(a.armadura.verga.phi, 1)}`, `φ${n(a.armadura.estribo.phi, 1)} c/${n(a.armadura.estribo.s * 100, 0)}`, a.armadura.peitoril ? `${a.armadura.peitoril.n} φ${n(a.armadura.peitoril.phi, 1)}` : '—', `${a.armadura.montante.n} φ${n(a.armadura.montante.phi, 1)}`, a.armadura.canto ? `${a.armadura.canto.n} φ${n(a.armadura.canto.phi, 1)}` : '—', a.origem, sit(a.status)])),
    });
    const det = dim.detalhesParedes ?? [];
    out.push({
      id: 'emendas', titulo: 'Emendas por traspasse (acima do pavimento)', colunas: ['Elemento', 'Trecho', 'Pavimento', 'Tipo', 'φ', 'lb (cm)', 'α0t', 'Ampliação (cm)', 'Mínimo (cm)', 'Adotada (cm)', 'Origem'],
      linhas: det.flatMap((d) => d.emendas.map((e) => [d.nome, e.nomeLado, e.nomePav, e.tipo === 'tracao' ? 'tracionada' : 'comprimida', `φ${n(e.phi, 1)}`, n(e.lb * 100, 0), e.tipo === 'tracao' ? n(e.alfa0t, 1) : '1,0', n(e.ampliacao * 100, 0), n(e.minimo * 100, 0), n(e.comprimento * 100, 0), e.editada ? 'editada' : 'calculada'])),
    });
    out.push({
      id: 'quantitativo', titulo: 'Quantitativos das paredes e pilares-parede', colunas: ['Elemento', 'Concreto (m³)', 'Forma (m²)', 'Aço (kg)', 'kg/m³'],
      linhas: det.map((d) => [d.nome, n(d.concreto), n(d.forma), n(d.peso), n(d.concreto ? d.peso / d.concreto : 0, 1)]),
    });
    out.push({
      id: 'resumo-aco', titulo: 'Resumo de aço das paredes', colunas: ['Aço', 'φ (mm)', 'Comprimento (m)', 'Peso (kg)', 'Peso com perdas (kg)'],
      linhas: (dim.resumoAcoParedes ?? []).map((r) => [r.aco, n(r.phi, 1), n(r.comprimento), n(r.peso), n(r.pesoComPerdas)]),
    });
    out.push({
      id: 'mensagens', titulo: 'Mensagens da armadura das paredes', colunas: ['Elemento', 'Local', 'Mensagem'],
      linhas: ws.flatMap((w) => [
        ...w.mensagens.map((m) => [w.nome, '—', m]), ...w.panos.flatMap((p) => p.mensagens.map((m) => [w.nome, `${p.nomeLado}, ${p.nomePav}, pano ${p.pano + 1}`, m])),
        ...w.lados.flatMap((l) => l.mensagens.map((m) => [w.nome, `${l.nome}, ${l.nomePav}`, m])), ...w.aberturas.flatMap((a) => a.mensagens.map((m) => [w.nome, `abertura (${a.tipo}), ${a.nomePav}`, m])),
        ...(det.find((d) => d.id === w.id)?.avisos ?? []).map((m) => [w.nome, 'detalhamento', m]),
      ]),
    });
  }
  const ms = dim.muros ?? [];
  if (ms.length) {
    out.push({
      id: 'muros', titulo: 'Muros de arrimo: estabilidade', colunas: ['Muro', 'K', 'Ea (kN/m)', 'FS tombamento', 'FS deslizamento', 'e (m)', 'σmáx / σmín (kN/m²)', 'Situação'],
      linhas: ms.map((m) => [m.nome ?? '', n(m.estabilidade.K, 3), n(m.estabilidade.Ea, 1), n(m.estabilidade.FSt), n(m.estabilidade.FSd), n(m.estabilidade.e), `${n(m.estabilidade.sigmaMax, 1)} / ${n(m.estabilidade.sigmaMin, 1)}`, m.estabilidade.atende.tombamento && m.estabilidade.atende.deslizamento && m.estabilidade.atende.tensao ? 'atende' : 'não atende']),
    });
    out.push({
      id: 'muros-armadura', titulo: 'Muros de arrimo: armadura por metro', colunas: ['Muro', 'Elemento', 'Md (kN·m/m)', 'Vd (kN/m)', 'As necessária / mínima (cm²/m)', 'Adotada', 'Cortante'],
      linhas: ms.flatMap((m) => {
        const e = m.fuste.estacoes.at(-1)!;
        return [
          [m.nome ?? '', 'Fuste (base)', n(e.Md, 1), n(e.Vd, 1), `${n(e.AsNec)} / ${n(e.AsMin)}`, `${phi(m.fuste.principal)}${m.fuste.alturaCorte !== null ? `, metade cortada a ${n(m.fuste.alturaCorte)} m da base` : ''}`, m.fuste.cortanteOk ? `VRd1 ${n(m.fuste.VRd1, 1)}` : 'não atende'],
          [m.nome ?? '', `Ponta (${m.base.ponta.face})`, n(m.base.ponta.Md, 1), n(m.base.ponta.Vd, 1), `${n(m.base.ponta.AsNec)} / ${n(m.base.ponta.AsMin)}`, phi(m.base.ponta.malha), m.base.ponta.cortanteOk ? `VRd1 ${n(m.base.ponta.VRd1, 1)}` : 'não atende'],
          [m.nome ?? '', `Talão (${m.base.talao.face})`, n(m.base.talao.Md, 1), n(m.base.talao.Vd, 1), `${n(m.base.talao.AsNec)} / ${n(m.base.talao.AsMin)}`, phi(m.base.talao.malha), m.base.talao.cortanteOk ? `VRd1 ${n(m.base.talao.VRd1, 1)}` : 'não atende'],
        ];
      }),
    });
    out.push({
      id: 'muros-aco', titulo: 'Muros de arrimo: barras e quantitativo por metro', colunas: ['Muro', 'Barra', 'φ (mm)', 'n/m', 'C (m)', 'kg/m'],
      linhas: ms.flatMap((m) => [...m.barras.map((x) => [m.nome ?? '', x.descricao, n(x.phi, 1), n(x.nPorM, 2), n(x.comprimento), n(x.nPorM * x.comprimento * (Math.PI * (x.phi / 1000) ** 2 / 4) * 7850)]), [m.nome ?? '', 'Total', '', '', '', n(m.peso, 1)]]),
    });
  }
  return out;
}
