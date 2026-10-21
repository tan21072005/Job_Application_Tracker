"""Original editable JobTrack diagrams. No upstream artwork is copied."""
from pathlib import Path
import xml.etree.ElementTree as E
import importlib.util
import json

OUT=Path(__file__).resolve().parent/'diagrams'
OUT.mkdir(exist_ok=True)
mx=E.Element('mxfile',host='drawio',type='device',version='29.0.3')
COLORS={'client':('#dae8fc','#6c8ebf'),'service':('#ffe6cc','#d79b00'),'data':('#d5e8d4','#82b366'),'ops':('#e1d5e7','#9673a6'),'neutral':('#f5f5f5','#666666')}

class Page:
 def __init__(self,name,pid,height=1000):
  self.d=E.SubElement(mx,'diagram',id=pid,name=name)
  m=E.SubElement(self.d,'mxGraphModel',page='1',pageScale='1',pageWidth='1440',pageHeight=str(height),grid='1',gridSize='10',background='#ffffff')
  self.root=E.SubElement(m,'root');E.SubElement(self.root,'mxCell',id='0');E.SubElement(self.root,'mxCell',id='1',parent='0')
  self.n=1
  self.text(40,20,1360,50,name,28)
 def text(self,x,y,w,h,value,size=16):
  self.n+=1;id=f't{self.n}'
  c=E.SubElement(self.root,'mxCell',id=id,value=value,style=f'text;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;fontFamily=Arial;fontSize={size};fontColor=#243943;',vertex='1',parent='1')
  E.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
  return id
 def box(self,id,x,y,value,role='service',w=240,h=120):
  fill,stroke=COLORS[role]
  c=E.SubElement(self.root,'mxCell',id=id,value=value,style=f'rounded=1;arcSize=8;whiteSpace=wrap;html=1;fontFamily=Arial;fontSize=18;fontColor=#243943;fillColor={fill};strokeColor={stroke};spacing=14;',vertex='1',parent='1')
  E.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
  return id
 def edge(self,s,t,label='',sx=1,sy=.5,tx=0,ty=.5,dashed=False,points=()):
  self.n+=1
  style=f'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;fontFamily=Arial;fontSize=14;fontColor=#243943;labelBackgroundColor=#ffffff;endArrow=block;exitX={sx};exitY={sy};entryX={tx};entryY={ty};'
  if dashed:style+='dashed=1;'
  c=E.SubElement(self.root,'mxCell',id=f'e{self.n}',value=label,style=style,edge='1',parent='1',source=s,target=t)
  geo=E.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
  if points:
   arr=E.SubElement(geo,'Array',attrib={'as':'points'})
   for x,y in points:E.SubElement(arr,'mxPoint',x=str(x),y=str(y))
 def legend(self,y):
  for i,(role,label) in enumerate([('client','Client / frontend'),('service','API / service'),('data','Data store'),('ops','Operations')]):
   self.box('legend-'+role,40+i*340,y,label,role,w=280,h=50)

p=Page('01 · Hiện trạng đã kiểm tra','current')
p.text(40,80,1340,60,'ĐÃ CÓ: 5 React entry + shared core + localStorage demo. Backend/database thật chưa tồn tại.',18)
p.box('browser',80,190,'Desktop / mobile browser','client')
p.box('ui',80,440,'Dossier · Rhythm · Atlas\nWorkbench · Index','client',w=300,h=150)
p.box('core',550,440,'jobtrack-core\ndomain + repository + React hook','service',w=320,h=150)
p.box('local',1050,260,'localStorage\nsynthetic preview data','data',w=300)
p.box('contract',1050,550,'/api adapter + API.md\nCONTRACT ONLY\nNo running backend','neutral',w=300,h=150)
p.edge('browser','ui','render',.5,1,.5,0)
p.edge('ui','core','headless logic / data')
p.edge('core','local','demo',1,.25,0,.5)
p.edge('core','contract','api mode chưa nghiệm thu',1,.8,0,.5,True)
p.legend(850)

