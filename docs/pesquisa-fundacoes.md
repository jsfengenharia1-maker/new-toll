# Pesquisa: fundações profundas (out/2026)

## Décourt-Quaresma (1978) com α/β de Décourt (1996)
**Fórmulas:**
- Rp = α·C·Np·Ap
- Rl = β·10·(Nl/3 + 1)·U·L, em kPa

**Valores de N:**
- Np: média dos N da ponta, imediatamente acima e imediatamente abaixo; limitado a 50.
- Nl: média ao longo do fuste, com 3 ≤ N ≤ 50, excluindo os N usados na ponta.

**Coeficiente C (kPa):** argila 120 · silte argiloso 200 · silte arenoso 250 · areia 400.

**α (ponta)**, na ordem argila / intermediário / areia:
- cravada: 1 / 1 / 1;
- escavada: 0,85 / 0,60 / 0,50;
- hélice: 0,30 / 0,30 / 0,30 (orientativo).

**β (fuste)**, mesma ordem:
- cravada: 1 / 1 / 1;
- escavada: 0,80 / 0,65 / 0,50;
- hélice: 1 / 1 / 1 (orientativo).

**Fatores de segurança:**
- Padm = mín[(Rp+Rl)/2 ; Rp/4 + Rl/1,3].
- NBR 6122: FS global 2 nos métodos semiempíricos; 1,6 com prova de carga.

**Ponta de escavadas:**
- texto de 2010: Padm ≤ 1,25·Rl;
- projeto de 2019 (escavada com fluido): Rp ≤ Rl; sem garantia de contato com solo competente, Rp = 0.

## NBR 6122:2019, Tabela 4 (projeto 2018 — conferir no texto publicado)
Regras gerais: γf = 1,4 e γs = 1,15.

| Tipo | Classe / γc (CAA I-II · III-IV) | As,mín | Comprimento armado | σ sem armar |
|---|---|---|---|---|
| Hélice | C30/2,7 · C40/3,6 | 0,4% | 4 m | 6 MPa |
| Escavada sem fluido | C25/3,1 · C40/5,0 | 0,4% | 2 m | 5 MPa |
| Escavada com fluido | C30/2,7 · C40/3,6 | 0,4% | 4 m | 6 MPa |
| Strauss | 20/2,5 | 0,4% | 2 m | 5 MPa |
| Raiz | 20/1,6 | 0,4% | integral | – |

## Pré-moldadas (catálogo SCAC, centrifugadas)
| Ø (cm) | Carga estrutural (kN) | Tração (kN) |
|---|---|---|
| 26 | 500 | 150 |
| 33 | 800 | 180 |
| 38 | 1000 | 210 |
| 42 | 1250 | 240 |
| 50 | 1700–1850 | 270 |
| 60 | 2350–2550 | 370 |
| 70 | 3150–3350 | 480 |
| 80 | 4000–5000 | 640 |

**Nega:**
- É a penetração permanente por golpe (série de 10 golpes); o repique é a parcela elástica.
- Fórmulas dinâmicas e fatores de segurança: Brix (≥ 5), Holandeses (≥ 10), Engineering News (≥ 6), Dinamarquesa.
- Não foi encontrado critério normativo para estimar a profundidade de nega pelo SPT.

## Limites executivos
- Escavada mecânica sem fluido: até o nível d'água.
- Hélice: 30–80 cm usuais (até 100–120 cm); profundidade 22–32 m usual (até cerca de 50 m documentado). Não atravessa rocha nem matacão.

## Carga horizontal (Miche)
- T = (EI/nh)^(1/5); Mmáx ≈ 0,79·H·T a cerca de 1,32·T de profundidade; válido para L > 4T.
- nh de Terzaghi (MN/m³), seca / submersa:
  - areia fofa: 2,2 / 1,3;
  - média: 6,6 / 4,4;
  - compacta: 17,6 / 10,7.
- Argila mole: cerca de 0,08 MN/m³ (UFRJ, a confirmar).

## Blocos
- Espaçamento ≥ 2,5φ (pré-moldadas) e ≥ 3φ (moldadas in loco).
- Distribuição de cargas: Ni = N/n ± Mx·yi/Σyi² ± My·xi/Σxi².

## Fontes
- UFPR, capacidade de carga axial: https://gegeo.ufpr.br/wp-content/uploads/2024/09/capacidade-de-carga-axial-de-fundacoes-profundas.pdf
- UFPR, aula 7 (fórmulas dinâmicas): https://gegeo.ufpr.br/wp-content/uploads/2024/09/aula7.pdf
- Unicamp, método de Décourt: https://www.fecfau.unicamp.br/~pjra/wp-content/uploads/2024/01/Me%CC%81todo-de-De%CC%81court_SEFE-2023_Polido-et-al..pdf
- NBR 6122, Consulta Nacional 2018: https://www.acad.eng.br/wp-content/uploads/2018/12/NBR-6122-2018-Consulta-Nacional.pdf
- UFRJ, CSDutra: https://pantheon.ufrj.br/bitstream/11422/17024/1/CSDutra.pdf
- APL, o que mudou na NBR 6122:2019: https://blog.apl.eng.br/veja-o-que-mudou-na-nbr-6122-2019-norma-de-fundacoes/
- Alonso, hélice contínua: https://www.institutodeengenharia.org.br/site/wp-content/uploads/2023/08/Helice-continua.pdf
- SCAC, catálogo: https://pdfcoffee.com/scac-catalogo-tecnico-estacas-pdf-free.html
- UNESP (Bastos), blocos: https://wwwp.feb.unesp.br/pbastos/concreto3/Blocos.pdf
