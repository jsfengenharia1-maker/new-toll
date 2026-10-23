import re,sys
pat=re.compile(r'<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n',re.S)
rank={'Feito':3,'Parcial':2,'Falta':1}
def st(l):
    c=[x.strip() for x in l.split('|')]
    return rank.get(c[3],0) if len(c)>4 else 0
def f(h,t):
    hl=h.splitlines(); tl=t.splitlines()
    if all(l.startswith('| ') for l in hl+tl) and len(hl)==len(tl):
        return '\n'.join((a if st(a)>=st(b) else b) if re.match(r'\| [CK]\d',a) else a for a,b in zip(hl,tl))+'\n'
    return h+t
for p in sys.argv[1:]:
    s=open(p).read(); s=pat.sub(lambda m:f(m.group(1),m.group(2)),s); open(p,'w').write(s)
