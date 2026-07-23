import { useTheme } from "@context/theme"
import { useToast } from "@context/toast"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import { Git } from "@lib/git"
import { type File } from "@context/application"

interface DiscardDialogProps {
  file?: File
  all?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function DiscardDialog({
  file,
  all,
  onConfirm,
}: DiscardDialogProps) {
  const theme = useTheme().theme
  const toast = useToast()

  useKeyboard(key => {
    if (key.name === "return") {
      submit()
    }
  })

  async function submit() {
    const res = all
      ? await Git.discardAllFiles()
      : await Git.discardFile(file!.path, file!.status)
    
    if (res.error) {
      toast.error(`Failed to discard: ${res.error}`)
      console.error("Failed to discard", res.error)
    }

    onConfirm()
  }

  return (
    <box
      paddingBottom={1}
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
        <text fg={theme.text} attributes={TextAttributes.BOLD}>Discard {all ? "all changes" : "changes"}?</text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box
        paddingLeft={4}
        paddingRight={4}
        marginBottom={1}
        flexDirection="column"
        gap={1}
      >
        <text fg={theme.textMuted}>
          {all ? "Discard all unstaged changes and untracked files?" : "Are you sure you want to discard changes to:"}
        </text>
        <text fg={theme.error}>{all ? "This cannot be undone." : `[*] ${file!.path}`}</text>
      </box>
      <box
        paddingLeft={4}
        paddingRight={4}
        width="100%"
        flexDirection="row"
        alignItems="flex-end"
        justifyContent="flex-end"
        gap={1}
      >
        <text fg={theme.text}>enter</text>
        <text fg={theme.textMuted}>confirm</text>
      </box>
    </box>
  )
}
