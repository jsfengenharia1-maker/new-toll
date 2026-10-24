// Converte a `Cena3D` pura em objetos do three.js: uma malha fundida por tipo (e uma para os panos a definir), arestas,
// linhas das vigotas, marcas "?", realce de seleção e de cursor, câmeras perspectiva e ortográfica (eixo z para cima),
// raycast e captura PNG. Nenhuma cor aqui: elas chegam lidas dos tokens `--v3d-*` (design/global.css).
import type * as THREE from 'three';
import { direcaoOlhar, metadeAltura, posicaoCamera, type Camera3D, type EstadoCaminhar } from '../../core/vista3d/camera';
import type { Cena3D, Objeto3D, TipoElemento3D } from '../../core/vista3d/registro';
import { malhaDeTubos, type CamadaArmadura } from '../../core/vista3d/armaduras3d';
import type { CenaDeformada } from '../../core/resultados/deformadaCena';
import type { EixoDeformado } from '../../core/resultados/deformada';
import type { Three } from './carregarThree';

export interface CoresCena {
  fundo: string; linha: string; selecao: string; destaque: string; pendente: string;
  tipos: Record<TipoElemento3D, string>;
}

export interface AjustesMateriais {
  /** Opacidade por tipo, 0 a 1 (1 = opaco). */
  opacidade: Partial<Record<TipoElemento3D, number>>;
  textura: boolean;
}

interface Faixa { ini: number; fim: number; obj: Objeto3D }
/** Atributo de posição da deformada: posições originais, deslocamentos e o atributo do three que recebe base + escala · fator · desl. */
interface RegistroDef { attr: THREE.BufferAttribute; base: Float32Array; desl: Float32Array; geo: THREE.BufferGeometry }
interface Bloco { chave: string; tipo: TipoElemento3D; pendente: boolean; mesh: THREE.Mesh; faixas: Faixa[] }

