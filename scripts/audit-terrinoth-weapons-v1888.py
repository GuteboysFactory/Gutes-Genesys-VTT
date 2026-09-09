"""Compare printed weapon skill, total damage, Critical and range against each Actor's native profiles."""
import fitz,json,re,sys
from pathlib import Path
pdf=fitz.open(sys.argv[1]);census=json.loads(Path('docs/terrinoth-source-census-v1888.json').read_text());actors={a['flags']['genesys-vtt']['adversaryTemplate']['id']:a for a in json.loads(Path('data/terrinoth-adversaries.json').read_text())}
flow=[];heads=[]
for n,page in enumerate(pdf):
 rows=[r for r in census['entries'] if r['printedPage']==n];roleBlocks=[b for b in page.get_text('blocks') if re.search(r'\(\s*(?:MINION|RIVAL|NEMESIS)\s*\)',b[4])]
 for row,b in zip(rows,roleBlocks):heads.append(((n,int((b[0]+b[2])/2>page.rect.width/2),b[1]),row))
 for b in page.get_text('blocks'):
  if b[1]>48 and b[3]<718:flow.append(((n,int((b[0]+b[2])/2>page.rect.width/2),b[1]),re.sub(r'(?m)^S(?:k(?:i)?)?\s*$','',b[4])))
