#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
EMSDK="${WIDELANDS_EMSDK:-/root/toolchains/emsdk}"
"$EMSDK/upstream/emscripten/emcmake" cmake -S . -B mobile/build-single -G Ninja \
 -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_FLAGS_RELEASE='-O1 -DNDEBUG' \
 -DCMAKE_C_FLAGS_RELEASE='-O1 -DNDEBUG' -DOPTION_BUILD_TESTS=OFF \
 -DOPTION_BUILD_WEBSITE_TOOLS=OFF -DOPTION_BUILD_CODECHECK=OFF \
 -DUSE_FLTO_IF_AVAILABLE=OFF -DUSE_XDG=OFF -DWL_WEB_SINGLE_THREAD=ON
python3 mobile/prepare-web.py
ninja -C mobile/build-single -j"${WIDELANDS_JOBS:-6}"
mkdir -p mobile/www
cp mobile/shell/* mobile/www/
cp mobile/build-single/src/widelands.js mobile/build-single/src/widelands.wasm mobile/www/
cp COPYING CREDITS mobile/www/

python3 mobile/touch-texts.py
python3 mobile/pack-assets.py

python3 mobile/constructor-exports.py
python3 mobile/instrument-startup.py
