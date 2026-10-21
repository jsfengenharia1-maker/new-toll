// Comandos de ações e combinações (frente N2a): compatibilidade entre casos, arranjos (xadrez e carga móvel), tipos de
// empuxo, estados-limite (grupos de combinações) e situações de projeto do usuário.
import type { Draft } from 'immer';
import { ESTADOS_INFO, estadoInfo, fatoresDaSituacao } from '../building/acoes';
import { combinacoesDoEstado, combinacoesEdificio } from '../building/combinacoes';
import { k0, kaCoulomb, kaRankine } from '../building/empuxo';
import { casosDaObra, CLASSE_DO_USO, PSI_CLASSE, pavimentosOrdenados, relacaoEfetiva, type BuildingModel, type EstadoId, type Natureza, type RelacaoCasos, type SituacaoUsuario, type TipoEmpuxo } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { pontoInterno, type P } from '../geom/faces';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const r6 = (v: number) => +v.toFixed(6);
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');
const ESTADOS = ESTADOS_INFO.map((e) => e.id);

/** Nomes dos 12 casos de vento gerados (4 direções × centrado, +e, −e). */
export const NOMES_VENTO = ([0, 90, 180, 270] as const).flatMap((d) => ['', '+e', '−e'].map((e) => `W${d}°${e}`));
/** Ids de casos que podem aparecer num fator de combinação: casos da obra e os de vento gerados. */
const idsDeFatores = (b: BuildingModel) => new Set([...casosDaObra(b).map((c) => c.id), ...(b.casos ?? []).map((c) => c.id), ...NOMES_VENTO]);

// ---------------- compatibilidade entre casos ----------------

registrar<{ a: string; b: string; relacao: RelacaoCasos }>({
  nome: 'caso.compatibilidade',
  descricao: 'Define a relação entre dois casos de carga da mesma natureza (Q ou W): compativel, incompativel (nunca atuam juntos) ou simultaneo (o primeiro segue o segundo, mesmo fator). Só guarda o que difere da relação derivada de grupo/simultâneo/arranjos. A incompatibilidade vale por componente: se A é incompatível com B e B com C, os três são excludentes.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['a', 'b', 'relacao'], properties: { a: { type: 'string' }, b: { type: 'string' }, relacao: { type: 'string', enum: ['compativel', 'incompativel', 'simultaneo'] } } },
  validar(m, p) {
    const cs = casosDaObra(m), ca = cs.find((c) => c.id === p.a), cz = cs.find((c) => c.id === p.b);
    if (!ca || !cz) return err('CASO_INEXISTENTE', `Caso ${!ca ? p.a : p.b} não existe.`);
    if (p.a === p.b) return err('CASO_COMPAT', 'Informe dois casos diferentes.');
    if (p.relacao !== 'simultaneo' && (ca.natureza !== cz.natureza || (ca.natureza !== 'Q' && ca.natureza !== 'W'))) return err('CASO_COMPAT', 'Compatibilidade só entre casos variáveis (Q) ou só entre casos horizontais (W) da mesma natureza.');
    if (p.relacao === 'simultaneo' && (ca.natureza === 'G' || ca.natureza === 'E' || ca.natureza === 'H')) return err('CASO_COMPAT', 'Caso simultâneo só para ações variáveis ou horizontais.');
    // a relação pedida precisa valer de fato (a incompatibilidade é transitiva)
    const sim = { ...m, compat: [...(m.compat ?? []).filter((o) => !(o.a === p.a && o.b === p.b) && !(o.a === p.b && o.b === p.a)), { a: p.a, b: p.b, relacao: p.relacao }] };
    const rel = relacaoEfetiva(casosDaObra(sim), p.a, p.b);
    return rel === p.relacao ? [] : err('COMPAT_TRANSITIVA', `Não é possível: a incompatibilidade vale por componente (${ca.nome} e ${cz.nome} continuam ${rel === 'incompativel' ? 'incompatíveis por um terceiro caso' : rel}). Edite o grupo dos casos.`);
  },
  aplicar(d, p) {
    const sem = (d.compat ?? []).filter((o) => !(o.a === p.a && o.b === p.b) && !(o.a === p.b && o.b === p.a));
    const base = relacaoEfetiva(casosDaObra({ ...(d as BuildingModel), compat: sem }), p.a, p.b);
    if (sem.length) d.compat = sem; else delete d.compat;
    if (base !== p.relacao) (d.compat ??= []).push({ a: p.a, b: p.b, relacao: p.relacao });
    const nome = (id: string) => casosDaObra(d as BuildingModel).find((c) => c.id === id)?.nome ?? id;
    return `${nome(p.a)} e ${nome(p.b)}: ${p.relacao}.`;
  },
});