/** Textura procedural de concreto: ruído em tons de cinza, gerado pixel a pixel (sem imagem externa). */
function texturaConcreto(T: Three): THREE.CanvasTexture {
  const n = 128, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const ctx = cv.getContext('2d')!, img = ctx.createImageData(n, n);
  let s = 12345;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < n * n; i++) {
    const v = 205 + Math.round((rnd() - 0.5) * 50) + (rnd() < 0.04 ? -35 : 0);
    img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = v;
    img.data[4 * i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(cv);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

export class RenderizadorCena {
  private T: Three;
  private R: THREE.WebGLRenderer;
  private cena: THREE.Scene;
  private persp: THREE.PerspectiveCamera;
  private orto: THREE.OrthographicCamera;
  private ativa: THREE.Camera;
  private raiz: THREE.Group;
  private realce: THREE.Group;
  private arm: THREE.Group;
  private def: THREE.Group;
  private registrosDef: RegistroDef[] = [];
  private blocos: Bloco[] = [];
  private objetos = new Map<string, Objeto3D>();
  private ray: THREE.Raycaster;
  private textura: THREE.CanvasTexture | null = null;
  private cores: CoresCena | null = null;
  private selecao = new Set<string>();
  private destaque: string | null = null;
  private w = 1; private h = 1;
  private aj: AjustesMateriais = { opacidade: {}, textura: false };
  /** Duração (ms) do último `renderizar`. */
  ultimoQuadroMs = 0;

  constructor(T: Three, container: HTMLElement) {
    this.T = T;
    this.R = new T.WebGLRenderer({ antialias: true });
    this.R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.cena = new T.Scene();
    this.persp = new T.PerspectiveCamera(45, 1, 0.05, 5000);
    this.orto = new T.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
    for (const c of [this.persp, this.orto]) c.up.set(0, 0, 1);
    this.ativa = this.persp;
    this.raiz = new T.Group();
    this.realce = new T.Group();
    this.arm = new T.Group();
    this.def = new T.Group();
    this.cena.add(this.raiz, this.realce, this.arm, this.def);
    this.cena.add(new T.HemisphereLight(undefined, undefined, 1.1));
    const sol = new T.DirectionalLight(undefined, 1.6);
    sol.position.set(-0.6, -0.9, 1.4);
    this.cena.add(sol);
    this.ray = new T.Raycaster();
    container.appendChild(this.R.domElement);
  }

  get canvas(): HTMLCanvasElement { return this.R.domElement; }

  redimensionar(w: number, h: number): void {
    this.w = Math.max(1, w); this.h = Math.max(1, h);
    this.R.setSize(this.w, this.h, false);
  }

  private limpar(): void {
    for (const filho of [...this.raiz.children]) {
      this.raiz.remove(filho);
      const g = filho as THREE.Mesh;
      g.geometry?.dispose();
      const m = g.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m?.dispose();
    }
    this.blocos = [];
    this.objetos.clear();
  }

  /** Monta as malhas da cena (substitui a anterior). */
  definirCena(c: Cena3D, cores: CoresCena): void {
    const T = this.T;
    this.limpar();
    this.cores = cores;
    this.R.setClearColor(new T.Color(cores.fundo));
    const grupos = new Map<string, Objeto3D[]>();
    for (const o of c.objetos) {
      this.objetos.set(o.id, o);
      const k = `${o.tipo}|${o.pendente ? 'p' : ''}`;
      (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(o);
    }
    const linhasPorTipo = new Map<string, number[]>();
    for (const [chave, lista] of grupos) {
      const pendente = chave.endsWith('|p'), tipo = lista[0].tipo;
      let nv = 0, ni = 0;
      for (const o of lista) { nv += o.pos.length; ni += o.idx.length; }
      const pos = new Float32Array(nv), uv = new Float32Array((nv / 3) * 2), idx = new Uint32Array(ni);
      const faixas: Faixa[] = [];
      let pv = 0, pi = 0;
      for (const o of lista) {
        const base = pv / 3;
        pos.set(o.pos, pv);
        for (let i = 0; i < o.pos.length; i += 3) {
          const k = (pv + i) / 3;
          uv[2 * k] = (o.pos[i] + 0.6 * o.pos[i + 2]) * 0.6; uv[2 * k + 1] = (o.pos[i + 1] + 0.6 * o.pos[i + 2]) * 0.6;
        }
        for (let i = 0; i < o.idx.length; i++) idx[pi + i] = o.idx[i] + base;
        faixas.push({ ini: pi / 3, fim: (pi + o.idx.length) / 3, obj: o });
        pv += o.pos.length; pi += o.idx.length;
        const L = linhasPorTipo.get(pendente ? 'pendente' : 'normal') ?? linhasPorTipo.set(pendente ? 'pendente' : 'normal', []).get(pendente ? 'pendente' : 'normal')!;
        for (let i = 0; i < o.linhas.length; i++) L.push(o.linhas[i]);
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(new T.Uint32BufferAttribute(idx, 1));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const mat = pendente
        ? new T.MeshBasicMaterial({ color: new T.Color(cores.pendente), transparent: true, opacity: 0.35, depthWrite: false, side: T.DoubleSide })
        : new T.MeshLambertMaterial({ color: new T.Color(cores.tipos[tipo]), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      const mesh = new T.Mesh(geo, mat);
      this.raiz.add(mesh);
      this.blocos.push({ chave, tipo, pendente, mesh, faixas });
    }
    const arestas = linhasPorTipo.get('normal');
    if (arestas?.length) this.raiz.add(this.linhas(arestas, new T.LineBasicMaterial({ color: new T.Color(cores.linha) })));
    const pend = linhasPorTipo.get('pendente');
    if (pend?.length) {
      const l = this.linhas(pend, new T.LineDashedMaterial({ color: new T.Color(cores.pendente), dashSize: 0.3, gapSize: 0.2 }));
      l.computeLineDistances();
      this.raiz.add(l);
    }
    const aux = c.auxiliares.flatMap((a) => a.linhas);
    if (aux.length) this.raiz.add(this.linhas(aux, new T.LineBasicMaterial({ color: new T.Color(cores.linha) })));
    if (c.rotulos.length) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = cores.pendente; ctx.font = 'bold 56px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', 32, 34);
      const tex = new T.CanvasTexture(cv);
      tex.colorSpace = T.SRGBColorSpace;
      for (const r of c.rotulos) {
        const s = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false }));
        s.position.set(r.x, r.y, r.z + 0.4);
        s.scale.set(0.9, 0.9, 1);
        this.raiz.add(s);
      }
    }
    this.atualizarMateriais(this.aj);
    this.refazerRealce();
  }

  private linhas(v: number[], mat: THREE.Material): THREE.LineSegments {
    const g = new this.T.BufferGeometry();
    g.setAttribute('position', new this.T.Float32BufferAttribute(v, 3));
    return new this.T.LineSegments(g, mat);
  }

  /** Armaduras (V2): uma camada = um objeto (linhas ou malha de tubos) com a cor da camada; `raio` em m para os tubos. */
  definirArmaduras(camadas: CamadaArmadura[], cores: string[], modo: 'linhas' | 'tubos', raio: number): void {
    const T = this.T;
    this.limparArmaduras();
    camadas.forEach((c, i) => {
      if (!c.linhas.length) return;
      const cor = new T.Color(cores[i % cores.length]);
      if (modo === 'linhas') { this.arm.add(this.linhas(c.linhas, new T.LineBasicMaterial({ color: cor }))); return; }
      const { pos, idx } = malhaDeTubos(c.linhas, raio);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setIndex(new T.Uint32BufferAttribute(idx, 1));
      g.computeVertexNormals();
      this.arm.add(new T.Mesh(g, new T.MeshLambertMaterial({ color: cor, side: T.DoubleSide })));
    });
  }

  private limparArmaduras(): void {
    for (const f of [...this.arm.children]) { this.arm.remove(f); (f as THREE.Mesh).geometry.dispose(); ((f as THREE.Mesh).material as THREE.Material).dispose(); }
  }

  /** Transparência por tipo e textura procedural. */
  atualizarMateriais(aj: AjustesMateriais): void {
    this.aj = aj;
    if (aj.textura && !this.textura) this.textura = texturaConcreto(this.T);
    for (const b of this.blocos) {
      if (b.pendente) continue;
      const m = b.mesh.material as THREE.MeshLambertMaterial, op = aj.opacidade[b.tipo] ?? 1;
      m.opacity = op; m.transparent = op < 1; m.depthWrite = op >= 1;
      m.map = aj.textura ? this.textura : null;
      m.needsUpdate = true;
      b.mesh.visible = op > 0.001;
    }
  }


  // ---------------------------------------------------------------- deformada (V3)

  private limparDeformada(): void {
    for (const f of [...this.def.children]) { this.def.remove(f); const g = f as THREE.Mesh; g.geometry.dispose(); (g.material as THREE.Material).dispose(); }
    this.registrosDef = [];
  }

  /** Cor da rampa (cores[0] = menor |Δ|) na posição `t` de 0 a 1. */
  private corRampa(cores: THREE.Color[], t: number): THREE.Color {
    const x = Math.min(1, Math.max(0, t)) * (cores.length - 1), i = Math.min(cores.length - 2, Math.floor(x));
    return cores[i].clone().lerp(cores[i + 1], x - i);
  }

  /**
   * Mostra a deformada no lugar da cena original (que fica oculta): `completa` = malhas refinadas coloridas por |Δ|;
   * `simplificada` = eixos das barras. `cd` nulo desliga. `cores` = rampa `--v3d-def-1..5`.
   */
  definirDeformada(cd: CenaDeformada | null, eixos: EixoDeformado[] | null, cores: string[], modo: 'completa' | 'simplificada', dmax: number): void {
    const T = this.T;
    this.limparDeformada();
    this.raiz.visible = !(cd || eixos);
    if (!cd && !eixos) return;
    const rampa = cores.map((c) => new T.Color(c)), cor = (d: number) => this.corRampa(rampa, dmax > 1e-12 ? d / dmax : 0);
    const registrar = (geo: THREE.BufferGeometry, base: Float32Array, desl: Float32Array) => {
      const attr = new T.Float32BufferAttribute(base.slice(), 3);
      geo.setAttribute('position', attr);
      this.registrosDef.push({ attr, base, desl, geo });
    };
    if (modo === 'completa' && cd) {
      for (const o of cd.objetos) {
        const geo = new T.BufferGeometry(), nv = o.pos.length / 3, col = new Float32Array(nv * 3);
        for (let v = 0; v < nv; v++) { const c = cor(o.delta[v]); col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; }
        registrar(geo, o.pos, o.desl);
        geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
        geo.setIndex(new T.Uint32BufferAttribute(o.idx, 1));
        this.def.add(new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })));
      }
    } else if (eixos) {
      const base: number[] = [], desl: number[] = [], col: number[] = [];
      for (const e of eixos) for (let k = 0; k + 1 < e.delta.length; k++) {
        for (const j of [k, k + 1]) {
          base.push(e.pos[j * 3], e.pos[j * 3 + 1], e.pos[j * 3 + 2]); desl.push(e.desl[j * 3], e.desl[j * 3 + 1], e.desl[j * 3 + 2]);
          const c = cor(e.delta[j]); col.push(c.r, c.g, c.b);
        }
      }
      const geo = new T.BufferGeometry();
      registrar(geo, Float32Array.from(base), Float32Array.from(desl));
      geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      this.def.add(new T.LineSegments(geo, new T.LineBasicMaterial({ vertexColors: true })));
    }
    this.atualizarDeformada(1, 1, true);
  }

  /** Posições = original + escala · fator · deslocamento; `normais` refaz o sombreamento (não nos quadros da animação). */
  atualizarDeformada(escala: number, fator: number, normais: boolean): void {
    const k = escala * fator;
    for (const r of this.registrosDef) {
      const a = r.attr.array as Float32Array;
      for (let i = 0; i < a.length; i++) a[i] = r.base[i] + k * r.desl[i];
      r.attr.needsUpdate = true;
      if (normais && r.geo.index) r.geo.computeVertexNormals();
      r.geo.computeBoundingSphere();
    }
  }

  // ---------------------------------------------------------------- realce (seleção e cursor)

  private construirRealce(ids: Iterable<string>, cor: string, opacidade: number): THREE.Mesh | null {
    const T = this.T, alvo = new Set(ids), pos: number[] = [], idx: number[] = [];
    // `ids` guarda ids de elemento (os da planta) ou de objeto (o cursor)
    for (const o of this.objetos.values()) {
      if (!alvo.has(o.elemento) && !alvo.has(o.id)) continue;
      const base = pos.length / 3;
      for (const v of o.pos) pos.push(v);
      for (const i of o.idx) idx.push(i + base);
    }
    if (!idx.length) return null;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const m = new T.MeshBasicMaterial({ color: new T.Color(cor), transparent: true, opacity: opacidade, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    return new T.Mesh(g, m);
  }

  private refazerRealce(): void {
    for (const f of [...this.realce.children]) { this.realce.remove(f); (f as THREE.Mesh).geometry.dispose(); ((f as THREE.Mesh).material as THREE.Material).dispose(); }
    if (!this.cores) return;
    const sel = this.selecao.size ? this.construirRealce(this.selecao, this.cores.selecao, 0.85) : null;
    if (sel) this.realce.add(sel);
    const hov = this.destaque && !this.selecao.has(this.objetos.get(this.destaque)?.elemento ?? '') ? this.construirRealce([this.destaque], this.cores.destaque, 0.6) : null;
    if (hov) this.realce.add(hov);
  }

  /** Elementos selecionados (ids de elemento do modelo, os mesmos da planta). */
  selecionar(elementos: Set<string>): void {
    this.selecao = new Set(elementos);
    this.refazerRealce();
  }

  /** Objeto sob o cursor (id do objeto) ou nenhum. */
  destacar(id: string | null): void {
    if (id === this.destaque) return;
    this.destaque = id;
    this.refazerRealce();
  }

  // ---------------------------------------------------------------- câmera

  /** Aplica a câmera de órbita (perspectiva ou ortográfica) ou, no modo caminhar, a do olhar. */
  definirCamera(c: Camera3D, caminhar?: EstadoCaminhar): void {
    const asp = this.w / this.h;
    if (caminhar) {
      const p = this.persp;
      p.fov = 62; p.aspect = asp; p.near = 0.05; p.far = 3000;
      p.position.set(...caminhar.pos);
      const d = direcaoOlhar(caminhar);
      p.lookAt(caminhar.pos[0] + d[0], caminhar.pos[1] + d[1], caminhar.pos[2] + d[2]);
      p.updateProjectionMatrix();
      this.ativa = p;
      return;
    }
    const pos = posicaoCamera(c);
    if (c.projecao === 'perspectiva') {
      const p = this.persp;
      p.fov = c.fov; p.aspect = asp; p.near = Math.max(0.05, c.dist / 400); p.far = c.dist * 60 + 500;
      p.position.set(...pos);
      p.lookAt(...c.alvo);
      p.updateProjectionMatrix();
      this.ativa = p;
    } else {
      const o = this.orto, hh = metadeAltura(c);
      o.left = -hh * asp; o.right = hh * asp; o.top = hh; o.bottom = -hh;
      o.near = -c.dist * 20; o.far = c.dist * 20;
      o.position.set(...pos);
      o.lookAt(...c.alvo);
      o.updateProjectionMatrix();
      this.ativa = o;
    }
  }

  // ---------------------------------------------------------------- consulta e saída

  /** Objeto atingido pelo raio que passa por (x, y) em pixels do contêiner. */
  pick(x: number, y: number): Objeto3D | null {
    return this.pickPonto(x, y)?.obj ?? null;
  }

  /** Objeto atingido e o ponto do modelo (m, eixos da obra) onde o raio o toca (V6d: consulta do nó pelo clique). */
  pickPonto(x: number, y: number): { obj: Objeto3D; ponto: [number, number, number] } | null {
    const T = this.T;
    this.ray.setFromCamera(new T.Vector2((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1), this.ativa);
    const meshes = this.blocos.filter((b) => b.mesh.visible).map((b) => b.mesh);
    const hit = this.ray.intersectObjects(meshes, false)[0];
    if (!hit || hit.faceIndex == null) return null;
    const bloco = this.blocos.find((b) => b.mesh === hit.object);
    if (!bloco) return null;
    const f = hit.faceIndex;
    let lo = 0, hi = bloco.faixas.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (bloco.faixas[m].fim <= f) lo = m + 1; else hi = m; }
    const obj = bloco.faixas[lo]?.obj;
    return obj ? { obj, ponto: [hit.point.x, hit.point.y, hit.point.z] } : null;
  }

  renderizar(): number {
    const t0 = performance.now();
    this.R.render(this.cena, this.ativa);
    this.ultimoQuadroMs = performance.now() - t0;
    return this.ultimoQuadroMs;
  }

  capturar(): Promise<Blob | null> {
    this.R.render(this.cena, this.ativa);
    return new Promise((ok) => this.R.domElement.toBlob((b) => ok(b), 'image/png'));
  }

  dispose(): void {
    this.limpar();
    this.limparArmaduras();
    this.limparDeformada();
    for (const f of [...this.realce.children]) { (f as THREE.Mesh).geometry.dispose(); ((f as THREE.Mesh).material as THREE.Material).dispose(); }
    this.textura?.dispose();
    this.R.dispose();
    this.R.domElement.remove();
  }
}
