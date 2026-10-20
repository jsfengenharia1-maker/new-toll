// Ponto de entrada do registro: importa os módulos que registram comandos.
import './obra';
import './planta';
import './vigas';
import './lajes';

export * from './registry';
export { comandosEdificioPadrao } from './obra';
export { validarSchema, type JsonSchema } from './schema';
