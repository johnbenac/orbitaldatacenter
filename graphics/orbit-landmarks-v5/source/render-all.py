import argparse,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--blender',default='blender');p.add_argument('--preview',action='store_true');p.add_argument('--cpu',action='store_true');p.add_argument('--gpu-name',default='');p.add_argument('--ids',nargs='*');a=p.parse_args()
ids=a.ids or ['redwire-8kw','starcloud-3','starmind-ai1','orbital-1-202609','orbital-1-202606','star-catcher-self-powered']
for ident in ids:
 cmd=[a.blender,'-b','-t','8','--python',str(ROOT/'source'/'render-orbital.py'),'--','--id',ident]
 if a.preview:cmd+=['--preview']
 if a.cpu:cmd+=['--cpu']
 if a.gpu_name:cmd+=['--gpu-name',a.gpu_name]
 started=time.time()
 with (ROOT/(ident+('-preview' if a.preview else '-final')+'.log')).open('w') as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
 target=ROOT/'renders'/(ident+('-preview' if a.preview else '')+'.png')
 assert target.exists() and target.stat().st_mtime>=started,f'Render failed; inspect {ident} log'
 print(ident,'finished',flush=True)
