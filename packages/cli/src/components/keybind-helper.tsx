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

  return (
    <box flexDirection="row" gap={1}>
      <text fg={theme.text}>{keybind.print(props.key)}</text>
      <text fg={theme.textMuted}>{props.label}</text>
    </box>
  )
}
