// Assistente de nova obra (L1, C1.15, C1.16): transforma a especificação numa lista de comandos já existentes.
// Função pura: não lê nem grava o modelo. Os ids dos grupos e pavimentos são previstos pela mesma contagem de `seq`
// que os comandos fazem ao aplicar (grupo.criar, pavimento.criar e cada cópia de pavimento.repetir consomem 1).
import { categoriaPorId } from './categoriasUso';
import type { CategoriaVento, Norma, OrigemObra } from './types';

export interface Cmd { nome: string; params: Record<string, unknown> }

export interface PavimentoEspec {
  nome: string;
  /** m. Distância ao pavimento de baixo. No primeiro da lista só vale para as repetições (a cota dele é 0). */
  peDireito: number;
  /** id de `categoriasDeUso()`. */
  categoria: string;
  /** Sobrecarga própria (kN/m²); ausente = a da categoria. */
  q?: number;
  /** 1 = pavimento único; n ≥ 2 = n pavimentos iguais no mesmo grupo (pavimento-tipo). */
  repeticoes: number;
}

export interface EspecificacaoObra {
  nome: string;
  /** Até 2 linhas de até 120 caracteres. */
  descricao?: string[];
  cidade?: string;
  profundidadeFundacao?: number;
  perfil?: 'sistema' | 'nbr';
  norma?: { fck: number; aco: Norma['aco']; caa: Norma['caa'] };
  vento?: { v0: number; categoria: CategoriaVento };
  /** Cota do primeiro pavimento (m); padrão 0. Em obra nova fica 0; o exemplo do comando usa outra para não colidir. */
  cotaBase?: number;
  /** Revestimento e piso (kN/m²) de todos os grupos; padrão 1,0. */
  revestimento?: number;
  /** Sobrecarga editada por categoria (id de `categoriasDeUso()` → kN/m²) nesta obra; vale quando a linha do pavimento não tem `q` próprio. */
  qCategoria?: Record<string, number>;
  /** De baixo para cima. */
  pavimentos: PavimentoEspec[];
  /** Malha de eixos opcional: espaçamentos em m. */
  eixos?: { dx: number[]; dy: number[] };
  origem?: OrigemObra;
}

export const ESPEC_PADRAO: EspecificacaoObra = {
  nome: 'Nova obra',
  perfil: 'sistema',
  norma: { fck: 30, aco: 'CA-50', caa: 'II' },
  profundidadeFundacao: 1.5,
  revestimento: 1,
  origem: 'assistente',
  pavimentos: [
    { nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 },
    { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 3 },
    { nome: 'Cobertura', peDireito: 3, categoria: 'cobertura', repeticoes: 1 },
  ],
};

/** Mensagens de violação (vazio = válida). Nunca lança exceção, mesmo com entrada sem validação de tipos. */
export function validarEspecificacao(e: EspecificacaoObra): string[] {
  const erros: string[] = [];
  const nome = String(e.nome ?? '').trim();
  if (!nome) erros.push('Informe o nome da obra.');
  const linhas = e.descricao ?? [];
  if (linhas.length > 2) erros.push('A descrição aceita até 2 linhas.');
  if (linhas.some((l) => String(l).trim().length > 120)) erros.push('Cada linha da descrição aceita até 120 caracteres.');
  const pavs = e.pavimentos ?? [];
  if (!pavs.length) erros.push('Informe ao menos um pavimento.');
  pavs.forEach((r, i) => {
    const n = i + 1;
    if (!String(r.nome ?? '').trim()) erros.push(`Pavimento ${n}: informe o nome.`);
    if (!Number.isFinite(r.peDireito) || r.peDireito <= 0 || r.peDireito > 10) erros.push(`Pavimento ${n}: pé-direito entre 0 e 10 m.`);
    if (!Number.isInteger(r.repeticoes) || r.repeticoes < 1 || r.repeticoes > 60) erros.push(`Pavimento ${n}: repetições de 1 a 60.`);
    if (!categoriaPorId(r.categoria)) erros.push(`Pavimento ${n}: categoria de uso desconhecida.`);
    if (r.q !== undefined && r.q < 0) erros.push(`Pavimento ${n}: sobrecarga negativa.`);
  });
  if (e.norma && (e.norma.fck < 20 || e.norma.fck > 90)) erros.push('fck entre 20 e 90 MPa.');
  if (e.vento && (e.vento.v0 < 20 || e.vento.v0 > 60)) erros.push('V0 entre 20 e 60 m/s.');
  if (e.eixos && [...e.eixos.dx, ...e.eixos.dy].some((s) => !Number.isFinite(s) || s <= 0)) erros.push('Espaçamentos dos eixos devem ser positivos.');
  if (e.profundidadeFundacao !== undefined && !(e.profundidadeFundacao > 0 && e.profundidadeFundacao <= 30)) erros.push('Profundidade da fundação entre 0 e 30 m.');
  if (Object.values(e.qCategoria ?? {}).some((v) => !Number.isFinite(v) || v < 0)) erros.push('Sobrecarga de categoria inválida.');
  if (e.cotaBase !== undefined && !Number.isFinite(e.cotaBase)) erros.push('Cota base inválida.');
  return erros;
}

