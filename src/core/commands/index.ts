// Ponto de entrada do registro: importa os módulos que registram comandos.
import './obra';
import './planta';
import './vigas';
import './lajes';
import './acoes';
import './armaduras';
import './armadurasLajes';
import './tabelas';
import './fundacao';
import './baseElastica';
import './corrida';
import './edicao';

export * from './registry';
export { PARAMS_FUNDACAO } from './fundacao';
export { comandosEdificioPadrao } from './obra';
export { validarSchema, type JsonSchema } from './schema';
