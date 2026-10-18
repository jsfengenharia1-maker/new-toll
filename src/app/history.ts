// Histórico de atividades: fica no navegador e vai junto no arquivo de trabalho.
export interface Activity { at: string; text: string; project: string }

const KEY = 'statikos:history';
const MAX = 1000;

export function getHistory(): Activity[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

function put(list: Activity[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch { /* armazenamento indisponível */ }
}

export function logActivity(text: string, project: string) {
  put([...getHistory(), { at: new Date().toISOString(), text, project }]);
}

/** Une o histórico de um arquivo ao do navegador, sem duplicar, em ordem cronológica. */
export function mergeHistory(incoming: Activity[]) {
  const seen = new Set<string>();
  const all = [...getHistory(), ...incoming].filter((a) => {
    if (!a || typeof a.at !== 'string' || typeof a.text !== 'string') return false;
    const k = `${a.at}|${a.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  put(all.sort((a, z) => a.at.localeCompare(z.at)));
}
