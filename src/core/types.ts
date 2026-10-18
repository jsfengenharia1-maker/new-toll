// Modelo de dados do analisador de pórticos planos.
// Unidades internas: kN, m, rad, °C. (E em kN/m², A em m², I em m⁴)

export type Restraint = 'free' | 'fixed' | 'spring';

export interface Support {
  ux: Restraint;
  uy: Restraint;
  rz: Restraint;
  kx?: number; // kN/m
  ky?: number; // kN/m
  kr?: number; // kN·m/rad
  /** Ângulo (graus) dos eixos locais do apoio em relação ao global (apoio inclinado). */
  angle?: number;
}

export interface Node {
  id: number;
  x: number;
  y: number;
  support?: Support;
}

export interface Material {
  id: number;
  name: string;
  E: number; // kN/m²
  nu: number;
  alpha: number; // 1/°C
  gamma: number; // kN/m³ (peso específico)
  kind?: 'concrete' | 'steel' | 'other';
  fck?: number; // MPa (concreto)
  fy?: number; // MPa (aço estrutural)
  fu?: number; // MPa (aço estrutural)
}

export type SectionShape =
  | { kind: 'generic'; A: number; I: number; h: number; As?: number }
  | { kind: 'rect'; b: number; h: number }
  | { kind: 'circle'; d: number }
  | { kind: 'tube'; d: number; t: number }
  | { kind: 'tee'; bf: number; tf: number; bw: number; h: number }
  | { kind: 'ishape'; bf: number; tf: number; tw: number; h: number }
  | { kind: 'box'; b: number; h: number; t: number };

export interface Section {
  id: number;
  name: string;
  shape: SectionShape;
}

export interface Member {
  id: number;
  ni: number; // id do nó inicial
  nj: number; // id do nó final
  material: number;
  section: number;
  hingeI?: boolean;
  hingeJ?: boolean;
  /** Papel no dimensionamento (auto: inclinação > 60° com a horizontal = pilar). */
  role?: MemberRole;
  /** Comprimento de flambagem no plano do pórtico (m). Padrão: comprimento da barra. */
  leIn?: number;
  /** Comprimento de flambagem / travamento lateral fora do plano (m). Padrão: comprimento da barra. */
  leOut?: number;
}

export type MemberRole = 'auto' | 'beam' | 'column' | 'none';

export type LoadSystem = 'local' | 'global' | 'projected';

export interface NodalLoad { kind: 'nodal'; id: number; caseId: number; node: number; fx: number; fy: number; mz: number }
/** Carga distribuída linear em toda a barra (uniforme quando i = j). */
export interface DistLoad {
  kind: 'dist'; id: number; caseId: number; member: number; system: LoadSystem;
  qxi: number; qyi: number; qxj: number; qyj: number;
}
export interface EndMoment { kind: 'endMoment'; id: number; caseId: number; member: number; mi: number; mj: number }
/** Variação de temperatura nas fibras y+ (superior) e y− (inferior), em °C. */
export interface ThermalLoad { kind: 'thermal'; id: number; caseId: number; member: number; tTop: number; tBot: number }
export interface PrescribedDisp { kind: 'presc'; id: number; caseId: number; node: number; dx?: number; dy?: number; rz?: number }
export interface SelfWeight { kind: 'selfWeight'; id: number; caseId: number; factor: number }

export type Load = NodalLoad | DistLoad | EndMoment | ThermalLoad | PrescribedDisp | SelfWeight;

export type CaseNature = 'G' | 'Q' | 'W';
export interface LoadCase { id: number; name: string; nature?: CaseNature; psi0?: number; psi1?: number; psi2?: number }
export type ComboKind = 'ELU' | 'QP' | 'FREQ' | 'RARA';
export interface Combination { id: number; name: string; factors: Record<number, number>; kind?: ComboKind }

export interface TrainLoad { d: number; P: number } // posição a partir da frente (m), carga (kN)
export interface LoadTrain {
  id: number;
  name: string;
  length: number; // comprimento do veículo (m)
  loads: TrainLoad[];
  q: number; // carga distribuída fora do veículo (kN/m)
  qIn: number; // carga distribuída sob o veículo (kN/m)
  impact: number; // coeficiente de impacto
}

export interface AnalysisOptions {
  shearDeformation: boolean;
  axialDeformation: boolean;
}

export interface DesignSettings {
  caa: 1 | 2 | 3 | 4;
  coverBeam?: number; // m (padrão pela CAA)
  coverColumn?: number; // m
  gammaC: number;
  gammaS: number;
  fyk: number; // MPa, armadura longitudinal
  fywk: number; // MPa, estribos
  dmax: number; // m, diâmetro máximo do agregado
  gammaA1: number; // aço estrutural
}

export interface ProjectInfo {
  obra: string;
  cliente: string;
  local: string;
  responsavel: string;
  registro: string;
  revisao: string;
}

export const defaultDesign = (): DesignSettings => ({ caa: 2, gammaC: 1.4, gammaS: 1.15, fyk: 500, fywk: 500, dmax: 0.019, gammaA1: 1.1 });
export const defaultProject = (): ProjectInfo => ({ obra: '', cliente: '', local: '', responsavel: '', registro: '', revisao: 'R00' });

export interface Model {
  version: 1;
  name: string;
  design?: DesignSettings;
  project?: ProjectInfo;
  foundation?: import('./piles').FoundationData;
  nodes: Node[];
  members: Member[];
  materials: Material[];
  sections: Section[];
  cases: LoadCase[];
  combinations: Combination[];
  loads: Load[];
  trains: LoadTrain[];
  options: AnalysisOptions;
}

export function emptyModel(): Model {
  return {
    version: 1,
    name: 'Novo modelo',
    nodes: [],
    members: [],
    materials: [{ id: 1, name: 'Concreto C30', E: 26.84e6, nu: 0.2, alpha: 1e-5, gamma: 25, kind: 'concrete', fck: 30 }],
    sections: [{ id: 1, name: 'Ret 20x50', shape: { kind: 'rect', b: 0.2, h: 0.5 } }],
    cases: [{ id: 1, name: 'Caso 1' }],
    combinations: [],
    loads: [],
    trains: [],
    options: { shearDeformation: false, axialDeformation: true },
    design: defaultDesign(),
    project: defaultProject(),
  };
}
