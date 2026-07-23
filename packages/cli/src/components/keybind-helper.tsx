import { useKeybind } from "@context/keybind"
import { useTheme } from "@context/theme"
import type { KeybindsConfig } from "@util/config"

interface Props {
  label: string
  key: keyof KeybindsConfig
}

export default function KeybindHelper(props: Props) {
  const theme = useTheme().theme
  const keybind = useKeybind()
  const key = () => keybind.print(props.key).replace(/^shift\+([a-z])$/, (_, key: string) => key.toUpperCase())

  return (
    <box flexDirection="row" gap={1}>
      <text fg={theme.text}>{key()}</text>
      <text fg={theme.textMuted}>{props.label}</text>
    </box>
  )
}
