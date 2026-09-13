"""Pack bounded asset blocks; avoid a single 377 MiB JS allocation at startup."""
from pathlib import Path
import json,collections,hashlib
root=Path(__file__).resolve().parent
stage=root/'stage/data';www=root/'www'
limit=16*1024*1024;parts=[];files=[];block=bytearray();groups=collections.Counter();largest=[]
def flush():
 global block,files
 if not files:return
 name=f'assets-{len(parts):03d}.bin';(www/name).write_bytes(block)
 parts.append({'url':name,'bytes':len(block),'sha256':hashlib.sha256(block).hexdigest(),'files':files})
 block=bytearray();files=[]
for p in sorted(stage.rglob('*')):
 if not p.is_file():continue
 data=p.read_bytes();name=p.relative_to(stage).as_posix()
 if block and len(block)+len(data)>limit:flush()
 files.append({'path':'/data/'+name,'start':len(block),'size':len(data)});block.extend(data)
 groups[name.split('/')[0]]+=len(data);largest.append((len(data),name))
flush()
manifest={'version':2,'bytes':sum(p['bytes'] for p in parts),'parts':parts}
(www/'package.json').write_text(json.dumps(manifest,separators=(',',':')))
# Remove only generated legacy payloads and obsolete numbered blocks.
(www/'widelands.data').unlink(missing_ok=True)
valid={p['url'] for p in parts}
for p in www.glob('assets-*.bin'):
 if p.name not in valid:p.unlink()
audit={'bytes':manifest['bytes'],'fileCount':len(largest),'blocks':len(parts),'largestBlock':max(p['bytes'] for p in parts),'groups':dict(groups.most_common()),'largestFiles':sorted(largest,reverse=True)[:20], 'note':'Bounded allocation, not lazy loading: all assets still mounted before main. No game content removed.'}
(root/'verification/assets-0.12.0.json').write_text(json.dumps(audit,indent=2))
print(json.dumps({k:audit[k] for k in ['bytes','fileCount','blocks','largestBlock']}))
