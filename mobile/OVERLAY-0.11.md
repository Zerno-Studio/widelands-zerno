# Widelands 0.11: floating Actions and one-finger map gestures

Actions is now absolutely positioned over a full-size game viewport on phone,
Fold and portrait layouts. Opening, closing and moving it do not resize the
canvas or ask the engine to change resolution. Its header can be dragged; its
position is clamped to the visible area after rotation or keyboard changes.
The unobscured map remains interactive; there is no screen-wide backdrop.
The original assets remain in use, with a smaller heading, tighter spacing,
and removal of generic explanatory copy. Touch tap dispatch prevents missing
or duplicate button activation after a captured header drag.

One-finger gestures wait for an 8 CSS px movement threshold before dispatch.
The engine classifies the initial point against visible mouse-sensitive widgets.
A map gesture writes camera deltas without any synthetic left-button events;
a UI drag keeps the original mouse-down/move/up sequence. Tap remains a click.
Movement is buffered if native hit testing replies after the finger is released.
Pinch and two-finger pan remain available. Cancellation clears pending input.
The display-only ChatOverlay now declares that it does not handle mouse input,
so it doesn't obscure the underlying map during touch hit testing.

Android 11+ continues to use ADJUST_NOTHING and a sidebar-only IME inset.
Keyboard space changes the overlay's available height/position, not game layout.
Android 9–10 retain the older inset fallback. Physical Samsung keyboard behavior
still requires a device check. Rotation legitimately changes the full viewport.

Verification:
- Live Chromium tutorial: a single-finger map swipe reached the mapview widget,
  moved the native camera (including world-wrap), emitted zero left clicks and
  left the game context unchanged.
- Native mini-map Buildings toggled on/off/on; stale targets were rejected.
- Native resolution stayed 1399x600 across opening Actions and an IME simulation.
- Three touch drag/open/close cycles each at 1280x549, 1032x792 and 549x1280 left
  canvas geometry and requested engine resolution unchanged. Overlay taps did
  not emit map mouse-down events.
- Dispatcher tests cover map swipe, late native response after release, UI drag,
  tap and cancellation. Existing native OK, pinch, Save, scale and saved-game
  persistence regression passed during this change.
- No attached Android device. Browser screenshots are labelled accordingly.
