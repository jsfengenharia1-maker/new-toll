#!/usr/bin/env node
// Edição de linhas dos checklists de paridade sem abrir os arquivos inteiros.
// Uso (npm run checklist -- <comando>):
//   get <id> [<id>...]                         imprime a(s) linha(s) e o arquivo
//   set <id> [--arquivo usuario|calculo] [--situacao S] [--frente F] [--nota "t" | --acrescentar "t"]
//   lote <arquivo.json>                        array de {id, arquivo?, situacao?, frente?, nota?, acrescentar?}; tudo ou nada
//   historico "<linha>"                        acrescenta "- DD/MM/AAAA — <linha>" ao fim de docs/historico-fatias.md
// Só as linhas tocadas mudam (bytes preservados). Após cada escrita, recontar-checklists recalcula os resumos.
// Variável CHECKLIST_DOCS aponta outra pasta docs/ (para testar numa cópia).
import { readFileSync, writeFileSync, appendFileSync, openSync, readSync, closeSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { recontar } from './recontar-checklists.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARQUIVOS = {
  usuario: 'checklist-manual-cypecad.md',
  calculo: 'checklist-manual-calculo-cypecad.md',
};
const SITUACOES = ['Feito', 'Parcial', 'Falta', 'Fora'];
const FRENTES = ['N', 'R', 'E', 'FU', 'L', 'V'];
const TRACO = '—';
const pendente = (s) => s === 'Parcial' || s === 'Falta';

/** Separa a linha em células brutas (entre "|" não escapados), sem tocar no texto. */
function segmentos(linha) {
  const partes = linha.split(/(?<!\\)\|/);
  if (partes.length < 3 || partes[0].trim() !== '' || partes[partes.length - 1].trim() !== '') {
    throw new Error(`linha de tabela inválida: ${linha.slice(0, 80)}`);
  }
  return partes.slice(1, -1);
}
const valor = (bruto) => bruto.trim();
const escapa = (t) => t.replace(/(?<!\\)\|/g, '\\|');

/** Linha de item: 5 células e id na 1ª (ex.: C7.8, K1.9.98). */
function ehItem(linha) {
  if (!linha.startsWith('|')) return null;
  let celulas;
  try { celulas = segmentos(linha); } catch { return null; }
  const id = valor(celulas[0]);
  if (!/^[A-Z]\d/.test(id) || celulas.length !== 5) return null;
  return { id, celulas };
}

function carregar(docs) {
  const estado = {};
  for (const [chave, nome] of Object.entries(ARQUIVOS)) {
    const caminho = join(docs, nome);
    const texto = readFileSync(caminho, 'utf8');
    estado[chave] = { caminho, nome, linhas: texto.split('\n'), original: texto, alterado: false };
  }
  return estado;
}

/** Localiza as ocorrências de um id nos arquivos (ou só no escolhido). */
function localizar(estado, id, arquivo) {
  if (arquivo && !ARQUIVOS[arquivo]) throw new Error(`--arquivo deve ser usuario ou calculo (veio "${arquivo}")`);
  const chaves = arquivo ? [arquivo] : Object.keys(ARQUIVOS);
  const achados = [];
  for (const chave of chaves) {
    const ls = estado[chave].linhas;
    ls.forEach((l, i) => {
      const it = ehItem(l);
      if (it && it.id === id) achados.push({ chave, indice: i });
    });
  }
  if (achados.length === 0) {
    throw new Error(`id "${id}" não encontrado${arquivo ? ` em ${ARQUIVOS[arquivo]}` : ''}`);
  }
  const porArquivo = new Set(achados.map((a) => a.chave));
  if (porArquivo.size > 1 && !arquivo) {
    throw new Error(`id "${id}" existe nos dois checklists; use --arquivo usuario|calculo`);
  }
  if (achados.length > 1) throw new Error(`id "${id}" aparece ${achados.length} vezes em ${ARQUIVOS[achados[0].chave]}`);
  return achados[0];
}

