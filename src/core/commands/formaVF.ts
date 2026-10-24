// Seção T, L ou plana das vigas de fundação (E5k): esquema JSON e validação compartilhados pelos comandos de
// `vigaElastica.*` e `vigaFundacao.*`.
import { erroFormaVF } from '../building/secaoVF';
import type { FormaVF } from '../building/types';
import type { Diagnostico } from '../building/verify';
import type { JsonSchema } from './schema';

export type FormaVFIn = { tipo: 'retangular' | 'T' | 'L' | 'plana'; bf?: number; hf?: number; mesa?: 'inferior' | 'superior' };

export const formaVFSchema: JsonSchema = {
  type: 'object', additionalProperties: false, required: ['tipo'],
  description: 'seção da viga de fundação: retangular (padrão; remove a forma), T (mesa dos dois lados), L (mesa de um lado) ou plana (retangular larga). `b` do comando é a largura da alma; `bf` = largura total da mesa e `hf` = espessura (m); `mesa` = face da mesa (viga sobre base elástica: inferior; equilíbrio/travamento: superior)',
  properties: {
    tipo: { type: 'string', enum: ['retangular', 'T', 'L', 'plana'] },
    bf: { type: 'number', minimum: 0.2, maximum: 8 }, hf: { type: 'number', minimum: 0.1, maximum: 2 },
    mesa: { type: 'string', enum: ['inferior', 'superior'] },
  },
};

/** Forma do modelo a partir do parâmetro do comando (`undefined` para retangular). */
export function formaDe(p: FormaVFIn | undefined): FormaVF | undefined {
  if (!p || p.tipo === 'retangular') return undefined;
  return { tipo: p.tipo, ...(p.bf !== undefined ? { bf: p.bf } : {}), ...(p.hf !== undefined ? { hf: p.hf } : {}), ...(p.mesa ? { mesa: p.mesa } : {}) };
}

/** Erro de forma inválida (mesa menor que a alma, espessura da mesa) para a alma `bw` e a altura `h`. */
export function validarFormaVF(bw: number, h: number, forma: FormaVF | undefined, mesaPadrao: 'inferior' | 'superior'): Diagnostico[] {
  const e = erroFormaVF(bw, h, forma, mesaPadrao);
  return e ? [{ codigo: 'FORMA_SECAO_INVALIDA', severidade: 'erro', elementos: [], mensagem: e }] : [];
}
