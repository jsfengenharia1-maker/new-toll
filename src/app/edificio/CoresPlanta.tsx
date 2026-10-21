// Tabela de cores da planta editável (R7-0): cada tema (escuro, claro, P&B) parte das cores do design system
// (global.css, --pl-<tema>-<chave>) e o usuário troca as que quiser; as alterações ficam só neste navegador.
import { useState } from 'react';
import { CHAVES, hexDaCor, paletaBase, usePlanta, type Paleta } from './plantaStore';
import { Button, Modal } from '../ui';

const ROTULOS: Record<keyof Paleta, string> = {
  fundo: 'Fundo', mascara: 'Máscara (DXF)', eixo: 'Eixos', viga: 'Vigas', laje: 'Lajes', carga: 'Cargas', parede: 'Paredes (alvenaria)', pilar: 'Pilares', pilarBorda: 'Borda dos pilares',
  texto: 'Textos', cota: 'Cotas', selecao: 'Seleção', captura: 'Captura', guia: 'Linhas-guia', erro: 'Erro', aviso: 'Aviso', janela: 'Janela de seleção', cruzamento: 'Seleção por cruzamento', fantasma: 'Pilares do pavimento de baixo', limite: 'Limites da fundação',
};
const NOME_TEMA = { escuro: 'escuro', claro: 'claro', pb: 'P&B' } as const;

export function CoresPlanta() {
  const [aberta, setAberta] = useState(false);
  const pl = usePlanta();
  const t = pl.tema, alteradas = pl.cores[t] ?? {}, base = paletaBase(t);
  const mudar = (k: keyof Paleta, hex: string) => {
    // mantém a opacidade da cor original (guias e pilares de baixo são translúcidos)
    const alfa = hexDaCor(base[k]).alfa, nova = hex + alfa;
    const cores = { ...pl.cores, [t]: { ...alteradas, [k]: nova } };
    if (hexDaCor(base[k]).hex === hex) delete cores[t]![k];
    pl.set({ cores });
  };
  const restaurar = () => { const cores = { ...pl.cores }; delete cores[t]; pl.set({ cores }); };
  const n = Object.keys(alteradas).length;
  return (
    <>
      <Button title="Tabela de cores da planta (por tema; fica neste navegador)" onClick={() => setAberta(true)}>Cores{n ? ` (${n})` : ''}</Button>
      {aberta && (
        <Modal titulo={`Cores da planta — tema ${NOME_TEMA[t]}`} onClose={() => setAberta(false)}>
          <div className="cores-planta" data-tema={t}>
            {CHAVES.map((k) => {
              const atual = hexDaCor(alteradas[k] ?? base[k]).hex;
              return (
                <label key={k} className={alteradas[k] ? 'on' : ''}>
                  <input type="color" aria-label={`Cor: ${ROTULOS[k]}`} data-chave={k} value={atual} onChange={(e) => mudar(k, e.target.value)} />
                  <span>{ROTULOS[k]}{alteradas[k] ? ' *' : ''}</span>
                </label>
              );
            })}
          </div>
          <div className="row wrap">
            <Button disabled={!n} onClick={restaurar}>Restaurar as cores do tema</Button>
            <span className="muted small">* alterada. Cada tema guarda as suas cores; troque o tema na barra da planta.</span>
          </div>
        </Modal>
      )}
    </>
  );
}
