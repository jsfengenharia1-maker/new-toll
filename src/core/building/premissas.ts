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
  { id: 'pilar-min', tema: 'Pilares', texto: 'Menor dimensão ≥ 19 cm; entre 14 e 19 cm exige γn (aviso); abaixo de 14 cm ou área < 360 cm² é erro.', fonte: 'NBR 6118, 13.2.3 (item a confirmar na edição de 2023)', aConfirmar: true },
  { id: 'pilar-parede', tema: 'Pilares', texto: 'Seção com lado maior > 5 × o menor é pilar-parede (aviso; modelo próprio na V2).', fonte: 'NBR 6118, 14.4.2.4 (item a confirmar)', aConfirmar: true },
  { id: 'renumerar', tema: 'Pilares', texto: 'Renumeração da esquerda para a direita e de cima para baixo; pilares com centros a até 0,3 m em y ficam na mesma linha.', fonte: 'Spec, item 5', aConfirmar: true },
  { id: 'unidade-dxf', tema: 'Máscara', texto: 'Unidade do DXF por $INSUNITS; sem ela, estimada pela maior dimensão do desenho (> 5000 → mm; > 300 → cm; senão m), editável.', fonte: 'Critério do app', aConfirmar: true },
  { id: 'viga-apoio', tema: 'Vigas', texto: 'Apoio da viga = pilar que chega ao pavimento e toca o corpo da viga, ou outra viga cujo eixo ela cruza ou em cujo corpo ela termina (folga de 1 cm). Sem apoio é erro; um apoio só é aviso de balanço.', fonte: 'Critério do app', aConfirmar: true },
  { id: 'viga-face', tema: 'Vigas', texto: 'Face da viga a até 5 cm da face paralela do pilar (viga não centrada) gera aviso com a correção “encostar na face”.', fonte: 'Critério do app', aConfirmar: true },
  { id: 'viga-numeracao', tema: 'Vigas', texto: 'Vigas numeradas por grupo: horizontais de cima para baixo e da esquerda para a direita; depois verticais e inclinadas da esquerda para a direita.', fonte: 'Spec, item 5', aConfirmar: false },
  { id: 'transicao', tema: 'Pilares', texto: 'Pilar que nasce sobre viga (transição) é erro até a V2; pilar que nasce sem viga embaixo é erro.', fonte: 'Spec, item 8', aConfirmar: false },
  { id: 'pano', tema: 'Lajes', texto: 'Contorno da laje pelo eixo das vigas; pontas das vigas levadas ao eixo da viga de apoio para fechar cantos e “T”. Região fechada sem laje gera aviso.', fonte: 'Spec, item 12', aConfirmar: false },
  { id: 'trelicada', tema: 'Lajes', texto: 'Treliçadas com EPS: H8/H12/H16 (intereixo 42 cm, nervura 9 cm, capa 4 cm) e H20/H25 (50 cm, 10 cm, capa 5 cm); peso próprio = 25 × (capa + nervura) + 0,2 kN/m³ × EPS; vigotas no menor vão; fora de região fechada por vigas é erro.', fonte: 'Catálogo a confirmar com o fabricante', aConfirmar: true },
  { id: 'alvenaria', tema: 'Cargas', texto: 'Alvenaria da máscara: pares de linhas paralelas a 5–35 cm; peso = γ (cerâmico 13, concreto 14 kN/m³, com revestimento) × espessura × altura; altura = até o pavimento de cima menos a viga mais comum dele (sem vigas: 0,5 m); na cobertura, 1,0 m (platibanda). Aberturas não são descontadas nesta versão.', fonte: 'Spec, item 17', aConfirmar: true },
  { id: 'capturas', tema: 'Desenho', texto: 'Capturas num raio de 12 px; prioridade: extremidade > interseção > meio > centro > quadrante > perpendicular > próximo; polar a cada 15°.', fonte: 'Spec, itens 32', aConfirmar: false },
];
