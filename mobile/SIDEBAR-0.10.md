# Sidebar 0.10

The mobile sidebar now exports the original Button icon, tooltip, enabled state,
and permanent toggle state. The icon comes from the original ImageCache key;
JavaScript reads its bundled MEMFS file into a cached blob URL. Missing/generated
images fall back to text. Original DejaVu Sans Bold and default Widelands window
and button textures are reused; no generated replacement art is used.

Mini-map Buildings toggles MiniMapLayer::Building, not a construction menu.
The original MiniMap::toggle updates both map rendering and pressed button states.
The sidebar now displays On/Off and a checkmark from the native state, with a
specific mini-map explanation. Toggle actions keep the sidebar open.

For other window buttons, the sidebar waits for native dispatch acknowledgement
before closing. This avoids resizing/recreating the widget tree before the
queued action is validated. Stale targets remain rejected and now give visible
feedback. This acknowledgement means dispatch, not proof of every action's
successful domain outcome. Password inputs remain excluded.

Android 11+ keeps IME insets out of WebView layout padding and applies their
height only to the sidebar. Android SOFT_INPUT_ADJUST_NOTHING avoids automatic
window resizing/panning; the focused HTML input scrolls within the sidebar.
The keyboard can cover the lower part of the game, but should no longer force
another engine resolution change. Opening/closing the sidebar and rotating the
physical device still legitimately change the game viewport. Android 9–10 retain
the previous inset fallback. Browser/iOS keyboard behavior is not claimed fixed.

API contract: [Android WindowManager.LayoutParams](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#SOFT_INPUT_ADJUST_NOTHING).

Device validation still required: Galaxy Fold 7 / Samsung keyboard, open Pinned
Note, edit text, dismiss keyboard, fold/unfold. Confirm the game doesn't resize
again for IME and that the active input remains visible. This build does not
claim coverage of every custom widget or keyboard-modifier combination.
