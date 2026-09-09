"""Build NPC data from the supplied PDF. Requires PyMuPDF; no book artwork included."""
import fitz,re,json,hashlib,sys
from pathlib import Path
source=Path(sys.argv[1]); pdf=fitz.open(source)
known_qualities=set(re.findall(r'core\("([^"]+)"', (Path(__file__).resolve().parent.parent/'dist/domain/items/qualities.js').read_text()))
blocks=[]
for i,p in enumerate(pdf):
    split=325 if (i+1)%2 else 280
    rich=p.get_text('dict')['blocks']
    pageblocks=[b for b in p.get_text('blocks') if b[1]>45 and b[3]<713]
    for side in [0,1]:
        for b in sorted([b for b in pageblocks if (b[0]>=split)==bool(side)],key=lambda b:(round(b[1]),b[0])):
            text=re.sub(r'(?m)^S(?:k(?:i)?)?\s*$','',b[4]).strip()
            rb=next((v for v in rich if all(abs(a-c)<0.1 for a,c in zip(v['bbox'],b[:4]))),None)
            for line in (rb or {}).get('lines',[]):
                for span in line['spans']:
                    if 'Icons' in span['font']:
                        label={0x52237f:'Difficulty',0x72cddc:'Boost',0x0:'Setback',0x761213:'Challenge',0xffe800:'Proficiency'}.get(span['color'])
                        if label:text=text.replace(span['text'],'['+label+']',1)
            if re.fullmatch(r'[\d\s]+',text):
                words=[w for w in p.get_text('words') if b[0]-0.1<=w[0] and w[2]<=b[2]+0.1 and b[1]-0.1<=w[1] and w[3]<=b[3]+0.1]
                text=' '.join(w[4] for w in sorted(words,key=lambda w:w[0]))
            blocks.append({'page':i+1,'text':text})
entries=[]
for idx,b in enumerate(blocks):
    t=' '.join(b['text'].split())
    if re.match(r'[A-Z ,^–’\x27-]*\s*\(\s*(MINION|RIVAL|NEMESIS)\s*\)',t):
        name,role=re.match(r'(.*?)\s*\(\s*(MINION|RIVAL|NEMESIS)',t).groups()
        if not name.strip():name=blocks[idx-1]['text'].strip()
        name={'GOLBINS':'SPLIG, KING OF ALL GOBLINS','THIEVES^ GUILD CUTPURSE':'THIEVES’ GUILD CUTPURSE'}.get(name,name)
        entries.append({'name':name.title(),'role':role.lower(),'page':b['page'],'index':idx})
assert len(entries)==79
chars=['brawn','agility','intellect','cunning','willpower','presence']
def slug(s):return re.sub('[^a-z0-9]+','-',s.lower()).strip('-')
def skill(s):
    s=slug(s)
    return {'lore':'knowledge-lore','melee':'melee-light'}.get(s,s)
def clean(t):
    t=re.sub(r'-\s*\n','',t)
    t=re.sub(r'\s+',' ',t)
    t=re.sub(r'S\s*k\s*i\s*l\s*l\s*s','Skills',t)
    return t.strip()
def sections(t):
    return {m[1]:m[2].strip() for m in re.finditer(r'(Skills(?: \(group only\))?|Talents|Abilities|Equipment|Spells):\s*(.*?)(?=(?:Skills(?: \(group only\))?|Talents|Abilities|Equipment|Spells):|$)',t)}