// ---------------- arranjos: xadrez e carga móvel ----------------

/** Agrupa valores em colunas/linhas por proximidade (m); devolve o índice de cada um (ordem crescente). */
function indicesPorProximidade(valores: number[], tol: number): number[] {
  const ordem = valores.map((v, i) => [v, i] as const).sort((a, z) => a[0] - z[0]);
  const idx = new Array<number>(valores.length).fill(0);
  let k = 0, ref = ordem[0]?.[0] ?? 0;
  for (const [v, i] of ordem) { if (v - ref > tol) { k++; ref = v; } idx[i] = k; }
  return idx;
}

const psiDaClasse = (b: BuildingModel, grupo?: string): [number, number, number] | undefined => {
  const g = b.grupos.find((x) => x.id === grupo), cl = g ? CLASSE_DO_USO[g.uso] ?? 'A' : 'A';
  return cl === 'A' ? undefined : (b.norma.psiUso?.[cl] ?? PSI_CLASSE[cl]);
};

type ArranjosP = { modo: 'xadrez' | 'faixasX' | 'faixasY' | 'movel'; grupo: string; nome: string; natureza?: Natureza; valor?: number; tolerancia?: number; trajeto?: P[]; passo?: number; carga?: 'ponto' | 'linha'; comprimento?: number; orientacao?: 'trajeto' | 'transversal' };
const MAX_ARRANJOS = 60;

