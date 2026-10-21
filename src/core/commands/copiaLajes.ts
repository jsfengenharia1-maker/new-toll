// Cópia da armadura das lajes (R7f): salvar a armadura de todos os grupos (ex.: antes de abrir um furo imprevisto),
// recuperá-la só onde a geometria não mudou e copiar a armadura de outro grupo de pavimentos para o grupo atual.
// A "armadura" é o que o usuário lançou: base, predefinidas, edição das posições, geração sem cálculo, vigotas,
// punção e tabela, mais as zonas de uniformização e as linhas de dobra do grupo. As barras calculadas saem do
// detalhamento; as que passam por furo novo são cortadas na borda dele, sem ganchos.
import type { Draft } from 'immer';
import type { BuildingModel, CopiaLaje, Laje } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const TOL = 0.01;
const CAMPOS = ['base', 'predefinidas', 'edicao', 'semCalculo', 'armaduraVigotas', 'puncao', 'tabela'] as const;

type Contorno = [number, number][];
/** Os dois contornos têm os mesmos vértices (qualquer vértice de partida), dentro da tolerância? */
export function contornosIguais(a: Contorno, z: Contorno, tol = TOL): boolean {
  return a.length === z.length && a.every((p) => z.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol));
}

interface P { acao: 'salvar' | 'recuperar' | 'copiar' | 'remover'; nome?: string; data?: string; grupos?: string[]; copia?: string; de?: string; para?: string }

/** Cópia salva da armadura das lajes dos grupos (todos se omitido). */
export function copiaDasLajes(b: BuildingModel, id: string, nome: string, data: string, grupos?: string[]) {
  const dentro = (g: string) => !grupos || grupos.includes(g);
  return {
    id, nome, data,
    lajes: b.lajes.filter((l) => dentro(l.grupo)).map((l): CopiaLaje => ({ laje: l.id, nome: l.nome, grupo: l.grupo, contorno: clone(l.contorno), ...(l.furos ? { furos: clone(l.furos) } : {}), ...Object.fromEntries(CAMPOS.filter((k) => l[k] !== undefined).map((k) => [k, clone(l[k])])) })),
    zonas: clone((b.zonasLaje ?? []).filter((z) => dentro(z.grupo))), linhas: clone((b.linhasDobra ?? []).filter((x) => dentro(x.grupo))),
  };
}

function aplicarCampos(l: Draft<Laje>, c: Partial<Pick<Laje, (typeof CAMPOS)[number]>>) {
  for (const k of CAMPOS) { if (c[k] !== undefined) (l as unknown as Record<string, unknown>)[k] = clone(c[k]); else delete (l as unknown as Record<string, unknown>)[k]; }
}

/** Furos que a laje tem hoje e a cópia não tinha (cortam as barras restauradas). */
const furosNovos = (copia: CopiaLaje, l: Laje) => (l.furos ?? []).filter((f) => !(copia.furos ?? []).some((g) => contornosIguais(f, g))).length;

