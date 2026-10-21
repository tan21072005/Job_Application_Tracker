"""Package JobTrack-authored design artifacts; exclude the upstream reference clone."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, json

root=Path(__file__).resolve().parents[2]
base=Path(__file__).resolve().parent
out=root/'deliverables/JobTrack-System-Design.zip'
out.parent.mkdir(exist_ok=True)
files=[p for p in sorted(base.rglob('*')) if p.is_file()
       and '__pycache__' not in p.parts and p.name not in ['interview-sequence-confirmed.png']]
files.append(root/'.github/workflows/frontend-quality.yml')
with ZipFile(out,'w',ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.relative_to(root))
    z.writestr('OPEN-FIRST.txt',
      'JobTrack system design\n\nOpen docs/system-design/README.md and diagrams/JobTrack-System-Design.drawio.\n'
      'PNG previews are included. This is a design package, not an implemented backend.\n'
      'The upstream ByteByteGo repository is not redistributed here. See reference-provenance.json and REFERENCE-MAP.md.\n'
      'Apply these docs/workflow to the existing JobTrack workspace; the checker expects packages/jobtrack-core/src/domain.ts.\n'
      'In the current workspace, npm run check:architecture is already configured.\n')
with ZipFile(out) as z:
    assert z.testzip() is None
    entries=len(z.namelist())
manifest={'file':out.name,'bytes':out.stat().st_size,'entries':entries,
          'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
          'upstreamIncluded':False,'backendImplemented':False}
(out.parent/'JobTrack-System-Design.manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