registrar<ArranjosP>({
  nome: 'caso.arranjos',
  descricao: 'Gera arranjos de carga como casos filhos (incompatíveis entre si) de um novo caso-pai `nome`: modo "xadrez" (panos alternados em xadrez, 2 arranjos), "faixasX"/"faixasY" (colunas/linhas de panos alternadas, 2 arranjos por direção) com carga de área `valor` kN/m² (padrão: a carga variável do grupo, que passa a 0 para não somar duas vezes), ou "movel" (carga `carga` ponto em kN ou linha em kN/m, de `comprimento` m, percorrendo o `trajeto` a cada `passo` m, um arranjo por posição).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['modo', 'grupo', 'nome'], properties: {
    modo: { type: 'string', enum: ['xadrez', 'faixasX', 'faixasY', 'movel'] }, grupo: { type: 'string' }, nome: { type: 'string', minLength: 1 },
    natureza: { type: 'string', enum: ['Q', 'W'], default: 'Q' },
    valor: { type: 'number', exclusiveMinimum: 0, description: 'kN/m² (xadrez e faixas), kN (móvel, ponto) ou kN/m (móvel, linha)' },
    tolerancia: { type: 'number', exclusiveMinimum: 0, maximum: 10, description: 'm: tolerância para considerar panos na mesma coluna ou linha (padrão 1)' },
    trajeto: { type: 'array', items: ponto, minItems: 2 }, passo: { type: 'number', exclusiveMinimum: 0, description: 'm' },
    carga: { type: 'string', enum: ['ponto', 'linha'] }, comprimento: { type: 'number', exclusiveMinimum: 0, description: 'm (carga em linha)' },
    orientacao: { type: 'string', enum: ['trajeto', 'transversal'], description: 'direção da linha de carga em relação ao trajeto (padrão: trajeto)' },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    if (casosDaObra(b).some((c) => c.nome === p.nome.trim() || c.id === p.nome.trim())) return err('CASO_REPETIDO', `Já existe o caso ${p.nome}.`);
    if (p.modo === 'movel') {
      if (!p.trajeto || p.trajeto.length < 2) return err('ARRANJO_TRAJETO', 'Informe o trajeto (polilinha com 2 pontos ou mais).');
      if (!p.passo) return err('ARRANJO_PASSO', 'Informe o passo (m).');
      if (!p.valor) return err('ARRANJO_VALOR', 'Informe o valor da carga.');
      if ((p.carga ?? 'ponto') === 'linha' && !p.comprimento) return err('ARRANJO_COMPRIMENTO', 'Informe o comprimento da carga em linha.');
      const L = p.trajeto.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p.trajeto![i][0], q[1] - p.trajeto![i][1]), 0);
      const n = Math.floor(L / p.passo + 1e-9) + 1;
      return n > MAX_ARRANJOS ? err('ARRANJO_MUITOS', `${n} posições: o máximo é ${MAX_ARRANJOS} (aumente o passo).`) : n < 2 ? err('ARRANJO_POUCOS', 'O trajeto é menor que o passo: só uma posição.') : [];
    }
    const g = b.grupos.find((x) => x.id === p.grupo)!;
    if (b.lajes.filter((l) => l.grupo === p.grupo).length < 2) return err('ARRANJO_LAJES', 'O grupo precisa de ao menos 2 lajes (panos) para alternar a carga.');
    if (!p.valor && !(g.q > 0)) return err('ARRANJO_VALOR', 'O grupo não tem carga variável: informe o valor (kN/m²).');
    return [];
  },
  aplicar(d, p) {
    const m = d as BuildingModel;
    const nat = p.natureza ?? 'Q', psi = nat === 'Q' ? psiDaClasse(m, p.grupo) : undefined;
    const paiId = novoId(d, 'cs');
    (d.casos ??= []).push({ id: paiId, nome: p.nome.trim(), natureza: nat, ...(psi ? { psi: [...psi] as [number, number, number] } : {}), descricao: p.modo === 'movel' ? 'Carga móvel (arranjos por posição)' : 'Cargas alternadas (arranjos por pano)' });
    const filho = (rot: string) => { const id = novoId(d, 'cs'); d.casos!.push({ id, nome: `${p.nome.trim()} ${rot}`, natureza: nat, pai: paiId }); return id; };
    if (p.modo === 'movel') {
      const tr = p.trajeto!, passo = p.passo!;
      const segs = tr.slice(1).map((q, i) => ({ a: tr[i], z: q, L: Math.hypot(q[0] - tr[i][0], q[1] - tr[i][1]) })).filter((s) => s.L > 1e-9);
      const L = segs.reduce((s, x) => s + x.L, 0), n = Math.floor(L / passo + 1e-9) + 1;
      for (let k = 0; k < n; k++) {
        let s = k * passo, seg = segs[0];
        for (const x of segs) { seg = x; if (s <= x.L + 1e-9) break; s -= x.L; }
        const t = Math.min(1, s / seg.L), ux = (seg.z[0] - seg.a[0]) / seg.L, uy = (seg.z[1] - seg.a[1]) / seg.L;
        const c: P = [seg.a[0] + (seg.z[0] - seg.a[0]) * t, seg.a[1] + (seg.z[1] - seg.a[1]) * t];
        const id = filho(String(k + 1));
        if ((p.carga ?? 'ponto') === 'ponto') d.cargas.push({ id: novoId(d, 'c'), grupo: p.grupo, caso: id, tipo: 'ponto', valor: p.valor!, pontos: [[r6(c[0]), r6(c[1])]] });
        else {
          const [dx, dy] = p.orientacao === 'transversal' ? [-uy, ux] : [ux, uy], h = p.comprimento! / 2;
          d.cargas.push({ id: novoId(d, 'c'), grupo: p.grupo, caso: id, tipo: 'linha', valor: p.valor!, pontos: [[r6(c[0] - dx * h), r6(c[1] - dy * h)], [r6(c[0] + dx * h), r6(c[1] + dy * h)]] });
        }
      }
      return `${n} posições da carga móvel em ${p.nome.trim()}.`;
    }
    const g = d.grupos.find((x) => x.id === p.grupo)!, valor = p.valor ?? g.q, tol = p.tolerancia ?? 1;
    const ls = d.lajes.filter((l) => l.grupo === p.grupo);
    const cs = ls.map((l) => pontoInterno(l.contorno as P[]));
    const col = indicesPorProximidade(cs.map((c) => c[0]), tol), lin = indicesPorProximidade(cs.map((c) => c[1]), tol);
    const ids = [filho('A'), filho('B')];
    ls.forEach((l, i) => {
      const cor = (p.modo === 'xadrez' ? col[i] + lin[i] : p.modo === 'faixasX' ? col[i] : lin[i]) % 2;
      d.cargas.push({ id: novoId(d, 'c'), grupo: p.grupo, caso: ids[cor], tipo: 'area', valor, pontos: l.contorno.map((q) => [q[0], q[1]] as P) });
    });
    g.q = 0; // a carga variável do grupo passa a vir dos arranjos
    return `${p.nome.trim()}: 2 arranjos ${p.modo === 'xadrez' ? 'em xadrez' : p.modo === 'faixasX' ? 'em colunas' : 'em linhas'} (${ls.length} panos, ${fmt(valor)} kN/m²); carga variável geral do grupo zerada.`;
  },
});