registrar<P>({
  nome: 'lajes.copiaArmadura',
  descricao: 'Cópia da armadura das lajes (R7f): `salvar` guarda a armadura lançada (base, predefinidas, edição das posições, vigotas, punção, tabela, zonas de uniformização e linhas de dobra) de todos os grupos, ou dos `grupos` indicados, com `nome` e `data`; `recuperar` (`copia` = id) restaura só nas lajes cujo contorno não mudou — as barras que passam por furos novos são cortadas na borda, sem ganchos; `copiar` (`de` e `para` = grupos) copia a armadura das lajes do grupo de origem para as do grupo de destino com o mesmo contorno (mesma malha), e as zonas e linhas de dobra; `remover` apaga uma cópia salva.',
  risco: 'escrita',
  mcp: false,
  calculo: 'detalhe',
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    acao: { type: 'string', enum: ['salvar', 'recuperar', 'copiar', 'remover'] },
    nome: { type: 'string', minLength: 1 }, data: { type: 'string', description: 'data da cópia (ISO); a interface informa a de hoje' },
    grupos: { type: 'array', items: { type: 'string' }, minItems: 1 },
    copia: { type: 'string' }, de: { type: 'string' }, para: { type: 'string' },
  } },
  validar(b, p) {
    const grupoOk = (g?: string) => !g || b.grupos.some((x) => x.id === g);
    const sg = [...(p.grupos ?? []), ...(p.de ? [p.de] : []), ...(p.para ? [p.para] : [])].find((g) => !grupoOk(g));
    if (sg) return err('GRUPO_INEXISTENTE', `Grupo ${sg} não existe.`);
    if (p.acao === 'salvar') return b.lajes.some((l) => !p.grupos || p.grupos.includes(l.grupo)) ? [] : err('SEM_LAJES', 'Não há lajes nos grupos indicados.');
    if (p.acao === 'recuperar' || p.acao === 'remover') return b.copiasLaje?.some((c) => c.id === p.copia) ? [] : err('COPIA_INEXISTENTE', `Cópia ${p.copia ?? '?'} não existe.`);
    if (!p.de || !p.para) return err('PARAMETRO_INVALIDO', 'Informe o grupo de origem (`de`) e o de destino (`para`).');
    if (p.de === p.para) return err('GRUPO_IGUAL', 'Origem e destino são o mesmo grupo.');
    return b.lajes.some((l) => l.grupo === p.de) ? [] : err('SEM_LAJES', 'O grupo de origem não tem lajes.');
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    if (p.acao === 'salvar') {
      const n = Math.max(0, ...(d.copiasLaje ?? []).map((c) => { const m = /^Cópia (\d+)$/.exec(c.nome); return m ? +m[1] : 0; })) + 1;
      const c = copiaDasLajes(b, `cl_${(++d.seq).toString(36)}`, p.nome?.trim() || `Cópia ${n}`, p.data ?? '', p.grupos);
      (d.copiasLaje ??= []).push(c);
      return `Armadura de ${c.lajes.length} laje(s) guardada em “${c.nome}”.`;
    }
    if (p.acao === 'remover') {
      d.copiasLaje = (d.copiasLaje ?? []).filter((c) => c.id !== p.copia);
      if (!d.copiasLaje.length) delete d.copiasLaje;
      return 'Cópia removida.';
    }
    if (p.acao === 'recuperar') {
      const c = d.copiasLaje!.find((x) => x.id === p.copia)!;
      const ok: string[] = [], mudou: string[] = [], cortadas: string[] = [], grupos = new Set<string>();
      for (const s of c.lajes) {
        const l = d.lajes.find((x) => x.id === s.laje);
        if (!l || l.grupo !== s.grupo || !contornosIguais(l.contorno as Contorno, s.contorno)) { mudou.push(s.nome); continue; }
        aplicarCampos(l, s);
        ok.push(l.nome); grupos.add(s.grupo);
        if (furosNovos(s, l as Laje)) cortadas.push(l.nome);
      }
      // zonas e linhas dos grupos restaurados voltam como estavam
      if (grupos.size) {
        d.zonasLaje = [...(d.zonasLaje ?? []).filter((z) => !grupos.has(z.grupo)), ...clone(c.zonas.filter((z) => grupos.has(z.grupo)))];
        d.linhasDobra = [...(d.linhasDobra ?? []).filter((x) => !grupos.has(x.grupo)), ...clone(c.linhas.filter((x) => grupos.has(x.grupo)))];
        if (!d.zonasLaje.length) delete d.zonasLaje;
        if (!d.linhasDobra.length) delete d.linhasDobra;
      }
      return `Cópia “${c.nome}”: armadura restaurada em ${ok.length} laje(s)${cortadas.length ? `; furo novo em ${cortadas.join(', ')} (barras cortadas na borda, sem ganchos)` : ''}${mudou.length ? `; geometria mudou, mantidas como estão: ${mudou.join(', ')}` : ''}.`;
    }
    // copiar de outro grupo
    const origem = d.lajes.filter((l) => l.grupo === p.de), destino = d.lajes.filter((l) => l.grupo === p.para);
    const feitas: string[] = [], sem: string[] = [];
    for (const o of origem) {
      const alvo = destino.find((l) => contornosIguais(l.contorno as Contorno, o.contorno as Contorno));
      if (!alvo) { sem.push(o.nome); continue; }
      aplicarCampos(alvo, o as Laje);
      feitas.push(`${o.nome} → ${alvo.nome}`);
    }
    if (feitas.length) {
      const zs = (d.zonasLaje ?? []).filter((z) => z.grupo === p.de), ls = (d.linhasDobra ?? []).filter((x) => x.grupo === p.de);
      d.zonasLaje = [...(d.zonasLaje ?? []).filter((z) => z.grupo !== p.para), ...zs.map((z) => ({ ...clone(z), id: `zu_${(++d.seq).toString(36)}`, grupo: p.para! }))];
      d.linhasDobra = [...(d.linhasDobra ?? []).filter((x) => x.grupo !== p.para), ...ls.map((x) => ({ ...clone(x), id: `ld_${(++d.seq).toString(36)}`, grupo: p.para! }))];
      if (!d.zonasLaje.length) delete d.zonasLaje;
      if (!d.linhasDobra.length) delete d.linhasDobra;
    }
    return feitas.length ? `Armadura copiada em ${feitas.length} laje(s) (${feitas.join('; ')})${sem.length ? `; sem laje de mesmo contorno no destino: ${sem.join(', ')}` : ''}.` : `Nenhuma laje do grupo de origem tem laje de mesmo contorno no destino (${sem.join(', ')}).`;
  },
});
