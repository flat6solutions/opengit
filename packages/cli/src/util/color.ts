import { useTheme } from "@context/theme"

export function getNameStatusColor(v: string | undefined) {
  const theme = useTheme().theme

  switch (v) {
    case "??":
      return theme.info
    case " M":
      return theme.accent
    case "A ":
    case "R ":
    case "M ":
    case "D ":
      return theme.success
    case " D":
    case "AM":
    case "MM":
      return theme.error
    case "UA":
    case "UU":
    case "DU":
      return theme.warning
    case undefined:
      return theme.textMuted
    default:
      return theme.textMuted
  }
}