// ---------------- empuxo de terra ----------------

const estratoSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['espessura', 'gama', 'phi'], properties: {
  espessura: { type: 'number', exclusiveMinimum: 0, description: 'm (o último estrato segue até a base)' }, gama: { type: 'number', exclusiveMinimum: 0, description: 'peso aparente kN/m³' },
  gamaSub: { type: 'number', exclusiveMinimum: 0, description: 'peso submerso kN/m³ (padrão aparente − 10)' }, phi: { type: 'number', minimum: 0, maximum: 60, description: 'ângulo de atrito interno (graus)' } } };
type EmpuxoP = { id?: string; remover?: boolean; nome?: string; metodo?: TipoEmpuxo['metodo']; estratos?: TipoEmpuxo['estratos']; cotaAterro?: number; nivelAgua?: number; semAgua?: boolean; talude?: number; delta?: number; alivio?: number; sobrecarga?: number; k?: number };

registrar<EmpuxoP>({
  nome: 'empuxo.tipo',
  descricao: 'Cria (sem id), edita (com id) ou remove (`remover`) um tipo de empuxo de terra reutilizável: método (repouso K0 = 1 − sen φ, rankine ou coulomb ativo), estratos (espessura, peso aparente e submerso, φ), cota do topo do aterro, nível d\'água (`semAgua` remove), talude β, atrito δ (Coulomb), alívio da água por drenagem (%), sobrecarga no terreno (kN/m²) e K informado (0 volta ao do método). Casos H usam o tipo (caso.criar/editar `empuxo`).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: {
    id: { type: 'string' }, remover: { type: 'boolean' }, nome: { type: 'string', minLength: 1 }, metodo: { type: 'string', enum: ['repouso', 'rankine', 'coulomb'] },
    estratos: { type: 'array', items: estratoSchema, minItems: 1 }, cotaAterro: { type: 'number', description: 'm' }, nivelAgua: { type: 'number', description: 'cota m' }, semAgua: { type: 'boolean' },
    talude: { type: 'number', minimum: 0, maximum: 60 }, delta: { type: 'number', minimum: 0, maximum: 45 }, alivio: { type: 'number', minimum: 0, maximum: 100 }, sobrecarga: { type: 'number', minimum: 0 }, k: { type: 'number', minimum: 0, maximum: 3 },
  } },
  validar(b, p) {
    const t = p.id ? b.empuxos?.find((x) => x.id === p.id) : undefined;
    if (p.id && !t) return err('EMPUXO_INEXISTENTE', `Tipo de empuxo ${p.id} não existe.`);
    if (p.remover) {
      if (!p.id) return err('EMPUXO_INEXISTENTE', 'Informe o id do tipo a remover.');
      const em = (b.casos ?? []).filter((c) => c.empuxo === p.id);
      return em.length ? err('EMPUXO_EM_USO', `O tipo é usado por ${em.map((c) => c.nome).join(', ')}.`) : [];
    }
    if (!p.id && !p.nome?.trim()) return err('EMPUXO_NOME', 'Informe o nome do tipo de empuxo.');
    if (p.nome && (b.empuxos ?? []).some((x) => x.id !== p.id && x.nome === p.nome!.trim())) return err('EMPUXO_REPETIDO', `Já existe o tipo ${p.nome}.`);
    const metodo = p.metodo ?? t?.metodo ?? 'repouso', talude = p.talude ?? t?.talude ?? 0, estratos = p.estratos ?? t?.estratos ?? [{ phi: 30 }];
    if (metodo !== 'repouso') for (const e of estratos) if (talude > e.phi + 1e-9) return err('EMPUXO_TALUDE', `Talude β = ${fmt(talude)}° maior que φ = ${fmt(e.phi)}°: empuxo ativo indefinido.`);
    return [];
  },
  aplicar(d, p) {
    if (p.remover) { d.empuxos = d.empuxos!.filter((x) => x.id !== p.id); if (!d.empuxos.length) delete d.empuxos; return 'Tipo de empuxo removido.'; }
    let t = p.id ? d.empuxos!.find((x) => x.id === p.id)! : undefined;
    if (!t) {
      const base = pavimentosOrdenados(d as BuildingModel)[0]?.cota ?? 0;
      t = { id: novoId(d, 'em'), nome: p.nome!.trim(), metodo: 'repouso', estratos: [{ espessura: 10, gama: 18, phi: 30 }], cotaAterro: base };
      (d.empuxos ??= []).push(t);
    }
    if (p.nome !== undefined) t.nome = p.nome.trim();
    if (p.metodo) t.metodo = p.metodo;
    if (p.estratos) t.estratos = p.estratos.map((e) => ({ espessura: e.espessura, gama: e.gama, ...(e.gamaSub ? { gamaSub: e.gamaSub } : {}), phi: e.phi }));
    if (p.cotaAterro !== undefined) t.cotaAterro = p.cotaAterro;
    if (p.semAgua) delete t.nivelAgua; else if (p.nivelAgua !== undefined) t.nivelAgua = p.nivelAgua;
    for (const k of ['talude', 'delta', 'alivio', 'sobrecarga', 'k'] as const) if (p[k] !== undefined) { if (p[k]) t[k] = p[k]; else delete t[k]; }
    const phi = t.estratos[0].phi;
    const kk = t.k ?? (t.metodo === 'repouso' ? k0(phi) : t.metodo === 'rankine' ? kaRankine(phi, t.talude ?? 0) : kaCoulomb(phi, t.delta ?? 0, t.talude ?? 0));
    return `Empuxo “${t.nome}” (${t.metodo}, K = ${kk === null ? '—' : fmt(kk)}).`;
  },
});

