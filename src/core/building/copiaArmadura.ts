// Cópia de armadura entre pórticos (R7f): condições da cópia com o motivo da recusa, e modelos de pórtico que podem
// ser guardados na biblioteca do usuário e aplicados em outras obras.
//  Condições (programa de referência): mesmo número de vãos, diferença de cada vão menor que 25 cm e desníveis
//  coincidentes. Não há aviso se a armadura copiada for menor que a necessária: o recálculo verifica e reprova.
import { apoiosDaViga } from './detalhamento';
import type { ArmaduraViga, BuildingModel, DetalheEditado, Viga } from './types';
import { vaosDaViga } from './vigas';

/** Diferença máxima (m) entre os vãos correspondentes de duas vigas para copiar a armadura (registro C6.78). */
export const COPIA_DIF_VAO = 0.25;
/** Tolerância (m) entre desníveis para tê-los por coincidentes. */
export const COPIA_TOL_NIVEL = 0.01;

/** Vãos (distância entre os eixos dos apoios, m) e desnível do topo de uma viga. */
export function perfilDaViga(b: BuildingModel, v: Viga): { vaos: number[]; nivel: number; secao: { b: number; h: number } } {
  const c = apoiosDaViga(b, v).map((a) => (a.s0 + a.s1) / 2);
  return { vaos: c.slice(1).map((x, i) => x - c[i]), nivel: v.nivel ?? 0, secao: { ...v.secao } };
}

/** Motivo de não se poder copiar a armadura de um pórtico (perfil `de`) para a viga `para` (nenhum = pode). */
export function motivoCopia(b: BuildingModel, de: { vaos: number[]; nivel: number }, para: Viga): string | null {
  const p = perfilDaViga(b, para);
  if (p.vaos.length !== de.vaos.length) return `${para.nome} tem ${p.vaos.length} vão(s) e a origem tem ${de.vaos.length}`;
  const i = p.vaos.findIndex((x, k) => Math.abs(x - de.vaos[k]) >= COPIA_DIF_VAO);
  if (i >= 0) return `o vão ${i + 1} de ${para.nome} (${p.vaos[i].toFixed(2).replace('.', ',')} m) difere em ${(Math.abs(p.vaos[i] - de.vaos[i]) * 100).toFixed(0)} cm do da origem (${de.vaos[i].toFixed(2).replace('.', ',')} m; o limite é ${Math.round(COPIA_DIF_VAO * 100)} cm)`;
  if (Math.abs(p.nivel - de.nivel) > COPIA_TOL_NIVEL) return `o desnível de ${para.nome} (${(p.nivel * 100).toFixed(0)} cm) não coincide com o da origem (${(de.nivel * 100).toFixed(0)} cm)`;
  return null;
}

/** Pórtico guardado para reaproveitar em outras obras (biblioteca do usuário): armadura, detalhe editado e perfil. */
export interface ModeloPortico {
  versao: 1;
  nome: string;
  secao: { b: number; h: number };
  nivel: number;
  vaos: number[];
  armadura: Omit<ArmaduraViga, 'vaos'>;
  detalhe?: Omit<DetalheEditado, 'vaos'>;
}

/** Modelo a partir de uma viga com armadura bloqueada (nenhum se não houver). */
export function modeloDaViga(b: BuildingModel, v: Viga, nome?: string): ModeloPortico | null {
  if (!v.armadura) return null;
  const { vaos: _v, ...arm } = v.armadura;
  const p = perfilDaViga(b, v);
  const det = v.detalhe && v.detalhe.vaos === vaosDaViga(b, v) ? (({ vaos: _d, ...r }) => r)(v.detalhe) : undefined;
  return { versao: 1, nome: nome?.trim() || v.nome, secao: p.secao, nivel: p.nivel, vaos: p.vaos.map((x) => +x.toFixed(3)), armadura: JSON.parse(JSON.stringify(arm)), ...(det && Object.keys(det).length ? { detalhe: JSON.parse(JSON.stringify(det)) } : {}) };
}

/** Confere se um objeto lido (JSON) tem a forma de um modelo de pórtico. */
export function ehModeloPortico(x: unknown): x is ModeloPortico {
  const m = x as ModeloPortico | null;
  return !!m && m.versao === 1 && typeof m.nome === 'string' && Array.isArray(m.vaos) && m.vaos.every((n) => typeof n === 'number') && !!m.armadura && typeof m.armadura.inf?.n === 'number' && typeof m.armadura.estribo?.s === 'number' && !!m.secao && typeof m.nivel === 'number';
}
