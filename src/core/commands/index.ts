// Ponto de entrada do registro: importa os módulos que registram comandos.
import './obra';
import './planta';
import './vigas';
import './lajes';
import './acoes';
import './armaduras';
import './agrupamento';
import './armadurasLajes';
import './copiaLajes';
import './tabelas';
import './fundacao';
import './baseElastica';
import './corrida';
import './edicao';
import './pilarParede';
import './flechas';

export * from './registry';
export { PARAMS_FUNDACAO } from './fundacao';
export { comandosEdificioPadrao } from './obra';
export { validarSchema, type JsonSchema } from './schema';
