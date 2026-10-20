// Premissas do módulo Edifícios em uso no código: exibidas no app, servidas ao MCP e escritas no memorial.
// Cresce a cada fatia; a lista completa aceita pelo usuário está em docs/spec-edificios.md (seção 0).
import { COBRIMENTOS, USOS } from './types';
import { PE_DIREITO_MIN } from './verify';

export interface Premissa { id: string; tema: string; texto: string; fonte: string; aConfirmar: boolean }

export const PREMISSAS: Premissa[] = [
  { id: 'cota', tema: 'Obra', texto: 'A cota do pavimento é o topo da laje estrutural; revestimento entra como carga (padrão 1,0 kN/m²).', fonte: 'Spec, item 2', aConfirmar: false },
  { id: 'fundacao', tema: 'Obra', texto: 'Nível de fundação global 1,5 m abaixo do pavimento mais baixo (editável); desvio por pilar na V2.', fonte: 'Spec, item 3', aConfirmar: false },
  { id: 'grupo', tema: 'Obra', texto: 'Só pavimentos com o mesmo pé-direito formam grupo; o grupo compartilha a planta (pavimento-tipo vinculado).', fonte: 'Spec, item 1', aConfirmar: false },
  { id: 'pedireito', tema: 'Obra', texto: `Pé-direito abaixo de ${String(PE_DIREITO_MIN).replace('.', ',')} m gera aviso.`, fonte: 'Critério do app', aConfirmar: true },
  { id: 'uso', tema: 'Cargas', texto: `Carga variável padrão por uso: ${USOS.map((u) => `${u.label.split(' (')[0].toLowerCase()} ${String(u.q).replace('.', ',')}`).join('; ')} kN/m².`, fonte: 'NBR 6120:2019, Tabela 10', aConfirmar: true },
  { id: 'cobrimento', tema: 'Norma', texto: `Cobrimentos nominais pela CAA (laje/viga/pilar, cm): ${Object.entries(COBRIMENTOS).map(([k, c]) => `${k} ${c.laje}/${c.viga}/${c.pilar}`).join('; ').replace(/\./g, ',')}.`, fonte: 'NBR 6118, Tabela 7.2', aConfirmar: false },
  { id: 'padroes', tema: 'Norma', texto: 'Padrões: fck 30 MPa, CA-50, CAA II.', fonte: 'CLAUDE.md (premissas confirmadas)', aConfirmar: false },
];
