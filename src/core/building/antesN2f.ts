// Opções da N2f com os valores anteriores à frente (testes de regressão que fixam números de antes dela).
// Uso só nos testes: fator único 1 + αf(t0), ρ′ = 0, seção bruta no Branson, balanço com tangente fixa, lajes sem
// fissuração, sem flecha ativa e variável das lajes elástica (sem fatores simplificados de ativa e conforto).
export const ANTES_N2F = {
  flechaEtapas: 0, flechaRhoLinha: 0, inerciaHomogeneizada: 0, flechaRotacaoBalanco: 0, fissuracaoLajes: 0,
  limiteFlechaAtiva: 0, limiteFlechaAtivaAbs: 0, fatorFlechaAtiva: 0, fatorFlechaAtivaTrelicada: 0, fatorFlechaConforto: 0, fatorFlechaConfortoTrelicada: 0,
};
