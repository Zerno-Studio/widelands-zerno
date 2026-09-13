# Version 0.2.0 verification — 2026-09-12

## Confirmed

- Emscripten 4.0.23 / CMake / Ninja Release: builds with
  `WL_WEB_SINGLE_THREAD=ON`, Asyncify and no pthread requirement.
- Main menu and Tutorial 01 render without cross-origin isolation and with
  SharedArrayBuffer unavailable. Simulation advances; no browser exceptions.
- Keyboard/menu commands keep the game open. Repeated touch Menu presses on
  a 960×432 mobile viewport close/advance tutorial dialogs without navigating.
- Browser history Back stays in the game. The APK routes Android Back to the
  same `widelandsBack()` function rather than navigating WebView history.
- IDBFS writes and sync complete successfully.
- Native Java compilation, APK packaging and debug signature verification pass.
  Version code 2, package com.stih07.widelands, same signing key as 0.1.0.
- Android code no longer starts Chrome, a loopback server, or AndroidX WebKit.

## Performance observation

Same Tutorial 01 scene, 1280×720, headless Chromium / SwiftShader on the server.
10-second observation after initial loading and dismissal of the welcome box.
Rendering measured through WebGL frame clears; both builds retain a 30 FPS cap.

| Build | Average FPS | 95th-percentile frame interval |
|---|---:|---:|
| 0.1.0 threaded / GL proxy | 19.85 | 63.91 ms |
| 0.2.0 cooperative / direct GL | 29.73 | 40.40 ms |

These are controlled browser observations, not measurements on Galaxy Fold.
Raw results are in verification/. No claim of a guaranteed device speedup.

## Remaining limits

Physical Android execution of 0.2.0 has not yet been tested. The user verified
0.1.0's Chrome fallback on Fold and reported Back navigation and lag.
Desktop tutorial instructions, touch ergonomics and device performance still
need work. Multiplayer and audio are unavailable in this prototype.
Chrome and application WebView storage are separate; updating does not migrate
old Chrome saves automatically, nor delete them.

## 0.3.0: startup crash investigation (2026-09-12)

The Galaxy Fold user reported 0.2.0 stuck at Running, followed by Android's
WebView crash recovery dialog. Root cause remains unconfirmed without device
logs. Desktop Chromium success does not establish Android WebView compatibility.

Changes: stream the asset bundle into one preallocated buffer and hand it to
Emscripten via getPreloadedPackage, avoiding the generated loader's retained
chunks plus full-sized copy. Initial WASM memory reduced from 256 to 64 MiB
(still grows on demand). No game content removed. Removed unnecessary isolation
headers from the single-thread Android asset server. Added startup JS failures,
runtime milestone logging, and native renderer termination handling with a
copyable report including WebView version and didCrash classification. Native
Back/lifecycle calls tolerate a destroyed renderer. No automatic reload loops.

Reference: Android WebViewClient.onRenderProcessGone requires removal and
cleanup of the affected WebView; returning true indicates the host handled it:
https://developer.android.com/reference/android/webkit/WebViewClient#onRenderProcessGone(android.webkit.WebView,%20android.webkit.RenderProcessGoneDetail)

This is an experimental mitigation and diagnostic release, not a confirmed
resolution of the reported physical-device crash.

## 0.4.0: sequential initialization and asset loading

Device report: Android 16 SM-F966B, WebView 152.0.7977.64, renderer didCrash=true.
Last console line was asset loading complete; screenshot shows Running. In
Emscripten 4.0.23, Running precedes initRuntime, after run dependencies resolve.
No onRuntimeInitialized milestone was reached. Exact native fault is unknown.
The 0.3.0 memory mitigation did not resolve the physical-device crash.

