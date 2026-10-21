"""Generate the proposed OpenAPI contract. This does not implement an API server."""
from pathlib import Path
import json

OUT = Path(__file__).resolve().parent
statuses = ['Saved','Applied','Screening','Interview','Offer','Rejected','Withdrawn']
round_states = ['Scheduled','Completed','Cancelled']
def ref(name): return {'$ref': '#/components/schemas/' + name}
def string(maximum=250, **kw): return {'type':'string','maxLength':maximum,**kw}
def obj(props, required=(), **kw): return {'type':'object','properties':props,'required':list(required),'additionalProperties':False,**kw}
instant = {'type':'string','format':'date-time','pattern':r'(Z|[+-]\d{2}:\d{2})$'}
date = {'anyOf':[{'type':'string','format':'date'},{'type':'string','maxLength':0}]}
draft = {k:string() for k in ['company','position','location','salary','nextAction']}
draft['company']['minLength']=1; draft['position']['minLength']=1
draft.update(url=string(2000),source=string(128),jobCode=string(128),
             workMode={'type':'string','enum':['','On-site','Hybrid','Remote']},
             appliedAt=date,notes=string(5000),
             deadline={'anyOf':[instant,{'type':'null'}]},
             status={'type':'string','enum':statuses,'default':'Saved'})
interview = {'title':string(200,minLength=1,default='Phỏng vấn'),'at':instant,
             'timezone':string(100,description='Server-validated IANA identifier; UTC accepted.'),
             'format':{'type':'string','enum':['Online','Phone','On-site','Other'],'default':'Online'},
             'location':string(2000),'preparation':string(5000),'notes':string(5000),
             'status':{'type':'string','enum':round_states,'default':'Scheduled'}}
schemas = {
 'ApplicationStatus':{'type':'string','enum':statuses},
 'InterviewStatus':{'type':'string','enum':round_states},
 'Credentials':obj({'email':string(254,format='email'),'password':string(64,minLength=15,format='password',writeOnly=True)},['email','password']),
 'LoginCredentials':obj({'email':string(254,format='email'),'password':string(64,minLength=1,format='password',writeOnly=True)},['email','password']),
 'UserSession':obj({'user':obj({'id':string(36,format='uuid'),'email':string(254,format='email')},['id','email']),
                    'expiresAt':instant},['user','expiresAt']),
 'InterviewWrite':obj(interview,['at','timezone']),
 'InterviewPatch':obj(interview,(),minProperties=1),
 'InterviewRead':obj({**interview,'id':string(36,format='uuid'),'applicationVersion':{'type':'integer','minimum':1}},list(interview)+['id','applicationVersion']),
 'ApplicationCreate':obj({**draft,'confirmReapply':{'type':'boolean','default':False}},['company','position']),
 'ApplicationPatch':obj(draft,(),minProperties=1),
 'ApplicationRead':obj({**draft,'id':string(36,format='uuid'),'createdAt':instant,'updatedAt':instant,
                        'version':{'type':'integer','minimum':1},'interviews':{'type':'array','items':ref('InterviewRead')}},list(draft)+['id','createdAt','updatedAt','version','interviews']),
 'ApplicationPage':obj({'items':{'type':'array','items':ref('ApplicationRead')},
                        'nextCursor':{'type':['string','null']},'hasMore':{'type':'boolean'}},['items','nextCursor','hasMore']),
 'Dashboard':obj({'total':{'type':'integer','minimum':0},'upcoming':{'type':'integer','minimum':0},
                   'offers':{'type':'integer','minimum':0},'response':{'type':'number','minimum':0,'maximum':100},
                   'asOf':instant},['total','upcoming','offers','response','asOf']),
 'Error':obj({'code':string(80),'message':string(500),'requestId':string(100),
               'fields':{'type':'object','additionalProperties':{'type':'string'}},
               'existing':ref('ApplicationRead')},['code','message','requestId'])
}
def response(description, schema=None, headers=None):
    value={'description':description}
    if schema: value['content']={'application/json':{'schema':schema}}
    if headers: value['headers']=headers
    return value
def param(name, where, schema, required=False, description=''):
    return {'name':name,'in':where,'required':required,'schema':schema,'description':description}
identity=param('id','path',string(36,format='uuid'),True,'Application or interview ID, resolved within current owner.')
match=param('If-Match','header',{'type':'string','pattern':r'^"app:[0-9a-fA-F-]{36}:v[1-9][0-9]*"$'},True,
            'ETag of the parent application. Required for all aggregate mutations except new application.')
