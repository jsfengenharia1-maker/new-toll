// Corresponder propriedades: copia campos de um elemento de origem para outros do mesmo tipo (pilar, viga, laje ou fundação).
// Os campos de cada tipo ficam em CAMPOS (a janela e o comando usam a mesma lista). A posição e a geometria nunca são copiadas.
import type { Draft } from 'immer';
import { direcaoMenorVao } from './lajes';
import { ehNervurada } from './tiposLaje';
import { lancesDoPilar, type BuildingModel, type ElementoFundacao, type Laje, type Pilar, type Viga } from './types';
import type { P } from '../geom/faces';

export type TipoCorresp = 'pilar' | 'viga' | 'laje' | 'fundacao';
export interface CampoCorresp { id: string; rotulo: string; /** marcado de início na janela */ padrao: boolean }

export const CAMPOS: Record<TipoCorresp, CampoCorresp[]> = {
  pilar: [
    { id: 'secao', rotulo: 'Seção (e seções por lance)', padrao: true },
    { id: 'angulo', rotulo: 'Ângulo e ponto fixo', padrao: false },
    { id: 'material', rotulo: 'Resistência do concreto por lance (fck)', padrao: true },
    { id: 'estabilidade', rotulo: 'Engastes, flambagem e travamentos', padrao: false },
    { id: 'cobrimento', rotulo: 'Cobrimento', padrao: false },
    { id: 'tabela', rotulo: 'Tabela de armadura', padrao: false },
    { id: 'opcoes', rotulo: 'Opções de cálculo do pilar', padrao: false },
    { id: 'vinculoBase', rotulo: 'Vínculo da base', padrao: false },
    { id: 'cargas', rotulo: 'Cargas nos lances (horizontais e do topo)', padrao: false },
    { id: 'lances', rotulo: 'Pavimentos em que nasce e morre', padrao: false },
  ],
  viga: [
    { id: 'secao', rotulo: 'Seção (b × h, mesa e viga chata)', padrao: true },
    { id: 'alinhamento', rotulo: 'Alinhamento (eixo ou face) e inversão', padrao: false },
    { id: 'nivel', rotulo: 'Desnível do topo', padrao: false },
    { id: 'vinculos', rotulo: 'Vínculos e engastes das pontas', padrao: false },
    { id: 'cobrimento', rotulo: 'Cobrimento', padrao: false },
    { id: 'tabela', rotulo: 'Tabelas de armadura (barras e estribos)', padrao: false },
    { id: 'opcoes', rotulo: 'Opções de cálculo da viga', padrao: false },
  ],
  laje: [
    { id: 'tipo', rotulo: 'Tipo do pano (maciça, treliçada, nervurada…)', padrao: true },
    { id: 'direcao', rotulo: 'Direção das vigotas', padrao: false },
    { id: 'nivel', rotulo: 'Desnível do topo', padrao: false },
    { id: 'engaste', rotulo: 'Engaste das bordas (mesmo número de lados)', padrao: false },
    { id: 'cobrimento', rotulo: 'Cobrimento', padrao: false },
    { id: 'tabela', rotulo: 'Tabela de armadura', padrao: false },
    { id: 'opcoes', rotulo: 'Opções de cálculo do pano', padrao: false },
  ],
  fundacao: [
    { id: 'cota', rotulo: 'Cota de assentamento', padrao: true },
    { id: 'sigmaAdm', rotulo: 'σadm próprio', padrao: false },
    { id: 'sondagem', rotulo: 'Sondagem (furo ou média)', padrao: false },
    { id: 'estaca', rotulo: 'Tipo de estaca do bloco', padrao: false },
    { id: 'impostas', rotulo: 'Dimensões e armadura impostas (mesmo tipo)', padrao: false },
  ],
};

/** Tipo do elemento de id dado para corresponder, ou null. */
export function tipoCorresp(b: BuildingModel, id: string): TipoCorresp | null {
  if (b.pilares.some((x) => x.id === id)) return 'pilar';
  if (b.vigas.some((x) => x.id === id)) return 'viga';
  if (b.lajes.some((x) => x.id === id)) return 'laje';
  if (b.fundacao?.elementos.some((x) => x.id === id)) return 'fundacao';
  return null;
}

const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const poe = <T extends object, K extends keyof T>(o: T, k: K, v: T[K] | undefined) => { if (v === undefined) delete o[k]; else o[k] = copia(v); };

/** Motivo de o destino não aceitar a correspondência (ou null). */
export function motivoRecusa(b: BuildingModel, tipo: TipoCorresp, origem: string, destino: string): string | null {
  if (destino === origem) return 'A origem não pode ser destino.';
  if (tipoCorresp(b, destino) !== tipo) return `${destino} não é ${tipo === 'fundacao' ? 'uma fundação' : tipo === 'laje' ? 'uma laje' : `um ${tipo}`}.`;
  if (tipo === 'viga' && b.vigas.find((v) => v.id === destino)?.comumDe) return 'A viga comum associada segue a viga de origem: altere a origem.';
  if (tipo === 'laje' && b.lajes.find((l) => l.id === origem)?.definir) return 'O pano de origem ainda está "a definir" (sem tipo).';
  return null;
}