Final change: initialize WASM and C++ global constructors BEFORE allocating the
377 MiB asset bundle. Then stream the data into one buffer, mount file views in
MEMFS with canOwn, and explicitly call main. Asset packing now uses a separate
reproducible manifest, removing the generated Emscripten preload dependency and
its large embedded file index. Original game content and save location remain.
Stage instrumentation around initRuntime and constructors is build-checked.
This separates initialization failures from resource-loading failures, while
removing asset memory pressure from the early engine initialization phase.

Experiments with -O2 and -Oz final optimization were stopped after prolonged
Binaryen passes (detailed log showed coalesce-locals delay). These options and
the temporary skip-pass option are NOT part of the final build. EVAL_CTORS is
incompatible with Asyncify and is not used. No JSPI or Chrome fallback added.

Physical Android validation remains unavailable on this host. This release is
a candidate mitigation and diagnostic improvement, not a verified Fold fix.

## 0.5.0: isolate startup constructor calls

0.4.0 device report ended at Starting C++ constructors, before the asset bundle
was requested. This rules out loading the game assets as the necessary trigger;
it does not identify a native crash cause or prove a WebView compiler defect.

ASYNCIFY_REMOVE excludes only __wasm_call_ctors, which is synchronous runtime
initialization. Startup now invokes its 539 constituent void calls in linker
order from JS. The build parses the pinned binary dispatcher and rejects any
unexpected instructions, argument/result types or missing Asyncify state guards.
Only the WASM export section is extended; function bodies, imports, memory and
tables remain identical. The JS runner checks asyncify_get_state after each call
and logs its ordinal. That both avoids the aggregate WASM dispatcher path and
identifies the specific last call if this device still crashes. Actual constructor
code is retained; none of the constructors or their state checks are skipped.

The native failure still needs physical-device verification. No Android runtime
is available here; desktop Chromium alone does not validate WebView compatibility.

## 0.6.0: compact shortcut initialization

0.5.0 device report last began constructor 127 / zerno_ctor_0126. Re-linking
with --emit-symbol-map and verifying the complete ordered constructor index
list mapped it to _GLOBAL__sub_I_wlapplication_options.cc. This is the last
observed call; there is still no native WebView crash stack.

Two callees constructed nontrivial initializer_lists for fastplace and keyboard
shortcut defaults. Their generated WASM bodies had:
- fastplace: 128,567 bytes and 7,741 locals;
- shortcuts: 565,749 bytes and 34,774 locals.

Replace complex aggregate initialization with small records consumed by loops.
The resulting helpers are 3,132 bytes / 199 locals and 3,489 bytes / 235 locals.
Names, translations, scopes, keys, modifiers and alias behavior are preserved.
This reduces pathological generated startup code; a compiler/stack limit in
WebView is a hypothesis, not a confirmed native failure mechanism.

Validation: mobile/check-shortcut-defaults.py compiles both git-baseline and
current data initializers in a native harness, using SDL types and a deterministic
scancode stub. All 226 serialized records match byte-for-byte, SHA256
4e83760a4b6b63ab69604cef671abc005507e39e8c017bde01cfc65e9d83b0b8.
Chromium: tutorial renders, history Back remains in game, IDBFS round trip passes,
no JS errors, approximately 29.8 FPS in the existing software-rendering test.
No physical Android WebView validation is available on this host.

## 0.7.0: controls outside the game viewport

User confirmed 0.6.0 starts on the Galaxy Fold. New issue: the prototype's
floating keyboard row covered map-selection footer controls.

Replace it with a 60 CSS-pixel utility dock (44x44 targets), in ordinary flex
layout outside the canvas. The expandable 228-pixel control drawer also occupies
layout space. ResizeObserver fits the entire 1280x720 canvas into the remaining
viewport without cropping; pointer mapping uses its current bounds. Portrait
browser layout puts the dock below the viewport. Back first closes the drawer.
Move/secondary-click mode remains explicit and visually selected. Build-space
shortcut and directional keys move into More; add a Confirm/Enter shortcut.
Mouse/touch conversion retains the existing game input semantics, with pointer
and key release on cancellation, blur and page hiding.

