"""Read local project DOCX text and record the downloaded reference provenance."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import json, subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
texts = []
for file in sorted((ROOT / 'Tài liệu').glob('*.docx')):
    with ZipFile(file) as z:
        tree = ET.fromstring(z.read('word/document.xml'))
    lines = [''.join(t.text or '' for t in p.findall('.//w:t', ns)) for p in tree.findall('.//w:p', ns)]
    texts.append('# ' + file.name + '\n' + '\n'.join(x for x in lines if x))
(OUT / 'source-text.txt').write_text('\n\n'.join(texts), encoding='utf-8')
repo = ROOT / 'references/system-design-101'
def git(*args):
    return subprocess.check_output(['git','-c',f'safe.directory={repo.as_posix()}','-C',str(repo),*args],text=True).strip()
manifest = {'repository':git('remote','get-url','origin'),'commit':git('rev-parse','HEAD'),
            'shallow':git('rev-parse','--is-shallow-repository'),
            'license':'CC BY-NC-ND 4.0; original files retained, no upstream figures adapted',
            'guideFiles':len(list((repo/'data/guides').glob('*.md'))),
            'projectDocuments':[p.name for p in sorted((ROOT/'Tài liệu').glob('*.docx'))]}
(OUT / 'reference-provenance.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