// ---------------- estados-limite ----------------

registrar<{ estados?: Partial<Record<EstadoId, { ativo?: boolean; modo?: 'norma' | 'usuario' }>>; combinarAdicionais?: Partial<Record<'Q' | 'W', boolean>>; padrao?: boolean }>({
  nome: 'estados.definir',
  descricao: `Estados-limite (grupos de combinações): ativa ou desativa cada grupo (${ESTADOS.join(', ')}) e escolhe o modo "norma" ou "usuario" (situações do usuário) nos grupos que usam lista de combinações. Desativar tira os avisos do grupo da revisão (concreto é sempre verificado). "combinarAdicionais" por natureza (Q, W): false torna os casos adicionais dessa natureza mutuamente excludentes. "padrao": true volta tudo ao padrão.`,
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: {
    estados: { type: 'object', additionalProperties: false, properties: Object.fromEntries(ESTADOS.map((id) => [id, { type: 'object', additionalProperties: false, properties: { ativo: { type: 'boolean' }, modo: { type: 'string', enum: ['norma', 'usuario'] } } } as JsonSchema])) },
    combinarAdicionais: { type: 'object', additionalProperties: false, properties: { Q: { type: 'boolean' }, W: { type: 'boolean' } } },
    padrao: { type: 'boolean' },
  } },
  validar(b, p) {
    for (const [id, c] of Object.entries(p.estados ?? {}) as [EstadoId, { ativo?: boolean; modo?: string }][]) {
      const i = estadoInfo(id);
      if (c.ativo === false && i.fixo) return err('ESTADO_FIXO', `O grupo “${i.rotulo}” é sempre verificado.`);
      if (c.modo === 'usuario' && !i.lista) return err('ESTADO_SEM_LISTA', `O grupo “${i.rotulo}” não usa lista de combinações: ${i.descricao}`);
    }
    void b;
    return [];
  },
  aplicar(d, p) {
    if (p.padrao) { delete d.estados; if (d.norma.combinarAdicionais) delete d.norma.combinarAdicionais; }
    for (const [id, c] of Object.entries(p.estados ?? {}) as [EstadoId, { ativo?: boolean; modo?: 'norma' | 'usuario' }][]) {
      const i = estadoInfo(id), atual = { ...(d.estados?.[id] ?? {}) };
      if (c.ativo !== undefined) { if (c.ativo === i.ativo) delete atual.ativo; else atual.ativo = c.ativo; }
      if (c.modo !== undefined) { if (c.modo === 'norma') delete atual.modo; else atual.modo = c.modo; }
      d.estados ??= {};
      if (Object.keys(atual).length) d.estados[id] = atual; else delete d.estados[id];
    }
    if (d.estados && !Object.keys(d.estados).length) delete d.estados;
    for (const [n, v] of Object.entries(p.combinarAdicionais ?? {}) as ['Q' | 'W', boolean][]) {
      const m = { ...(d.norma.combinarAdicionais ?? {}) };
      if (v) delete m[n]; else m[n] = false;
      if (Object.keys(m).length) d.norma.combinarAdicionais = m; else delete d.norma.combinarAdicionais;
    }
    return 'Estados-limite alterados.';
  },
});

