import { createSignal, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useKeybind } from "@context/keybind"
import Files from "@components/panes/files"
import { useDialog } from "@ui/dialog"

export default function Sidebar() {
  const keybind = useKeybind()
  const dialog = useDialog()
  const [showSidebar, setShowSidebar] = createSignal<boolean>(true)

  useKeyboard((event) => {
    if (dialog.stack.length > 0) return

    if (keybind.match("trigger_sidebar", event)) {
      setShowSidebar(!showSidebar())
      return
    }
  })

  return (
    <Show when={showSidebar()}>
      <box width={42} flexDirection="column">
        <box width="100%" flexDirection="column" flexGrow={1} gap={1}>
          <Files />
        </box>
      </box>
    </Show>
  )
}