result=[]
for j,e in enumerate(entries):
    end=entries[j+1]['index'] if j+1<len(entries) else len(blocks)
    bs=blocks[e['index']+1:end]
    nums=[(k,list(map(int,re.findall(r'\d+',v['text'])))) for k,v in enumerate(bs) if re.fullmatch(r'[\d\s]+',v['text'])]
    ci,cv=next((k,n) for k,n in nums if len(n)==6)
    hv=next(n for k,n in nums if k>ci and len(n)==(5 if e['role']=='nemesis' else 4))
    # Stop at the next regional heading; only mechanics below the stat table are retained.
    raw='\n'.join(b['text'] for b in bs[ci+1:])
    start=re.search(r'(?:S\s*)?(?:k\s*)?(?:i\s*)?l\s*l\s*s(?=\s*(?:\(|:))',raw)
    assert start,e['name']
    raw='Skills'+raw[start.end():]
    cutoff=re.search(r'\n(?:[A-Z][A-Z ’,\-]{5,})\n',raw)
    if cutoff:raw=raw[:cutoff.start()]
    sec=sections(clean(raw)); skills=[]; issues=[]
    for v in sec.get('Skills',sec.get('Skills (group only)','')).rstrip('. ').split(','):
        v=v.strip().rstrip('.')
        if not v or v=='None':continue
        m=re.fullmatch(r'(.+?)\s+(\d+)',v)
        if e['role']=='minion':skills.append({'id':skill(v),'rank':0,'group':True})
        elif m:skills.append({'id':skill(m[1]),'rank':int(m[2]),'group':False})
        else:
            issues.append(f'Source lists {v} without a rank; left at 0 for GM review.')
            skills.append({'id':skill(v),'rank':0,'group':False})
    if e['name']=='Onoit Shaman':issues.append('Source uses unspecialized Melee 2; mapped to Melee (Light) for its hatchet. GM may change this.')
    talents=sec.get('Talents','None.'); abilities=sec.get('Abilities','None.')
    # Official Genesys FAQ/Errata v1.1 removes Flying Mount Dodge 2.
    if e['name']=='Flying Mount':talents='None.'
    if e['name']=='Gnome Minstrel':talents='Encouraging Song (with an instrument, roll Average Verse; on success choose up to one medium-range target per net Success. Each gains one Boost on its next check. Spend each Advantage to heal one strain on an affected target).'
    equipment=sec.get('Equipment','None.')
    depth=0
    for pos,c in enumerate(equipment):
        if c=='(':depth+=1
        elif c==')':depth-=1
        elif c=='.' and depth==0:
            equipment=equipment[:pos+1];break
    # Long region prose after a finished equipment block is excluded by heading cutoff above.
    itemrows=[]
    for m in re.finditer(r'([^.;()]+?)\s*\((Brawl|Melee(?:\s*[\[(](?:Light|Heavy)[\])])?|Ranged);\s*Damage\s+(\d+);\s*Critical\s+(\d+);\s*Range\s*\[([^\]]+)\](?:[;,]\s*([^)]*))?\)',equipment,re.I):
        name=m[1].strip(' ,');name=re.sub(r'^(?:or|and)\s+','',name,flags=re.I)
        if name.lower()=='or':name=(itemrows[-1]['name'] if itemrows else 'Spear')+' (thrown)'
        qualities=[]
        for q in re.split(r'[,;]',m[6] or ''):
            qm=re.fullmatch(r'\s*([A-Za-z -]+?)\s*(\d+)?\s*',q)
            if qm and slug(qm[1]) in known_qualities:qualities.append({'id':slug(qm[1]),'rank':int(qm[2] or 1)})
        itemrows.append({'name':name.capitalize(),'type':'weapon','system':{'skillId':('melee-heavy' if m[2].lower()=='melee' and e['name'] in ['Giant','Ogre'] else skill(m[2])),'damage':int(m[3]),'damageCharacteristic':'none','critical':int(m[4]),'range':m[5].lower(),'equipped':True,'qualities':qualities,'notes':'Printed total damage; Brawn is already included. Realms of Terrinoth p. '+str(e['page']-1)}})
    if e['name']=='Minor Elemental':
        for weapon in itemrows:weapon.setdefault('flags',{}).setdefault('genesys-vtt',{})['conditionalQualities']=[{'id':'burn','rank':1,'variant':'flame'},{'id':'ensnare','rank':1,'variant':'quicksand'},{'id':'stun','rank':5,'variant':'spring'}]
    # Each talent/ability keeps a source reference; passive printed totals must not be applied twice.
    for label,txt in [('Talents',talents),('Abilities',abilities),('Equipment reference',equipment),('Spells',sec.get('Spells',''))]:
        if txt and txt not in ['None.','None']:
            itemrows.append({'name':label+' — '+e['name'],'type':'gear','system':{'notes':txt,'equipped':False},'flags':{'genesys-vtt':{'adversaryReference':True,'automation':'manual'}}})
    parry=re.search(r'\bParry (\d+)',talents)
    if parry:itemrows.append({'name':'Parry','type':'talent','system':{'sourceId':'core-talent:parry','rank':int(parry[1]),'ranked':True,'activation':'out-of-turn-incidental','enabled':True,'tier':1,'rules':[{'id':'parry-reaction','type':'reaction','timing':'pre-soak','optional':True,'predicate':{'all':['combat','attack:melee','hit','target:wielding-melee-weapon']},'cost':{'strain':3},'effect':{'type':'reduce-damage','amount':2,'amountPerRank':1},'usage':{'limit':1,'period':'hit'},'metadata':{'reactionId':'core-talent:parry'}}],'notes':'Spend 3 strain to reduce a melee hit by 2 + rank before soak.'}})
    adv=re.search(r'\bAdversary (\d+)',talents); sil=re.search(r'\bSilhouette (\d+)',abilities)
    category='People & humanoids'
    if any(k in e['name'] for k in ['Dragon','Wyrm']):category='Dragons'
    if e['name'] in ['Barghest','Death Knight','Lord Of Bilehall','Reanimate','Wraith','Specter','Shade']:category='Undead'
    if e['name'] in ['Beast Of Burden','Flying Mount','Riding Beast','War Mount','Leonx','Gurak Tol','Manticore','Merriod','Giant Snake','Scorpion Swarm']:category='Beasts & mounts'
    if e['name'] in ['Aymhelin Scion','Forest Guardian','Carnivorous Flora']:category='Plants & forest beings'
    if e['name'] in ['Rune Golem','Ironbound']:category='Constructs'
    if e['name'] in ['Minor Elemental','Lava Elemental','Djinn']:category='Elementals'
    if e['name'] in ['True Fae','Dimora']:category='Fae'
    if e['name'] in ['Flesh Ripper','Grotesque','Spined Thresher']:category='Ynfernael creatures'
    if e['name']=='Giant':issues.append('Huge club has Short range in the source. Extended melee reach requires GM adjudication in the current combat workflow.')
    if e['name']=='Orc Outrider':issues.append('The source throwing spear omits a range band; use the equipment reference and set a range manually before adding it as a weapon.')
    sid='rot:'+slug(e['name'])
    system={'role':e['role'],'characteristics':dict(zip(chars,cv)),'wounds':{'value':0,'threshold':hv[1]},'strain':{'value':0,'threshold':hv[2] if len(hv)==5 else 0},'soak':hv[0],'defense':{'melee':hv[-2],'ranged':hv[-1]},'silhouette':int(sil[1]) if sil else 1,'adversaryRank':int(adv[1]) if adv else 0,'extraActivations':0,'minionGroup':{'members':1,'memberWoundThreshold':hv[1],'casualties':0,'groupSkillIds':[s['id'] for s in skills if s['group']]},'skills':[{'id':s['id'],'rank':s['rank'],'career':False,'sourceId':sid} for s in skills],'profile':{'notes':'Realms of Terrinoth p. '+str(e['page']-1)+'. Printed totals. See reference Items for manual abilities/spells. '+ ' '.join(issues)}}
    result.append({'_id':hashlib.sha256(sid.encode()).hexdigest()[:16],'name':e['name'],'type':'character','img':'icons/svg/mystery-man.svg','system':system,'items':itemrows,'flags':{'genesys-vtt':{'rulesProfile':'realms-of-terrinoth','adversaryTemplate':{'id':sid,'origin':'Realms of Terrinoth','page':e['page']-1,'pdfPage':e['page'],'category':category,'revision':1,'reviewNotes':issues}}}})
