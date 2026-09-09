"""Independent whole-PDF heading census (not the Forge builder's column parser)."""
import fitz,json,re,sys,hashlib
from pathlib import Path
source=Path(sys.argv[1]);pdf=fitz.open(source)
actors=json.loads(Path('data/terrinoth-adversaries.json').read_text())
def key(s):return re.sub('[^a-z0-9]','',s.lower().replace('golbins','goblins'))
alias={'thievesguildcutpurse':'thievesguildcutpurse','dwarfancestralspecter':'dwarfancestralspecter'}
rows=[]
for n,page in enumerate(pdf):
 text=page.get_text()
 for m in re.finditer(r'\(\s*(MINION|RIVAL|NEMESIS)\s*\)',text):
  lines=text[max(0,m.start()-100):m.start()].splitlines();name=[]
  for line in reversed(lines):
   line=line.strip()
   if line and line==line.upper() and any(c.isalpha() for c in line):name.insert(0,line)
   elif name:break
  heading=' '.join(name)
  candidates=[a for a in actors if key(a['name'])==key(heading) and a['system']['role']==m[1].lower() and a['flags']['genesys-vtt']['adversaryTemplate']['page']==n]
  if len(candidates)!=1:raise ValueError(f'Unmatched source profile: {n} {heading}')
  a=candidates[0];rows.append({'templateId':a['flags']['genesys-vtt']['adversaryTemplate']['id'],'printedPage':n,'pdfPage':n+1,'heading':heading,'role':m[1].lower(),'identityMatch':True})
if len(rows)!=len(actors) or len({r['templateId'] for r in rows})!=len(actors):raise ValueError('Duplicate or extra template')
out={'source':'Realms of Terrinoth, supplied PDF','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'scope':'Complete printed Minion/Rival/Nemesis profile-heading census; identity/page/role coverage. Does not certify every reference ability automated or every statistic correct.','profileCount':len(rows),'templateCount':len(actors),'entries':rows}
Path('docs/terrinoth-source-census-v1888.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(f'PASS: {len(rows)} of {len(actors)} printed adversary profiles matched by independent heading census')
