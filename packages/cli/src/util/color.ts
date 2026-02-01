import { useTheme } from "@context/theme"

export function getNameStatusColor(v: string | undefined) {
    const theme = useTheme().theme

    switch (v) {
        case "M ":
            return theme.success
        case "M":
            return theme.success
        case " M":
            return theme.error
        case "??":
            return theme.error
        case undefined:
            return theme.textMuted
        default:
            return theme.textMuted
    }
}
