# Widelands for Android — Zerno

Unofficial Zerno portability experiment on upstream revision
`187e4e257c2e127ec2c607f8c7765f774e2474ec`. Original game by the
Widelands Development Team. This is not an official Android release.

## Build

Install Emscripten **4.0.23**, CMake, Ninja, Python 3. Run `mobile/bootstrap.sh`
for pinned Asio headers. Set `WIDELANDS_EMSDK` to your
emsdk directory; run `mobile/build-web.sh`. Start `python3 mobile/serve.py`
and visit http://127.0.0.1:5189/. The default build does not require cross-origin isolation or SharedArrayBuffer.

Android: Java 21, host aapt2/zipalign/apksigner, Android API 36 android.jar,
API 33 resource android.jar and D8 are required. `mobile/android/build.sh`
documents their paths and accepts `ANDROID_TOOLCHAIN`. This produces a
locally signed debug APK, not a Play Store release.

## Implementation and limits

* Existing C++ engine, Lua game definitions and original economy.
* GLES3 / WebGL2 shaders and texture readback; cooperative single-thread game
  loop with Emscripten Asyncify. Simulation keeps its 50 ms tick and original
  command queues; SDL yields to browser events between frames.
* English; original sound effects and music are enabled in 0.12.0. Audio pauses
  during loading screens and while the app is in the background, then resumes. Game volume settings
  remain in control. Translated catalogs are excluded; all tribes, maps and campaigns remain.
* Version 0.11.0 adapts the logical viewport to the available display. A floating
  Actions overlay exposes native window actions, icons, tooltips and toggle states
  without resizing the game when opened or closed.
* Tap activates controls; one-finger dragging on the map pans it. Two-finger
  gestures pan and zoom. Native widget hit testing keeps UI dragging distinct
  from map panning. Android Back sends Escape to the game.
* Save data uses IDBFS in the application's WebView storage. Browser testing
  covers persistence and reload; keep backups when evaluating development builds.
* The Android activity uses the platform WebView and bundled game files. No
  separate browser or game download is needed. Keyboard insets move the overlay
  rather than resizing the game on Android 11 and newer.
* Touch instructions are adapted in the first tutorial and shortcut labels.
  Other campaigns and custom interfaces still need a complete mobile audit.
* Version 0.1.0's separate Chrome/loopback route is no longer used by the APK.
  Chrome and WebView have separate storage: old Chrome saves require export
  and import to transfer; they are not deleted by installing the update.
* A browser-only fullscreen button is available for manual web testing.
* `WL_WEB_SINGLE_THREAD=OFF` retains the old threaded engine configuration for
  comparisons. The current Android shell targets the default single-thread build.
* Multiplayer sockets are not implemented for browsers. Long sessions,
  large settlements and other devices still require evaluation.

## Try it and verification

[Android APK 0.13.0](https://zerno.stih07.com/downloads/widelands-zerno-0.13.0-a215f98e.apk)
· [Corresponding source](https://zerno.stih07.com/downloads/widelands-zerno-0.13.0-source.tar.gz)
· [Phone and Fold screenshots](https://zerno.stih07.com/downloads/widelands-0.11-preview.html)

The owner reports comfortable tutorial gameplay in both folded phone and unfolded
Fold modes. This is user feedback, not certification of every campaign or device.
Browser checks exercise native action dispatch, gestures, stable overlay layout
and save persistence; see [STATUS.md](STATUS.md) and [OVERLAY-0.11.md](OVERLAY-0.11.md).
The iOS harness is exploratory and has not been verified on physical iOS hardware.

This branch is based on upstream **1.4-git1**, at the revision above; it is not
based on the stable 1.3.1 release. The APK is a development build, signed with a
debug key. Google Play publication is pending; no store listing is claimed.

## Licensing

Widelands code remains GPL-2.0-or-later; see root COPYING and source notices.
Retain original data and third-party copyright/license files. Original art,
fonts and other assets have their own notices within the data/source tree.
Asio uses the Boost Software License; SDL2 family uses zlib; Emscripten uses
MIT/NCSA; ICU uses the Unicode license. AndroidX/Kotlin were used only by
version 0.1.0; version 0.2.0 uses the platform WebView APIs.
The binary download must be accompanied by its corresponding source,
including these modifications and build scripts. No proprietary engine or
third-party commercial assets are introduced by this experiment.

Build and runtime results are recorded in `STATUS.md` after verification.
