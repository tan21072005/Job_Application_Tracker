"""Portable structural checks, not PostgreSQL execution or full OpenAPI conformance."""
from pathlib import Path
import json, re
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parents[2]
BASE=Path(__file__).resolve().parent
doc=json.loads((BASE/'openapi.json').read_text(encoding='utf-8'))
assert doc['openapi']=='3.1.1'
operations=[(p,m,v) for p,methods in doc['paths'].items() for m,v in methods.items()]
assert len(operations)==14
assert len({o['operationId'] for _,_,o in operations})==14

def walk(value):
    if isinstance(value,dict):
        if '$ref' in value:
            pointer=value['$ref'];assert pointer.startswith('#/'),pointer
            target=doc
            for bit in pointer[2:].split('/'):
                target=target[bit.replace('~1','/').replace('~0','~')]
        if 'properties' in value:
            assert set(value.get('required',[])) <= set(value['properties'])
        for v in value.values():walk(v)
    elif isinstance(value,list):
        for v in value:walk(v)
walk(doc)
for path,method,op in operations:
    declared={p['name'] for p in op['parameters'] if p['in']=='path' and p['required']}
    assert set(re.findall(r'{([^}]+)}',path))==declared
    assert any(code.startswith('2') for code in op['responses'])
    if not path.startswith('/auth/'):
        assert op['security']==[{'cookieSession':[]}]
    if method in ['patch','delete'] or (method=='post' and path.endswith('/interviews')):
        assert any(p['name']=='If-Match' and p['required'] for p in op['parameters'])
    if method=='post' and not path.startswith('/auth/'):
        assert any(p['name']=='Idempotency-Key' and p['required'] for p in op['parameters'])
assert '201' in doc['paths']['/auth/register']['post']['responses']
assert 'Set-Cookie' in doc['paths']['/auth/register']['post']['responses']['201']['headers']
domain=(ROOT/'packages/jobtrack-core/src/domain.ts').read_text(encoding='utf-8')
enum=re.search(r'export const statuses\s*=\s*\[([^]]+)\]',domain).group(1)
assert re.findall(r"'([^']+)'",enum)==doc['components']['schemas']['ApplicationStatus']['enum']
sql=(BASE/'schema.sql').read_text(encoding='utf-8')
tables=re.findall(r'CREATE TABLE (\w+)',sql)
assert set(tables)=={'users','sessions','applications','interviews','idempotency_requests'}
assert 'applications_active_url_uq' in sql and 'applications_active_source_code_uq' in sql
assert 'ON DELETE CASCADE' in sql and 'deadline_at timestamptz' in sql and 'applied_at date' in sql

drawio=BASE/'diagrams/JobTrack-System-Design.drawio'
tree=ET.parse(drawio).getroot();pages=tree.findall('diagram');assert len(pages)==7
vertices=edges=0
for page in pages:
    cells=page.findall('mxGraphModel/root/mxCell')
    ids=[c.get('id') for c in cells];assert len(ids)==len(set(ids))
    assert ids[:2]==['0','1']
    for c in cells:
        if c.get('parent'):assert c.get('parent') in ids
        if c.get('edge')=='1':
            assert c.get('source') in ids and c.get('target') in ids
            assert c.find('mxGeometry').get('relative')=='1'
            edges+=1
        if c.get('vertex')=='1':
            assert c.find('mxGeometry') is not None
            assert 'image=' not in c.get('style','')
            vertices+=1

# Only local authored document links, so CI doesn't need the external reference clone.
for p in BASE.glob('*.md'):
    for link in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
        if link.startswith(('https://','http://','#')):continue
        target=p.parent/link.split('#')[0]
        assert target.exists(),f'Broken link {p.name}: {link}'

report={'openapiOperations':len(operations),'openapiRefs':'resolved','statusEnums':'match current core',
        'sqlTables':tables,'drawioPages':len(pages),'nativeVertices':vertices,'edges':edges,
        'limits':['No full OpenAPI meta-schema validation','SQL checks are structural; no PostgreSQL execution',
                  'No runtime API, ownership, concurrency, performance or deployment test']}
(BASE/'validation-results.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
