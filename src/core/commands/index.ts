// Ponto de entrada do registro: importa os módulos que registram comandos.
import './obra';
import './planta';
import './vigas';
import './lajes';
import './armaduras';
import './fundacao';

export * from './registry';
export { PARAMS_FUNDACAO } from './fundacao';
export { comandosEdificioPadrao } from './obra';
export { validarSchema, type JsonSchema } from './schema';
