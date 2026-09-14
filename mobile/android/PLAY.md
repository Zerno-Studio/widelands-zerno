# Google Play bundle

`build-play.sh` packages the prepared `../www` tree without rebuilding WASM.
Compile and prepare that tree using the mobile build instructions first.
The release manifest removes debuggable while retaining package identity and API 36.
The base contains Java, HTML/JS/WASM and the asset inventory; game data is an
install-time Play Asset Delivery module, accessible through the existing
Android AssetManager path. No Play SDK, runtime download or network permission
is added. All payload hashes are recorded in `out/play/payload-sha256.json`.

Use Google bundletool 1.18.3 (`BUNDLETOOL=/path/to/bundletool.jar`) and the existing
ARM64 toolchain. Set `PLAY_KEYSTORE`, `PLAY_STORE_PASSWORD_FILE` and optionally
`PLAY_KEY_ALIAS` (defaults to `upload`). Passwords and signing keys must remain
outside the source tree. Never publish them with a source archive.

For split generation using Ubuntu's older ARM64 aapt2, use `--aapt2` pointing to
`aapt2-bundletool`; it translates the renamed sparse encoding flag to the older
equivalent. `bundletool build-apks`, `validate`, and `get-size total` are the
local checks. Actual Play installation with its install-time pack still needs
to be exercised through a test track on a physical device.

The production upload key is intentionally different from the historical
Android debug key. Play App Signing manages the distributed APK certificate.
Do not uninstall a previous debug build without first preserving local saves.
