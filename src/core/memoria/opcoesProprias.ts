// Memória detalhada (V7f, K1.4.1): registra as opções de cálculo próprias de um elemento (laje ou pilar), que sobrepõem
// as da obra só nele, com a faixa de cada uma e a indicação de que a premissa é do usuário.
import { OPCOES_INFO, textoOpcoesProprias } from '../building/opcoes';
import type { Registrador } from './registrador';

export function registrarOpcoesProprias(mem: Registrador, el: string, tipo: 'laje' | 'pilar' | 'viga', opcoes: Partial<Record<string, number>> | undefined) {
  if (!opcoes || !Object.keys(opcoes).length) return;
  const nomes = Object.keys(opcoes).map((k) => OPCOES_INFO.find((i) => i.chave === k)?.rotulo ?? k);
  mem.passo({
    etapa: 'dimensionamento', elemento: el, topico: `Opções próprias ${tipo === 'pilar' ? 'do pilar' : tipo === 'laje' ? 'da laje' : 'da viga'}`,
    descricao: `Opções de cálculo próprias (sobrepõem as da obra só neste elemento): ${nomes.join('; ')}`,
    formula: 'opção própria do elemento > opção da obra', expressao: textoOpcoesProprias(opcoes), resultado: nomes.length, unidade: 'opções',
    norma: 'Opção do programa (K1.4.1)', aConfirmar: false, entradas: Object.fromEntries(Object.entries(opcoes).map(([k, v]) => [k, v as number])),
  });
}
