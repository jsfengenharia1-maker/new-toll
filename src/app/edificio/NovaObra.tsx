// Janela "Nova obra" (L1): modos de criação e assistente em etapas.
import { useState } from 'react';
import { ESPEC_PADRAO, validarEspecificacao, type EspecificacaoObra } from '../../core/building/assistente';
import { EXEMPLOS_OBRA } from '../../core/building/exemplos';
import { Button, Chip, Hint, Modal, Note, Seg, Spacer } from '../ui';
import { PassoCargas, PassoEixos, PassoNormas, PassoObra, PassoPavimentos, PassoResumo } from './NovaObraPassos';
import { useBuilding } from './store';

type Passo = 'modo' | 'obra' | 'normas' | 'pavimentos' | 'eixos' | 'cargas' | 'resumo';
type Modo = 'assistente' | 'vazio' | 'padrao' | 'exemplo' | 'texto' | 'dxf' | 'ifc';

const PASSOS: Passo[] = ['modo', 'obra', 'normas', 'pavimentos', 'eixos', 'cargas', 'resumo'];
const MODOS: { v: Modo; label: string; desabilitado?: string }[] = [
  { v: 'assistente', label: 'Assistente passo a passo' },
  { v: 'vazio', label: 'Obra vazia' },
  { v: 'padrao', label: 'Edifício padrão' },
  { v: 'exemplo', label: 'Obra de exemplo' },
  { v: 'texto', label: 'Cargas de arquivo de texto' },
  { v: 'dxf', label: 'Lançamento por DXF/DWG', desabilitado: 'Chega com a frente L2' },
  { v: 'ifc', label: 'Importação de IFC', desabilitado: 'Chega com a frente L3' },
];

export function NovaObra({ onClose, onCriada, onTexto }: { onClose(): void; onCriada(): void; onTexto(): void }) {
  const [passo, setPasso] = useState<Passo>('modo');
  const [modo, setModo] = useState<Modo>('assistente');
  const [espec, setEspec] = useState<EspecificacaoObra>(() => structuredClone(ESPEC_PADRAO));
  const mudar = (p: Partial<EspecificacaoObra>) => setEspec((e) => ({ ...e, ...p }));
  const erros = validarEspecificacao(espec);
  const { novo, novaObra, novaObraExemplo } = useBuilding();
  const k = PASSOS.indexOf(passo);

  return (
    <Modal titulo="Nova obra" onClose={onClose} larga>
      {modo === 'assistente' && (
        <Seg small value={passo} onChange={setPasso} options={[
          { v: 'modo', label: 'Modo' }, { v: 'obra', label: 'Obra' }, { v: 'normas', label: 'Normas e materiais' },
          { v: 'pavimentos', label: 'Pavimentos' }, { v: 'eixos', label: 'Eixos' }, { v: 'cargas', label: 'Cargas' }, { v: 'resumo', label: 'Resumo' },
        ]} />
      )}
      <div className="nova-obra">
        {passo === 'modo' && (
          <>
            <Hint>Como começar a nova obra?</Hint>
            <div className="row wrap">
              {MODOS.map((m) => (
                <Chip key={m.v} on={modo === m.v} disabled={!!m.desabilitado} title={m.desabilitado} onClick={() => setModo(m.v)}>{m.label}</Chip>
              ))}
            </div>
            {modo === 'assistente' && <Hint>Responda em 6 etapas; a obra é gerada de uma vez e abre a janela de dados gerais.</Hint>}
            {modo === 'vazio' && (
              <>
                <Hint>Obra sem pavimentos: crie pavimentos, grupos e pilares pelos comandos e pela planta.</Hint>
                <div><Button variant="primary" onClick={() => { novo(true); onCriada(); }}>Criar obra vazia</Button></div>
              </>
            )}
            {modo === 'padrao' && (
              <>
                <Hint>Térreo, 3 pavimentos-tipo e cobertura, pé-direito de 3 m.</Hint>
                <div><Button variant="primary" onClick={() => { novo(false); onCriada(); }}>Criar edifício padrão</Button></div>
              </>
            )}
            {modo === 'exemplo' && EXEMPLOS_OBRA.map((e) => (
              <div className="recente" key={e.id}>
                <div className="recente-info">
                  <span className="recente-nome">{e.nome}</span>
                  <span className="recente-meta">{e.descricao.join(' · ')} — {e.resumo}</span>
                </div>
                <Button aria-label={`Abrir exemplo ${e.nome}`} onClick={() => { novaObraExemplo(e.id); onCriada(); }}>Abrir exemplo</Button>
              </div>
            ))}
            {modo === 'texto' && (
              <>
                <Hint>Arquivo de texto com as hipóteses de carga, os esforços nos arranques e a dimensão da base dos pilares: gera uma obra só de arranques para calcular as fundações.</Hint>
                <div><Button variant="primary" onClick={() => onTexto()}>Escolher arquivo de texto…</Button></div>
              </>
            )}
          </>
        )}
        {passo === 'obra' && <PassoObra espec={espec} mudar={mudar} />}
        {passo === 'normas' && <PassoNormas espec={espec} mudar={mudar} />}
        {passo === 'pavimentos' && <PassoPavimentos espec={espec} mudar={mudar} />}
        {passo === 'eixos' && <PassoEixos espec={espec} mudar={mudar} />}
        {passo === 'cargas' && <PassoCargas espec={espec} mudar={mudar} />}
        {passo === 'resumo' && <PassoResumo espec={espec} mudar={mudar} erros={erros} />}
        {modo !== 'assistente' && <Note>A nova obra substitui a obra atual. Guarde a atual antes, pelo Arquivo › Salvar no computador, se precisar.</Note>}
      </div>
      <div className="nova-obra-rodape">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Spacer />
        {modo === 'assistente' && (
          <>
            <span className="muted">{k === 0 ? 'Início' : `Etapa ${k} de 6`}</span>
            <Button disabled={passo === 'modo'} onClick={() => setPasso(PASSOS[Math.max(0, k - 1)])}>Voltar</Button>
            {passo !== 'resumo' && <Button variant="primary" onClick={() => setPasso(PASSOS[k + 1])}>Avançar</Button>}
            {passo === 'resumo' && <Button variant="primary" disabled={erros.length > 0} onClick={() => { const r = novaObra(espec); if (r.ok) onCriada(); }}>Criar obra</Button>}
          </>
        )}
      </div>
    </Modal>
  );
}
