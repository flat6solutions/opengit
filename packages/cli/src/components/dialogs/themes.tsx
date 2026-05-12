import { DialogSelect, type DialogSelectRef } from "@ui/dialog-select"
import { useTheme } from "@context/theme"
import { useApplication } from "@context/application"
import { useDialog } from "@ui/dialog"
import { useToast } from "@context/toast"
import { onCleanup } from "solid-js"

export default function ThemesDialog() {
  const app = useApplication()
  const theme = useTheme()
  const dialog = useDialog()
  const toast = useToast()

  const options = Object.keys(theme.all())
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((value) => ({
      title: value,
      value,
    }))

  const initial = app.config.theme ?? theme.selected
  let confirmed = false
  let ref: DialogSelectRef<string>

  onCleanup(() => {
    if (!confirmed && initial) theme.set(initial)
  })

  return (
    <DialogSelect
      title="Themes"
      options={options}
      current={initial}
      onFilter={(query) => {
        if (query.length === 0) {
          if (initial) {
            app.setConfig({ ...app.config, theme: initial })
            theme.set(initial)
          }
          return
        }
        const first = ref.filtered[0]
        if (first) {
          app.setConfig({ ...app.config, theme: first.value })
          theme.set(first.value)
        }
      }}
      onMove={(opt) => {
        app.setConfig({ ...app.config, theme: opt.value })
        theme.set(opt.value)
      }}
      onSelect={(opt) => {
        app.setConfig({ ...app.config, theme: opt.value })
        theme
          .set(opt.value)
          .then(() => {
            confirmed = true
            dialog.clear()
          })
          .catch((error) => {
            toast.show({ message: "Failed to save theme", variant: "error" })
            console.error("Failed to save theme", error)
          })
      }}
      ref={(r) => {
        ref = r
      }}
    />
  )
}