key=param('Idempotency-Key','header',string(36,format='uuid'),True,'Reuse for unchanged retry; new body/reapply requires new key. 24h retention.')
filters=[param('q','query',string(250)),param('status','query',{'type':'string','enum':['all']+statuses,'default':'all'})]
sort=param('sort','query',{'type':'string','enum':['created-desc','created-asc','applied-desc','applied-asc'],'default':'created-desc'})
etag={'ETag':{'schema':{'type':'string'},'description':'Parent aggregate ETag: "app:<uuid>:v<version>"'}}
replay={'Idempotency-Replayed':{'schema':{'type':'boolean'},'description':'True when returning a previously committed create response.'}}
paths={}
def operation(path,method,operation_id,summary,success_code,success_schema=None,body=None,parameters=(),public=False,description=''):
    available={
      '400':'Validation failure','401':'No valid session','403':'Origin rejected',
      '404':'Missing or not owned','409':'Active duplicate or reapply confirmation required',
      '412':'Parent aggregate changed; preserve draft and reload',
      '422':'Idempotency key reused with different request',
      '428':'Required If-Match missing','429':'Rate limit','503':'Dependency unavailable; no partial success'}
    codes=['400','429','503']
    if not public: codes+=['401']
    if method!='get': codes+=['403']
    if '{id}' in path: codes+=['404']
    if path.startswith('/applications') and method in ['post','patch'] and 'interviews' not in path: codes+=['409']
    if match in parameters: codes+=['412','428']
    if key in parameters: codes+=['422']
    if path=='/auth/login': codes+=['401']
    errors={c:response(available[c],ref('Error')) for c in dict.fromkeys(codes)}
    errors['429']['headers']={'Retry-After':{'schema':{'type':'integer','minimum':1}}}
    headers={}
    if success_schema==ref('ApplicationRead'): headers.update(etag)
    if method=='post' and '/auth/' not in path: headers.update(replay)
    if path in ['/auth/register','/auth/login']:
        headers['Set-Cookie']={'schema':{'type':'string'},'description':'HttpOnly, SameSite=Lax, Secure in HTTPS production. JWT and server-revocable sid.'}
    errors[success_code]=response('Success after transaction commit',success_schema,headers or None)
    value={'operationId':operation_id,'summary':summary,'description':description,
           'tags':['Auth' if path.startswith('/auth') else 'Dashboard' if path=='/dashboard' else 'Applications' if 'interviews' not in path else 'Interviews'],
           'security':[] if public else [{'cookieSession':[]}],
           'parameters':list(parameters),'responses':errors}
    if body: value['requestBody']={'required':True,'content':{'application/json':{'schema':ref(body)}}}
    paths.setdefault(path,{})[method]=value

operation('/auth/register','post','register','Register and immediately establish a session','201',ref('UserSession'),'Credentials',public=True,
          description='FR-01/UC-01 source wins over the earlier frontend manual-login flow. Exact Origin required; generic registration failure avoids email enumeration.')
operation('/auth/login','post','login','Authenticate and establish a revocable session','200',ref('UserSession'),'LoginCredentials',public=True)
operation('/auth/me','get','getSession','Read session without exposing JWT to JavaScript','200',ref('UserSession'))
operation('/auth/logout','post','logout','Revoke current sid and expire cookie; missing/expired cookie also succeeds','204',public=True)
operation('/applications','get','listApplications','Compatibility full list for the current owner','200',{'type':'array','items':ref('ApplicationRead')},parameters=filters+[sort],
          description='No pagination envelope here. Includes interview arrays; dashboard uses unfiltered owner data. No-store.')
operation('/applications/page','get','pageApplications','Future keyset list, created-desc only','200',ref('ApplicationPage'),parameters=filters+[
 param('after','query',string(512),description='Opaque createdAt/id cursor, not an authorization token.'),
 param('limit','query',{'type':'integer','minimum':1,'maximum':100,'default':50})],
 description='Do not switch current five interfaces until they can combine pages and obtain global overview separately.')
operation('/applications','post','createApplication','Create with active duplicate guard and explicit terminal reapply','201',ref('ApplicationRead'),'ApplicationCreate',[key])
operation('/applications/{id}','get','getApplication','Read an owned aggregate including rounds','200',ref('ApplicationRead'),parameters=[identity])
operation('/applications/{id}','patch','patchApplication','Update supplied fields of an owned aggregate','200',ref('ApplicationRead'),'ApplicationPatch',[identity,match],
          description='Omitted fields unchanged. Empty optional text/date clears; deadline null clears. Unknown fields rejected. No userId/id/createdAt writes.')
operation('/applications/{id}','delete','deleteApplication','Delete aggregate and cascade interview rows atomically','204',parameters=[identity,match])
operation('/applications/{id}/interviews','post','createInterview','Create round and sync application status in one transaction','201',ref('InterviewRead'),'InterviewWrite',[identity,match,key])
operation('/interviews/{id}','patch','patchInterview','Edit or reschedule an owned round','200',ref('InterviewRead'),'InterviewPatch',[identity,match],
          description='Omitted fields unchanged; validate the merged round, never apply create defaults to PATCH. If-Match is the parent application ETag. Editing does not reapply create-time application status synchronization.')
operation('/interviews/{id}','delete','deleteInterview','Delete an owned round and increment parent version','204',parameters=[identity,match])
operation('/dashboard','get','getDashboard','Four global current-state metrics, one owner and one asOf','200',ref('Dashboard'))

document={'openapi':'3.1.1','info':{'title':'JobTrack target API','version':'1.0.0-design',
 'description':'PROPOSED CONTRACT, not an implemented service. Same-origin /api; five frontend adapters require coordinated upgrades. See SYSTEM-DESIGN, DATA-MODEL and IMPLEMENTATION-PLAN.'},
 'servers':[{'url':'/api'}],'paths':paths,
 'components':{'securitySchemes':{'cookieSession':{'type':'apiKey','in':'cookie','name':'__Host-jobtrack'}},'schemas':schemas}}
(OUT/'openapi.json').write_text(json.dumps(document,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Generated OpenAPI {document["openapi"]}: {sum(len(p) for p in paths.values())} operations, {len(schemas)} schemas')