Imagegen concept in mobile/design is a design reference, not an implemented
map picker/building menu. Those original C++ screens are unchanged. Pinch and
context-aware automatic docking shown/proposed in design exploration are not
implemented in this release. Full prompt recorded in UI-CONCEPT-PROMPT.md.

Validation: check-controls.cjs checks 10 viewport/drawer combinations including
phone and Fold sizes, non-overlap, target sizes, bottom-of-canvas hit testing,
Confirm key events and Back closing the drawer. Existing tutorial, browser Back
and IDBFS checks pass. Native device verification of this UI is still pending.

## 0.8.0: adaptive game resolution

Replace the 16:9 letterbox with a canvas filling the available viewport. The
shell requests a matching internal resolution, preserving aspect ratio and the
original 800x600 minimum for desktop dialogs. Device pixel ratio is deliberately
not multiplied into the render target; normal large viewports are capped at
1440x1080 before the minimum-size constraint. Original dialogs remain desktop UI.

ResizeObserver debounces requests by 120 ms, including drawer layout changes.
Graphic::refresh consumes the request at a frame boundary using SDL window size
and the existing GraphicResolutionChanged notification. It does not re-enter
Asyncify from a JavaScript callback. Android remains sensorLandscape; physical
Fold folding/unfolding still requires device validation.

Validation: six live WASM viewport/drawer transitions match SDL canvas and WebGL
buffer sizes, preserve aspect ratio, and keep the footer reachable. Ten shell
control layouts pass. Welcome OK touch advances to Objectives after resizing.
No JS errors or WebGL context loss in Chromium; Android device check pending.

## 0.9.0: touch actions and resource blocks

See TOUCH-PORT-RESEARCH.md for primary references, decisions, implementation
limits and device acceptance route. Imagegen concept precedes implementation:
mobile/design/touch-actions-v2.png. No original game content is removed.

New shell: gestures, one Actions rail, live-window button list, native shortcut
catalogue, one-shot modifier clicks, original 125% default UI theme scale.
New asset format: 25 <=16 MiB blocks, no single 377 MiB JS allocation. Still eager
loading, not a reduced total memory claim. iOS WKWebView source harness added;
no IPA or physical iOS validation on this Linux host.

Validation (Linux host): native tutorial OK through the live window overlay,
2-finger pan (x 276 -> 216), pinch zoom (1 -> 0.6667), native Save command,
filename entered through the HTML text-field bridge, real touch-smoke.wgf saved
and flushed, then byte-identical 92,296-byte file restored after page reload.
125/150% scale switching and IDBFS passed, no JS errors. 12 layout/tab combinations
keep the canvas footer reachable; search keys do not leak into engine handlers.
Gesture-only test sends zero clicks for two fingers and preserves one-shot mods.
All 20,960 packed files match stage bytes. Final APK assets match www exactly.
Desktop Playwright WebKit (Safari 26.5 UA) starts tutorial and WebGL without JS
errors. No physical iOS or Android 0.9.0 verification. Native iOS source is unbuilt.
Registry inventory: 289 entries, 161 bound; this is not a claim that every action
has been independently exercised in every context. No Play/App Store submission.

## 0.10.0: native sidebar identity, toggle state and keyboard layout

Uses original button icons (including center-cropped mini-map textures), original
DejaVu Sans Bold, window/button textures, native tooltips and toggle state.
Mini-map Buildings is explicitly a map layer, not a construction command.
Toggle buttons remain open. Other window buttons close the drawer only after
native dispatch; stale commands report feedback and never call an invalid target.
Android 11+ IME insets resize only the sidebar, not the game surface. Android 9–10
retain the previous fallback. See SIDEBAR-0.10.md for implementation and limits.