/** Comandos que criam a obra, na ordem de aplicação. `seqInicial` é o `seq` do modelo onde serão aplicados. */
export function gerarObra(e: EspecificacaoObra, seqInicial = 0): { comandos: Cmd[]; erros: string[] } {
  const erros = validarEspecificacao(e);
  if (erros.length) return { comandos: [], erros };
  let seq = seqInicial;
  const novoId = (pre: string) => `${pre}_${(++seq).toString(36)}`;
  const comandos: Cmd[] = [];

  const linhas = (e.descricao ?? []).map((l) => l.trim()).filter(Boolean);
  const obra: Record<string, unknown> = { nome: e.nome.trim(), origem: e.origem ?? 'assistente' };
  if (e.cidade !== undefined) obra.cidade = e.cidade;
  if (e.profundidadeFundacao !== undefined) obra.profundidadeFundacao = e.profundidadeFundacao;
  if (linhas.length) obra.descricao = linhas;
  comandos.push({ nome: 'obra.definir', params: obra });
  if (e.norma) comandos.push({ nome: 'norma.definir', params: { ...e.norma } });
  if (e.perfil === 'nbr') comandos.push({ nome: 'opcoes.definir', params: { perfil: 'nbr' } });
  if (e.vento) comandos.push({ nome: 'vento.definir', params: { ativo: true, v0: e.vento.v0, categoria: e.vento.categoria } });

  let cota = e.cotaBase ?? 0;
  const rev = e.revestimento ?? 1;
  e.pavimentos.forEach((r, i) => {
    const nomeR = r.nome.trim();
    const nomeBase = /\d+$/.test(nomeR) ? nomeR : r.repeticoes > 1 ? `${nomeR} 1` : nomeR;
    const nomeGrupo = nomeR.replace(/\s*\d+$/, '').trim() || nomeR;
    const cat = categoriaPorId(r.categoria)!;
    const q = r.q ?? e.qCategoria?.[cat.id] ?? cat.q;
    if (i > 0) cota = +(cota + r.peDireito).toFixed(6);
    const g = novoId('g');
    comandos.push({ nome: 'grupo.criar', params: { nome: nomeGrupo, uso: cat.uso, gRev: rev, q } });
    const p = novoId('pav');
    comandos.push({ nome: 'pavimento.criar', params: { nome: nomeBase, cota, grupo: g } });
    if (r.repeticoes > 1) {
      comandos.push({ nome: 'pavimento.repetir', params: { id: p, vezes: r.repeticoes - 1, peDireito: r.peDireito } });
      seq += r.repeticoes - 1;
      cota = +(cota + (r.repeticoes - 1) * r.peDireito).toFixed(6);
    }
  });

  if (e.eixos && e.eixos.dx.length + e.eixos.dy.length > 0) comandos.push({ nome: 'eixo.malha', params: { origem: [0, 0], dx: e.eixos.dx, dy: e.eixos.dy } });
  return { comandos, erros };
}
