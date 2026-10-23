#!/usr/bin/env node
// PreToolUse: recusa a leitura inteira de arquivos grandes (economia de contexto, docs/regras-agentes.md).
// Read sem limit (ou com limit > 800) de arquivo > 60 KB e `cat/less/more <arquivo grande>` sem pipe
// são recusados com a alternativa (grep -n + Read com offset/limit). Qualquer erro do próprio gancho libera a chamada.
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const LIMITE_BYTES = 60 * 1024
const LIMITE_LINHAS = 800

function tamanho(caminho, cwd) {
  try { return statSync(resolve(cwd || process.cwd(), caminho)).size } catch { return 0 }
}

function recusar(msg) {
  process.stderr.write(msg + '\n')
  process.exit(2)
}

try {
  const ev = JSON.parse(readFileSync(0, 'utf8'))
  const cwd = ev.cwd
  const inp = ev.tool_input || {}
  if (ev.tool_name === 'Read' && inp.file_path) {
    const t = tamanho(inp.file_path, cwd)
    const limite = Number(inp.limit) || 0
    if (t > LIMITE_BYTES && (!limite || limite > LIMITE_LINHAS)) {
      recusar(`Leitura recusada: ${inp.file_path} tem ${Math.round(t / 1024)} KB. Regra de economia de contexto (docs/regras-agentes.md): localize com grep -n e leia o trecho com Read offset/limit (limit ≤ ${LIMITE_LINHAS}). Nada foi perdido: todas as partes do arquivo continuam acessíveis por trecho.`)
    }
  } else if (ev.tool_name === 'Bash' && typeof inp.command === 'string') {
    for (const seg of inp.command.split(/&&|\|\||;|\n/)) {
      if (seg.includes('|')) continue
      const m = seg.match(/^\s*(?:cat|less|more|bat)\s+(.+)$/)
      if (!m) continue
      for (const arq of m[1].trim().split(/\s+/)) {
        if (arq.startsWith('-')) continue
        const t = tamanho(arq.replace(/^['"]|['"]$/g, ''), cwd)
        if (t > LIMITE_BYTES) {
          recusar(`Comando recusado: ${arq} tem ${Math.round(t / 1024)} KB. Regra de economia de contexto (docs/regras-agentes.md): use grep -n, sed -n 'a,bp' ou head/tail.`)
        }
      }
    }
  }
} catch {
  // gancho nunca bloqueia por erro próprio
}
process.exit(0)
