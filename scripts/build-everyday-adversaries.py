"""Original GM starting points, not official Terrinoth statblocks."""
import json,hashlib
from pathlib import Path
# name, Swedish search terms, category, role, characteristics, wounds, strain, soak, skills, weapon
rows=[
('Farmer','bonde lantbrukare','Townsfolk','minion',[2,2,2,2,2,2],5,0,2,{'athletics':0,'resilience':0},None),
('Villager','bybo civil','Townsfolk','minion',[2,2,2,2,2,2],4,0,2,{'cool':0},None),
('Laborer','arbetare hamnarbetare','Townsfolk','minion',[3,2,1,2,2,1],6,0,3,{'athletics':0,'resilience':0},None),
('Merchant','handlare köpman','Townsfolk','rival',[2,2,3,3,2,3],10,0,2,{'negotiation':2,'deception':1,'charm':1},None),
('Innkeeper','värdshusvärd krögare','Townsfolk','rival',[2,2,2,3,2,3],11,0,2,{'charm':2,'negotiation':1,'perception':1},None),
('Blacksmith','smed hantverkare','Townsfolk','rival',[3,2,3,2,2,2],12,0,3,{'mechanics':2,'athletics':1,'resilience':1},('Hammer','melee-light',5,4)),
('Artisan','hantverkare snickare','Townsfolk','rival',[2,2,3,2,2,2],10,0,2,{'mechanics':2,'negotiation':1},None),
('Healer','läkare helare','Townsfolk','rival',[2,2,3,2,3,2],10,0,2,{'medicine':2,'discipline':1},None),
('Scholar','lärd forskare','Townsfolk','rival',[1,2,4,2,2,2],9,0,1,{'knowledge-lore':2,'knowledge-geography':1},None),
('Noble','adelsman adelsdam','Townsfolk','rival',[2,2,3,2,2,3],11,0,2,{'leadership':1,'charm':2,'negotiation':1},None),
('Town Guard','stadsvakt vakt','Guards & Soldiers','minion',[3,2,2,2,2,2],5,0,4,{'melee-light':0,'vigilance':0},('Sword','melee-light',6,3)),
('Militia','milis byvakt','Guards & Soldiers','minion',[2,2,2,2,2,2],5,0,3,{'melee-light':0},('Spear','melee-light',5,3)),
('Soldier','soldat infanteri','Guards & Soldiers','minion',[3,2,2,2,2,2],6,0,5,{'melee-heavy':0,'discipline':0,'resilience':0},('Greatsword','melee-heavy',7,3)),
('Archer','bågskytt','Guards & Soldiers','minion',[2,3,2,2,2,2],5,0,3,{'ranged':0,'vigilance':0},('Bow','ranged',6,3)),
('Scout','spejare spanare','Guards & Soldiers','rival',[2,3,2,3,2,2],12,0,3,{'ranged':2,'stealth':2,'survival':2,'perception':1},('Bow','ranged',6,3)),
('Veteran','veteran erfaren soldat','Guards & Soldiers','rival',[3,3,2,2,3,2],16,0,5,{'melee-light':3,'discipline':2,'vigilance':2},('Sword','melee-light',6,3)),
('Guard Captain','vaktkapten befäl','Guards & Soldiers','nemesis',[3,3,2,3,3,3],18,14,5,{'melee-light':3,'leadership':3,'discipline':2,'vigilance':2},('Sword','melee-light',6,3)),
('Bandit','bandit rövare','Outlaws','minion',[2,2,2,2,2,2],5,0,3,{'melee-light':0,'coercion':0},('Club','melee-light',4,4)),
('Thief','tjuv ficktjuv','Outlaws','rival',[2,3,2,3,2,2],10,0,2,{'skulduggery':2,'stealth':2,'deception':1},('Dagger','melee-light',3,3)),
('Smuggler','smugglare','Outlaws','rival',[2,3,2,3,2,3],12,0,3,{'deception':2,'negotiation':2,'skulduggery':1},('Dagger','melee-light',3,3)),
('Bandit Leader','rövarhövding banditledare','Outlaws','nemesis',[3,3,2,3,3,3],18,13,4,{'melee-light':3,'coercion':2,'leadership':2,'deception':2},('Sword','melee-light',6,3)),
('Court Mage','hovmagiker magiker','Specialists','nemesis',[1,2,4,3,3,3],12,18,1,{'arcana':3,'knowledge-lore':3,'discipline':2},None)]
out=[]
for name,aliases,category,role,cs,w,st,soak,skills,weapon in rows:
 sid='custom:'+name.lower().replace(' ','-');items=[]
 if weapon:
  wn,sk,dmg,crit=weapon;items=[{'name':wn,'type':'weapon','system':{'skillId':sk,'damage':dmg,'damageCharacteristic':'none','critical':crit,'range':'medium' if sk=='ranged' else 'engaged','equipped':True,'qualities':[]}}]
 out.append({'_id':hashlib.sha256(sid.encode()).hexdigest()[:16],'name':name,'type':'character','img':'icons/svg/mystery-man.svg','system':{'role':role,'characteristics':dict(zip(['brawn','agility','intellect','cunning','willpower','presence'],cs)),'wounds':{'value':0,'threshold':w},'strain':{'value':0,'threshold':st},'soak':soak,'defense':{'melee':0,'ranged':0},'silhouette':1,'adversaryRank':1 if role=='nemesis' else 0,'extraActivations':0,'minionGroup':{'members':1,'memberWoundThreshold':w,'casualties':0,'groupSkillIds':list(skills) if role=='minion' else []},'skills':[{'id':k,'rank':v,'career':False,'sourceId':sid} for k,v in skills.items()],'profile':{'notes':'Original Genesys GM template. Not an official book statblock. Adjust skills, gear and abilities for the individual.'}},'items':items,'flags':{'genesys-vtt':{'rulesProfile':'realms-of-terrinoth','adversaryTemplate':{'id':sid,'origin':'Custom Genesys','category':category,'aliases':aliases,'revision':1}}}})
Path('data/everyday-adversaries.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Built',len(out),'original templates')
