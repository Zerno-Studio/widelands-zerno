#!/usr/bin/env bash
# Build a Google Play AAB using the existing ARM64-compatible toolchain.
set -euo pipefail
cd "$(dirname "$0")"
TOOLCHAIN="${ANDROID_TOOLCHAIN:-/root/gamedev-experiment-4/research/mobile-port-scout/shapez/mobile/android/toolchain}"
BUNDLETOOL="${BUNDLETOOL:-/mnt/HC_Volume_106090614/zerno-builds/tools/bundletool-1.18.3.jar}"
PLAY_OUT="${PLAY_OUT:-out/play}"
mkdir -p "$PLAY_OUT/classes" "$PLAY_OUT/dex"
export PLAY_OUT
ANDROID_JAR="$TOOLCHAIN/platform/android-36/android.jar"
RESOURCE_JAR="$TOOLCHAIN/resources-platform/android-13/android.jar"
python3 - <<'PY'
import os, xml.etree.ElementTree as ET
from pathlib import Path
ns='http://schemas.android.com/apk/res/android'
ET.register_namespace('android',ns)
t=ET.parse('app/src/main/AndroidManifest.xml')
t.getroot().find('application').set('{'+ns+'}debuggable','false')
t.write(Path(os.environ['PLAY_OUT'])/'AndroidManifest.xml',encoding='utf-8',xml_declaration=True)
PY
javac --release 8 -classpath "$ANDROID_JAR" -d "$PLAY_OUT/classes" app/src/main/java/com/stih07/widelands/MainActivity.java
mapfile -t classes < <(find "$PLAY_OUT/classes" -name '*.class' -type f)
java -cp "$TOOLCHAIN/build-tools/android-16/lib/d8.jar" com.android.tools.r8.D8 --lib "$ANDROID_JAR" --min-api 28 --output "$PLAY_OUT/dex" "${classes[@]}"
aapt2 compile --dir app/src/main/res -o "$PLAY_OUT/resources.zip"
aapt2 link --proto-format --manifest "$PLAY_OUT/AndroidManifest.xml" -I "$RESOURCE_JAR" -o "$PLAY_OUT/base-proto.apk" "$PLAY_OUT/resources.zip"
cat > "$PLAY_OUT/pack.xml" <<'XML'
<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:dist="http://schemas.android.com/apk/distribution" package="com.stih07.widelands" split="game_assets">
 <dist:module dist:type="asset-pack"><dist:delivery><dist:install-time/></dist:delivery><dist:fusing dist:include="true"/></dist:module>
</manifest>
XML
aapt2 link --proto-format --manifest "$PLAY_OUT/pack.xml" -I "$RESOURCE_JAR" -o "$PLAY_OUT/pack-proto.apk"
python3 - <<'PY'
import os, hashlib, json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
p=Path(os.environ['PLAY_OUT']); inventory={}
with ZipFile(p/'base.zip','w',ZIP_DEFLATED) as base, ZipFile(p/'game_assets.zip','w',ZIP_DEFLATED) as assets:
 with ZipFile(p/'base-proto.apk') as proto:
  for n in proto.namelist():
   base.writestr('manifest/'+n if n=='AndroidManifest.xml' else n,proto.read(n))
 with ZipFile(p/'pack-proto.apk') as proto:
  assets.writestr('manifest/AndroidManifest.xml',proto.read('AndroidManifest.xml'))
 for dex in (p/'dex').glob('*.dex'):base.write(dex,'dex/'+dex.name)
 for f in sorted(Path('../www').iterdir()):
  if not f.is_file():continue
  target=assets if f.name.startswith('assets-') and f.suffix=='.bin' else base
  target.write(f,'assets/game/'+f.name)
  inventory[f.name]=hashlib.sha256(f.read_bytes()).hexdigest()
 (p/'payload-sha256.json').write_text(json.dumps(inventory,indent=2)+'\n')
PY
java -jar "$BUNDLETOOL" build-bundle --modules="$PLAY_OUT/base.zip,$PLAY_OUT/game_assets.zip" --output="$PLAY_OUT/widelands-release.aab" --overwrite
# Keep the upload key and passwords outside the repository.
: "${PLAY_KEYSTORE:?Set PLAY_KEYSTORE to the private upload keystore}"
: "${PLAY_STORE_PASSWORD_FILE:?Set PLAY_STORE_PASSWORD_FILE to the private password file}"
jarsigner -keystore "$PLAY_KEYSTORE" -storepass:file "$PLAY_STORE_PASSWORD_FILE" "$PLAY_OUT/widelands-release.aab" "${PLAY_KEY_ALIAS:-upload}"
java -jar "$BUNDLETOOL" validate --bundle="$PLAY_OUT/widelands-release.aab"
sha256sum "$PLAY_OUT/widelands-release.aab"
