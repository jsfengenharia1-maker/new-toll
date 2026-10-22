import { describe, expect, it } from 'vitest';
import { afetaCalculo, aplicarComando, comandosEdificioPadrao, listarComandos, replay, Sessao, validarSchema, type JsonSchema } from './index';
import { edificioVazio, lancesDoPilar, peDireito } from '../building/types';
import { ESPEC_PADRAO } from '../building/assistente';
import { importarArranques, UNIDADES_PADRAO } from '../building/importarArranques';
import { verificar } from '../building/verify';
import { propostaDeLancamento, REGRAS_PADRAO, sugerirRegras } from '../building/lancamentoDxf';
import { lerEdificio } from '../building/file';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) expect(s.executar(c.nome, c.params, 'sistema').ok).toBe(true);
  return s;
}

const GEO = { PAREDE: { linhas: [0, 0, 1000, 0, 1000, 0, 1000, 800], arcos: [500, 400, 50, 0, 360], textos: [{ x: 10, y: 10, h: 20, rot: 0, t: 'SALA' }] }, PORTA: { linhas: [0, 0, 90, 0], arcos: [], textos: [] }, ALV: { linhas: [0, 300, 400, 300, 0, 315, 400, 315], arcos: [], textos: [] } };

/** Modelo base dos testes genéricos: padrão + eixos + grupo vazio + máscara (cm) + pilares P1 (0; 0) e P2 (4; 3) + vigas V1 (vertical) e V2 (horizontal) no Tipo. */
function base() {
  const s = padrao();
  for (const [n, p] of [
    ['eixo.malha', { dx: [4], dy: [3] }],
    ['grupo.criar', { nome: 'Vazio' }],
    ['mascara.importar', { grupo: 'g_3', nome: 'Arquitetura', geo: GEO, escala: 0.01 }],
    ['pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.5 } }],
    ['pilar.inserir', { x: 4, y: 3, secao: { tipo: 'ret', b: 0.2, h: 0.5 } }],
    ['viga.tracar', { grupo: 'g_3', pontos: [[4, 0], [4, 3]], secao: { b: 0.15, h: 0.4 } }],
    ['viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [4, 0]], secao: { b: 0.15, h: 0.4 }, alinhamento: 'esq' }],
    ['viga.tracar', { grupo: 'g_3', pontos: [[4, 0], [6, 0]], secao: { b: 0.15, h: 0.4 }, alinhamento: 'esq' }],
    ['viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [0, 3], [4, 3]], secao: { b: 0.15, h: 0.4 } }],
    ['laje.criar', { grupo: 'g_3', contorno: [[10, 0], [12, 0], [12, 2], [10, 2]] }],
    ['laje.criar', { grupo: 'g_3', contorno: [[10, 3], [12, 3], [12, 5], [10, 5]], tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } }],
    ['carga.ponto', { grupo: 'g_3', ponto: [1, 1], valor: 10 }],
    ['caso.criar', { nome: 'Empuxo', natureza: 'G' }],
    ['caso.criar', { nome: 'Água', natureza: 'Q' }],
    ['caso.criar', { nome: 'Vazio', natureza: 'Q' }],
    ['empuxo.tipo', { nome: 'Subsolo', metodo: 'repouso', estratos: [{ espessura: 5, gama: 18, phi: 30 }], cotaAterro: 0 }],
    ['situacao.importar', { estado: 'solo' }],
    ['corte.criar', { pontos: [[0, 1], [6, 1]] }],
    ['secao.criar', { a: [0, 0], b: [6, 3] }],
  ] as const) expect(s.executar(n, p).ok, n).toBe(true);
  // L2: a máscara sai da origem da importação (para `mascara.origemOriginal` ter o que desfazer)
  expect(s.executar('mascara.editar', { id: s.modelo.mascaras[0].id, dx: 0.5 }).ok).toBe(true);
  expect(s.executar('carga.pilar', { pilar: s.modelo.pilares[0].id, caso: 'Q', N: 50 }).ok).toBe(true);
  // R7a: uma tabela de vigas criada (para restaurar e remover) e a padrão dos estribos alterada
  expect(s.executar('tabela.definir', { tipo: 'vigas', tabela: { id: 'so16', nome: 'Só φ16', linhas: [{ bAte: 999, hAte: 999, pos: { bitolas: [16], nMin: 2, camadas: 2 }, neg: { bitolas: [16], nMin: 2, camadas: 2 }, passante: 0.5 }] } }).ok).toBe(true);
  expect(s.executar('tabela.definir', { tipo: 'estribos', tabela: { id: 'padrao', nome: 'Padrão', linhas: [{ bAte: 999, bitolas: [5, 6.3], sMin: 8, sMax: 20, ramos: [2, 4] }] } }).ok).toBe(true);
  expect(s.executar('viga.armadura', { id: s.modelo.vigas[1].id, inf: { n: 2, phi: 10 }, estribo: { phi: 5, s: 0.2 } }).ok).toBe(true);
  expect(s.executar('sondagem.criar', { nome: 'SP-01', x: 0, y: 0, nivelAgua: 6, leituras: [5, 8, 10, 12, 15, 18, 20, 25].map((N) => ({ N, solo: 'areia' })) }).ok).toBe(true);
  expect(s.executar('fundacao.terreno', { sigmaAdm: 250, estacas: [{ tipo: 'helice', D: 40, modo: 'informada', capacidade: 600 }] }).ok).toBe(true);
  expect(s.executar('fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'sapata', posicao: 'divisa', lado: [-1, 0] }).ok).toBe(true);
  // FU2: terceiro pilar e duas vigas de fundação (equilíbrio do elemento de P1 até P2; travamento P2–P3)
  expect(s.executar('pilar.inserir', { x: 0, y: 6, secao: { tipo: 'ret', b: 0.2, h: 0.2 } }).ok).toBe(true);
  // FU3: sapata sob P3 (para unir e igualar) e um limite poligonal
  expect(s.executar('fundacao.criar', { pilares: [s.modelo.pilares[2].id], tipo: 'sapata', posicao: 'centrada' }).ok).toBe(true);
  expect(s.executar('limite.criar', { pontos: [[-3, -3], [-3, 9]], nome: 'Divisa' }).ok).toBe(true);
  expect(s.executar('vigaFundacao.criar', { tipo: 'equilibrio', ini: s.modelo.fundacao!.elementos[0].id, fim: s.modelo.pilares[1].id }).ok).toBe(true);
  expect(s.executar('vigaFundacao.criar', { tipo: 'travamento', ini: s.modelo.pilares[1].id, fim: s.modelo.pilares[2].id, b: 0.2, h: 0.5 }).ok).toBe(true);
  // FU6: um radier e uma viga sobre base elástica longe dos pilares
  expect(s.executar('radier.criar', { contorno: [[20, 0], [24, 0], [24, 4], [20, 4]], h: 0.35 }).ok).toBe(true);
  expect(s.executar('vigaElastica.criar', { pontos: [[20, 10], [26, 10]] }).ok).toBe(true);
  // FU7a: uma sapata corrida sob parede longe dos pilares
  expect(s.executar('corrida.criar', { pontos: [[40, 0], [46, 0]], bw: 0.2 }).ok).toBe(true);
  // FU8a: sapata corrida de aba única com uma cinta até a sapata do P1
  expect(s.executar('corrida.criar', { pontos: [[-6, -3], [-6, 3]], bw: 0.2, aba: 'dir' }).ok).toBe(true);
  expect(s.executar('cinta.criar', { corrida: s.modelo.fundacao!.corridas![1].id, s: 3, fim: s.modelo.fundacao!.elementos[0].id, nome: 'CT1' }).ok).toBe(true);
  // E1b: um tipo de pilar-parede e um pilar-parede longe dos demais
  expect(s.executar('pilarParede.tipo', { nome: 'Parede 2 m', vertices: [[0, 0], [2, 0]], esq: 0.1, dir: 0.1 }).ok).toBe(true);
  expect(s.executar('pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 60, y: 60 }).ok).toBe(true);
  // E1c: uma parede longe dos demais e uma viga sobre ela (para embutir)
  expect(s.executar('parede.criar', { pontos: [[80, 0], [86, 0]], espessura: 0.2 }).ok).toBe(true);
  expect(s.executar('viga.tracar', { grupo: 'g_3', pontos: [[80, 0], [86, 0]], secao: { b: 0.2, h: 0.5 } }).ok).toBe(true);
  // E1d: uma porta na parede (para armadura da abertura) e um muro de arrimo isolado
  expect(s.executar('parede.abertura', { parede: s.modelo.paredes![0].id, s: 3, largura: 1, altura: 2.1, pavimento: s.modelo.pavimentos[0].id }).ok).toBe(true);
  // E1e: um bloco, tipos de alvenaria (blocos e genérica) e uma parede de blocos com uma porta, longe das demais
  expect(s.executar('bloco.tipo', { nome: 'B15', comprimento: 0.4, largura: 0.15, altura: 0.2, fbk: 6 }).ok).toBe(true);
  expect(s.executar('alvenaria.tipo', { nome: 'Blocos B15', modelo: 'blocos', bloco: s.modelo.blocos![0].id, gama: 14 }).ok).toBe(true);
  expect(s.executar('alvenaria.tipo', { nome: 'Alvenaria genérica', modelo: 'generica', gama: 13, E: 1500, fd: 1.2 }).ok).toBe(true);
  expect(s.executar('parede.criar', { pontos: [[100, 0], [104, 0]], espessura: 0.15, tipo: 'blocos', material: s.modelo.tiposAlvenaria![0].id }).ok).toBe(true);
  expect(s.executar('parede.abertura', { parede: s.modelo.paredes![1].id, s: 1.07, largura: 0.9, altura: 2.1, pavimento: s.modelo.pavimentos[0].id }).ok).toBe(true);
  expect(s.executar('muro.arrimo', { nome: 'MA1', H: 3, tTopo: 0.2, tBase: 0.3, B: 2, ponta: 0.5, hBase: 0.4, solo: { gama: 18, phi: 30, metodo: 'rankine' }, sobrecarga: 10 }).ok).toBe(true);
  return s.modelo;
}

/** Parâmetros válidos de exemplo para cada comando (sobre o modelo base). */
const EXEMPLOS: Record<string, (b: ReturnType<typeof base>) => Record<string, unknown>> = {
  'obra.definir': () => ({ nome: 'Outro', profundidadeFundacao: 2, descricao: ['Residencial de 5 pavimentos', 'Fase de anteprojeto'], origem: 'assistente' }),
  'obra.importarArranques': () => ({ nome: 'Só arranques', resultado: importarArranques('Pilar;Caso;N;x;y\nPA;G;300;9000;9000\nPB;G;200;9500;9000', { pilar: 0, caso: 1, N: 2, x: 3, y: 4 }, UNIDADES_PADRAO) }),
  'obra.assistente': () => ({ espec: { nome: 'Assistente', cotaBase: 100, perfil: 'nbr', pavimentos: [{ nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 }, { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 2 }], eixos: { dx: [5], dy: [] } } }),
  'norma.definir': () => ({ fck: 35, caa: 'III', psiQ: [0.7, 0.6, 0.4], psiUso: { C: [0.8, 0.7, 0.5] } }),
  'editar.girar': (b) => ({ pilares: [b.pilares[1].id], vigas: [b.vigas[0].id], lajes: [b.lajes[0].id], cargas: [b.cargas[0].id], centro: [4, 3], angulo: 30 }),
  'editar.espelhar': (b) => ({ pilares: [b.pilares[1].id], vigas: [b.vigas[1].id], eixo: [[5, -10], [5, 10]], copiar: true }),
  'vento.definir': () => ({ v0: 40, categoria: 'III', caX: 1.2, sentido: { xn: 0.33 }, vizinhanca: 1.1, platibanda: 1 }),
  'caso.criar': () => ({ nome: 'Reservatório', natureza: 'Q', grupo: 'reservatório', psi: [0.5, 0.4, 0.3], descricao: 'Caixa d\'água superior' }),
  'caso.editar': (b) => ({ id: b.casos![0].id, natureza: 'Q', grupo: 'g1', simultaneo: 'Q' }),
  'caso.remover': (b) => ({ id: b.casos![0].id }),
  'caso.compatibilidade': (b) => ({ a: b.casos![1].id, b: b.casos![2].id, relacao: 'incompativel' }),
  'caso.arranjos': () => ({ modo: 'xadrez', grupo: 'g_3', nome: 'Uso alternado' }),
  'empuxo.tipo': (b) => ({ id: b.empuxos![0].id, sobrecarga: 10, nivelAgua: -3, alivio: 20 }),
  'estados.definir': () => ({ estados: { flecha: { ativo: false }, solo: { modo: 'usuario' } }, combinarAdicionais: { Q: false } }),
  'etapas.definir': () => ({ elemento: 'viga', etapas: [{ nome: 'Desforma', dias: 21, pp: 1 }, { nome: 'Alvenaria', dias: 45, alvenaria: 1 }, { nome: 'Uso', dias: 180, revestimento: 1, variavel: 1 }] }),
  'fogo.definir': (b) => ({ ativo: true, ocupacao: 'A-2', altura: 20, trrf: { g_3: 90 }, revestimentos: { g_3: { material: 'cal', espessura: 15 } }, elementos: { [b.vigas[0].id]: { trrf: 60 }, [b.pilares[0].id]: { faces: 3, muFi: 0.5 }, [b.lajes[0].id]: { compartimentadora: false, lisa: true } } }),
  'flechas.limites': () => ({ elemento: 'macica', tipo: 'ativa', limite: { rel: 500, abs: 1.5 } }),
  'situacao.criar': () => ({ nome: 'Própria', estado: 'concreto', fatores: { G: 1.4, Q: 1.4 } }),
  'situacao.editar': (b) => ({ id: b.situacoes![0].id, nome: 'Renomeada', fatores: { G: 1, Q: 1 } }),
  'situacao.remover': (b) => ({ ids: [b.situacoes![0].id] }),
  'situacao.importar': () => ({ estado: 'fissuracao' }),
  'carga.pilar': (b) => ({ pilar: b.pilares[1].id, caso: b.casos![0].id, altura: 1, Hx: 3, My: 2 }),
  'carga.pilarRemover': (b) => ({ ids: [b.cargasPilar![0].id] }),
  'pilar.flambagem': (b) => ({ ids: [b.pilares[0].id], au: 2 }),
  'pilar.armadura': (b) => ({ id: b.pilares[0].id, pavimento: lancesDoPilar(b, b.pilares[0])[0].id, phi: 12.5, ...(b.pilares[0].secao.tipo === 'circ' ? { n: 6 } : { nb: 3, nh: 2 }), estribo: { phi: 5, s: 0.15 } }),
  'viga.armadura': (b) => ({ id: b.vigas[0].id, inf: { n: 3, phi: 12.5 }, sup: { n: 2, phi: 10 }, estribo: { phi: 6.3, s: 0.15 }, laterais: { n: 1, phi: 8 } }),
  'armadura.desbloquear': () => ({ tipo: 'viga' }),
  'tabela.definir': () => ({ tipo: 'pilares', tabela: { id: 'p25', nome: 'Pilares φ ≥ 16', bitolas: [16, 20, 25], espacamentos: [30, 20, 15], estribos: [{ phiAte: 20, phiT: 6.3, sMax: 15 }] } }),
  'tabela.restaurar': () => ({ tipos: ['estribos'] }),
  'laje.puncao': (b) => ({ id: b.lajes[0].id, adicionar: [{ pilar: b.pilares[0].id, linhas: 8, barras: 3, phi: 6.3, s: 0.12 }] }),
  'laje.armaduraVigotas': (b) => ({ ids: [b.lajes[1].id], inf: { n: 1, phi: 8 }, sup: { n: 2, phi: 6.3 } }),
  'viga.detalhe': (b) => ({ id: b.vigas[0].id, barras: [{ pos: 'N1', s0: 0.1, ganchos: [false, true], perna: 12 }], zonas: [{ zona: 0, phi: 6.3, s: 0.15, ramos: 4 }], fatorEmenda: 1.5 }),
  'pilar.detalhe': (b) => ({ id: b.pilares[0].id, espera: 0.8, passagens: [{ pavimento: lancesDoPilar(b, b.pilares[0])[0].id, emenda: 0.7, ancoragem: 0.6 }] }),
  'laje.armaduraBase': (b) => ({ ids: [b.lajes[0].id], inf: { tela: 'Q138' }, sup: { barras: [{ dir: 0, phi: 6.3, s: 20 }, { dir: 1, phi: 6.3, s: 20 }] }, detalhada: true }),
  'laje.armaduraPredefinida': (b) => ({ id: b.lajes[0].id, acao: 'criar', face: 'sup', a: [1, 1], angulo: 90, comprimento: 2, phi: 8, s: 0.15, n: 4 }),
  'laje.uniformizacao': (b) => ({ acao: 'criar', grupo: b.lajes[0].grupo, forma: 'linha', pontos: [[1, 1], [3, 1]], largura: 0.6, face: 'sup' }),
  'laje.linhaDobra': (b) => ({ acao: 'criar', grupo: b.lajes[0].grupo, a: [2, 0], z: [2, 5] }),
  'laje.barras': (b) => ({ id: b.lajes[0].id, acao: 'editar', barras: [{ pos: 'N1', face: 'inf', tipo: 'positiva', dir: 0, phi: 8, s: 0.15, comprimento: 4 }] }),
  'lajes.gerarArmadura': () => ({}),
  'prancha.rotulo': (b) => ({ chave: `${b.lajes[0].id}|N1`, dx: 5, dy: -3 }),
  'viga.tramo': (b) => ({ ids: [b.vigas[1].id, b.vigas[2].id] }),
  'viga.copiarArmadura': (b) => ({ de: b.vigas[1].id, para: [b.vigas[0].id] }),
  'vigas.agrupar': (b) => ({ acao: 'criar', ids: [b.vigas[0].id, b.vigas[1].id] }),
  'lajes.copiaArmadura': () => ({ acao: 'salvar', nome: 'Antes do furo', data: '2026-10-21' }),
  'materiais.definir': (b) => ({ fck: { pilar: 40, fundacao: 25 }, fckPilarPav: [{ pavimento: b.pavimentos[0].id, fck: 45 }], aco: { vigaEstribo: 'CA-60', fundacao: 'CA-60' }, gamas: { c: 1.5 }, cobFaces: { vigaInf: 3.5 }, cobFundacao: 4 }),
  'pilar.engaste': (b) => ({ ids: [b.pilares[0].id], topo: 0.5, base: 0 }),
  'pilar.vinculo': (b) => ({ ids: [b.pilares[0].id], base: { tipo: 'molas', krx: 5000, kry: 5000 }, cotaBase: -2, apoio: { pavimento: b.pilares[0].morre, altura: 1.2, direcao: 'u' } }),
  'opcoes.definir': () => ({ valores: { malha: 0.5, engasteTopoUltimo: 1 }, padrao: ['torcaoViga'] }),
  'prancha.definir': () => ({ carimbo: { empresa: 'Escritório Exemplo', responsavel: 'Eng. Fulano' }, formato: 'A1', escala: 50, armacao: { escalaVigas: 50, quadroPilares: 0 } }),
  'grupo.criar': () => ({ nome: 'Garagem', uso: 'garagem' }),
  'grupo.editar': () => ({ id: 'g_3', uso: 'escritorio' }),
  'grupo.remover': (b) => ({ id: b.grupos.find((g) => g.nome === 'Vazio')!.id }),
  'grupo.desvincular': () => ({ pavimento: 'pav_5' }),
  'pavimento.criar': () => ({ nome: 'Ático', cota: 15 }),
  'pavimento.editar': () => ({ id: 'pav_8', cota: 12.5 }),
  'pavimento.remover': () => ({ id: 'pav_6' }),
  'pavimento.repetir': () => ({ id: 'pav_6', vezes: 3 }),
  'eixo.criar': () => ({ nome: 'A', p1: [0, 0], p2: [10, 0] }),
  'corte.criar': () => ({ nome: 'Corte AA', pontos: [[0, 2], [8, 2]], sentido: 'esq', profundidade: 6 }),
  'corte.editar': (b) => ({ id: b.cortes![0].id, nome: 'Corte BB', sentido: 'dir', profundidade: 0 }),
  'corte.remover': (b) => ({ ids: [b.cortes![0].id] }),
  'secao.criar': () => ({ nome: 'S1', a: [0, 0], b: [6, 3] }),
  'secao.editar': (b) => ({ id: b.secoes![0].id, nome: 'S2', b: [6, 4] }),
  'secao.remover': (b) => ({ ids: [b.secoes![0].id] }),
  'eixo.editar': (b) => ({ id: b.eixos[0].id, nome: 'B' }),
  'eixo.remover': (b) => ({ ids: [b.eixos[0].id] }),
  'eixo.malha': () => ({ dx: [4, 5], dy: [3] }),
  'mascara.importar': () => ({ grupo: 'g_1', nome: 'Térreo', geo: GEO, escala: 0.01, centralizar: false }),
  'mascara.alinhar': (b) => ({ id: b.mascaras[0].id, de: [[0, 0], [10, 0]], para: [[1, 1], [1, 11]] }),
  'mascara.editar': (b) => ({ id: b.mascaras[0].id, rotacao: 30 }),
  'mascara.camadas': (b) => ({ id: b.mascaras[0].id, camadas: ['PORTA'], visivel: false }),
  'mascara.remover': (b) => ({ id: b.mascaras[0].id }),
  'mascara.copiar': (b) => ({ id: b.mascaras[0].id, grupos: ['g_1'] }),
  'mascara.regras': (b) => ({ id: b.mascaras[0].id, regras: sugerirRegras(b.mascaras[0].geo, b.mascaras[0].escala) }),
  'mascara.origemOriginal': (b) => ({ id: b.mascaras[0].id }),
  'mascara.configurar': (b) => ({ id: b.mascaras[0].id, configuracao: { versao: 1, camadas: [{ nome: 'PORTA', visivel: false, capturavel: true, apelido: 'Portas' }] } }),
  'lancamento.aplicar': (b) => ({ grupo: 'g_3', mascara: b.mascaras[0].id, proposta: propostaDeLancamento(b, b.mascaras[0], { ...REGRAS_PADRAO, papeis: { PAREDE: 'pilar' } }) }),
  'viga.daMascara': () => ({ grupo: 'g_3', ponto: [6, 0], cursor: [6, 1], modo: 'eixo', secao: { b: 0.15, h: 0.4 } }),
  'pilar.inserir': () => ({ x: 4, y: 0, secao: { tipo: 'circ', d: 0.4 }, nasce: 'pav_2', morre: 'pav_6' }),
  'pilar.editar': (b) => ({ id: b.pilares[0].id, ajuste: 'so', angulo: 90 }),
  'pilar.secaoLance': (b) => ({ id: b.pilares[0].id, pavimento: 'pav_8', secao: { tipo: 'ret', b: 0.2, h: 0.3 } }),
  'pilar.mover': (b) => ({ ids: [b.pilares[0].id], dx: 1, dy: 0 }),
  'pilar.copiar': (b) => ({ ids: [b.pilares[0].id], dx: 4, dy: 0, vezes: 2 }),
  'pilar.remover': (b) => ({ ids: [b.pilares[0].id] }),
  'pilar.renumerar': () => ({}),
  'viga.tracar': () => ({ grupo: 'g_3', pontos: [[0, 3], [4, 3]], secao: { b: 0.15, h: 0.4 } }),
  'viga.editar': (b) => ({ id: b.vigas[0].id, secao: { b: 0.2, h: 0.5 }, vinculoIni: 'articulado', engasteFim: 0.5, torcaoEquilibrio: true, engasteLajes: 0.4, mesa: { tipo: 'T', bf: 0.8, hf: 0.1 }, amarracao: true, estrutural: false }),
  'viga.atribuir': (b) => ({ ids: b.vigas.map((v) => v.id), campo: 'alinhamento', valor: 'dir' }),
  'viga.dividir': (b) => ({ id: b.vigas[1].id, ponto: [2, 0.1] }),
  'viga.unir': (b) => ({ ids: [b.vigas[1].id, b.vigas.find((v) => v.nome === 'V3')!.id] }),
  'viga.prolongar': (b) => ({ id: b.vigas[1].id, extremidade: 'ini', ate: { ponto: [-1, 0] } }),
  'viga.mover': (b) => ({ ids: [b.vigas[1].id], dx: 0, dy: 1 }),
  'viga.copiar': (b) => ({ ids: [b.vigas[1].id], dx: 0, dy: 3 }),
  'viga.copiarParaGrupos': (b) => ({ ids: b.vigas.map((v) => v.id), grupos: ['g_1'] }),
  'viga.remover': (b) => ({ ids: [b.vigas[0].id] }),
  'viga.renumerar': () => ({ grupo: 'g_3' }),
  'viga.ajustarFaces': () => ({ grupo: 'g_3', tolerancia: 0.3 }),
  'viga.alinharFace': (b) => ({ grupo: 'g_3', ids: [b.vigas[1].id], lado: 'esq' }),
  'laje.detectarPanos': () => ({ grupo: 'g_3' }),
  'laje.criar': () => ({ grupo: 'g_3', ponto: [2, 1.5], tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } }),
  'laje.editar': (b) => ({ id: b.lajes[0].id, tipo: { tipo: 'macica', h: 0.12 }, engasteBordas: [0.5, 1, 1, 1] }),
  'laje.atribuir': (b) => ({ ids: b.lajes.map((l) => l.id), tipo: { tipo: 'trelicada', modelo: 'H16', capa: 0.04 } }),
  'laje.abertura': (b) => ({ id: b.lajes[0].id, contorno: [[10.5, 0.5], [11, 0.5], [11, 1]] }),
  'laje.remover': (b) => ({ ids: [b.lajes[0].id] }),
  'laje.renumerar': () => ({ grupo: 'g_3' }),
  'carga.ponto': () => ({ grupo: 'g_3', ponto: [1, 1], valor: 10 }),
  'carga.linha': () => ({ grupo: 'g_3', pontos: [[0, 1], [4, 1]], valor: 5 }),
  'carga.area': () => ({ grupo: 'g_3', contorno: [[0, 0], [1, 0], [1, 1]], valor: 2 }),
  'carga.editar': (b) => ({ id: b.cargas[0].id, valor: 12 }),
  'carga.remover': (b) => ({ ids: [b.cargas[0].id] }),
  'carga.alvenariaDaMascara': () => ({ grupo: 'g_3', camada: 'ALV' }),
  'fundacao.criar': (b) => ({ pilar: b.pilares[1].id, tipo: 'bloco', posicao: 'canto', lado: [1, 1], cota: -2, sondagem: { modo: 'media' } }),
  'fundacao.editar': (b) => ({ id: b.fundacao!.elementos[0].id, posicao: 'centrada', sigmaAdm: 300, impostas: { A: 1.6, B: 1.4, h: 0.5 }, sondagem: { modo: 'furo', ids: [1] } }),
  'fundacao.unir': (b) => ({ ids: [b.fundacao!.elementos[0].id, b.fundacao!.elementos[1].id] }),
  'fundacao.eliminarSobreposicoes': (b) => ({ grupos: [[b.fundacao!.elementos[0].id, b.fundacao!.elementos[1].id]] }),
  'fundacao.igualar': (b) => ({ modelo: b.fundacao!.elementos[0].id, ids: [b.fundacao!.elementos[1].id] }),
  'fundacao.impor': (b) => ({ ids: [b.fundacao!.elementos[0].id], impostas: { A: 1.6, B: 1.4, h: 0.5, h0: 0.25, armadura: { x: { phi: 10, s: 0.15 }, y: { phi: 10, n: 9 } } } }),
  'limite.criar': () => ({ pontos: [[2, -1], [2, 8]], cota: -1.5, nome: 'Poço' }),
  'limite.editar': (b) => ({ id: b.fundacao!.limites![0].id, pontos: [[-3, -3], [-3, 10]], nome: 'Divisa A' }),
  'limite.remover': (b) => ({ ids: [b.fundacao!.limites![0].id] }),
  'fundacao.gerar': (b) => ({ pilares: [b.pilares[1].id], tipo: 'sapata', vigasEquilibrio: true, cargas: [{ pilar: b.pilares[1].id, Nk: 400 }] }),
  'fundacao.mover': (b) => ({ ids: [b.fundacao!.elementos[0].id], dx: 0.2, dy: 0 }),
  'fundacao.girar': (b) => ({ ids: [b.fundacao!.elementos[0].id], pontos: [[0, 0], [1, 1]] }),
  'fundacao.remover': (b) => ({ ids: [b.fundacao!.elementos[0].id] }),
  'fundacao.terreno': (b) => ({ sigmaModo: 'sondagem', fatorVento: 1.3, cotaTerreno: 0.5, estacas: [{ id: b.fundacao!.terreno.estacas[0].id, tipo: 'helice', D: 40, modo: 'sondagem' }, { tipo: 'premoldada', D: 33, modo: 'informada', capacidade: 400, s: 0.9 }] }),
  'fundacao.opcoes': () => ({ valores: { colPhi: 20, ftMethod: 'bielas', tbFck: 20 }, niveis: [-1.5] }),
  'vigaFundacao.criar': (b) => ({ tipo: 'travamento', ini: b.fundacao!.elementos[0].id, fim: b.pilares[2].id, b: 0.25, h: 0.5, fixa: true, nome: 'VT1' }),
  'vigaFundacao.editar': (b) => ({ id: b.fundacao!.vigas![0].id, equilibrio: { ini: true, fim: false }, h: 0.6, nome: 'VF9', ancoragem: { ini: 0.5 } }),
  'vigaFundacao.remover': (b) => ({ ids: [b.fundacao!.vigas![1].id] }),
  'vigaFundacao.igualar': (b) => ({ modelo: b.fundacao!.vigas![0].id, ids: [b.fundacao!.vigas![1].id] }),
  'radier.criar': () => ({ contorno: [[8, 8], [12, 8], [12, 12], [8, 12]], furos: [[[9, 9], [10, 9], [10, 10], [9, 10]]], h: 0.4, k: 30000, sigmaAdm: 150, nome: 'R9' }),
  'radier.editar': (b) => ({ id: b.fundacao!.radiers![0].id, h: 0.5, k: 60000, contorno: [[20, 0], [25, 0], [25, 4], [20, 4]], nome: 'RA' }),
  'radier.remover': (b) => ({ ids: [b.fundacao!.radiers![0].id] }),
  'radier.carga': (b) => ({ id: b.fundacao!.radiers![0].id, G: 5, Q: 2 }),
  'vigaElastica.criar': () => ({ pontos: [[30, 0], [36, 0], [36, 4]], b: 0.6, h: 1, k: 50000, nome: 'VE9' }),
  'vigaElastica.editar': (b) => ({ id: b.fundacao!.vigasElasticas![0].id, b: 0.7, sigmaAdm: 200, nome: 'VE5' }),
  'vigaElastica.remover': (b) => ({ ids: [b.fundacao!.vigasElasticas![0].id] }),
  'corrida.criar': () => ({ pontos: [[50, 0], [58, 0], [58, 6]], bw: 0.25, aba: 'esq', equilibrio: true, h: 0.5, h0: 0.25, alvenaria: true, sigmaAdm: 180, nome: 'SC9' }),
  'corrida.editar': (b) => ({ id: b.fundacao!.corridas![0].id, B: 1.2, aba: 'dir', bw: 0.3, equilibrio: true, nome: 'SCA', limpar: ['h'] }),
  'corrida.remover': (b) => ({ ids: [b.fundacao!.corridas![0].id] }),
  'parede.sapata': (b) => ({ parede: b.paredes![0].id, B: 1.2, h: 0.45, aba: 'esq', atrito: 0.35, sigmaAdm: 180 }),
  'cinta.criar': (b) => ({ corrida: b.fundacao!.corridas![1].id, s: 1, fim: b.pilares[2].id, b: 0.25, h: 0.5, fixa: true, nome: 'CT9' }),
  'cinta.editar': (b) => ({ id: b.fundacao!.corridas![1].cintas![0].id, s: 2, b: 0.25, h: 0.5, fixa: true, nome: 'CTA', ancoragem: { ini: 0.4 } }),
  'cinta.remover': (b) => ({ ids: [b.fundacao!.corridas![1].cintas![0].id] }),
  'sondagem.criar': () => ({ nome: 'SP-02', x: 4, y: 3, leituras: [{ N: 3, solo: 'argila' }, { N: 6, solo: 'silteArgiloso', descartada: true }, { N: 9, solo: 'silteArenoso' }], impenetravel: true }),
  'sondagem.editar': (b) => ({ id: b.fundacao!.sondagens[0].id!, nome: 'SP-1A', semAgua: true }),
  'sondagem.copiar': () => ({ furos: [{ name: 'SP-M1', water: 3, endImpenetrable: false, x: 1, y: 2, meters: [{ N: 4, soil: 'argila' }, { N: 7, soil: 'areia', excluded: true }] }], substituir: false }),
  'sondagem.remover': (b) => ({ ids: [b.fundacao!.sondagens[0].id!] }),
  'pilarParede.tipo': (b) => ({ id: b.tiposPilarParede![0].id, nome: 'Parede 2,5 m', lados: [{ a: [0, 0], z: [2.5, 0], esq: 0.1, dir: 0.1, porPavimento: [{ pavimento: b.pavimentos[1].id, esq: 0.15, dir: 0.05 }] }] }),
  'pilarParede.inserir': (b) => ({ tipo: b.tiposPilarParede![0].id, x: 70, y: 70, angulo: 90, nome: 'PP9', vinculoBase: 'rotula' }),
  'pilarParede.editar': (b) => ({ id: b.pilaresParede![0].id, angulo: 90, x: 61, vinculoBase: 'rotula' }),
  'pilarParede.mover': (b) => ({ ids: [b.pilaresParede![0].id], dx: 1, dy: 1 }),
  'pilarParede.remover': (b) => ({ ids: [b.pilaresParede![0].id] }),
  'parede.criar': () => ({ pontos: [[90, 0], [90, 6]], espessura: 0.2, nome: 'M9', vinculoBase: 'rotula' }),
  'parede.editar': (b) => ({ id: b.paredes![0].id, espessura: 0.25, porPavimento: [{ pavimento: b.pavimentos[1].id, esq: 0.1, dir: 0.1 }] }),
  'parede.mover': (b) => ({ ids: [b.paredes![0].id], dx: 1, dy: 0 }),
  'parede.remover': (b) => ({ ids: [b.paredes![0].id] }),
  'parede.abertura': (b) => ({ parede: b.paredes![0].id, s: 1, largura: 0.9, altura: 2.1, pavimento: b.pavimentos[0].id }),
  'parede.empuxo': (b) => ({ parede: b.paredes![0].id, empuxos: [{ caso: 'G', lado: 'esq', liquido: { cota: 1 } }] }),
  'parede.prolongar': (b) => ({ id: b.paredes![0].id, extremidade: 'fim', ate: { ponto: [88, 0] } }),
  'parede.atribuir': (b) => ({ ids: [b.paredes![0].id], valores: { esq: 0.15 } }),
  'parede.daMascara': () => ({ grupo: 'g_3', camada: 'ALV' }),
  'parede.armadura': (b) => ({ id: b.paredes![0].id, lado: 0, pavimento: b.pavimentos[0].id, pano: 0, vert: { phi: 10, s: 0.15 }, hor: { phi: 8, s: 0.2 }, emendas: [{ pavimento: b.pavimentos[0].id, tracao: 0.8, compressao: 0.5 }] }),
  'pilarParede.armadura': (b) => ({ id: b.pilaresParede![0].id, lado: 0, pavimento: b.pavimentos[0].id, vert: { phi: 8, s: 0.15 }, hor: { phi: 6.3, s: 0.2 } }),
  'parede.redimensionar': (b) => ({ id: b.paredes![0].id, pavimento: b.pavimentos[0].id, espessura: 0.25 }),
  'abertura.armadura': (b) => ({ acao: 'editar', abertura: b.paredes![0].aberturas![0].id, armadura: { verga: { n: 3, phi: 10 }, estribo: { phi: 5, s: 0.15 }, montante: { n: 2, phi: 10 }, canto: { n: 2, phi: 10 } } }),
  'bloco.tipo': (b) => ({ id: b.blocos![0].id, nome: 'B15 reforçado', fbk: 8 }),
  'alvenaria.tipo': (b) => ({ id: b.tiposAlvenaria![1].id, nome: 'Genérica 1,5', fd: 1.5, ftd: 0.15, considerarG: true, G: 600 }),
  'parede.modularAbertura': (b) => ({ parede: b.paredes![1].id }),
  'verga.armadura': (b) => ({ acao: 'editar', abertura: b.paredes![1].aberturas![0].id, armadura: { n: 2, phi: 10, estribo: { phi: 5, s: 0.2 } } }),
  'muro.arrimo': (b) => ({ id: b.murosArrimo![0].id, nome: 'MA1', H: 3.5, tTopo: 0.2, tBase: 0.35, B: 2.4, ponta: 0.5, hBase: 0.45, solo: { gama: 18, phi: 30, metodo: 'rankine' }, sobrecarga: 10 }),
  'muro.remover': (b) => ({ ids: [b.murosArrimo![0].id] }),
  'viga.embutir': (b) => ({ viga: b.vigas.at(-1)!.id, parede: b.paredes![0].id }),
  'lote': () => ({ comandos: [{ nome: 'pilar.inserir', params: { x: 8, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.2 } } }, { nome: 'pilar.inserir', params: { x: 8, y: 3, secao: { tipo: 'ret', b: 0.2, h: 0.2 } } }] }),
};

describe('registro de comandos', () => {
  it('todo comando registrado tem exemplo, descrição e schema de objeto', () => {
    for (const c of listarComandos()) {
      expect(EXEMPLOS[c.nome], c.nome).toBeDefined();
      expect(c.descricao.length).toBeGreaterThan(10);
      expect(c.schema.type).toBe('object');
    }
  });

  it('aplicar + inverso devolve o modelo original (todos os comandos)', () => {
    const b0 = base();
    for (const c of listarComandos()) {
      const s = new Sessao(b0);
      const r = s.executar(c.nome, EXEMPLOS[c.nome](b0));
      expect(r.ok, `${c.nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true);
      expect(r.diff!.resumo.length, c.nome).toBeGreaterThan(0);
      s.desfazer();
      expect(s.modelo, c.nome).toEqual(b0);
      s.refazer();
      expect(s.modelo, c.nome).not.toEqual(b0);
      expect(replay(s.log, b0), c.nome).toEqual(s.modelo);
    }
  });

  it('parâmetros inválidos e desconhecidos são recusados sem alterar o modelo', () => {
    const s = padrao();
    const antes = s.modelo;
    for (const [nome, p] of [
      ['pavimento.criar', { nome: 'X' }],
      ['pavimento.criar', { nome: 'X', cota: 'alta' }],
      ['pavimento.criar', { nome: 'X', cota: 3 }], // cota ocupada
      ['pavimento.editar', { id: 'nao', cota: 1 }],
      ['norma.definir', { fck: 10 }],
      ['obra.definir', { cor: 'azul' }],
      ['grupo.remover', { id: 'g_3' }], // em uso
      ['comando.inexistente', {}],
    ] as const) {
      const r = s.executar(nome, p);
      expect(r.ok, `${nome} ${JSON.stringify(p)}`).toBe(false);
      expect(r.erros[0].severidade).toBe('erro');
    }
    expect(s.modelo).toBe(antes);
    expect(s.podeDesfazer).toBe(true);
  });

  it('replay do log reproduz o modelo, inclusive depois de desfazer', () => {
    const s = padrao();
    s.executar('eixo.malha', { dx: [4, 4], dy: [5] });
    s.executar('pavimento.repetir', { id: 'pav_6', vezes: 2 });
    s.desfazer();
    s.executar('norma.definir', { caa: 'III' });
    expect(replay(s.log)).toEqual(s.modelo);
    // o arquivo guarda modelo + log e é relido igual
    const f = lerEdificio(JSON.parse(JSON.stringify({ building: s.modelo, buildingLog: s.log })))!;
    expect(replay(f.buildingLog)).toEqual(f.building);
  });

  it('prévia não altera o modelo; o token vale só na mesma revisão', () => {
    const s = padrao();
    const antes = s.modelo;
    const pv = s.previa('pavimento.criar', { nome: 'Ático', cota: 15 });
    expect(pv.ok).toBe(true);
    expect(pv.diff!.resumo).toEqual(['+ pavimento Ático', '+ grupo Ático']);
    expect(s.modelo).toBe(antes);
    const pv2 = s.previa('obra.definir', { nome: 'Y' });
    expect(s.aplicar(pv.token!).ok).toBe(true);
    expect(s.modelo.pavimentos.some((p) => p.nome === 'Ático')).toBe(true);
    const r = s.aplicar(pv2.token!);
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('PREVIA_INVALIDA'); // prévias anteriores são descartadas ao alterar
    expect(s.log.at(-1)!.autor).toBe('ia');
  });
});

describe('revisão de cálculo', () => {
  it('prancha.definir muda a revisão geral, não a de cálculo; geometria muda as duas; desfazer e refazer acompanham', () => {
    const s = padrao();
    const r0 = s.rev, c0 = s.revCalculo;
    expect(s.executar('prancha.definir', { carimbo: { responsavel: 'Eng. X' }, armacao: { escalaVigas: 75 } }).ok).toBe(true);
    expect(s.rev).toBe(r0 + 1);
    expect(s.revCalculo).toBe(c0);
    expect(s.executar('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.5 } }).ok).toBe(true);
    expect(s.revCalculo).toBe(c0 + 1);
    s.desfazer(); // pilar
    expect(s.revCalculo).toBe(c0 + 2);
    s.desfazer(); // prancha
    expect(s.revCalculo).toBe(c0 + 2);
    expect(s.modelo.prancha?.carimbo.responsavel).toBeUndefined();
    s.refazer(); // prancha
    expect(s.revCalculo).toBe(c0 + 2);
    s.refazer(); // pilar
    expect(s.revCalculo).toBe(c0 + 3);
    expect(s.rev).toBe(r0 + 6);
  });

  it('lote altera o cálculo quando algum item altera; comando desconhecido conta como cálculo', () => {
    expect(afetaCalculo('prancha.definir')).toBe(false);
    expect(afetaCalculo('lote', { comandos: [{ nome: 'prancha.definir', params: { escala: 50 } }] })).toBe(false);
    expect(afetaCalculo('lote', { comandos: [{ nome: 'prancha.definir' }, { nome: 'eixo.malha', params: { dx: [4], dy: [3] } }] })).toBe(true);
    expect(afetaCalculo('norma.definir')).toBe(true);
    expect(afetaCalculo('nao.existe')).toBe(true);
    const s = padrao(), c0 = s.revCalculo;
    expect(s.executar('lote', { comandos: [{ nome: 'prancha.definir', params: { formato: 'A1' } }, { nome: 'prancha.definir', params: { escala: 50 } }] }).ok).toBe(true);
    expect(s.revCalculo).toBe(c0);
  });

  it('comandos fora do cálculo só alteram b.prancha, b.cortes e b.secoes, e o cálculo não lê b.prancha', () => {
    const b0 = base();
    for (const c of listarComandos().filter((x) => x.calculo === false)) {
      const r = aplicarComando(b0, c.nome, EXEMPLOS[c.nome](b0));
      expect(r.ok, c.nome).toBe(true);
      expect(r.patches!.every((p) => ['prancha', 'cortes', 'secoes', 'seq'].includes(String(p.path[0]))), c.nome).toBe(true);
    }
    const src = import.meta.glob(['../building/*.ts', '!../building/*.test.ts', '!../building/types.ts', '!../building/file.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(src).length).toBeGreaterThan(10);
    expect(Object.keys(src).filter((f) => /\.prancha\b/.test(src[f]))).toEqual([]);
  });
});

describe('obra e pavimentos', () => {
  it('edifício padrão: 5 pavimentos, tipo vinculado, pés-direitos', () => {
    const b = padrao().modelo;
    expect(b.pavimentos.map((p) => [p.nome, p.cota])).toEqual([['Térreo', 0], ['Tipo 1', 3], ['Tipo 2', 6], ['Tipo 3', 9], ['Cobertura', 12]]);
    const tipo = b.pavimentos.filter((p) => p.nome.startsWith('Tipo'));
    expect(new Set(tipo.map((p) => p.grupo)).size).toBe(1);
    expect(b.grupos).toHaveLength(3);
    expect(peDireito(b, b.pavimentos[0].id)).toBe(1.5);
    expect(peDireito(b, b.pavimentos[4].id)).toBe(3);
    expect(verificar(b)).toEqual([]);
  });

  it('repetir insere acima e sobe os pavimentos de cima', () => {
    const s = padrao();
    s.executar('pavimento.repetir', { id: 'pav_6', vezes: 3 }); // Tipo 3 → Tipo 4, 5, 6
    const b = s.modelo;
    expect(b.pavimentos.map((p) => p.nome)).toEqual(['Térreo', 'Tipo 1', 'Tipo 2', 'Tipo 3', 'Tipo 4', 'Tipo 5', 'Tipo 6', 'Cobertura']);
    expect(b.pavimentos.at(-1)!.cota).toBe(21);
    expect(verificar(b)).toEqual([]);
  });

  it('pé-direito diferente no mesmo grupo é erro, com correção sugerida que resolve', () => {
    const s = padrao();
    s.executar('pavimento.editar', { id: 'pav_6', cota: 9.5 }); // Tipo 3 com 3,5 m
    const d = verificar(s.modelo).filter((x) => x.codigo === 'GRUPO_PE_DIREITO');
    expect(d).toHaveLength(1);
    expect(d[0].elementos[0]).toBe('pav_6');
    const sg = d[0].sugestao!;
    expect(s.executar(sg.comando, sg.params).ok).toBe(true);
    expect(verificar(s.modelo).filter((x) => x.severidade === 'erro')).toEqual([]);
  });

  it('remover o último pavimento do grupo remove o grupo; desfazer restaura', () => {
    const s = padrao();
    const antes = s.modelo;
    s.executar('pavimento.remover', { id: 'pav_8' });
    expect(s.modelo.grupos.some((g) => g.nome === 'Cobertura')).toBe(false);
    s.desfazer();
    expect(s.modelo).toEqual(antes);
  });

  it('CAA define os cobrimentos da Tabela 7.2; mudar o uso aplica a carga padrão', () => {
    const s = padrao();
    s.executar('norma.definir', { caa: 'III' });
    expect(s.modelo.norma.cobrimento).toEqual({ laje: 3.5, viga: 4.0, pilar: 4.0 });
    s.executar('grupo.editar', { id: 'g_3', uso: 'escritorio' });
    expect(s.modelo.grupos.find((g) => g.id === 'g_3')!.q).toBe(2.5);
  });

  it('malha de eixos: números nos verticais, letras nos horizontais, com giro', () => {
    const s = new Sessao(edificioVazio());
    s.executar('eixo.malha', { dx: [4, 5], dy: [3], angulo: 90, balanco: 0 });
    const e = s.modelo.eixos;
    expect(e.map((x) => x.nome)).toEqual(['1', '2', '3', 'A', 'B']);
    // eixo 3 (u = 9, v de 0 a 3) girado 90°: (x, y) = (−v, u)
    expect(e[2].p1).toEqual([0, 9]);
    expect(e[2].p2).toEqual([-3, 9]);
  });
});

describe('schema', () => {
  const s: JsonSchema = { type: 'object', additionalProperties: false, required: ['a'], properties: {
    a: { type: 'integer', minimum: 1 }, b: { type: 'array', items: { type: 'string', enum: ['x', 'y'] }, maxItems: 2 },
    c: { oneOf: [{ type: 'number' }, { type: 'string' }] },
  } };
  it('aponta caminho e motivo', () => {
    expect(validarSchema(s, { a: 2, b: ['x'], c: 's' })).toEqual([]);
    expect(validarSchema(s, { a: 0.5, b: ['z', 'x', 'y'], c: true, d: 1 }).map((e) => `${e.caminho}: ${e.mensagem}`)).toEqual([
      'a: esperado inteiro', 'b: máximo de 2 item(ns)', 'b[0]: deve ser um de: x, y', 'c: não corresponde a nenhuma alternativa', 'd: parâmetro desconhecido',
    ]);
    expect(validarSchema(s, {})[0]).toEqual({ caminho: 'a', mensagem: 'obrigatório' });
  });
});

describe('núcleo sem navegador', () => {
  it('src/core não usa window, document, localStorage nem navigator', () => {
    const src = import.meta.glob(['../**/*.ts', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(src).length).toBeGreaterThan(20);
    const bad = Object.keys(src).filter((f) => /\b(window|document|localStorage|navigator)\s*[.[]/.test(src[f].replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '')));
    expect(bad).toEqual([]);
  });
});

describe('obra.definir: descrição e origem', () => {
  it('grava a descrição aparada e a origem', () => {
    const s = new Sessao(edificioVazio());
    expect(s.executar('obra.definir', { descricao: ['  A  ', ' B '] }).ok).toBe(true);
    expect(s.modelo.obra.descricao).toEqual(['A', 'B']);
    expect(s.executar('obra.definir', { origem: 'texto' }).ok).toBe(true);
    expect(s.modelo.obra.origem).toBe('texto');
    expect(s.executar('obra.definir', { descricao: [] }).ok).toBe(true);
    expect(s.modelo.obra.descricao).toBeUndefined();
  });
  it('recusa mais de 2 linhas e linha com mais de 120 caracteres', () => {
    const s = new Sessao(edificioVazio());
    expect(s.executar('obra.definir', { descricao: ['a', 'b', 'c'] }).ok).toBe(false);
    const r = s.executar('obra.definir', { descricao: ['x'.repeat(121)] });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('DESCRICAO_LONGA');
    expect(s.executar('obra.definir', { origem: 'xyz' }).ok).toBe(false);
  });
});

describe('obra.assistente', () => {
  it('um passo no histórico: desfazer volta ao modelo vazio', () => {
    const s = new Sessao(edificioVazio());
    expect(s.executar('obra.assistente', { espec: ESPEC_PADRAO }).ok).toBe(true);
    expect(s.modelo.pavimentos.length).toBe(5);
    expect(s.log.length).toBe(1);
    s.desfazer();
    expect(s.modelo).toEqual(edificioVazio());
    s.refazer();
    expect(s.modelo.pavimentos.length).toBe(5);
  });
  it('replay do log reproduz a obra', () => {
    const s = new Sessao(edificioVazio());
    s.executar('obra.assistente', { espec: ESPEC_PADRAO });
    expect(replay(s.log, edificioVazio())).toEqual(s.modelo);
  });
  it('especificação inválida é recusada sem alterar o modelo', () => {
    const s = new Sessao(edificioVazio());
    const antes = s.modelo;
    const r = s.executar('obra.assistente', { espec: { ...ESPEC_PADRAO, nome: ' ' } });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('ESPEC_INVALIDA');
    expect(s.modelo).toEqual(antes);
  });
  it('mesmo modelo que o edifício padrão antigo', () => {
    const A = new Sessao();
    for (const c of comandosEdificioPadrao()) expect(A.executar(c.nome, c.params, 'sistema').ok).toBe(true);
    const B = new Sessao(edificioVazio());
    const espec = { nome: 'Edifício residencial', profundidadeFundacao: 1.5, pavimentos: [
      { nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 },
      { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 3 },
      { nome: 'Cobertura', peDireito: 3, categoria: 'cobertura', repeticoes: 1 },
    ] };
    expect(B.executar('obra.assistente', { espec }).ok).toBe(true);
    expect(B.modelo.pavimentos.map((p) => [p.nome, p.cota])).toEqual(A.modelo.pavimentos.map((p) => [p.nome, p.cota]));
    expect(B.modelo.grupos.map((g) => [g.nome, g.uso, g.q])).toEqual(A.modelo.grupos.map((g) => [g.nome, g.uso, g.q]));
  });
});

describe('obra.importarArranques', () => {
  it('cria arranques, casos e cargas em um passo', () => {
    const r = importarArranques('Pilar;Caso;N;Hx\nPA;G;300;0\nPA;Vento1;0;12\nPB;G;200;0', { pilar: 0, caso: 1, N: 2, Hx: 3 }, UNIDADES_PADRAO);
    const s = new Sessao(edificioVazio());
    expect(s.executar('obra.importarArranques', { nome: 'Só arranques', resultado: r }).ok).toBe(true);
    expect(s.modelo.pilares.length).toBe(2);
    expect(s.modelo.cargasPilar!.length).toBe(3);
    expect(s.modelo.casos!.length).toBe(1);
    expect(s.modelo.obra.nome).toBe('Só arranques');
    expect(s.modelo.obra.origem).toBe('texto');
    expect(s.log.length).toBe(1);
    s.desfazer();
    expect(s.modelo).toEqual(edificioVazio());
  });
  it('recusa resultado com erro, sem arranques ou malformado', () => {
    const r = importarArranques('Pilar;Caso;N;Hx\nPA;G;300;0', { pilar: 0, caso: 1, N: 2, Hx: 3 }, UNIDADES_PADRAO);
    const s = new Sessao(edificioVazio());
    const r1 = s.executar('obra.importarArranques', { nome: 'X', resultado: { ...r, erros: ['x'] } });
    expect(r1.ok).toBe(false);
    expect(r1.erros[0].codigo).toBe('IMPORTACAO_COM_ERRO');
    expect(s.executar('obra.importarArranques', { nome: 'X', resultado: { ...r, arranques: [] } }).erros[0].codigo).toBe('SEM_ARRANQUES');
    expect(s.executar('obra.importarArranques', { nome: 'X', resultado: {} as never }).erros[0].codigo).toBe('RESULTADO_INVALIDO');
  });
});
