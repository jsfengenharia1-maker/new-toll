// Validador do subconjunto de JSON Schema usado pelos comandos (sem dependência externa).
// Suporta: type object/array/string/number/integer/boolean, properties, required, additionalProperties: false,
// enum, const, minimum, maximum, exclusiveMinimum, minLength, minItems, maxItems, items, oneOf, default, description.

export interface JsonSchema {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: readonly (string | number)[];
  const?: string | number | boolean;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  minLength?: number;
  minItems?: number;
  maxItems?: number;
  oneOf?: JsonSchema[];
  default?: unknown;
}

export interface SchemaError { caminho: string; mensagem: string }

function typeOk(t: JsonSchema['type'], v: unknown): boolean {
  switch (t) {
    case 'object': return typeof v === 'object' && v !== null && !Array.isArray(v);
    case 'array': return Array.isArray(v);
    case 'string': return typeof v === 'string';
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    case 'integer': return typeof v === 'number' && Number.isInteger(v);
    case 'boolean': return typeof v === 'boolean';
    default: return true;
  }
}

const NOMES = { object: 'objeto', array: 'lista', string: 'texto', number: 'número', integer: 'inteiro', boolean: 'verdadeiro/falso' };

/** Valida `v` contra `s`. Lista vazia = válido. */
export function validarSchema(s: JsonSchema, v: unknown, caminho = ''): SchemaError[] {
  const at = caminho || '(raiz)';
  if (s.oneOf) {
    const ok = s.oneOf.filter((o) => validarSchema(o, v, caminho).length === 0).length;
    return ok === 1 ? [] : [{ caminho: at, mensagem: ok ? 'corresponde a mais de uma alternativa' : 'não corresponde a nenhuma alternativa' }];
  }
  if (s.type && !typeOk(s.type, v)) return [{ caminho: at, mensagem: `esperado ${NOMES[s.type]}` }];
  const e: SchemaError[] = [];
  if (s.const !== undefined && v !== s.const) e.push({ caminho: at, mensagem: `deve ser ${JSON.stringify(s.const)}` });
  if (s.enum && !s.enum.includes(v as string | number)) e.push({ caminho: at, mensagem: `deve ser um de: ${s.enum.join(', ')}` });
  if (typeof v === 'number') {
    if (s.minimum !== undefined && v < s.minimum) e.push({ caminho: at, mensagem: `deve ser ≥ ${s.minimum}` });
    if (s.maximum !== undefined && v > s.maximum) e.push({ caminho: at, mensagem: `deve ser ≤ ${s.maximum}` });
    if (s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum) e.push({ caminho: at, mensagem: `deve ser > ${s.exclusiveMinimum}` });
  }
  if (typeof v === 'string' && s.minLength !== undefined && v.trim().length < s.minLength) e.push({ caminho: at, mensagem: s.minLength === 1 ? 'não pode ser vazio' : `mínimo de ${s.minLength} caracteres` });
  if (Array.isArray(v)) {
    if (s.minItems !== undefined && v.length < s.minItems) e.push({ caminho: at, mensagem: `mínimo de ${s.minItems} item(ns)` });
    if (s.maxItems !== undefined && v.length > s.maxItems) e.push({ caminho: at, mensagem: `máximo de ${s.maxItems} item(ns)` });
    if (s.items) v.forEach((x, i) => e.push(...validarSchema(s.items!, x, `${caminho}[${i}]`)));
  }
  if (s.type === 'object' && typeOk('object', v)) {
    const o = v as Record<string, unknown>;
    for (const r of s.required ?? []) if (o[r] === undefined) e.push({ caminho: caminho ? `${caminho}.${r}` : r, mensagem: 'obrigatório' });
    for (const [k, x] of Object.entries(o)) {
      const p = s.properties?.[k];
      const ck = caminho ? `${caminho}.${k}` : k;
      if (p) { if (x !== undefined) e.push(...validarSchema(p, x, ck)); }
      else if (s.additionalProperties === false) e.push({ caminho: ck, mensagem: 'parâmetro desconhecido' });
    }
  }
  return e;
}

/** Cópia dos parâmetros com os valores `default` do schema preenchidos (só no primeiro nível de objeto). */
export function comDefaults<P>(s: JsonSchema, v: P): P {
  if (s.type !== 'object' || !typeOk('object', v)) return v;
  const o = { ...(v as Record<string, unknown>) };
  for (const [k, p] of Object.entries(s.properties ?? {})) if (o[k] === undefined && p.default !== undefined) o[k] = structuredClone(p.default);
  return o as P;
}
