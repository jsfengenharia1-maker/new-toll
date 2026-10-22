"""Referência independente do método geral (NBR 6118, 15.8.3.2) de um pilar 20 x 40 cm, fck 30, CA-50, 6 phi16,
flexão em torno do eixo fraco (curvatura ao longo de b = 0,20 m), barra birrotulada de comprimento Le com momento
de 1a ordem constante M1. Sem usar nada do Statikos: lâminas finas de concreto, aço bilinear, relação M-1/r
tabelada até a ruptura convencional (eps_c = 3,5 por mil ou eps_s = -10 por mil), curvatura invertida por
interpolação, equilíbrio por tiro (RK4) com bisseção na inclinação inicial."""
import math, sys

fck, gc = 30.0, 1.4
fcd = fck / gc
sig_pico = 1.1 * 0.85 * fcd          # MPa: 1,1 x sigma_cd (15.3.1)
ec2, ecu, ncur = 0.002, 0.0035, 2
fyd, Es = 500 / 1.15, 210000.0
b, h = 0.20, 0.40                    # s ao longo de b (0,20), largura da lâmina = h
phi = 0.016
a = 0.03 + 0.005 + phi / 2           # cobrimento + estribo phi5 + phi/2
Ab = math.pi * phi ** 2 / 4
bars = [(-(b / 2 - a)), (b / 2 - a)] * 3     # 3 barras em cada face de menor lado (6 phi16)
NL = 4000
ds = b / NL
strips = [(-b / 2 + (i + 0.5) * ds, ds * h) for i in range(NL)]


def sig(e):
    if e <= 0:
        return 0.0
    if e >= ec2:
        return sig_pico
    return sig_pico * (1 - (1 - e / ec2) ** ncur)


def forcas(e0, k):
    N = M = 0.0
    for s, A in strips:
        e = e0 + k * s
        if e > 0:
            F = sig(e) * A
            N += F
            M += F * s
    for s in bars:
        e = e0 + k * s
        F = (max(-fyd, min(fyd, Es * e)) - sig(e)) * Ab
        N += F
        M += F * s
    return N, M


def e0_de(k, N):
    lo, hi = -0.05, 0.01
    if forcas(hi, k)[0] < N or forcas(lo, k)[0] > N:
        return None
    for _ in range(60):
        m = (lo + hi) / 2
        if forcas(m, k)[0] < N:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2


def tabela(N):
    sMax, sBar = b / 2, min(bars)

    def rompe(k):
        e0 = e0_de(k, N)
        return e0 is None or e0 + k * sMax > ecu + 1e-12 or e0 + k * sBar < -0.01 - 1e-12

    lo, hi = 0.0, (ecu + 0.01) / b
    for _ in range(50):
        m = (lo + hi) / 2
        if rompe(m):
            hi = m
        else:
            lo = m
    kmax = lo
    tab = [(0.0, 0.0)]
    for i in range(1, 201):
        k = kmax * i / 200
        e0 = e0_de(k, N)
        tab.append((k, forcas(e0, k)[1]))
    fim = len(tab) - 1
    for i in range(1, len(tab)):
        if tab[i][1] < tab[i - 1][1]:
            fim = i - 1
            break
    return tab[: fim + 1]


import bisect


def kappa(tab, M):
    s, m = (1 if M >= 0 else -1), abs(M)
    if m > tab[-1][1]:
        return None
    ms = [t[1] for t in tab]
    i = max(1, bisect.bisect_left(ms, m))
    r = (m - tab[i - 1][1]) / (tab[i][1] - tab[i - 1][1] or 1)
    return s * (tab[i - 1][0] + r * (tab[i][0] - tab[i - 1][0]))


def tiro(N, M1, L, tab, n=2000):
    dx = L / n

    def f(th0):
        y, th = 0.0, th0
        ym = 0.0
        for _ in range(n):
            def acc(yy):
                k = kappa(tab, M1 + N * yy)
                if k is None:
                    raise ValueError('acima do resistente')
                return -k
            k1y, k1t = th, acc(y)
            k2y, k2t = th + 0.5 * dx * k1t, acc(y + 0.5 * dx * k1y)
            k3y, k3t = th + 0.5 * dx * k2t, acc(y + 0.5 * dx * k2y)
            k4y, k4t = th + dx * k3t, acc(y + dx * k3y)
            y += dx * (k1y + 2 * k2y + 2 * k3y + k4y) / 6
            th += dx * (k1t + 2 * k2t + 2 * k3t + k4t) / 6
            ym = max(ym, abs(y))
        return y, ym

    lo, hi = 0.0, 0.2
    # y(L) cresce com th0; procura th0 com y(L) = 0
    for _ in range(40):
        m = (lo + hi) / 2
        try:
            yL, _ = f(m)
        except ValueError:
            hi = m
            continue
        if yL < 0:
            lo = m
        else:
            hi = m
    th0 = (lo + hi) / 2
    # y no meio do vão
    y, th = 0.0, th0
    for i in range(n // 2):
        k = lambda yy: -kappa(tab, M1 + N * yy)
        k1y, k1t = th, k(y)
        k2y, k2t = th + 0.5 * dx * k1t, k(y + 0.5 * dx * k1y)
        k3y, k3t = th + 0.5 * dx * k2t, k(y + 0.5 * dx * k2y)
        k4y, k4t = th + dx * k3t, k(y + dx * k3y)
        y += dx * (k1y + 2 * k2y + 2 * k3y + k4y) / 6
        th += dx * (k1t + 2 * k2t + 2 * k3t + k4t) / 6
    return M1 + N * y, y, th0


if __name__ == '__main__':
    N = float(sys.argv[1])        # MN
    M1 = float(sys.argv[2])       # MN.m
    L = float(sys.argv[3])
    tab = tabela(N)
    print('Mpico (MN.m) =', tab[-1][1], ' k(M=1e-3)=', kappa(tab, 1e-3), 'EI inicial', 1e-3 / kappa(tab, 1e-3))
    Mmax, ym, th0 = tiro(N, M1, L, tab)
    print('Mmax (MN.m) =', Mmax, ' y(L/2) =', ym)
