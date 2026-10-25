// Módulo virtual resolvido em vite.config.ts: o worker do cálculo, em arquivo à parte (build publicado) ou embutido (artifact e testes).
declare module 'virtual:calculo-worker' {
  const CalculoWorker: new () => Worker;
  export default CalculoWorker;
}