Path('data').mkdir(exist_ok=True)
for actor in result:
    source=actor['flags']['genesys-vtt']['adversaryTemplate']
    actor['flags']['genesys-vtt']['sourceReference']={'sourceId':source['id'],'book':'realms-of-terrinoth','page':source['page'],'category':'adversary','version':'Official book + FAQ v1.1'}
    if source['id']=='rot:specter': actor['name']='Dwarf Ancestral Specter'
    for item in actor['items']:
        item['system']['provenance']={'sourceId':source['id'],'sourceType':'realms-of-terrinoth','sourceVersion':'RoT + FAQ v1.1','settingId':'realms-of-terrinoth'}
        item.setdefault('flags',{}).setdefault('genesys-vtt',{})['sourcePage']=source['page']
out=json.dumps(result,ensure_ascii=False,indent=2)
for code,label in [(0xf22b0,'Failure'),(0xf22b1,'Threat'),(0xf22b2,'Despair'),(0xf22b3,'Success'),(0xf22b4,'Advantage'),(0xf22b5,'Triumph')]:out=out.replace(chr(code),'['+label+']')
Path('data/terrinoth-adversaries.json').write_text(out+'\n')
print('Built',len(result),'templates;',sum(len([i for i in a['items'] if i['type']=='weapon']) for a in result),'weapons')
for a in result:
    if a['flags']['genesys-vtt']['adversaryTemplate']['reviewNotes']:print(a['name'],a['flags']['genesys-vtt']['adversaryTemplate']['reviewNotes'])