// ---------------- situações do usuário ----------------

type Coefs = Record<string, number>;
type SituacaoP = { nome?: string; estado?: EstadoId; situacao?: SituacaoUsuario['situacao']; modo?: SituacaoUsuario['modo']; fatores?: Coefs; gama?: Coefs; psi?: Coefs };
const coefsSchema = (desc: string): JsonSchema => ({ type: 'object', description: desc });
const SITUACAO_PROPS: Record<string, JsonSchema> = {
  nome: { type: 'string', minLength: 1 }, situacao: { type: 'string', enum: ['normal', 'especial', 'excepcional'], description: 'Tipo da situação de projeto (informativo)' },
  modo: { type: 'string', enum: ['fatores', 'gamapsi'], description: 'fatores: fator final por caso; gamapsi: γ e ψ separados (fator = γ·ψ)' },
  fatores: coefsSchema('caso → fator final (modo fatores)'), gama: coefsSchema('caso → γ (modo gamapsi)'), psi: coefsSchema('caso → ψ (modo gamapsi)'),
};
const coefsOk = (b: BuildingModel, ...cs: (Coefs | undefined)[]) => {
  const ids = idsDeFatores(b);
  for (const c of cs) for (const [k, v] of Object.entries(c ?? {})) {
    if (!ids.has(k)) return err('CASO_INEXISTENTE', `Caso ${k} não existe (use o id do caso ou W0°, W90°+e…).`);
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 5) return err('FATOR_INVALIDO', `Fator de ${k} fora de 0 a 5.`);
  }
  return [];
};
const limpa = (c: Coefs) => Object.fromEntries(Object.entries(c).filter(([, v]) => v).map(([k, v]) => [k, r6(v)]));

