import { addMember } from '../core/edit';
import { emptyModel, type Model, type Support } from '../core/types';

const FIX: Support = { ux: 'fixed', uy: 'fixed', rz: 'fixed' };
const PIN: Support = { ux: 'fixed', uy: 'fixed', rz: 'free' };
const ROL: Support = { ux: 'free', uy: 'fixed', rz: 'free' };

function sup(m: Model, x: number, y: number, s: Support) {
  const n = m.nodes.find((k) => Math.abs(k.x - x) < 1e-9 && Math.abs(k.y - y) < 1e-9);
  if (n) n.support = { ...s };
}
const memAt = (m: Model, x1: number, y1: number, x2: number, y2: number) => {
  const n1 = m.nodes.find((n) => n.x === x1 && n.y === y1)!, n2 = m.nodes.find((n) => n.x === x2 && n.y === y2)!;
  return m.members.find((k) => (k.ni === n1.id && k.nj === n2.id) || (k.ni === n2.id && k.nj === n1.id))!.id;
};
const nodeAt = (m: Model, x: number, y: number) => m.nodes.find((n) => n.x === x && n.y === y)!.id;

export function samplePortico(): Model {
  const m = emptyModel();
  m.name = 'Exemplo · pórtico de galpão';
  m.sections = [
    { id: 1, name: 'Pilar 30x50', shape: { kind: 'rect', b: 0.3, h: 0.5 } },
    { id: 2, name: 'Viga 20x60', shape: { kind: 'rect', b: 0.2, h: 0.6 } },
  ];
  addMember(m, 0, 0, 0, 5, 1, 1);
  addMember(m, 0, 5, 4, 6.2, 1, 2);
  addMember(m, 4, 6.2, 8, 5, 1, 2);
  addMember(m, 8, 5, 8, 0, 1, 1);
  addMember(m, 8, 5, 10, 5, 1, 2);
  sup(m, 0, 0, FIX);
  sup(m, 8, 0, FIX);
  m.cases = [
    { id: 1, name: 'Permanente', nature: 'G' },
    { id: 2, name: 'Sobrecarga', nature: 'Q' },
    { id: 3, name: 'Vento', nature: 'W' },
  ];
  const r1 = memAt(m, 0, 5, 4, 6.2), r2 = memAt(m, 4, 6.2, 8, 5), bal = memAt(m, 8, 5, 10, 5);
  let id = 1;
  m.loads = [
    { kind: 'selfWeight', id: id++, caseId: 1, factor: 1 },
    { kind: 'dist', id: id++, caseId: 1, member: r1, system: 'global', qxi: 0, qyi: -4, qxj: 0, qyj: -4 },
    { kind: 'dist', id: id++, caseId: 1, member: r2, system: 'global', qxi: 0, qyi: -4, qxj: 0, qyj: -4 },
    { kind: 'dist', id: id++, caseId: 1, member: bal, system: 'global', qxi: 0, qyi: -4, qxj: 0, qyj: -4 },
    { kind: 'dist', id: id++, caseId: 2, member: r1, system: 'projected', qxi: 0, qyi: -3, qxj: 0, qyj: -3 },
    { kind: 'dist', id: id++, caseId: 2, member: r2, system: 'projected', qxi: 0, qyi: -3, qxj: 0, qyj: -3 },
    { kind: 'nodal', id: id++, caseId: 2, node: nodeAt(m, 10, 5), fx: 0, fy: -12, mz: 0 },
    { kind: 'dist', id: id++, caseId: 3, member: memAt(m, 0, 0, 0, 5), system: 'global', qxi: 2.4, qyi: 0, qxj: 2.4, qyj: 0 },
    { kind: 'dist', id: id++, caseId: 3, member: memAt(m, 8, 5, 8, 0), system: 'global', qxi: 1.5, qyi: 0, qxj: 1.5, qyj: 0 },
  ];
  m.combinations = [];
  return m;
}

export function sampleViga(): Model {
  const m = emptyModel();
  m.name = 'Exemplo · viga contínua com trem-tipo';
  m.materials = [{ id: 1, name: 'Concreto C35', E: 29.4e6, nu: 0.2, alpha: 1e-5, gamma: 25, kind: 'concrete', fck: 35 }];
  m.sections = [{ id: 1, name: 'Longarina T', shape: { kind: 'tee', bf: 2.0, tf: 0.2, bw: 0.4, h: 1.4 } }];
  addMember(m, 0, 0, 10, 0, 1, 1);
  addMember(m, 10, 0, 22, 0, 1, 1);
  addMember(m, 22, 0, 32, 0, 1, 1);
  sup(m, 0, 0, PIN); sup(m, 10, 0, ROL); sup(m, 22, 0, ROL); sup(m, 32, 0, ROL);
  m.cases = [{ id: 1, name: 'Permanente', nature: 'G' }];
  m.loads = [{ kind: 'selfWeight', id: 1, caseId: 1, factor: 1 }, ...m.members.map((mm, k) => ({ kind: 'dist' as const, id: 2 + k, caseId: 1, member: mm.id, system: 'global' as const, qxi: 0, qyi: -12, qxj: 0, qyj: -12 }))];
  m.trains = [{ id: 1, name: 'Veículo exemplo (3 eixos)', length: 6, loads: [{ d: 1.5, P: 75 }, { d: 3, P: 75 }, { d: 4.5, P: 75 }], q: 10, qIn: 0, impact: 1.25 }];
  return m;
}

export function sampleTrelica(): Model {
  const m = emptyModel();
  m.name = 'Exemplo · treliça Howe';
  m.materials = [{ id: 1, name: 'Aço ASTM A572 Gr.50', E: 200e6, nu: 0.3, alpha: 1.2e-5, gamma: 78.5, kind: 'steel', fy: 345, fu: 450 }];
  m.sections = [{ id: 1, name: 'Tubo Ø114x6', shape: { kind: 'tube', d: 0.1143, t: 0.006 } }];
  const n = 6, w = 3, H = 3;
  for (let k = 0; k < n; k++) addMember(m, k * w, 0, (k + 1) * w, 0, 1, 1);
  for (let k = 1; k < n; k++) addMember(m, k * w, 0, k * w, H * (1 - Math.abs(k - n / 2) / (n / 2)) + (k === n / 2 ? 0 : 0), 1, 1);
  const top = (k: number) => H * (1 - Math.abs(k - n / 2) / (n / 2));
  for (let k = 0; k < n; k++) addMember(m, k * w, top(k), (k + 1) * w, top(k + 1), 1, 1);
  for (let k = 1; k < n - 1; k++) {
    if (k < n / 2) addMember(m, k * w, top(k), (k + 1) * w, 0, 1, 1);
    else addMember(m, k * w, 0, (k + 1) * w, top(k + 1), 1, 1);
  }
  m.members.forEach((mm) => { mm.hingeI = true; mm.hingeJ = true; });
  sup(m, 0, 0, PIN); sup(m, n * w, 0, ROL);
  m.cases = [{ id: 1, name: 'Cobertura', nature: 'G' }];
  m.loads = [];
  for (let k = 1; k < n; k++) m.loads.push({ kind: 'nodal', id: k, caseId: 1, node: nodeAt(m, k * w, top(k)), fx: 0, fy: -20, mz: 0 });
  return m;
}

export const SAMPLES = [
  { key: 'portico', label: 'Pórtico de galpão', make: samplePortico },
  { key: 'viga', label: 'Viga contínua + trem-tipo', make: sampleViga },
  { key: 'trelica', label: 'Treliça Howe', make: sampleTrelica },
];