flow.sort(key=lambda x:x[0]);heads.sort(key=lambda x:x[0]);errors=[];entries=[];skillChecks=[];referenceChecks=[];referenceErrors=[];qualityChecks=[]
for index,(key,row) in enumerate(heads):
 end=heads[index+1][0] if index+1<len(heads) else (999,0,0)
 text=' '.join(t for pos,t in flow if key<pos<end);text=re.sub(r'-\s*\n','',text);text=' '.join(text.split());text=re.sub(r'Crit\s*ical|Criti\s*cal','Critical',text)
 text=re.sub(r'S\s*k\s*i\s*l\s*l\s*s','Skills',text)
 skillMatch=re.search(r'(?:S\s*)?(?:k\s*)?(?:i\s*)?l\s*l\s*s(?: \(group only\))?:\s*(.*?)(?=Talents:|Abilities:|Equipment:|Spells:)',text)
 if skillMatch:
  sourceSkills=[]
  for value in skillMatch[1].split('.',1)[0].strip().split(','):
   value=value.strip().rstrip('.')
   if not value or value=='None':continue
   m=re.fullmatch(r'(.+?)\s+(\d+)',value)
   name,rank=(m[1],int(m[2])) if m and row['role']!='minion' else (value,0)
   name=re.sub('[^a-z0-9]+','-',name.lower()).strip('-');name={'lore':'knowledge-lore','melee':'melee-light'}.get(name,name)
   sourceSkills.append((name,rank))
  nativeSkills=[(s['id'],s['rank']) for s in actors[row['templateId']]['system']['skills']]
  if sorted(sourceSkills)!=sorted(nativeSkills):errors.append(('skills',row['templateId'],sourceSkills,nativeSkills))
  else:skillChecks.append({'templateId':row['templateId'],'skills':len(nativeSkills)})
 else:errors.append(('skills',row['templateId'],'missing skills section',text[:800] if row['templateId']=='rot:beast-of-burden' else ''))
 sourceText=text
 def compact(value):
  for code,label in [(0xf22b0,'Failure'),(0xf22b1,'Threat'),(0xf22b2,'Despair'),(0xf22b3,'Success'),(0xf22b4,'Advantage'),(0xf22b5,'Triumph')]:value=value.replace(chr(code),'['+label+']')
  value=re.sub(r'\[(?:Boost|Setback|Difficulty|Challenge|Proficiency|Ability)\]','',value)
  return re.sub(r'[^a-z0-9]','',value.lower())
 for item in actors[row['templateId']]['items']:
  if item['type']=='weapon' or item['type']=='talent':continue
  note=item['system'].get('notes','')
  if compact(note) in compact(sourceText):referenceChecks.append({'templateId':row['templateId'],'item':item['name'],'status':'source-text-checked-dice-glyphs-excluded'})
  elif row['templateId']=='rot:gnome-minstrel' and item['name'].startswith('Talents'):referenceChecks.append({'templateId':row['templateId'],'item':item['name'],'status':'official-faq-override'})
  else:referenceErrors.append({'templateId':row['templateId'],'item':item['name'],'note':note,'source':sourceText})
 if 'Equipment:' in text:
  text=text.split('Equipment:',1)[1]
  depth=0
  for pos,char in enumerate(text):
   depth+=int(char=='(')-int(char==')')
   if char=='.' and depth==0:text=text[:pos+1];break
 found=[];sourceQualityRows=[]
 for m in re.finditer(r'\((Brawl|Melee(?:\s*[\[(](Light|Heavy)[\])])?|Ranged);\s*Damage\s+(\d+);\s*Critical\s+(\d+);\s*Range\s*\[([^\]]+)\]',text,re.I):
  skill=m[1].lower();skill='melee-heavy' if skill=='melee' and actors[row['templateId']]['name'] in ['Giant','Ogre'] else 'melee-light' if skill=='melee' else re.sub('[^a-z]+','-',skill).strip('-')
  found.append((skill,int(m[3]),int(m[4]),m[5].lower()))
  sourceQualityRows.append(text[m.end():].split(')',1)[0].replace('Concus sive','Concussive'))
 nativeWeapons=[i for i in actors[row['templateId']]['items'] if i['type']=='weapon']
 for weapon,tail in zip(nativeWeapons,sourceQualityRows):
  native={q['id']:q.get('rank',1) for q in weapon['system']['qualities']}
  parsed={}
  for quality in ['accurate','auto-fire','blast','breach','burn','concussive','cumbersome','defensive','deflection','disorient','ensnare','inaccurate','knockdown','limited-ammo','linked','pierce','prepare','slow-firing','stun-damage','stun','sunder','superior','unwieldy','vicious']:
   pattern=r'(?<![a-z])'+re.escape(quality).replace(r'\-',r'[- ]')+r'(?![a-z])'+(r'(?! Damage)' if quality=='stun' else '')+r'(?:\s+(\d+))?'
   match=re.search(pattern,tail,re.I)
   if match:parsed[quality]=int(match[1] or 1)
  conditional=weapon.get('flags',{}).get('genesys-vtt',{}).get('conditionalQualities',[])
  for q in conditional:
   if parsed.get(q['id'])!=q['rank'] or q['variant']+' elemental only' not in tail:errors.append(('conditional-quality',row['templateId'],q,tail))
   parsed.pop(q['id'],None)
  if native!=parsed:errors.append(('qualities',row['templateId'],weapon['name'],native,parsed,tail))
  else:qualityChecks.append({'templateId':row['templateId'],'weapon':weapon['name'],'qualities':len(native)})
 actual=[(w['system']['skillId'],w['system']['damage'],w['system']['critical'],w['system']['range']) for w in actors[row['templateId']]['items'] if w['type']=='weapon']
 if sorted(found)!=sorted(actual):errors.append((row['templateId'],found,actual,text[:1000]))
 else:entries.append({'templateId':row['templateId'],'weaponProfiles':len(actual)})
Path('/tmp/v1888-reference-errors.json').write_text(json.dumps(referenceErrors,indent=2));print('Matched',len(entries),'Errors',errors,'Reference matches',len(referenceChecks),'reference mismatches',len(referenceErrors))
if errors or referenceErrors:raise SystemExit(1)
Path('docs/terrinoth-weapon-audit-v1888.json').write_text(json.dumps({'sourceSha256':census['sha256'],'scope':'Printed skill IDs/ranks and explicit weapon skill, total damage, Critical and range tuples; source missing range/rank is preserved as a documented GM decision','profiles':len(entries),'weapons':sum(e['weaponProfiles'] for e in entries),'entries':entries,'skillChecks':skillChecks,'skills':sum(e['skills'] for e in skillChecks),'referenceChecks':referenceChecks,'referenceMismatchCount':len(referenceErrors),'qualityChecks':qualityChecks,'qualityRatings':sum(r['qualities'] for r in qualityChecks)},indent=2)+'\n')
