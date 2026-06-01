import { KVProvider } from "@context/kv"
import { ApplicationProvider, useApplication } from "@context/application"
import { ThemeProvider, useTheme } from "@context/theme"
import { KeybindProvider, useKeybind } from "@context/keybind"
import { Clipboard } from "@util/clipboard"
import { useKeyboard, useRenderer } from "@opentui/solid"
import { useDialog, DialogProvider } from "@ui/dialog"
import { Toast, ToastProvider, useToast } from "@context/toast"
import Keybinds from "@components/keybinds"
import { onMount } from "solid-js"
import { Opencode } from "@lib/opencode"
import { Git } from "@lib/git"
import Sidebar from "@components/sidebar"
import Main from "@components/main"
import ThemesDialog from "@components/dialogs/themes"
import SettingsDialog from "@components/dialogs/settings"

export function tui() {
  return (
    <ToastProvider>
      <KVProvider>
        <ApplicationProvider>
          <ThemeProvider mode="dark">
            <KeybindProvider>
              <DialogProvider>
                <App />
              </DialogProvider>
            </KeybindProvider>
          </ThemeProvider>
        </ApplicationProvider>
      </KVProvider>
    </ToastProvider>
  )
}

function App() {
  const renderer = useRenderer()
  const keybind = useKeybind()
  const theme = useTheme()
  const dialog = useDialog()
  const app = useApplication()
  const toast = useToast()

  function exit() {
    Opencode.closeClient()
    renderer.setTerminalTitle("")
    renderer.destroy()
    process.exit(0)
  }

  async function setupAi() {
    const available = await Opencode.providers()
    if (available.length > 0) {
      app.setConfig({ ...app.config, aiEnabled: true })
    }
  }

  async function setup() {
    const branch = await Git.getCurrentBranch()
    if (branch) app.setBranch(branch)
    await setupAi()
  }

  useKeyboard((event) => {
    if (keybind.match("theme_mode_toggle", event)) {
      dialog.replace(() => <ThemesDialog />)
    }

    if (keybind.match("debug_toggle", event)) {
      renderer?.console.toggle()
      renderer?.toggleDebugOverlay()
    }

    if (dialog.stack.length > 0) return

    if (keybind.match("open_settings", event)) {
      dialog.replace(() => <SettingsDialog />)
      return
    }

    if (keybind.match("app_exit", event)) {
      exit()
    }
  })

  onMount(setup)

  return (
    <>
      <Toast />
      <box
        flexDirection="column"
        // gap={1}
        backgroundColor={theme.theme.background}
        // padding={1}
        width="100%"
        height="100%"
        onMouseUp={async () => {
          const text = renderer.getSelection()?.getSelectedText()
          if (text && text.length > 0) {
            const base64 = Buffer.from(text).toString("base64")
            const osc52 = `\x1b]52;c;${base64}\x07`
            const finalOsc52 = process.env["TMUX"] ? `\x1bPtmux;\x1b${osc52}\x1b\\` : osc52
            /* @ts-expect-error */
            renderer.writeOut(finalOsc52)
            await Clipboard.copy(text)
              .then(() => toast.show({ message: "Copied to clipboard", variant: "info" }))
              .catch(toast.error)
            renderer.clearSelection()
          }
        }}
      >
        <box flexDirection="row" flexGrow={1}>
          <box flexGrow={1} flexDirection="row">
            <Sidebar />
            <Main />
          </box>
        </box>
        <Keybinds />
      </box>
    </>
  )
}
