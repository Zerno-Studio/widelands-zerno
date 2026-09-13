"""Apply reviewed English touch wording to the staging tree, not upstream assets."""
from pathlib import Path
root=Path(__file__).resolve().parent
path=Path('campaigns/tutorial01_basic_control.wmf/scripting/texts.lua')
s=(root.parent/'data'/path).read_text()
replacements={
 'Like most other windows, you can also close the window by right-clicking on it.':'You can close this window with its close button, or choose Actions → Touch guide → Close a window and tap the window.',
 'You can also minimize windows by middle-clicking on them.':'To minimize a window, choose Actions → Minimize a window, then tap it.',
 'The second one is the more common and faster one: press-and-hold the right mouse button anywhere on the map, then move your mouse around and you’ll see the view scroll.':'Move two fingers together on the map. The map follows your fingers. Spread or pinch two fingers to change map zoom.',
 'Moving around with the right mouse button may be uncomfortable if you play on a laptop with a touchpad. You can enable map movement with touchpad scrolling in the the Widelands main menu: Choose ‘Options’, then press ‘Edit keyboard and mouse actions’, and select the ‘Mouse Scrolling’ tab.':'Tap with one finger to select. Hold a control to inspect it in Actions. Use two fingers to move the map without selecting or building.',
 'If you hold Ctrl or Shift+Ctrl while you finish the road, flags are placed automatically.':'For automatic road flags, open Actions → Touch guide → Extra options, enable Ctrl (or Ctrl and Shift together), close Actions, then tap the road endpoint. These options apply to one tap only.',
 'You can also hold down the Ctrl or Shift key to select multiple messages, or press %s to select them all.':'To select several messages, arm Ctrl or Shift under Actions → Touch guide → Extra options before each tap. To select all messages, use %s.',
 'All windows in Widelands (except story message windows showing ‘OK’) can be closed by right-clicking into them. Some windows can also be toggled with the buttons and menus at the very bottom of the screen.':'Use a window’s close button, or choose Actions → Close a window and tap it. Story messages require OK. Some windows also toggle using the game toolbar.',
 'The windows can also be minimized by middle-clicking in them.':'Choose Actions → Minimize a window, then tap a window to minimize it.',
 'Close the messages window now by right-clicking into it.':'Close the messages window now with its close button or Actions → Close a window.',
 'Of course, a right-click also works.':'You can also use its close button.',
 'left-clicking':'tapping','left-click':'tap','clicking':'tapping','click on':'tap','click the':'tap the',
}
for old,new in replacements.items():
 assert old in s,old
 s=s.replace(old,new)
(root/'stage/data'/path).write_text(s)
print('Applied',len(replacements),'reviewed tutorial touch replacements')