registrar<SituacaoP & { copiarDe?: string }>({
  nome: 'situacao.criar',
  descricao: 'Cria uma situação (combinação) de projeto do usuário num grupo de estados (`estado`), definida por fatores finais por caso ou por γ e ψ separados; `copiarDe` copia outra situação. Casos: id do caso (G, Q, QB…) ou nome do vento (W0°, W90°+e…).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['nome'], properties: { ...SITUACAO_PROPS, estado: { type: 'string', enum: ESTADOS }, copiarDe: { type: 'string' } } },
  validar(b, p) {
    const origem = p.copiarDe ? b.situacoes?.find((s) => s.id === p.copiarDe) : undefined;
    if (p.copiarDe && !origem) return err('SITUACAO_INEXISTENTE', `Situação ${p.copiarDe} não existe.`);
    const estado = p.estado ?? origem?.estado;
    if (!estado) return err('SITUACAO_ESTADO', 'Informe o grupo de estados (estado).');
    if (!estadoInfo(estado).lista) return err('ESTADO_SEM_LISTA', `O grupo “${estadoInfo(estado).rotulo}” não usa lista de combinações.`);
    if ((b.situacoes ?? []).some((s) => s.estado === estado && s.nome === p.nome!.trim())) return err('SITUACAO_REPETIDA', `Já existe a situação ${p.nome} neste grupo.`);
    return coefsOk(b, p.fatores, p.gama, p.psi);
  },
  aplicar(d, p) {
    const o = p.copiarDe ? d.situacoes!.find((s) => s.id === p.copiarDe) : undefined;
    const modo = p.modo ?? o?.modo ?? 'fatores';
    const s: SituacaoUsuario = { id: novoId(d, 'si'), nome: p.nome!.trim(), estado: (p.estado ?? o?.estado)!, situacao: p.situacao ?? o?.situacao ?? 'normal', modo,
      fatores: limpa(p.fatores ?? (modo === 'fatores' ? o?.fatores ?? {} : {})), ...(modo === 'gamapsi' ? { gama: limpa(p.gama ?? o?.gama ?? {}), psi: limpa(p.psi ?? o?.psi ?? {}) } : {}) };
    (d.situacoes ??= []).push(s);
    return `Situação “${s.nome}” criada em ${estadoInfo(s.estado).rotulo}.`;
  },
});

