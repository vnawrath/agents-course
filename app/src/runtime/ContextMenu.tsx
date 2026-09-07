import { DefaultContextMenu, DefaultContextMenuContent, TldrawUiMenuGroup, UnlockAllMenuItem, type TLUiContextMenuProps } from 'tldraw'

// tldraw only offers "Unlock all" in its main menu, which the deck hides. Built shapes are locked,
// so without this item there is no way to move one during rehearsal.
export function DeckContextMenu(props: TLUiContextMenuProps) {
  return (
    <DefaultContextMenu {...props}>
      <DefaultContextMenuContent />
      <TldrawUiMenuGroup id="deck-lock">
        <UnlockAllMenuItem />
      </TldrawUiMenuGroup>
    </DefaultContextMenu>
  )
}
