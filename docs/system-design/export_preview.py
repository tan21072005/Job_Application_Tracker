"""One bounded native draw.io preview attempt; no upstream scripts are executed."""
from pathlib import Path
import subprocess
import json
import sys
import xml.etree.ElementTree as ET
import time

folder=Path(__file__).resolve().parent/'diagrams'
exe=Path('C:/Program Files/draw.io/draw.io.exe')
if '--all' in sys.argv:
    pages=ET.parse(folder/'JobTrack-System-Design.drawio').getroot().findall('diagram')
    inputs=folder/'preview-sources';inputs.mkdir(exist_ok=True)
    results=[]
    for i,page in enumerate(pages,1):
        source=inputs/f'page-{i:02}.drawio';mini=ET.Element('mxfile');mini.append(page)
        ET.ElementTree(mini).write(source,encoding='utf-8',xml_declaration=True)
        target=folder/f'page-{i:02}.png'
        target.unlink(missing_ok=True)  # generated preview only; never accept an old export
        result={'page':i,'name':page.get('name'),'success':False}
        try:
            done=subprocess.run([str(exe),'-x','-f','png','--width','1600','-o',str(target),str(source),'--disable-gpu'],
                                capture_output=True,text=True,timeout=45,
                                creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
            # Electron may delegate export to another instance before its final write.
            deadline=time.monotonic()+5
            while time.monotonic()<deadline:
                if target.exists() and target.read_bytes().endswith(b'IEND\xaeB`\x82'):break
                time.sleep(.1)
            result.update(returncode=done.returncode,success=done.returncode==0 and target.exists(),
                          stdout=done.stdout[-400:],stderr=done.stderr[-400:])
        except subprocess.TimeoutExpired:result['error']='Timed out after 45 seconds'
        results.append(result)
        if not result['success']:break
    (folder/'export-all-status.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    if len(results)>1 and results[1]['success']:
        (folder/'target-preview.png').write_bytes((folder/'page-02.png').read_bytes())
    print(json.dumps(results,ensure_ascii=True,indent=2))
    raise SystemExit(0 if len(results)==7 and all(r['success'] for r in results) else 1)
output=folder/'target-preview.png'
result={'attempted':False,'success':False,'file':str(output)}
if exe.is_file():
    result['attempted']=True
    try:
        done=subprocess.run([str(exe),'-x','-f','png','--width','1600','-o',str(output),
                             str(folder/'target-preview.drawio'),'--disable-gpu'],
                            capture_output=True,text=True,timeout=45,
                            creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        result.update(returncode=done.returncode,success=done.returncode==0 and output.exists(),
                      stdout=done.stdout[-1200:],stderr=done.stderr[-1200:])
    except subprocess.TimeoutExpired:
        result['error']='Native export exceeded 45 seconds; bounded attempt ended.'
else: result['error']='draw.io Desktop executable unavailable.'
(folder/'export-status.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
