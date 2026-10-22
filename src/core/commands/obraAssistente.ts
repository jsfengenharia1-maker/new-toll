// Comandos compostos de nova obra (L1): o assistente e a importação de arranques. Cada um expande para comandos
// existentes e os aplica no mesmo passo (um desfazer), como o `lote`.
import type { Draft } from 'immer';
import { gerarObra, type Cmd, type EspecificacaoObra } from '../building/assistente';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { aplicarComando, comando, registrar } from './registry';
import { comDefaults } from './schema';

export const erroCmd = (codigo: string, mensagem: string): Diagnostico[] => [{ codigo, severidade: 'erro', elementos: [], mensagem }];

/** Valida a lista passo a passo sobre o modelo evoluindo; devolve os erros do primeiro passo que falhar. */
export function validarLista(b: BuildingModel, lista: Cmd[]): Diagnostico[] {
  let m = b;
  for (const [i, c] of lista.entries()) {
    const r = aplicarComando(m, c.nome, c.params);
    if (!r.ok) return r.erros.map((e) => ({ ...e, mensagem: `Passo ${i + 1} (${c.nome}): ${e.mensagem}` }));
    m = r.modelo;
  }
  return [];
}

/** Aplica a lista sobre o rascunho (já validada). */
export function aplicarLista(d: Draft<BuildingModel>, lista: Cmd[]): void {
  for (const c of lista) {
    const cmd = comando(c.nome)!;
    cmd.aplicar(d, comDefaults(cmd.schema, c.params) as Record<string, unknown>);
  }
}

// ---- obra.assistente ----

registrar<{ espec: EspecificacaoObra }>({
  nome: 'obra.assistente',
  descricao: 'Gera a obra a partir da especificação do assistente (dados gerais, norma, perfil de opções, vento, grupos e pavimentos com repetições, malha de eixos) como um passo só. Em obra com pavimentos, acrescenta os novos a partir de `cotaBase`.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['espec'], properties: {
    espec: { type: 'object', description: 'EspecificacaoObra (src/core/building/assistente.ts)' },
  } },
  validar(b, p) {
    const g = gerarObra(p.espec, b.seq);
    if (g.erros.length) return g.erros.map((m) => erroCmd('ESPEC_INVALIDA', m)).flat();
    return validarLista(b, g.comandos);
  },
  aplicar(d, p) {
    aplicarLista(d, gerarObra(p.espec, d.seq).comandos);
    return `Obra “${p.espec.nome.trim()}” gerada: ${d.pavimentos.length} pavimento(s) em ${d.grupos.length} grupo(s).`;
  },
});
