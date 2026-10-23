# uso: flows-add.py <branch> <prefixo do nome do fluxo>... ; reconstrói e2e/flows.mjs = HEAD + blocos dos fluxos do branch
import subprocess,sys
br=sys.argv[1]; nomes=sys.argv[2:]
base=subprocess.run(['git','show','HEAD:e2e/flows.mjs'],capture_output=True,text=True).stdout
e=subprocess.run(['git','show',br+':e2e/flows.mjs'],capture_output=True,text=True).stdout
add=''
for n in nomes:
    if "name: '"+n in base: continue
    i=e.index("    name: '"+n); i=e.rindex('  {\n',0,i)
    j=e.find("\n  {\n    name: '",i+5); j=j+1 if j>0 else e.rindex('];')
    add+=e[i:j]
k=base.rindex('];'); open('e2e/flows.mjs','w').write(base[:k]+add+base[k:])
