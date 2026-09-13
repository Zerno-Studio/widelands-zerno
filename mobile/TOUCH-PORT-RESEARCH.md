# Widelands touch port: research and decisions (2026-09-13)

## References and what we take from them

- [Feral: Building Rome — touch controls, interface and help](https://feralinteractive.com/en/games/rometw/android-ios/building/).
  The developer describes tap/hold/swipe navigation, familiar camera gestures,
  frequent actions kept visible and less frequent actions in expandable menus.
  Hold is used for information. Their testing exposed a second learning burden:
  players were learning both a strategy game and its touch controls. Application
  here: two-finger map navigation, hold to inspect, large context actions, and
  tutorial wording that describes touch paths. We do not copy their artwork.
- [Feral: Building an Empire](https://www.feralinteractive.com/en/games/empiremobile/android-ios/building-an-empire/).
  The developer explains gestures for camera control, direct orders, contextual
  help and a reorganized campaign interface. Application here: preserve useful
  information and action semantics, not desktop key labels or window geometry.
  Feral's changes to Empire's gameplay systems are not changes we are making.
- [Porting to a Mobile Touch Interface](https://www.gamedeveloper.com/design/porting-to-a-mobile-touch-interface).
  First-person porting discussion: translating click-and-drag involves more than
  hiding the pointer. Application here: delay a single-finger click until gesture
  intent is known; a second finger must not accidentally place a building.
- [Porting an adventure game to mobile: Tips and Pitfalls, Part 3](https://www.gamedeveloper.com/design/porting-an-adventure-game-to-mobile-tips-and-pitfalls-part-3).
  Relevant discussion found for fitting desktop UI into small screens. Treat as
  supplementary reading, not evidence about Widelands or modern iOS limits.

## Decisions implemented in the 0.9 prototype

1. Tap selects; a delayed single-finger drag keeps original widget dragging.
   Hold inspects the current UI via a large Actions drawer. Two fingers pan,
   spread/pinch zoom. No synthetic left click is sent for an initial two-finger
   gesture. Camera changes are made in the engine, not by scaling a screenshot.
2. One 48px Actions rail replaces the six-button rail. It reserves layout space;
   neither it nor the drawer covers game confirmation controls. This is a
   practical first implementation of the imagegen concept, not pixel-identical.
3. Current-window buttons are discovered from the live UI tree, with original
   labels/tooltips/enabled state, and invoke their original signals. Pending
   actions are revalidated against the live tree, name, label and window title.
   No JS pointers are dereferenced directly. Dialog changes invalidate actions.
4. The command catalogue comes from Widelands' initialized shortcut registry,
   including configured bindings. It filters main menu / game / editor scopes.
   Blocking modal dialogs disable general commands. Commands specific to a
   non-modal window retain original engine dispatch conditions: this is NOT yet
   a complete semantic availability model for all commands.
5. One-shot Ctrl/Shift/Alt options preserve modifier+click behavior such as road
   flag placement and multiple selection. Modifier state travels with each mouse
   event, so an async delay cannot clear it before the click is handled. Blur and
   cancellation clear armed options. These are a fallback pending domain-specific
   controls for every modifier interaction, not an assertion of full parity.
6. Original theme scaling defaults to 125%, with 100/125/150% choices. Fixed-size
   legacy windows may still require per-window layout work. Do not call this
   universal minimum 48px targeting inside the C++ UI.
7. Hotkey accelerator columns are suppressed for the WASM target. Generated
   shortcut references point to Actions. Reviewed touch text is applied to the
   first tutorial in the asset staging tree. Other campaigns/manual prose has
   not been fully rewritten, and the prototype remains English-only.

## Resources and startup

`verification/assets-0.9.0.json` is the measured inventory. Payload ~376.6 MiB:
tribes ~222.5 MiB; theme ~78 MiB; maps ~31.2 MiB; campaigns ~20.6 MiB; i18n
(mainly fonts) ~17.4 MiB. The C++ WASM module is separate.

The loader now mounts 25 blocks <=16 MiB instead of allocating one 377 MiB
buffer. All game content is retained. This bounds individual JS allocations;
it does NOT reduce total resident resources or implement demand loading.

Next memory work requires a native filesystem bridge that can suspend reads
safely with Asyncify, or explicit engine asset preloading phases. Separate script
registration from image loading, measure file reads per scenario, and cache only
needed tribe/theme images. Removing tribes or changing image formats blindly
would risk map compatibility and rendering quality.

## iOS and completion gates

An offline WKWebView harness is in `ios/`. This Linux host cannot compile/sign
an IPA. Desktop WebKit startup testing is recorded separately and must not be
presented as an iPhone result. Test scheme fetch, IDB persistence, suspension,
memory pressure and gestures on a physical device before distribution.

## Device acceptance route

Install over 0.8 (same package/signing key); keep existing saves. Start tutorial.
Use Actions -> This window -> OK. Drag map with two fingers in both directions;
spread/pinch. Try Fold closed/open. Set UI to 100/125/150%; inspect dialog edges.
Show build spaces, build lumberjack/quarry, connect a road, place automatic flags
with one-shot Ctrl, save, force-close and reload. Inspect a building, disabled
button, pin and minimize; ensure old context actions cannot operate another
window. Report awkward actions and frame stalls rather than treating a launch
as evidence of full playability.

Estimate after this iteration: 2–5 focused developer-days for the first tutorial
and common building/road flows, 1–3 weeks for broader UI/action coverage. iOS
runtime investigation may take 1–5 days once a Mac and device are available, or
longer if filesystem/persistence needs another backend. These are planning
ranges, not validated delivery dates or a Factorio-port estimate.

## Additional examples found

- [Community Generals: Zero Hour mobile port](https://github.com/MYSOREZ/GeneralsZH-Android-Port): the maintainers describe direct RTS touch controls including two-finger camera movement and pinch zoom, plus native Android/iOS backends. This is their compatibility claim, not a build we independently tested. It is a useful comparable port, not evidence that our WASM route will work for Factorio.
- [Mobile porting guide by a former RuneScape Mobile developer](https://oceanviewgames.co.uk/blog/posts/mobile-game-porting-guide): useful broader practitioner reading for physical target sizes and adapting a complex desktop game. Engine-specific recommendations need separate evaluation for Widelands.
- [OpenTTD portable-device notes](https://wiki.openttd.org/en/Archive/Compilation%20and%20Ports/Portable%20device%20version): historical examples of splitting toolbars and adapting small-screen controls. This is an archive, not a current compatibility guarantee.

The 0.9 bridge also exposes non-password text fields from the live window and
writes through their original set_text/changed path. This enables filename entry
with the system keyboard. It closes original dropdowns before dispatching a
catalogue command, preventing an old menu from floating over the new dialog.
