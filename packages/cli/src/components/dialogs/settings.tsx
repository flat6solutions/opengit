import { createMemo } from "solid-js"
import { useRenderer } from "@opentui/solid"
import { DialogSelect, type DialogContext } from "@ui/dialog-select"
import { useDialog } from "@ui/dialog"
import { useTheme } from "@context/theme"
import { Opencode } from "@lib/opencode"
import DiffViewDialog from "@components/dialogs/diff-view"
import ThemesDialog from "@components/dialogs/themes"

export default function SettingsDialog() {
  const dialog = useDialog()
  const theme = useTheme()
  const renderer = useRenderer()

  function exit() {
    Opencode.closeClient()
    renderer.setTerminalTitle("")
    renderer.destroy()
    process.exit(0)
  }

  const options = createMemo(() => [
    {
      title: "Diff View",
      value: "diffView",
      category: "Diff Viewer",
      onSelect: (ctx: DialogContext) => {
        dialog.push(() => <DiffViewDialog />)
      },
    },
    {
      title: "Switch theme",
      value: "switchTheme",
      category: "System",
      onSelect: (ctx: DialogContext) => {
        dialog.replace(() => <ThemesDialog />)
      },
    },
    {
      title: theme.mode() === "dark" ? "Switch to light mode" : "Switch to dark mode",
      value: "toggleTheme",
      category: "System",
      onSelect: (ctx: DialogContext) => {
        theme.setMode(theme.mode() === "dark" ? "light" : "dark")
        ctx.clear()
      },
    },
    {
      title: "Exit the app",
      value: "exit",
      category: "System",
      onSelect: (ctx: DialogContext) => {
        ctx.clear()
        exit()
      },
    },
  ])

  return (
    <DialogSelect
      title="Settings"
      flat
      skipFilter={false}
      options={options()}
    />
  )
}