p=Page('02 · Kiến trúc đích cho cả năm giao diện','target')
p.text(40,80,1360,60,'ĐỀ XUẤT · One origin, one modular monolith, one PostgreSQL. Chưa triển khai production.',18)
p.box('browser2',60,350,'Browser\n5 UI / cùng cookie','client',w=240)
p.box('edge2',410,350,'HTTPS edge\nstatic + /api reverse proxy','service',w=260)
p.box('api2',780,350,'Express / TypeScript\nAuth · Apps · Rounds\nDashboard','service',w=280,h=150)
p.box('pg2',1160,350,'PostgreSQL\nconstraints + transactions','data',w=240,h=150)
p.box('static2',410,160,'Vite static artifacts\nhashed assets','client',w=260)
p.box('obs2',780,670,'Logs / metrics / health\nredacted, requestId','ops',w=280)
p.box('backup2',1160,670,'Encrypted backups\nrestore drills','ops',w=240)
p.edge('browser2','edge2','HTTPS')
p.edge('edge2','static2','static files',.5,0,.5,1)
p.edge('edge2','api2','/api JSON')
p.edge('api2','pg2','SQL')
p.edge('api2','obs2','telemetry',.5,1,.5,0)
p.edge('pg2','backup2','daily / target RPO 24h',.5,1,.5,0)
p.legend(900)

p=Page('03 · Ranh giới backend được đề xuất','modules',1100)
p.text(40,80,1320,60,'Module = ranh giới trong cùng tiến trình. Controller → Service → Repository; không HTTP giữa các module.',18)
p.box('ingress3',80,180,'HTTP request\nfrom shared adapter','client')
p.box('middleware3',540,180,'Origin · auth · DTO\nrequestId · limiter','service',w=300)
p.box('routing3',1080,180,'Controllers\nHTTP ↔ DTO','service',w=260)
for id,x,label in [('auth3',60,'Auth Service\nArgon2id / JWT / session'),('app3',400,'Application Service\nowner / identity / version'),('round3',740,'Interview Service\natomic parent status'),('dash3',1080,'Dashboard Service\nowner + one asOf')]:
 p.box(id,x,470,label,'service',w=260,h=140)
p.box('repo3',550,790,'Owned Repositories + pg client\nwithTransaction / injected clock','data',w=380,h=150)
p.edge('ingress3','middleware3','')
p.edge('middleware3','routing3','validated context')
for i,id in enumerate(['auth3','app3','round3','dash3']):
 p.edge('routing3',id,'dispatch',.15+i*.2,1,.5,0,points=[(1120+i*40,390),(190+i*340,390)])
 p.edge(id,'repo3','same tx client',.5,1,.15+i*.22,0)
p.text(40,1000,1320,60,'Backend không import hook/localStorage. Interview ghi round và application trong cùng transaction. Mọi repository cần userId.',18)

p=Page('04 · Mô hình dữ liệu đích','erd',1300)
p.text(40,80,1320,50,'SQL ứng viên: schema.sql · ownership qua applications.user_id · version trên aggregate application.',18)
p.box('users4',570,160,'users\nPK id\nemail / email_normalized UNIQUE\npassword_hash · created_at','data',w=310,h=200)
p.box('apps4',70,500,'applications\nPK id · FK user_id\ncompany · position · status\nurl / normalized_url\nsource / code + normalized keys\napplied_at (date)\nnext_action · deadline_at\nnotes · salary · location\nversion · timestamps','data',w=370,h=350)
p.box('round4',70,1000,'interviews\nPK id · FK application_id\nat (timestamptz) + IANA timezone\nformat · preparation · notes\nScheduled / Completed / Cancelled','data',w=370,h=220)
p.box('sessions4',1030,160,'sessions\nPK id (JWT sid) · FK user_id\nexpires_at · revoked_at','data',w=330,h=200)
p.box('idem4',1030,540,'idempotency_requests\nPK (user_id, scope, key)\nrequest_hash · response_body\nresponse_status · expires_at','data',w=330,h=230)
p.edge('users4','apps4','1 → n',.25,1,.5,0,points=[(650,430),(250,430)])
p.edge('apps4','round4','1 → n · ON DELETE CASCADE',.5,1,.5,0)
p.edge('users4','sessions4','1 → n')
p.edge('users4','idem4','1 → n',.8,1,.5,0,points=[(820,430),(1190,430)])
p.text(540,850,840,220,'Hai partial UNIQUE theo owner + identity active.\nService: terminal reapply confirmation, owner/version validation.\nSession không chứa password/JWT raw.\nDB không tự xác thực timezone hoặc toàn bộ URL policy.',18)

