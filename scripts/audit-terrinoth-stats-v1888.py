"""Independent positioned-word check of every printed characteristic and health table."""
import fitz,json,re,sys
from pathlib import Path
pdf=fitz.open(sys.argv[1]);census=json.loads(Path('docs/terrinoth-source-census-v1888.json').read_text());actors={a['flags']['genesys-vtt']['adversaryTemplate']['id']:a for a in json.loads(Path('data/terrinoth-adversaries.json').read_text())}
checks=[];errors=[]
tables=[]
for pageNo,p in enumerate(pdf):
 for b in p.get_text('blocks'):
  if 'BRAWN' in b[4]:tables.append(((pageNo,int((b[0]+b[2])/2>p.rect.width/2),b[1]),b))
tables.sort(key=lambda pair:pair[0])
for pageNo in sorted({r['printedPage'] for r in census['entries']}):
 p=pdf[pageNo];blocks=p.get_text('blocks');words=p.get_text('words');rows=[r for r in census['entries'] if r['printedPage']==pageNo]
 heads=[b for b in blocks if re.search(r'\(\s*(?:MINION|RIVAL|NEMESIS)\s*\)',b[4])]
 assert len(heads)==len(rows),(pageNo,len(heads),len(rows))
 for row,head in zip(rows,heads):
  headKey=(pageNo,int((head[0]+head[2])/2>p.rect.width/2),head[1])
  match=next(((key,label) for key,label in tables if key>headKey),None)
  if not match:errors.append([row['templateId'],'missing characteristic table']);continue
  tableKey,label=match;statPage=pdf[tableKey[0]];words=statPage.get_text('words');statBlocks=statPage.get_text('blocks');mid=(label[0]+label[2])/2
  values=sorted([w for w in words if re.fullmatch(r'\d+',w[4]) and label[0]-5<=w[0] and w[2]<=label[2]+5 and label[1]-25<w[1]<label[1]-2],key=lambda w:w[0])
  health=sorted([b for b in statBlocks if 'SOAK VALUE' in b[4] and abs((b[0]+b[2])/2-mid)<100 and b[1]>label[1]],key=lambda b:b[1])
  if not health:errors.append([row['templateId'],'missing health table']);continue
  h=health[0];numbers=sorted([w for w in words if re.fullmatch(r'\d+',w[4]) and h[0]-10<=w[0] and w[2]<=h[2]+10 and h[3]<w[1]<h[3]+20],key=lambda w:w[0])
  actual=[int(w[4]) for w in values]+[int(w[4]) for w in numbers]
  a=actors[row['templateId']]['system'];expected=[a['characteristics'][c] for c in ['brawn','agility','intellect','cunning','willpower','presence']]+[a['soak'],a['wounds']['threshold']]+([a['strain']['threshold']] if a['role']=='nemesis' else [])+[a['defense']['melee'],a['defense']['ranged']]
  if actual!=expected:errors.append([row['templateId'],actual,expected])
  else:checks.append({'templateId':row['templateId'],'printedPage':pageNo,'statTablePage':tableKey[0],'matchedValues':len(expected)})
print('Matched',len(checks),'Errors',errors)
if errors:raise SystemExit(1)
Path('docs/terrinoth-stat-audit-v1888.json').write_text(json.dumps({'sourceSha256':census['sha256'],'method':'Positioned words around printed table labels; independent of builder numeric-block parser','profiles':len(checks),'values':sum(r['matchedValues'] for r in checks),'entries':checks},indent=2)+'\n')
