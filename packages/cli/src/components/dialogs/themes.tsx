import { createEffect, createMemo, createSignal, For, onCleanup } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "@context/theme"
import { useApplication } from "@context/application"
import { useKeyboard } from "@opentui/solid"
import { useKeybind } from "@context/keybind"
import { useDialog } from "@ui/dialog"
import { useToast } from "@context/toast"

export default function ThemesDialog() {
  const app = useApplication()
  const theme = useTheme()
  const keybind = useKeybind()
  const dialog = useDialog()
  const toast = useToast()
  const colors = theme.theme
  const names = createMemo(() => Object.keys(theme.all()))
  const original = app.config.theme ?? theme.selected

  const [selected, setSelected] = createSignal(Math.max(0, names().indexOf(app.config.theme ?? theme.selected)))
  const [saved, setSaved] = createSignal(false)
  const [loading, setLoading] = createSignal(false)

  async function submit() {
    if (loading()) return

    const name = names()[selected()]
    if (!name) return

    setLoading(true)
    try {
      app.setConfig({ ...app.config, theme: name })
      await theme.set(name)
      setSaved(true)
      dialog.clear()
    } catch (error) {
      toast.show({ message: "Failed to save theme", variant: "error" })
      console.error("Failed to save theme", error)
    } finally {
      setLoading(false)
    }
  }

  useKeyboard((key) => {
    if (keybind.match("next", key)) {
      if (selected() < names().length - 1) {
        setSelected(selected() + 1)
      }
      return
    }

    if (keybind.match("previous", key)) {
      if (selected() > 0) {
        setSelected(selected() - 1)
      }
      return
    }

    if (keybind.match("confirm", key) || key.name === "return") {
      key.preventDefault()
      key.stopPropagation()
      submit()
    }
  })

  createEffect(() => {
    const name = names()[selected()]
    if (!name) return
    app.setConfig({ ...app.config, theme: name })
  })

  onCleanup(() => {
    if (saved()) return
    if (!original) return
    app.setConfig({ ...app.config, theme: original })
  })

  return (
    <box
      paddingBottom={2}
      gap={1}
    >
      <box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        paddingLeft={4}
        paddingRight={4}
        marginBottom={1}
      >
        <text fg={colors.text} attributes={TextAttributes.BOLD}>Themes</text>
        <text fg={colors.textMuted}>esc</text>
      </box>
      <box paddingLeft={1} paddingRight={1} flexDirection="column" gap={0}>
        <For each={names()}>
          {(name, index) => {
            const selectedGlobalTheme = app.config.theme === name
            return (
              <box
                flexDirection="row"
                alignItems="center"
                justifyContent="flex-start"
                gap={1}
                paddingLeft={selectedGlobalTheme ? 2 : 4}
                paddingRight={4}
                backgroundColor={selected() === index() ? colors.primary : undefined}
              >
                {selectedGlobalTheme && (
                  <text fg={selected() === index() ? colors.backgroundElement : colors.text}>●</text>
                )}
                <text
                  fg={selected() === index() ? colors.backgroundElement : colors.text}
                  attributes={selected() === index() ? TextAttributes.BOLD : undefined}
                >
                  {name}
                </text>
              </box>
            )
          }}
        </For>
      </box>
    </box>
  )
}
