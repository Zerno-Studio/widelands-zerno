"""Attach startup stage diagnostics to the pinned Emscripten runtime."""
from pathlib import Path
import re, json
p=Path(__file__).resolve().parent/'www/widelands.js'
s=p.read_text()
start=s.index('function initRuntime(')
end=s.index('function preMain(',start)
segment=s[start:end]
segment,n=re.subn(r'function initRuntime\(\)\s*\{',lambda m:m[0]+"console.log('Initializing runtime filesystem');",segment)
assert n==1, 'initRuntime marker changed'
# This runtime function calls exactly one WASM export: global constructors.
# Match also minified export names used by optimized Emscripten builds.
constructors=json.loads((p.parent/'constructors.json').read_text())
runner='(()=>{const names='+json.dumps(constructors)+";for(let i=0;i<names.length;i++){console.log('Constructor '+(i+1)+'/'+names.length+' '+names[i]);wasmExports[names[i]]();if(wasmExports.asyncify_get_state()!==0)throw new Error('Constructor tried to suspend');}})()"
segment,n=re.subn(r'wasmExports\[[^\]]+\]\(\)',lambda m:"(console.log('Starting C++ constructors'),"+runner+",console.log('C++ constructors finished'))",segment)
assert n==1, 'constructor marker changed'
s=s[:start]+segment+s[end:]
p.write_text(s)
