import { For } from "solid-js"
import { KeybindsConfig } from "@util/config"
import { useKeyboard } from "@opentui/solid"
import { useKeybind } from "@context/keybind"
import { Git } from "@lib/git"
import { useDialog } from "@ui/dialog"
import CommitDialog from "@components/dialogs/commit"
import KeybindHelper from "@components/keybind-helper"
import { useApplication } from "@context/application"

export default function Keybinds() {
  const dialog = useDialog()
  const keybind = useKeybind()
  const app = useApplication()

  const keybinds: Array<{ label: string; key: keyof KeybindsConfig }> = [
    { label: "trigger sidebar", key: "trigger_sidebar" },
    { label: "stage/unstage", key: "stage_unstage_file" },
    { label: "stage all", key: "stage_all_files" },
    { label: "unstage all", key: "unstage_all_files" },
    { label: "commit", key: "commit" },
    { label: "discard", key: "discard_file" },
    { label: "discard all", key: "discard_all_files" },
  ]

  useKeyboard(async (event) => {
    if (dialog.stack.length > 0) return

    if (keybind.match("stage_all_files", event)) {
      await Git.stageAllFiles()
      await app.refreshFiles()
      return
    }

    if (keybind.match("unstage_all_files", event)) {
      await Git.unstageAllFiles()
      await app.refreshFiles()
      return
    }

    if (keybind.match("commit", event)) {
      dialog.replace(() => (
        <CommitDialog
          onConfirm={async () => {
            await app.refreshFiles()
            dialog.clear()
          }}
        />
      ))
      return
    }
  })

  return (
    <box
      height={1}
      flexShrink={0}
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      gap={2}
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="row" gap={2}>
        <For each={keybinds}>{(item) => <KeybindHelper label={item.label} key={item.key} />}</For>
      </box>
      <KeybindHelper label="settings" key="settings_open" />
    </box>
  )
}