Validation: final single-thread WASM compiled; 539 constructor instrumentation
passed. Real Chromium tutorial toggled native Buildings On -> Off -> On, loaded
11 original icons, rejected a stale target visibly, and retained 975x600 engine
resolution when a 280 CSS px keyboard inset was simulated. Native OK, camera
pan/pinch, Save, UI scale and byte-identical saved-game restoration after reload
passed. 12 phone/Fold/portrait layouts, keyboard isolation and touch gestures
passed. APK signature valid, version 0.10.0/code 10; all 36 packaged game assets
match final www. No attached Android device: Samsung IME behavior needs user test.

## 0.11.0: floating Actions, stable game viewport, one-finger map pan

See OVERLAY-0.11.md. The panel is a draggable overlay; the canvas occupies the
whole available screen. Native hit testing routes map swipes to camera movement
and UI drags to existing handlers. ChatOverlay is explicitly non-interactive.
Keyboard insets remain local to the overlay on Android 11+. Native map swipe,
mini-map toggle, touch overlay drag/close and stable viewport checks passed;
results are in verification/*0.11.0*. Real Samsung keyboard validation is pending.

## 0.11.0 user feedback — 2026-09-13

The owner reports that both folded phone mode and unfolded Fold mode work well,
that the tutorial is visible and understandable, and that playing through it
appears practical. This supports opening the build to more testers. The report
does not establish completion of every tutorial/campaign or long-session testing.

## Publication preparation — 2026-09-13

Updated the public README to describe 0.11.0 rather than the old 0.2.0 controls.
Zerno is a project name, not a registered legal entity. The source repository is published at https://github.com/STih07/widelands-zerno;
a separate Zerno GitHub organization has not been created. The owner registered
Google Play Console as Zerno Studio and reports that account verification is
pending. Existing APK/source downloads remain available.


## Android 0.12.0 — audio restored

Removed `--nosound` and bundled the original music. SDL mixer settings remain
unchanged. The Android lifecycle suspends/resumes its AudioContext; a touch can
resume audio when browser autoplay rules require it.

Chromium smoke check: mixer output peak 0.089111328125, background state
`suspended`, foreground state `running`. This measures browser audio output;
listening on a physical Android device remains for the owner. APK versionCode 12
and signing certificate match the previous installation identity.

APK SHA-256: `bf7a76d76b1f0f2006bbb0260719b3f57fe450e8becbf6665863ce4777dce32c`.


## Android 0.13.0 — quiet loading transitions

ProgressWindow lifetime signals the web audio bridge. AudioContext stays suspended
while any progress window is active, and resumes 250 ms after the last one closes.
Pointer gestures and foreground events do not override the loading pause. Volume
preferences are unchanged. This avoids playing an underrunning main-thread SDL
mixer during loading; it does not move the mixer to an audio worker.

Chromium tutorial test observed native progress entry at 14.875 s, completion at
30.708 s, suspended audio during loading, and running audio at the welcome dialog.
Nested loading, touch during loading, and background-before-completion remained
suspended. Foreground output resumed with measured peak 0.0639190673828125.
Physical device listening remains to be confirmed.

APK SHA-256: `a215f98ecf314cd7c20827e1d8f7a511070fe678e7c7142f0a500718c68bb9f5`.


## Android 0.14.0 — silent startup before the menu

The 0.13 progress-window pause did not cover application startup. The upstream
application starts intro music before graphics and resource initialization.
The web build now omits that early playback. MainMenu's existing draw path starts
menu music once the menu is visible. No paused intro track is left blocking
splash completion; desktop startup behavior is unchanged.

Normal-start Chromium check (not direct tutorial launch): audio context created
at 7.334 s, 40 silent samples observed, first nonzero output at 16.772 s with native
context `widelands_main_menu`, peak 0.0283203125. Audio remained running at the
menu. Physical Android listening remains for the owner.

APK SHA-256: `da739f1ad456d4d3f846bc1864b855bf46734412afa6fcb3f428aa241dd3d8ca`.