p=Page('05 · Deployment và độ bền đề xuất','deployment',1100)
p.text(40,80,1320,60,'MVP: một API + một PostgreSQL có điểm lỗi đơn. Không xem sơ đồ này là bằng chứng đã deploy.',18)
for id,x,label,role in [('dev5',70,'Commit / pull request','client'),('ci5',560,'CI build + tests\ncontract validation','ops'),('art5',1050,'Versioned artifacts\nstaging acceptance','ops')]:p.box(id,x,190,label,role,w=300,h=130)
for id,x,label,role in [('db5',70,'Private PostgreSQL\npool / constraints','data'),('api5',560,'Private API process\nreadiness + graceful stop','service'),('edge5',1050,'Public HTTPS edge\nstatic files + /api','service')]:p.box(id,x,520,label,role,w=300,h=130)
p.box('backup5',70,850,'Encrypted backup storage\nrestore / RPO / RTO drill','ops',w=300)
p.box('monitor5',560,850,'Redacted telemetry\nlatency / lock / errors','ops',w=300)
p.edge('dev5','ci5','')
p.edge('ci5','art5','checks pass')
p.edge('art5','edge5','controlled release',.5,1,.5,0)
p.edge('edge5','api5','/api',0,.5,1,.5)
p.edge('api5','db5','SQL over private network',0,.5,1,.5)
p.edge('db5','backup5','backup',.5,1,.5,0)
p.edge('api5','monitor5','metrics / logs',.5,1,.5,0)

# Use the shipped sequence generator for deterministic lifeline geometry.
skill=Path('C:/Users/Admin/.agents/skills/drawio-skill/scripts/seqlayout.py')
spec=importlib.util.spec_from_file_location('jobtrack_sequence_layout',skill)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
mod.MIN_SPACING=400
mod.RETURN=mod.RETURN.replace('#999999','#526571')
parts=[{'id':'client','label':'Frontend adapter'},{'id':'http','label':'API middleware'}, {'id':'service','label':'Owned service'},{'id':'db','label':'PostgreSQL'}]
seqs=[('06 · Create, duplicate và retry','create-sequence',[
 ('client','http','POST /applications + same Idempotency-Key'),
 ('http','service','Validated session / Origin / DTO'),
 ('service','db','BEGIN; session FOR SHARE; owner FOR UPDATE'),
 ('service','db','Lookup scoped key/hash; replay before writing'),
 ('service','db','Check active OR identity; terminal needs confirmation'),
 ('service','db','INSERT application + saved 201 response; COMMIT'),
 ('db','service','COMMIT acknowledged',True),
 ('service','http','Committed result',True),('http','client','201 application; retry returns original response',True),
 ]),('07 · Interview và status cùng transaction','interview-sequence',[
 ('client','http','POST round + parent If-Match + Idempotency-Key'),
 ('http','service','Validated owner / at / IANA'),
 ('service','db','BEGIN; session lock then owner lock'),
 ('service','db','Replay check; owned parent + version check'),
 ('service','db','INSERT round; sync status except terminal/Offer'),
 ('service','db','Increment parent version + idempotency result; COMMIT'),
 ('db','service','COMMIT acknowledged',True),
 ('service','http','Committed round + applicationVersion',True),
 ('http','client','201; invalidate parent/list/dashboard',True),
 ])]
for name,id,messages in seqs:
 inp={'title':name,'participants':parts,'messages':[{'from':m[0],'to':m[1],'label':m[2],**({'return':True} if len(m)>3 else {})} for m in messages]}
 (OUT/(id+'.json')).write_text(json.dumps(inp,ensure_ascii=False,indent=2),encoding='utf-8')
 diag=E.fromstring(mod.layout(inp)).find('diagram');diag.set('id',id)
 model=diag.find('mxGraphModel');model.set('pageWidth','1600');model.set('pageHeight','900')
 mx.append(diag)

E.indent(mx,space='  ')
path=OUT/'JobTrack-System-Design.drawio'
E.ElementTree(mx).write(path,encoding='utf-8',xml_declaration=True)
# Minimal single-page source for a bounded native preview render.
mini=E.Element('mxfile');mini.append(E.fromstring(E.tostring(mx.findall('diagram')[1])))
E.ElementTree(mini).write(OUT/'target-preview.drawio',encoding='utf-8',xml_declaration=True)
print(f'Wrote {path.name}: {len(mx.findall("diagram"))} editable pages')
