// Ações do módulo Fundações que a faixa de comandos dispara (a lógica fica em Fundacoes.tsx, que registra a função ao montar).
import { create } from 'zustand';

interface AcoesFundacoes { importarDoPortico: () => void; set(p: Partial<Omit<AcoesFundacoes, 'set'>>): void }

export const useAcoesFundacoes = create<AcoesFundacoes>((set) => ({ importarDoPortico: () => {}, set: (p) => set(p) }));
