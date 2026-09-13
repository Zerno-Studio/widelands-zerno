"""Expose synchronous startup calls individually, retaining linker order.

Fail closed if the pinned toolchain stops emitting a flat void-call sequence.
No game function bodies are modified. Only the export section is extended.
"""
from pathlib import Path
import json
root=Path(__file__).resolve().parent/'www'
p=root/'widelands.wasm'
data=p.read_bytes()
assert data[:8]==b'\0asm\x01\0\0\0'
def read_u(b,pos):
 value=shift=0
 while True:
  x=b[pos];pos+=1;value|=(x&127)<<shift
  if x<128:return value,pos
  shift+=7;assert shift<35

def enc(n):
 out=bytearray()
 while n>=128:out.append((n&127)|128);n>>=7
 out.append(n);return bytes(out)
def string(b,pos):
 n,pos=read_u(b,pos);return b[pos:pos+n].decode(),pos+n
sections=[];pos=8
while pos<len(data):
 kind=data[pos];size,start=read_u(data,pos+1);sections.append((kind,data[start:start+size]));pos=start+size
byid=dict(sections)
# Widelands single-thread build imports functions only. Reject layout changes.
b=byid[2];count,pos=read_u(b,0);function_types=[]
for _ in range(count):
 _,pos=string(b,pos);_,pos=string(b,pos);assert b[pos]==0;pos+=1
 type_id,pos=read_u(b,pos);function_types.append(type_id)
import_count=len(function_types)
b=byid[3];count,pos=read_u(b,0)
for _ in range(count):
 type_id,pos=read_u(b,pos);function_types.append(type_id)
b=byid[1];count,pos=read_u(b,0);types=[]
for _ in range(count):
 assert b[pos]==0x60;pos+=1
 n,pos=read_u(b,pos);params=b[pos:pos+n];pos+=n
 n,pos=read_u(b,pos);results=b[pos:pos+n];pos+=n
 types.append((params,results))
b=byid[7];count,pos=read_u(b,0);original_entries=b[pos:];ctor=None;names=set()
for _ in range(count):
 name,pos=string(b,pos);kind=b[pos];pos+=1;index,pos=read_u(b,pos);names.add(name)
 if name=='__wasm_call_ctors':assert kind==0;ctor=index
assert ctor is not None
b=byid[10];_,pos=read_u(b,0)
for index in range(ctor-import_count+1):
 size,start=read_u(b,pos);body=b[start:start+size];pos=start+size
# ASYNCIFY_REMOVE with assertions emits one saved state local and a guard
# after each call. Preserve that guard via asyncify_get_state in the JS runner.
local_count,pos=read_u(body,0);assert local_count==1
n,pos=read_u(body,pos);assert n==1 and body[pos]==0x7f;pos+=1
assert body[pos]==0x23;state_global,pos=read_u(body,pos+1)
assert body[pos:pos+2]==b'\x21\x00';pos+=2
guard=b'\x23'+enc(state_global)+b'\x20\x00\x47\x04\x40\x00\x0b' 
calls=[]
while body[pos]!=0x0b:
 assert body[pos]==0x10, f'Unexpected startup opcode: {body[pos]:x}'
 index,pos=read_u(body,pos+1)
 assert types[function_types[index]]==(b'',b''),'Constructor must take/return no values'
 calls.append(index)
 assert body[pos:pos+len(guard)]==guard, "Missing constructor state guard"
 pos+=len(guard)
assert pos==len(body)-1 and calls
extra=bytearray();exports=[]
for i,index in enumerate(calls):
 name=f'zerno_ctor_{i:04d}';assert name not in names;raw=name.encode()
 extra+=enc(len(raw))+raw+b'\0'+enc(index);exports.append(name)
new_export=enc(count+len(exports))+original_entries+extra
output=bytearray(data[:8])
for kind,payload in sections:
 if kind==7:payload=new_export
 output+=bytes([kind])+enc(len(payload))+payload
p.write_bytes(output)
(root/'constructors.json').write_text(json.dumps(exports))
print(f'Exposed {len(exports)} ordered constructors; dispatcher {len(body)} bytes')
