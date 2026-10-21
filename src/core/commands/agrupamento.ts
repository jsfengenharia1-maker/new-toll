// Agrupar pórticos (R7f): vigas que levam a mesma armadura (a do pórtico que governa), com um só desenho nas pranchas.
// Agrupar não verifica condições; o cálculo avisa com o motivo quando o agrupamento não vale (AGRUP_IGNORADO).
import type { Draft } from 'immer';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];

interface P { acao: 'criar' | 'acrescentar' | 'desagrupar'; ids?: string[]; agrupamento?: string; nome?: string }

registrar<P>({
  nome: 'vigas.agrupar',
  descricao: 'Agrupa pórticos (R7f): `criar` um agrupamento com as vigas `ids` (duas ou mais), `acrescentar` vigas a um agrupamento existente (`agrupamento` = id) ou `desagrupar` (as vigas `ids` saem dos seus agrupamentos; só `agrupamento`, desfaz o agrupamento todo). Não verifica condições: no cálculo, as vigas do grupo levam a armadura do pórtico que governa e saem num só desenho; sem o mesmo número de vãos e a mesma seção, o cálculo avisa o motivo e as dimensiona sozinhas. Uma viga pertence a um só agrupamento.',
  risco: 'escrita',
  mcp: false,
  calculo: 'detalhe',
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    acao: { type: 'string', enum: ['criar', 'acrescentar', 'desagrupar'] },
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
    agrupamento: { type: 'string' },
    nome: { type: 'string', minLength: 1, description: 'nome do agrupamento novo (padrão G1, G2…)' },
  } },
  validar(b, p) {
    const sem = (p.ids ?? []).filter((id) => !b.vigas.some((v) => v.id === id));
    if (sem.length) return err('VIGA_INEXISTENTE', `Viga ${sem.join(', ')} não existe.`);
    const ag = p.agrupamento ? b.agrupamentos?.find((g) => g.id === p.agrupamento) : undefined;
    if (p.agrupamento && !ag) return err('AGRUPAMENTO_INEXISTENTE', `Agrupamento ${p.agrupamento} não existe.`);
    const nome = (id: string) => b.vigas.find((v) => v.id === id)?.nome ?? id;
    if (p.acao === 'desagrupar') {
      if (!p.ids?.length && !p.agrupamento) return err('PARAMETRO_INVALIDO', 'Informe as vigas (`ids`) ou o agrupamento.');
      const fora = (p.ids ?? []).filter((id) => !b.agrupamentos?.some((g) => g.vigas.includes(id)));
      return fora.length && !p.agrupamento ? err('SEM_AGRUPAMENTO', `${fora.map(nome).join(', ')} não está(ão) em agrupamento.`, fora) : [];
    }
    if (!p.ids?.length) return err('PARAMETRO_INVALIDO', 'Informe as vigas (`ids`).');
    if (p.acao === 'criar' && p.ids.length < 2) return err('AGRUPAMENTO_CURTO', 'Um agrupamento tem duas ou mais vigas.');
    if (p.acao === 'acrescentar' && !ag) return err('PARAMETRO_INVALIDO', 'Informe o agrupamento a que acrescentar.');
    const ocupadas = p.ids.filter((id) => b.agrupamentos?.some((g) => g.vigas.includes(id) && g.id !== ag?.id));
    return ocupadas.length ? err('AGRUPAMENTO_EXISTENTE', `${ocupadas.map(nome).join(', ')} já está(ão) em outro agrupamento (desagrupe antes).`, ocupadas) : [];
  },
  aplicar(d: Draft<BuildingModel>, p) {
    const nomeDe = (id: string) => d.vigas.find((v) => v.id === id)?.nome ?? id;
    if (p.acao === 'criar') {
      const n = Math.max(0, ...(d.agrupamentos ?? []).map((g) => { const m = /^G(\d+)$/.exec(g.nome); return m ? +m[1] : 0; })) + 1;
      const g = { id: `ag_${(++d.seq).toString(36)}`, nome: p.nome?.trim() || `G${n}`, vigas: [...new Set(p.ids!)] };
      (d.agrupamentos ??= []).push(g);
      return `Agrupamento ${g.nome}: ${g.vigas.map(nomeDe).join(', ')}.`;
    }
    if (p.acao === 'acrescentar') {
      const g = d.agrupamentos!.find((x) => x.id === p.agrupamento)!;
      const novas = p.ids!.filter((id) => !g.vigas.includes(id));
      g.vigas.push(...novas);
      return `${novas.map(nomeDe).join(', ') || 'Nenhuma viga'} acrescentada(s) ao agrupamento ${g.nome}.`;
    }
    const fora = p.agrupamento && !p.ids?.length ? null : new Set(p.ids);
    const msgs: string[] = [];
    for (const g of d.agrupamentos ?? []) {
      if (p.agrupamento && g.id !== p.agrupamento) continue;
      if (!fora) { msgs.push(`Agrupamento ${g.nome} desfeito.`); g.vigas = []; continue; }
      const sai = g.vigas.filter((id) => fora.has(id));
      if (sai.length) { g.vigas = g.vigas.filter((id) => !fora.has(id)); msgs.push(`${sai.map(nomeDe).join(', ')} saiu(ram) do agrupamento ${g.nome}.`); }
    }
    d.agrupamentos = (d.agrupamentos ?? []).filter((g) => g.vigas.length >= 2);
    if (!d.agrupamentos.length) delete d.agrupamentos;
    return msgs.join(' ') || 'Nada a desagrupar.';
  },
});
