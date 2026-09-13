"""Differential check of initialized shortcut data against the git baseline.
Uses SDL's types with a deterministic scancode stub; no game/graphics runtime.
"""
from pathlib import Path
import subprocess,tempfile,hashlib,os
root=Path(__file__).resolve().parents[1]
header=(root/'src/wlapplication_options.h').read_text()
enums=''
for name in ['KeyboardShortcut','KeyboardShortcutScope']:
 start=header.index('enum class '+name+' ');end=header.index('\n};',start)+3
 enums+=header[start:end]+'\n'
prefix=r'''
#include <map>
#include <vector>
#include <set>
#include <string>
#include <initializer_list>
#include <iostream>
#include <SDL_keyboard.h>
#define gettext_noop(x) x
#define _(x) x
extern "C" SDL_Scancode SDL_GetScancodeFromKey(SDL_Keycode key) {return static_cast<SDL_Scancode>(key & 511);}
inline SDL_Keysym keysym(SDL_Keycode key,uint16_t mod=0) {return {SDL_GetScancodeFromKey(key),key,mod,0};}
static const std::string kFastplaceGroupPrefix="fastplace_";
'''+enums+'\nstd::string to_string(KeyboardShortcut);\n'
suffix=r'''
void print(const KeyboardShortcutInfo& info) {
 for(auto scope:info.scopes)std::cout<<static_cast<int>(scope)<<',';
 std::cout<<'|'<<info.default_shortcut.scancode<<'|'<<info.default_shortcut.sym<<'|'<<info.default_shortcut.mod
 <<'|'<<info.current_shortcut.scancode<<'|'<<info.current_shortcut.sym<<'|'<<info.current_shortcut.mod
 <<'|'<<info.internal_name<<'|'<<info.descname<<'|'<<info.fastplace.size()<<'\n';
}
int main(){
 for(const auto& info:kFastplaceDefaults){std::cout<<"F|";print(info);}
 for(const auto& entry:shortcuts_){std::cout<<"K|"<<static_cast<int>(entry.first)<<'|';print(entry.second);}
 for(const auto& entry:shortcut_aliases_)std::cout<<"A|"<<static_cast<int>(entry.first)<<'|'
 <<static_cast<int>(entry.second.real_shortcut)<<'|'<<entry.second.descname_override<<'\n';
}
'''
sources=[subprocess.check_output(['git','show','HEAD:src/wlapplication_options.cc'],cwd=root).decode(),(root/'src/wlapplication_options.cc').read_text()]
include=Path(os.environ.get('WIDELANDS_EMSDK','/root/toolchains/emsdk'))/'upstream/emscripten/cache/sysroot/include/SDL2'
outputs=[]
with tempfile.TemporaryDirectory(prefix='widelands-shortcuts-') as tmp:
 for i,source in enumerate(sources):
  start=source.index('struct KeyboardShortcutInfo');end=source.index('// Keyboard control additional help texts',start)
  cpp=Path(tmp)/f'check{i}.cc';binary=Path(tmp)/f'check{i}'
  cpp.write_text(prefix+source[start:end]+suffix)
  subprocess.run(['g++','-std=c++17','-O0','-I',str(include),str(cpp),'-o',str(binary)],check=True)
  outputs.append(subprocess.check_output([str(binary)]))
assert outputs[0]==outputs[1], 'Initialized shortcut defaults differ from baseline'
print('Shortcut data matches baseline:',len(outputs[0].splitlines()),'records; SHA256',hashlib.sha256(outputs[0]).hexdigest())