registrar<SituacaoP & { id: string }>({
  nome: 'situacao.editar',
  descricao: 'Altera nome, tipo, modo ou os fatores (γ, ψ) de uma situação do usuário; os mapas informados substituem os anteriores.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, ...SITUACAO_PROPS } },
  validar(b, p) {
    const s = b.situacoes?.find((x) => x.id === p.id);
    if (!s) return err('SITUACAO_INEXISTENTE', `Situação ${p.id} não existe.`);
    if (p.nome && (b.situacoes ?? []).some((x) => x.id !== s.id && x.estado === s.estado && x.nome === p.nome!.trim())) return err('SITUACAO_REPETIDA', `Já existe a situação ${p.nome} neste grupo.`);
    return coefsOk(b, p.fatores, p.gama, p.psi);
  },
  aplicar(d, p) {
    const s = d.situacoes!.find((x) => x.id === p.id)!;
    if (p.nome !== undefined) s.nome = p.nome.trim();
    if (p.situacao) s.situacao = p.situacao;
    if (p.modo) {
      // ao passar de fatores para γ·ψ, o fator vira o γ (ψ = 1); no sentido contrário vira o produto
      if (p.modo === 'gamapsi' && s.modo !== 'gamapsi') { s.gama = { ...s.fatores }; s.psi = {}; }
      if (p.modo === 'fatores' && s.modo === 'gamapsi') { s.fatores = fatoresDaSituacao(s); delete s.gama; delete s.psi; }
      s.modo = p.modo;
    }
    if (p.fatores) s.fatores = limpa(p.fatores);
    if (p.gama) s.gama = limpa(p.gama);
    if (p.psi) s.psi = limpa(p.psi);
    if (s.modo === 'gamapsi') { s.gama ??= {}; s.psi ??= {}; }
    return `Situação “${s.nome}” alterada.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'situacao.remover',
  descricao: 'Remove situações do usuário.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) { const f = p.ids.filter((id) => !b.situacoes?.some((s) => s.id === id)); return f.length ? err('SITUACAO_INEXISTENTE', `Situação(ões) inexistente(s): ${f.join(', ')}.`) : []; },
  aplicar(d, p) { const s = new Set(p.ids); d.situacoes = d.situacoes!.filter((x) => !s.has(x.id)); if (!d.situacoes.length) delete d.situacoes; return `${p.ids.length} situação(ões) removida(s).`; },
});

registrar<{ estado: EstadoId; substituir?: boolean; combinacoes?: { nome: string; fatores: Coefs }[] }>({
  nome: 'situacao.importar',
  descricao: 'Cria as situações do usuário de um grupo de estados a partir das combinações da norma (mesmos nomes e fatores de combinacoesEdificio), para ajustar à mão. `combinacoes` aceita a lista já calculada pela análise (com a ampliação do vento por 0,95·γz); sem ela, usa o vento nominal (sem ampliação). `substituir` (padrão sim) troca as situações do grupo.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['estado'], properties: {
    estado: { type: 'string', enum: ESTADOS }, substituir: { type: 'boolean', default: true },
    combinacoes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['nome', 'fatores'], properties: { nome: { type: 'string', minLength: 1 }, fatores: { type: 'object' } } } },
  } },
  validar(b, p) {
    const i = estadoInfo(p.estado);
    if (!i.lista) return err('ESTADO_SEM_LISTA', `O grupo “${i.rotulo}” não usa lista de combinações.`);
    if (!normativas(b, p).length) return err('SEM_COMBINACOES', 'A norma não gera combinações deste grupo neste modelo.');
    return coefsOk(b, ...(p.combinacoes ?? []).map((c) => c.fatores));
  },
  aplicar(d, p) {
    const lista = normativas(d as BuildingModel, p);
    if (p.substituir !== false) d.situacoes = (d.situacoes ?? []).filter((s) => s.estado !== p.estado);
    const usados = new Set((d.situacoes ?? []).filter((s) => s.estado === p.estado).map((s) => s.nome));
    for (const c of lista) {
      let nome = c.nome, k = 2;
      while (usados.has(nome)) nome = `${c.nome} (${k++})`;
      usados.add(nome);
      (d.situacoes ??= []).push({ id: novoId(d, 'si'), nome, estado: p.estado, situacao: c.nome.startsWith('ELU excepcional') ? 'excepcional' : 'normal', modo: 'fatores', fatores: limpa(c.fatores) });
    }
    return `${lista.length} situação(ões) importada(s) da norma em ${estadoInfo(p.estado).rotulo}.`;
  },
});

/** Combinações da norma do grupo: a lista passada ou as geradas com o vento nominal (sem a ampliação do γz). */
function normativas(b: BuildingModel, p: { estado: EstadoId; combinacoes?: { nome: string; fatores: Coefs }[] }) {
  if (p.combinacoes) return p.combinacoes;
  const vento = b.vento?.ativo === false ? null : { classe: 'A' as const, altura: 0, casos: ([0, 90, 180, 270] as const).flatMap((direcao) => ([0, 1, -1] as const).map((exc) => ({ nome: `W${direcao}°${exc ? (exc > 0 ? '+e' : '−e') : ''}`, direcao, exc, forcas: [] }))), gamaZ: [] };
  const todas = combinacoesEdificio(b, { vento } as never);
  return combinacoesDoEstado({ ...b, estados: undefined, situacoes: undefined }, { vento } as never, p.estado, todas).map((c) => ({ nome: c.nome, fatores: c.fatores }));
}
