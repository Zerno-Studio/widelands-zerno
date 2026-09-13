#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p vendor android/lib
if [ ! -f vendor/asio-asio-1-30-2/asio/include/asio.hpp ]; then
 curl -fL https://github.com/chriskohlhoff/asio/archive/refs/tags/asio-1-30-2.tar.gz -o vendor/asio.tar.gz
 tar -xzf vendor/asio.tar.gz -C vendor
fi
