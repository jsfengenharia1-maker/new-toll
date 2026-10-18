# Pesquisa: memorial de cálculo e dimensionamento de pilares (out/2026)

## Estrutura de memorial
- **NBR 6118, item 5.2.3:** "O produto final do projeto estrutural é constituído por desenhos, especificações e critérios de projeto." A norma não traz modelo de memorial.
- **TQS:** descrição, normas, software, materiais, durabilidade (CAA e cobrimentos), ações e combinações, modelo estrutural, estabilidade global (γz, α), ELS, memorial por elemento (lajes, vigas, pilares, fundações), critérios.
- **ABECE 003:2015:** objetivo, direitos autorais, normas, durabilidade e vida útil de projeto, NBR 15575, incêndio, carregamentos, materiais, cobrimentos, critérios do modelo, orientações para a construção, usuário, manutenção.
- **Eberick:** valores de carga na fundação são característicos ("Carga máx"). O pilar é dimensionado com Nd,máx; o elemento de fundação (bloco/sapata) é dimensionado com valores de cálculo.

## Pilares (NBR 6118)
- **Momento mínimo:** M1d,mín = Nd(0,015 + 0,03h), item 11.3.3.4.3.
- **Pilar-padrão com curvatura aproximada** (λ ≤ 90):
  - 1/r = 0,005/[h(ν + 0,5)] ≤ 0,005/h;
  - Md,tot = αb·M1d,A + Nd·le²/10·(1/r) ≥ M1d,A.
- **Esbeltez:** λ1 = (25 + 12,5·e1/h)/αb, com 35 ≤ λ1 ≤ 90; αb = 0,60 + 0,40·MB/MA ≥ 0,40.
- **Seção mínima:** 19 cm. Entre 14 e 19 cm, γn = 1,95 − 0,05b. Área mínima 360 cm².
- **Armadura longitudinal:** As,mín = 0,15·Nd/fyd ≥ 0,4%·Ac. As,máx = 8%·Ac incluindo a emenda; na prática, 4% fora dela.
- **Barras longitudinais:** φl entre 10 mm e b/8.
- **Estribos:** φt ≥ 5 mm e ≥ φl/4. Espaçamento ≤ 20 cm, ≤ menor dimensão, ≤ 12φl (CA-50).
- **NBR 6118:2023 (segundo TCC da UFU, a confirmar):** gancho de estribo a 135°, αb = 1 em balanço, novo γn1, ηc para fck > 40.

## Fontes
- TQS – Memorial descritivo: https://docs.tqs.com.br/Docs/Details?id=1465178373&language=pt-br
- ABECE 003:2015: http://www.abece.com.br/pdf/Recomendacao003_Memorial_Descritivo_Projeto_Estrutural_online.pdf
- Bastos, Pilares: https://professor.pucgoias.edu.br/sitedocente/admin/arquivosUpload/14026/material/Pilares.pdf
- Scadelai/Pinheiro, Pilares: https://www.fec.unicamp.br/~almeida/ec802/Pilares/16%20Pilares.pdf
- AltoQi, momento mínimo: https://suporte.altoqi.com.br/hc/pt-br/articles/115001540993
- AltoQi, cargas de fundação x pilar: https://suporte.altoqi.com.br/hc/pt-br/articles/115003698753
- UFU, mudanças da NBR 6118:2023: https://repositorio.ufu.br/bitstream/123456789/38372/1/Atualiza%C3%A7%C3%B5esABNTNBR.pdf
