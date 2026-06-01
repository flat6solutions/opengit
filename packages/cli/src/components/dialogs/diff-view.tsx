import { DialogSelect } from "@ui/dialog-select"
import { useApplication } from "@context/application"
import { useDialog } from "@ui/dialog"
import { useKV } from "@context/kv"

export default function DiffViewDialog() {
  const app = useApplication()
  const dialog = useDialog()
  const kv = useKV()

  const options = [
    {
      title: "Split",
      value: "split" as const,
      description: "Side-by-side diff view",
    },
    {
      title: "Unified",
      value: "unified" as const,
      description: "Single column diff view",
    },
  ]

  return (
    <DialogSelect
      title="Diff View"
      flat
      skipFilter
      options={options}
      current={app.config.diffView}
      onSelect={(opt) => {
        app.setConfig({ ...app.config, diffView: opt.value })
        kv.set("diffView", opt.value)
        dialog.clear()
      }}
    />
  )
}
