#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
TOOLCHAIN="${ANDROID_TOOLCHAIN:-/root/gamedev-experiment-4/research/mobile-port-scout/shapez/mobile/android/toolchain}"
ANDROID_JAR="$TOOLCHAIN/platform/android-36/android.jar"
D8_JAR="$TOOLCHAIN/build-tools/android-16/lib/d8.jar"
RESOURCE_JAR="$TOOLCHAIN/resources-platform/android-13/android.jar"
mkdir -p out/classes-v2 out/dex app/src/main/assets
mkdir -p app/src/main/assets/game
# Remove only generated payloads from the previous packaging format.
python3 - <<'PY_ASSETS'
from pathlib import Path
p=Path('app/src/main/assets/game')
(p/'widelands.data').unlink(missing_ok=True)
for f in p.glob('assets-*.bin'):f.unlink()
PY_ASSETS
cp ../www/* app/src/main/assets/game/
javac --release 8 -classpath "$ANDROID_JAR" -d out/classes-v2 \
    app/src/main/java/com/stih07/widelands/MainActivity.java
mapfile -t CLASS_FILES < <(find out/classes-v2 -name '*.class' -type f)
java -cp "$D8_JAR" com.android.tools.r8.D8 --lib "$ANDROID_JAR" --min-api 28 \
    --output out/dex "${CLASS_FILES[@]}"
# Ubuntu ARM64 aapt2 cannot read API 36 compact framework resource tables.
# All referenced resource attributes exist in API 33. Java compiles against 36;
# the packaged manifest still targets 36, independently of this resource table.
aapt2 compile --dir app/src/main/res -o out/resources.zip
aapt2 link --manifest app/src/main/AndroidManifest.xml -I "$RESOURCE_JAR" \
    -A app/src/main/assets -0 arsc -o out/unsigned.apk out/resources.zip
python3 - <<'PY'
from zipfile import ZipFile, ZIP_DEFLATED
with ZipFile('out/unsigned.apk', 'a') as apk:
    apk.write('out/dex/classes.dex', 'classes.dex', compress_type=ZIP_DEFLATED)
PY
zipalign -f 4 out/unsigned.apk out/aligned.apk
if [ ! -f debug.keystore ]; then
    keytool -genkeypair -keystore debug.keystore -storepass android -keypass android \
        -alias androiddebugkey -dname 'CN=Android Debug,O=Zerno Widelands,C=US' \
        -keyalg RSA -keysize 2048 -validity 10000
fi
apksigner sign --ks debug.keystore --ks-pass pass:android --key-pass pass:android \
    --out out/widelands-debug.apk out/aligned.apk
apksigner verify --verbose --print-certs out/widelands-debug.apk
aapt2 dump badging out/widelands-debug.apk
sha256sum out/widelands-debug.apk
