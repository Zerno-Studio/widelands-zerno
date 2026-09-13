# iOS engineering shell — not yet a tested iPhone build

This is an offline WKWebView harness for the SAME mobile/www payload. It uses
Apple's WKURLSchemeHandler, 64 KiB native reads, safe-area layout, persistent
website data store and WebContent termination handling. It does not require a
browser entitlement or a remote game server. No IPA has been built on this
Linux host; this is not evidence of iOS compatibility.

On a Mac with Xcode and XcodeGen installed:

1. Build the web assets using ../build-web.sh (or copy the verified www payload).
2. Run `xcodegen generate` in this directory.
3. Open WidelandsZerno.xcodeproj, select your signing team and an iPhone/iPad.
4. Build and run. Use Safari Web Inspector for diagnostics.

Release gates: WASM startup, WebGL rendering, fetch streaming and IDBFS on the
custom scheme MUST be tested on a physical device. Check save -> force close ->
relaunch -> load, background suspension and memory pressure on large maps. A
successful desktop WebKit test does not establish any of these iOS-specific
properties. If IDB is unavailable for this scheme, implement a native save
bridge or a stable loopback origin before distributing a build.

No auto-reload after a renderer crash (avoids hiding a crash loop). Background
flush persists FS writes; it is not an automatic in-game save. App icons,
store signing, store metadata and App Store submission are not configured.

Apple APIs:
- https://developer.apple.com/documentation/webkit/wkurlschemehandler
- https://developer.apple.com/documentation/webkit/wknavigationdelegate/webviewwebcontentprocessdidterminate(_:)
