import { DialogSelect } from "@ui/dialog-select"
import { useApplication } from "@context/application"
import { useTheme } from "@context/theme"
import { useToast } from "@context/toast"
import ThemesDialog from "./themes"
import ModelsDialog from "./models"

export default function SettingsDialog() {
  const app = useApplication()
  const theme = useTheme()
  const toast = useToast()

  const save = (result: Promise<number>, message: string) =>
    result.catch((error) => {
      toast.show({ message, variant: "error" })
      console.error(message, error)
    })

  return (
    <DialogSelect
      title="Settings"
      options={[
        {
          title: "Layout",
          footer: app.config.diffView === "split" ? "Split" : "Unified",
          value: "diff-view",
          category: "Diff",
          onSelect: () =>
            save(app.setDiffView(app.config.diffView === "split" ? "unified" : "split"), "Failed to save diff view"),
        },
        {
          title: "Wrapping",
          footer: app.config.diffWrap ? "On" : "Off",
          value: "diff-wrap",
          category: "Diff",
          onSelect: () => save(app.setDiffWrap(!app.config.diffWrap), "Failed to save word wrapping"),
        },
        {
          title: "Dim staged files",
          footer: app.config.diffDimStaged ? "On" : "Off",
          value: "diff-dim-staged",
          category: "Diff",
          onSelect: () =>
            save(app.setDiffDimStaged(!app.config.diffDimStaged), "Failed to save staged file appearance"),
        },
        {
          title: "Model",
          footer: `${app.config.aiModel.providerID}/${app.config.aiModel.modelID}`,
          value: "ai-model",
          category: "AI",
          onSelect: (dialog) => dialog.replace(() => <ModelsDialog />),
        },
        {
          title: "Theme",
          footer: theme.selected,
          value: "theme",
          category: "Appearance",
          onSelect: (dialog) => dialog.replace(() => <ThemesDialog />),
        },
        {
          title: "Color mode",
          footer: theme.mode() === "dark" ? "Dark" : "Light",
          value: "theme-mode",
          category: "Appearance",
          onSelect: () =>
            save(theme.setMode(theme.mode() === "dark" ? "light" : "dark"), "Failed to save appearance mode"),
        },
      ]}
    />
  )
}
