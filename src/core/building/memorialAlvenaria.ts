// Dados do memorial da alvenaria estrutural e dos blocos de concreto (E1e): tabelas prontas (colunas e linhas de texto, vírgula
// decimal) para a interface e a exportação em HTML. Sem JSX: o memorial só desenha as tabelas. Vazio sem paredes de alvenaria.
import { blocoDe, tipoAlvenariaDe } from './alvenaria';
import type { Dimensionamento } from './dimensionamento';
import type { TabelaMemorial } from './memorialParedes';
import { OPCOES_INFO, opcoesEmUso, padraoDe, perfilDe } from './opcoes';
import type { BuildingModel } from './types';

const n = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',');
const phi = (x: { phi: number; s: number } | null | undefined) => (x ? `φ${n(x.phi, 1)} c/${n(x.s * 100, 1)}` : '—');
const sit = (s: string) => (s === 'ok' ? 'atende' : 'não atende');
const MOTIVO = { compressao: 'compressão', tracao: 'tração', cisalhamento: 'cisalhamento' } as const;

/** Tabelas do memorial da alvenaria estrutural (materiais, opções, verificação por pano, armadura, vergas, blocos, desligamentos e vigas). */
export function memorialAlvenaria(b: BuildingModel, dim: Dimensionamento): TabelaMemorial[] {
  const al = dim.alvenaria;
  if (!al?.paredes.length) return [];
  const out: TabelaMemorial[] = [], perfil = perfilDe(b), op = opcoesEmUso(b.opcoes, perfil);
  out.push({
    id: 'alv-opcoes', titulo: 'Opções da alvenaria estrutural em uso', colunas: ['Opção', 'Valor', 'Padrão do perfil', 'Fonte'],
    linhas: OPCOES_INFO.filter((o) => o.chave.startsWith('alvenaria')).map((o) => [o.rotulo, `${n(op[o.chave])}${o.unidade ? ` ${o.unidade}` : ''}`, n(padraoDe(o, perfil)), `${o.fonte}${o.aConfirmar ? ' [a confirmar]' : ''}`]),
  });
  out.push({
    id: 'alv-materiais', titulo: 'Materiais da alvenaria (resistências características e de cálculo)', colunas: ['Parede', 'Tipo de alvenaria', 'Modelo', 'Bloco', 'fbk (MPa)', 'fpk (MPa)', 'fk (MPa)', 'fd (MPa)', 'ftd (MPa)', 'E (MPa)', 'G (MPa)', 'ν', 'γ (kN/m³)', 'Armada'],
    linhas: al.paredes.map((w) => {
      const t = tipoAlvenariaDe(b, b.paredes!.find((x) => x.id === w.id)!), bl = blocoDe(b, t), r = w.resistencia;
      return [w.nome, w.nomeMaterial, r.modelo === 'blocos' ? 'blocos de concreto' : 'genérica', bl ? `${bl.nome} (${n(bl.comprimento * 100, 0)} × ${n(bl.largura * 100, 0)} × ${n(bl.altura * 100, 0)} cm)` : '—', r.fbk !== undefined ? n(r.fbk) : '—', r.fpk !== undefined ? n(r.fpk) : '—', r.fk !== undefined ? n(r.fk) : '—', n(r.fd), n(r.ftd), n(r.E, 0), n(r.G, 0), n(r.nu), n(r.gama, 1), r.armada ? 'sim' : 'não'];
    }),
  });
  out.push({
    id: 'alv-panos', titulo: 'Verificação das tensões-limite por pano', colunas: ['Parede', 'Trecho', 'Lance', 'Pano', 's (m)', 't (cm)', 'λ (máx.)', 'R', 'Utilização compressão / tração / cisalhamento', 'Cumprimento', 'Pior combinação', 'Situação'],
    linhas: al.paredes.flatMap((w) => w.panos.map((p) => [w.nome, p.nomeLado, p.nomePav, String(p.pano + 1), `${n(p.s0)} a ${n(p.s1)}`, n(p.t * 100, 1), `${n(p.lambda, 1)} (${n(p.lambdaMax, 0)})`, n(p.R, 3), `${n(p.util.comp)} / ${n(p.util.trac)} / ${n(p.util.cis)}`, `${n(p.cumprimento * 100, 1)} % (exigido ${n(p.exigido * 100, 0)} %)`, p.governa ? `${p.governa.combo} (${MOTIVO[p.governa.modo]})` : '—', sit(p.status)])),
  });
  out.push({
    id: 'alv-pontos', titulo: 'Pontos que excedem as tensões-limite', colunas: ['Parede', 'Trecho', 'Lance', 'Ponto (s; z) em m', 'Área (m²)', 'Limite excedido', 'Utilização', 'Combinação'],
    linhas: al.paredes.flatMap((w) => w.panos.flatMap((p) => p.pontos.slice(0, 5).map((q) => [w.nome, p.nomeLado, p.nomePav, `${n(q.s)}; ${n(q.z)}`, n(q.area), MOTIVO[q.motivo], n(q.util), q.combo]))),
  });
  const armadas = al.paredes.filter((w) => w.armada);
  if (armadas.length) out.push({
    id: 'alv-armadura', titulo: 'Armadura das paredes de blocos armadas por pano', colunas: ['Parede', 'Trecho', 'Lance', 'Pano', 'Necessária V / H (cm²/m)', 'Vertical', 'Horizontal (junta)', 'Origem', 'Situação'],
    linhas: armadas.flatMap((w) => w.panos.filter((p) => p.armadura).map((p) => [w.nome, p.nomeLado, p.nomePav, String(p.pano + 1), `${n(p.armadura!.nec.vert)} / ${n(p.armadura!.nec.hor)}`, phi(p.armadura!.vert), phi(p.armadura!.hor), p.armadura!.origem, sit(p.status)])),
  });
  out.push({
    id: 'alv-lados', titulo: 'Trechos curtos (pilares de alvenaria)', colunas: ['Parede', 'Trecho', 'Lance', 'L (m)', 't (cm)', 'λ', 'Utilização', 'Combinação', 'Situação'],
    linhas: al.paredes.flatMap((w) => w.lados.filter((l) => l.modelo === 'barra').map((l) => [w.nome, l.nome, l.nomePav, n(l.L), n(l.t * 100, 1), n(l.lambda, 1), n(l.util), l.combo || '—', sit(l.status)])),
  });
  out.push({
    id: 'alv-vergas', titulo: 'Vergas e contravergas das paredes de blocos', colunas: ['Parede', 'Abertura', 'Lance', 'Largura × altura (m)', 'Modular', 'Apoio (m)', 'Necessária verga / contraverga (cm²)', 'Verga', 'Contraverga', 'Estribos', 'Cortante V / VRd (kN)', 'Origem', 'Situação'],
    linhas: al.paredes.flatMap((w) => w.vergas.map((a) => [w.nome, a.tipo, a.nomePav, `${n(a.largura)} × ${n(a.altura)}`, a.modular ? 'sim' : 'não', n(a.apoio), `${n(a.necessaria.verga)} / ${n(a.necessaria.contraverga)}`, `${a.armadura.n} φ${n(a.armadura.phi, 1)}`, a.armadura.contraverga ? `${a.armadura.contraverga.n} φ${n(a.armadura.contraverga.phi, 1)}` : '—', a.armadura.estribo ? `φ${n(a.armadura.estribo.phi, 1)} c/${n(a.armadura.estribo.s * 100, 0)}` : '—', `${n(a.cortante.V, 1)} / ${n(a.cortante.VRd, 1)}`, a.origem, sit(a.status)])),
  });
  out.push({
    id: 'alv-blocos', titulo: 'Quantitativo de blocos por parede e pavimento', colunas: ['Parede', 'Bloco', 'Lance', 'Fiadas', 'Inteiros', 'Meios blocos', 'Peças de canto', 'Canaletas', 'Total', 'Área líquida (m²)'],
    linhas: al.paredes.flatMap((w) => (w.quantitativo?.lances ?? []).map((q) => [w.nome, w.quantitativo!.nomeBloco, q.nomePav, String(q.fiadas), String(q.inteiros), String(q.meios), String(q.cantos), String(q.canaletas), String(q.total), n(q.area)])),
  });
  out.push({
    id: 'alv-resumo-blocos', titulo: 'Resumo de blocos por tipo', colunas: ['Bloco', 'Inteiros', 'Meios blocos', 'Peças de canto', 'Canaletas', 'Total', 'Área líquida (m²)'],
    linhas: al.resumoBlocos.map((r) => [r.nome, String(r.inteiros), String(r.meios), String(r.cantos), String(r.canaletas), String(r.total), n(r.area)]),
  });
  if (al.resumoAco.length) {
    const ROT = { vertical: 'barra vertical', horizontal: 'junta (horizontal)', verga: 'verga', contraverga: 'contraverga', estribo: 'estribo de verga' } as const;
    out.push({
      id: 'alv-aco', titulo: 'Aço da alvenaria armada por parede e lance (mesma lista da tabela de aço das pranchas)', colunas: ['Parede', 'Lance', 'Elemento', 'Aço', 'φ (mm)', 'Quantidade', 'Comprimento unitário (m)', 'Comprimento total (m)', 'Peso (kg)'],
      linhas: al.paredes.flatMap((w) => (w.aco?.barras ?? []).map((x) => [w.nome, x.nomePav, ROT[x.tipo], x.aco, n(x.phi, 1), String(x.quant), n(x.comprimento), n(x.quant * x.comprimento), n(x.peso)])),
    });
    out.push({
      id: 'alv-resumo-aco', titulo: 'Resumo de aço da alvenaria armada (sem perdas)', colunas: ['Aço', 'φ (mm)', 'Comprimento total (m)', 'Peso (kg)'],
      linhas: [...al.resumoAco.map((r) => [r.aco, n(r.phi, 1), n(r.comprimento), n(r.peso)]), ['Total', '', n(al.resumoAco.reduce((s, r) => s + r.comprimento, 0)), n(al.resumoAco.reduce((s, r) => s + r.peso, 0))]],
    });
  }
  out.push({
    id: 'alv-desligamentos', titulo: 'Pilares em contato com muros de alvenaria', colunas: ['Muro', 'Pilar', 'Pavimento', 'Laje junto ao pilar', 'Desligado do muro'],
    linhas: al.desligamentos.map((d) => [d.nomeParede, d.nomePilar, d.nomePav, d.laje === 'vigotas' ? 'vigotas' : d.laje === 'macica' ? 'maciça' : 'sem laje', d.desligado ? 'sim' : 'não (aviso MURO_PILAR_MACICA)']),
  });
  out.push({
    id: 'alv-vigas', titulo: 'Vigas sobre muros de alvenaria', colunas: ['Viga', 'Muro', 'Papel', 'Seção (cm)', 'Armadura', 'Situação'],
    linhas: al.vigasMuro.map((v) => [v.nome, v.nomeParede, v.papel === 'topoSubsolo' ? 'topo de muro de subsolo' : v.papel === 'coroamento' ? 'coroamento em blocos' : 'nível da laje (alvenaria genérica)', `${n(v.b * 100, 0)} × ${n(v.h * 100, 0)}`, !v.opcional ? 'sempre armada' : v.dispensada ? 'opcional dispensada' : 'opcional armada', sit(v.status)]),
  });
  out.push({
    id: 'alv-mensagens', titulo: 'Mensagens da alvenaria estrutural', colunas: ['Parede', 'Local', 'Mensagem'],
    linhas: al.paredes.flatMap((w) => [
      ...w.mensagens.map((m) => [w.nome, '—', m]),
      ...w.panos.flatMap((p) => p.mensagens.map((m) => [w.nome, `${p.nomeLado}, ${p.nomePav}, pano ${p.pano + 1}`, m])),
      ...w.lados.flatMap((l) => l.mensagens.map((m) => [w.nome, `${l.nome}, ${l.nomePav}`, m])),
      ...w.vergas.flatMap((a) => a.mensagens.map((m) => [w.nome, `abertura (${a.tipo}), ${a.nomePav}`, m])),
    ]),
  });
  return out.filter((t) => t.id === 'alv-opcoes' || t.id === 'alv-materiais' || t.linhas.length > 0);
}
