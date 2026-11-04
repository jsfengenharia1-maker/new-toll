// Corresponder propriedades (aba Modificar): copia campos de um elemento para outros do mesmo tipo. Campos em building/corresponder.ts.
import { produce } from 'immer';
import { CAMPOS, corresponder, motivoRecusa, tipoCorresp } from '../building/corresponder';
import { pilaresSobrepostos } from '../building/pilares';
import type { BuildingModel, Pilar } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
type Params = { origem: string; destinos: string[]; campos: string[] };

registrar<Params>({
  nome: 'editar.corresponder',
  descricao: 'Corresponder propriedades: copia campos (`campos`) do elemento `origem` para os `destinos`, todos do mesmo tipo (pilar, viga, laje ou fundação). Campos: pilar secao, angulo, material, estabilidade, cobrimento, tabela, opcoes, vinculoBase, cargas, lances; viga secao, alinhamento, nivel, vinculos, cobrimento, tabela, opcoes; laje tipo, direcao, nivel, engaste, cobrimento, tabela, opcoes; fundação cota, sigmaAdm, sondagem, estaca, impostas. A posição nunca é copiada.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['origem', 'destinos', 'campos'], properties: {
    origem: { type: 'string' }, destinos: { type: 'array', items: { type: 'string' }, minItems: 1 }, campos: { type: 'array', items: { type: 'string' }, minItems: 1 },
  } },
  validar(b, p) {
    const tipo = tipoCorresp(b, p.origem);
    if (!tipo) return err('ELEMENTO_INEXISTENTE', `Elemento de origem ${p.origem} não existe ou não aceita correspondência (pilar, viga, laje, fundação).`);
    const validos = new Set(CAMPOS[tipo].map((c) => c.id));
    const ruins = p.campos.filter((c) => !validos.has(c));
    if (ruins.length) return err('CAMPO_INVALIDO', `Campo(s) inválido(s) para ${tipo}: ${ruins.join(', ')}. Válidos: ${[...validos].join(', ')}.`);
    for (const dest of p.destinos) { const m = motivoRecusa(b, tipo, p.origem, dest); if (m) return err('DESTINO_INVALIDO', m, [dest]); }
    if (tipo === 'pilar' && p.campos.some((c) => c === 'secao' || c === 'angulo' || c === 'lances')) {
      // a seção, o ângulo ou os lances novos não podem fazer o pilar invadir outro
      const novo = produce(b, (d) => { for (const dest of p.destinos) corresponder(d, tipo, p.origem, dest, p.campos); });
      for (const dest of p.destinos) {
        const q = novo.pilares.find((x) => x.id === dest) as Pilar;
        const sob = pilaresSobrepostos(novo, q);
        if (sob.length) return err('PILAR_SOBREPOSTO', `${q.nome} ficaria sobre ${sob.map((x) => x.nome).join(', ')}.`, [q.id, ...sob.map((x) => x.id)]);
      }
    }
    return [];
  },
  aplicar(d, p) {
    const tipo = tipoCorresp(d as BuildingModel, p.origem)!;
    for (const dest of p.destinos) corresponder(d, tipo, p.origem, dest, p.campos);
    return `${p.campos.length} campo(s) copiado(s) para ${p.destinos.length} elemento(s).`;
  },
});