/** Aplica uma alteração em memória. Lança erro se o resultado violar as regras do checklist. */
function aplicar(estado, op) {
  if (!op || typeof op.id !== 'string') throw new Error('operação sem id');
  const campos = ['situacao', 'frente', 'nota', 'acrescentar'];
  const usados = campos.filter((c) => op[c] !== undefined);
  if (usados.length === 0) throw new Error(`${op.id}: nada a alterar (informe situacao, frente, nota ou acrescentar)`);
  if (op.nota !== undefined && op.acrescentar !== undefined) throw new Error(`${op.id}: use nota ou acrescentar, não os dois`);
  for (const c of ['nota', 'acrescentar']) {
    if (op[c] !== undefined && (typeof op[c] !== 'string' || /[\r\n]/.test(op[c]))) {
      throw new Error(`${op.id}: ${c} deve ser texto de uma linha`);
    }
  }

  const { chave, indice } = localizar(estado, op.id, op.arquivo);
  const linha = estado[chave].linhas[indice];
  const { celulas } = ehItem(linha);
  const atual = { situacao: valor(celulas[2]), frente: valor(celulas[3]), nota: valor(celulas[4]) };

  if (op.situacao !== undefined && !SITUACOES.includes(op.situacao)) {
    throw new Error(`${op.id}: situação "${op.situacao}" inválida (use ${SITUACOES.join(', ')})`);
  }
  if (op.frente !== undefined && op.frente !== TRACO && !FRENTES.includes(op.frente)) {
    throw new Error(`${op.id}: frente "${op.frente}" inválida (use ${FRENTES.join(', ')} ou —)`);
  }
  const situacao = op.situacao ?? atual.situacao;
  const frente = op.frente ?? atual.frente;
  if (pendente(situacao) && !FRENTES.includes(frente)) {
    throw new Error(`${op.id}: ${situacao} exige frente dona (${FRENTES.join(', ')}); veio "${frente}"`);
  }
  if (!pendente(situacao) && frente !== TRACO) {
    throw new Error(`${op.id}: ${situacao} exige frente "${TRACO}"; veio "${frente}" (passe --frente ${TRACO})`);
  }

  let nota = atual.nota;
  if (op.nota !== undefined) nota = op.nota.trim();
  if (op.acrescentar !== undefined) {
    const extra = op.acrescentar.trim();
    nota = nota && extra ? `${nota} — ${extra}` : nota || extra;
  }

  const novas = [...celulas];
  novas[2] = ` ${situacao} `;
  novas[3] = ` ${frente} `;
  novas[4] = ` ${escapa(nota)} `;
  estado[chave].linhas[indice] = `|${novas.join('|')}|`;
  estado[chave].alterado = true;
  return { id: op.id, arquivo: chave, linha: estado[chave].linhas[indice] };
}

/** Grava só os arquivos alterados e recalcula os resumos. */
function gravar(estado, docs) {
  for (const f of Object.values(estado)) {
    if (f.alterado) writeFileSync(f.caminho, f.linhas.join('\n'));
  }
  recontar(docs);
}

function get(docs, ids) {
  const estado = carregar(docs);
  const saida = [];
  for (const id of ids) {
    const achados = [];
    for (const chave of Object.keys(ARQUIVOS)) {
      estado[chave].linhas.forEach((l) => {
        const it = ehItem(l);
        if (it && it.id === id) achados.push({ chave, linha: l });
      });
    }
    if (achados.length === 0) throw new Error(`id "${id}" não encontrado`);
    for (const a of achados) saida.push(`[${a.chave}] ${ARQUIVOS[a.chave]}\n${a.linha}`);
  }
  return saida.join('\n');
}

function escrita(docs, operacoes) {
  const estado = carregar(docs);
  const feitas = [];
  for (const op of operacoes) feitas.push(aplicar(estado, op));
  gravar(estado, docs);
  return feitas.map((f) => `[${f.arquivo}]\n${f.linha}`).join('\n');
}

function historico(docs, texto) {
  const t = texto.trim().replace(/^-\s*/, '');
  if (!t || /[\r\n]/.test(t)) throw new Error('historico: texto de uma linha só');
  const caminho = join(docs, 'historico-fatias.md');
  const tamanho = statSync(caminho).size;
  let sep = '';
  if (tamanho > 0) {
    const fd = openSync(caminho, 'r');
    const b = Buffer.alloc(1);
    readSync(fd, b, 0, 1, tamanho - 1);
    closeSync(fd);
    if (b[0] !== 0x0a) sep = '\n';
  }
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const data = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const linha = `- ${data} — ${t}\n`;
  appendFileSync(caminho, sep + linha);
  return linha.trimEnd();
}

const USO = `uso:
  checklist get <id> [<id>...]
  checklist set <id> [--arquivo usuario|calculo] [--situacao S] [--frente F] [--nota "t" | --acrescentar "t"]
  checklist lote <arquivo.json>
  checklist historico "<linha>"`;

/** Executa um comando e devolve o texto de saída (lança Error em caso de falha). */
export function executar(args, docs = process.env.CHECKLIST_DOCS || join(RAIZ, 'docs')) {
  const [cmd, ...resto] = args;
  if (cmd === 'get') {
    const { positionals } = parseArgs({ args: resto, options: {}, allowPositionals: true, strict: true });
    if (positionals.length === 0) throw new Error(USO);
    return get(docs, positionals);
  }
  if (cmd === 'set') {
    const { values, positionals } = parseArgs({
      args: resto,
      options: {
        arquivo: { type: 'string' }, situacao: { type: 'string' }, frente: { type: 'string' },
        nota: { type: 'string' }, acrescentar: { type: 'string' },
      },
      allowPositionals: true,
      strict: true,
    });
    if (positionals.length !== 1) throw new Error(USO);
    return escrita(docs, [{ id: positionals[0], ...values }]);
  }
  if (cmd === 'lote') {
    const { positionals } = parseArgs({ args: resto, options: {}, allowPositionals: true, strict: true });
    if (positionals.length !== 1) throw new Error(USO);
    const ops = JSON.parse(readFileSync(positionals[0], 'utf8'));
    if (!Array.isArray(ops)) throw new Error('lote: o JSON deve ser um array');
    return escrita(docs, ops);
  }
  if (cmd === 'historico') {
    if (resto.length !== 1) throw new Error(USO);
    return historico(docs, resto[0]);
  }
  throw new Error(USO);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(executar(process.argv.slice(2)));
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exitCode = 1;
  }
}
