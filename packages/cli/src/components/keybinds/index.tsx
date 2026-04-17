import {  For  } from "solid-js"
import { KeybindsConfig } from "@util/config"
import { useKeyboard } from "@opentui/solid"
import { useKeybind } from "@context/keybind"
import { Git } from "@lib/git"
import { useDialog } from "@ui/dialog"
import CommitDialog from "@components/dialogs/commit"
import KeybindHelper from "@components/keybind-helper"

export default function Keybinds() {
  const dialog = useDialog()
  const keybind = useKeybind()

  const keybinds: Array<{ label: string; key: keyof KeybindsConfig }> = [
    { label: "trigger sidebar", key: "trigger_sidebar" },
    { label: "stage/unstage", key: "stage_unstage_file" },
    { label: "stage all", key: "stage_all_files" },
    { label: "unstage all", key: "unstage_all_files" },
    { label: "commit", key: "commit" },
    { label: "discard", key: "discard_file" },
  ]

  useKeyboard(async event => {
    if (dialog.stack.length > 0) return

    if (keybind.match("stage_all_files", event)) {
      await Git.stageAllFiles()
      return
    }

    if (keybind.match("unstage_all_files", event)) {
      await Git.unstageAllFiles()
      return
    }

    if (keybind.match("commit", event)) {
      dialog.replace(() => (
        <CommitDialog
          onConfirm={async () => {
            dialog.clear()
          }}
        />
      ))
      return
    }
  })

  return (
    <box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      gap={2}
    >
      <box flexDirection="row" gap={2}>
        <For each={keybinds}>
          {(item) => (
            <KeybindHelper label={item.label} key={item.key} />
          )}
        </For>
      </box>
    </box>
  )
}