/** Aplica no rascunho os `campos` da origem ao destino (mesmo tipo, já validado). */
export function corresponder(d: Draft<BuildingModel>, tipo: TipoCorresp, origem: string, destino: string, campos: string[]): void {
  const tem = (c: string) => campos.includes(c);
  if (tipo === 'pilar') {
    const o = copia(d.pilares.find((x) => x.id === origem)!) as Pilar, q = d.pilares.find((x) => x.id === destino)!;
    if (tem('lances')) { q.nasce = o.nasce; q.morre = o.morre; poe(q, 'inicio', o.inicio); }
    const ls = new Set(lancesDoPilar(d as BuildingModel, q as Pilar).map((l) => l.id));
    const porLance = <T extends { pavimento: string }>(v: T[] | undefined): T[] | undefined => { const r = v?.filter((e) => ls.has(e.pavimento)); return r?.length ? r : undefined; };
    if (tem('secao')) { q.secao = o.secao; poe(q, 'secoes', porLance(o.secoes)); }
    if (tem('angulo')) { q.angulo = o.angulo; q.ajuste = o.ajuste; }
    if (tem('material')) poe(q, 'fck', porLance(o.fck));
    if (tem('estabilidade')) { poe(q, 'engastes', porLance(o.engastes)); poe(q, 'flambagem', porLance(o.flambagem)); poe(q, 'apoiosIntermediarios', porLance(o.apoiosIntermediarios)); }
    if (tem('cobrimento')) poe(q, 'cobrimento', o.cobrimento);
    if (tem('tabela')) poe(q, 'tabela', o.tabela);
    if (tem('opcoes')) poe(q, 'opcoes', o.opcoes);
    if (tem('vinculoBase')) { poe(q, 'vinculoBase', o.vinculoBase); poe(q, 'cotaBase', o.cotaBase); }
    if (tem('cargas')) {
      // as cargas do destino nos lances em comum saem; entram as da origem (ids novos)
      const novas = (d.cargasPilar ?? []).filter((c) => c.pilar === origem && ls.has(c.pavimento));
      d.cargasPilar = (d.cargasPilar ?? []).filter((c) => !(c.pilar === destino && ls.has(c.pavimento)));
      for (const c of novas) d.cargasPilar.push({ ...copia(c), id: `cp_${(++d.seq).toString(36)}`, pilar: destino });
      if (!d.cargasPilar.length) delete d.cargasPilar;
    }
  } else if (tipo === 'viga') {
    const o = d.vigas.find((x) => x.id === origem)! as Viga, v = d.vigas.find((x) => x.id === destino)!;
    if (tem('secao')) { v.secao = { ...o.secao }; poe(v, 'mesa', o.mesa); poe(v, 'chata', o.chata); }
    if (tem('alinhamento')) { v.alinhamento = o.alinhamento; poe(v, 'invertida', o.invertida); }
    if (tem('nivel')) { poe(v, 'nivel', o.nivel); poe(v, 'plano', o.plano); poe(v, 'projecaoPlano', o.projecaoPlano); }
    if (tem('vinculos')) for (const k of ['vinculoIni', 'vinculoFim', 'engasteIni', 'engasteFim', 'engasteLajes', 'torcaoEquilibrio', 'foraDiafragma'] as const) poe(v, k, o[k]);
    if (tem('cobrimento')) poe(v, 'cobrimento', o.cobrimento);
    if (tem('tabela')) { poe(v, 'tabela', o.tabela); poe(v, 'tabelaEstribo', o.tabelaEstribo); }
    if (tem('opcoes')) poe(v, 'opcoes', o.opcoes);
  } else if (tipo === 'laje') {
    const o = d.lajes.find((x) => x.id === origem)! as Laje, l = d.lajes.find((x) => x.id === destino)!;
    if (tem('tipo')) {
      const igual = l.tipo.tipo === o.tipo.tipo;
      l.tipo = copia(o.tipo); delete l.definir;
      // dados específicos do tipo anterior não valem em outro tipo
      if (!igual) for (const k of ['armaduraMoldada', 'armaduraVigotas', 'edicaoVigotas', 'vigotasMultiplas', 'alveolar', 'baseNervurada', 'zonasMacicas', 'pontoNervuras', 'nervurasConcentrar', 'vigotasBiapoiadas'] as const) delete l[k];
      const uni = ehNervurada(l.tipo) || l.tipo.tipo === 'alveolar';
      if (uni && l.direcao === undefined) l.direcao = o.direcao ?? direcaoMenorVao(l.contorno as P[]);
      if (!uni) delete l.direcao;
    }
    if (tem('direcao') && o.direcao !== undefined && (ehNervurada(l.tipo) || l.tipo.tipo === 'alveolar')) l.direcao = o.direcao;
    if (tem('nivel')) { poe(l, 'nivel', o.nivel); poe(l, 'plano', o.plano); }
    if (tem('engaste') && o.contorno.length === l.contorno.length) poe(l, 'engasteBordas', o.engasteBordas);
    if (tem('cobrimento')) poe(l, 'cobrimento', o.cobrimento);
    if (tem('tabela')) poe(l, 'tabela', o.tabela);
    if (tem('opcoes')) poe(l, 'opcoes', o.opcoes);
  } else {
    const o = d.fundacao!.elementos.find((x) => x.id === origem)! as ElementoFundacao, e = d.fundacao!.elementos.find((x) => x.id === destino)!;
    if (tem('cota')) poe(e, 'cota', o.cota);
    if (tem('sigmaAdm')) poe(e, 'sigmaAdm', o.sigmaAdm);
    if (tem('sondagem')) poe(e, 'sondagem', o.sondagem);
    if (tem('estaca') && e.tipo === 'bloco') poe(e, 'estaca', o.estaca);
    if (tem('impostas') && e.tipo === o.tipo) { poe(e, 'impostas', o.impostas); poe(e, 'simples', o.simples); poe(e, 'alturaConstante', o.alturaConstante); }
  }
}
