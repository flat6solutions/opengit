import { KVProvider } from "@context/kv"
import { ApplicationProvider, useApplication } from "@context/application"
import { ThemeProvider, useTheme } from "@context/theme"
import { KeybindProvider, useKeybind } from "@context/keybind"
import { Clipboard } from "@util/clipboard"
import { useKeyboard, useRenderer } from "@opentui/solid"
import { TextAttributes } from "@opentui/core"
import { useDialog, DialogProvider } from "@ui/dialog"
import { Toast, ToastProvider, useToast } from "@context/toast"
import Keybinds from "@components/keybinds"
import { createMemo, createSignal, Show, onMount } from "solid-js"
import { Opencode } from "@lib/opencode"
import { Git } from "@lib/git"
import Sidebar from "@components/sidebar"
import Main from "@components/main"
import ThemesDialog from "@components/dialogs/themes"
import SettingsDialog from "@components/dialogs/settings"
import { Frame } from "@ui/frame"

declare const OPENGIT_VERSION: string | undefined

export const version = typeof OPENGIT_VERSION === "undefined" ? "dev" : OPENGIT_VERSION

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
  const [sidebar, setSidebar] = createSignal(true)
  const count = () => app.files.length
  const changes = createMemo(() =>
    app.files.reduce(
      (total, file) => ({
        added: total.added + (file.added ?? 0),
        removed: total.removed + (file.removed ?? 0),
      }),
      { added: 0, removed: 0 },
    ),
  )

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

    if (keybind.match("settings_open", event)) {
      dialog.replace(() => <SettingsDialog />)
      return
    }

    if (keybind.match("diff_view_toggle", event)) {
      app.setDiffView(app.config.diffView === "split" ? "unified" : "split").catch((error) => {
        toast.show({ message: "Failed to save diff view", variant: "error" })
        console.error("Failed to save diff view", error)
      })
      return
    }

    if (keybind.match("trigger_sidebar", event)) {
      setSidebar(!sidebar())
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
        <box
          height={1}
          flexShrink={0}
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingLeft={1}
          paddingRight={1}
        >
          <box flexDirection="row">
            <text fg={theme.theme.text} attributes={TextAttributes.BOLD} wrapMode="none">
              OpenGit
            </text>
            <text fg={theme.theme.textMuted} wrapMode="none">
              {` ${version === "dev" ? version : `v${version}`}`}
            </text>
          </box>
          <Show
            when={app.filesLoaded && !app.filesError}
            fallback={
              <text fg={theme.theme.textMuted} wrapMode="none">
                {app.filesError ? "Unavailable" : "Loading..."}
              </text>
            }
          >
            <box flexDirection="row" gap={1}>
              <Show when={changes().added > 0}>
                <text fg={theme.theme.success} wrapMode="none">
                  +{changes().added}
                </text>
              </Show>
              <Show when={changes().removed > 0}>
                <text fg={theme.theme.error} wrapMode="none">
                  -{changes().removed}
                </text>
              </Show>
              <Show when={count() > 0}>
                <text fg={theme.theme.textMuted} wrapMode="none">
                  {`${count()} ${count() === 1 ? "file" : "files"}`}
                </text>
              </Show>
            </box>
          </Show>
        </box>
        <Frame sidebar={sidebar()} side={<Sidebar visible={sidebar()} />}>
          <Main />
        </Frame>
        <Keybinds />
      </box>
    </>
  )
}
