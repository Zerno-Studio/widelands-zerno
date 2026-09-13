from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
stage=root/'mobile/stage/data'
stage.mkdir(parents=True,exist_ok=True)
for p in (root/'data').iterdir():
    if p.name in ('i18n','music','.gitignore'): continue
    dest=stage/p.name
    if p.is_dir(): shutil.copytree(p,dest,dirs_exist_ok=True)
    else: shutil.copy2(p,dest)
shutil.copytree(root/'data/i18n',stage/'i18n',dirs_exist_ok=True,ignore=shutil.ignore_patterns('translations'))
(stage/'i18n/translations').mkdir(exist_ok=True)
(stage/'music').mkdir(exist_ok=True)

# Keep textdomain directories without packing 122 MB of translation sources.
for domain in (root/"data/i18n/translations").iterdir():
 if domain.is_dir():
  target=stage/"i18n/translations"/domain.name
  target.mkdir(parents=True,exist_ok=True)
  (target/".keep").write_text("English prototype: original msgids are used.\n")
