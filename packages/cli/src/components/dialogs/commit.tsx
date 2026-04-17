import { createEffect, createSignal, Show } from "solid-js"
import { TextareaRenderable, TextAttributes } from "@opentui/core"
import { useTheme } from "@context/theme"
import { Git } from "@lib/git"
import { useKeyboard } from "@opentui/solid"
import { useKeybind } from "@context/keybind"
import { Spinner } from "@components/spinner"
import { useApplication } from "@context/application"
import { Opencode } from "@lib/opencode"
import { useToast } from "@context/toast"

interface DiscardDialogProps {
  onConfirm: () => void
}

const PROMPT = `
Generate a conventional commit message for the staged changes.
- Use format: <type>: <description>
- Types: feat, fix, docs, refactor, test, chore
- Keep it under 50 characters
- No scope parentheses
- Return only the message, nothing else
`

export default function CommitDialog({
  onConfirm,
}: DiscardDialogProps) {
  const app = useApplication()
  const theme = useTheme().theme
  const keybind = useKeybind()
  const toast = useToast()

  let input: TextareaRenderable

  const [files, setFiles] = createSignal<Array<string>>([])
  const [commitMessage, setCommitMessage] = createSignal<string>("")
  const [generatingMessage, setGeneratingMessage] = createSignal(false)
  const [loading, setLoading] = createSignal(false)

  async function setup() {
    const stagedFiles = await Git.getStagedFiles()
    setFiles(stagedFiles)
  }

async function submit() {
    if (loading()) return
    if (commitMessage().trim() === "") return

    setLoading(true)
    const res = await Git.commit(commitMessage())
    setLoading(false)

    if (res.error) {
      toast.show({ message: "Failed to commit", variant: "error" })
      console.error(res.error)
      return
    }

    onConfirm()
  }

  async function generateWithAi() {
    setGeneratingMessage(true)

    const diff = await Git.getDiffStaged()

    const p = PROMPT.concat("\n\n").concat(diff.join(""))

    const res = await Opencode.prompt(p)
      .then(v => v?.trim().split("\n")[0])

    setGeneratingMessage(false)
    
    if (res) {
      input.setText(res)
      input.cursorOffset = res.length
      setCommitMessage(res)
    }
  }

  createEffect(() => {
    setup()
  })

  useKeyboard(key => {
    if (files() && app.config.aiEnabled && keybind.match("trigger_generic_action", key)) {
      generateWithAi()
      return
    }

    if (key.name === "return" && !key.shift) {
      key.preventDefault()
      key.stopPropagation()
      submit()
    }
  })

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
        <text fg={theme.text} attributes={TextAttributes.BOLD}>Commit files</text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box
        paddingLeft={4}
        paddingRight={4}
        marginBottom={1}
        flexDirection="column"
        gap={1}
      >
        <Show when={files().length === 0}>
          <text fg={theme.textMuted}>No files to be commited</text>
        </Show>
        <Show when={files().length > 0}>
          <textarea
            focused
            placeholder={generatingMessage() ? "generating message with ai..." : "commit message..."}
            focusedTextColor={theme.text}
            minHeight={1}
            maxHeight={6}
            onContentChange={() => {
              if (generatingMessage()) return
              const value = input.plainText
              setCommitMessage(value)
            }}
            ref={(r: TextareaRenderable) => {
              input = r
              setTimeout(() => {
                if (!input || !input.isDestroyed) return
                input.focus()
                input.cursorColor = theme.text
              }, 0)
            }}
            cursorColor={theme.primary}
            focusedBackgroundColor={theme.backgroundPanel}
          />
          <Show when={app.config.aiEnabled}>
            <box flexDirection="row" gap={1}>
              <text fg={theme.text}>{keybind.print("trigger_generic_action")}</text>
              <text fg={theme.textMuted}>generate message with ai</text>
              <Show when={generatingMessage()}>
                <Spinner />
              </Show>
            </box>
          </Show>
        </Show>
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
        <Show when={loading()}>
          <Spinner />
        </Show>
        <text fg={theme.text}>enter</text>
        <text fg={theme.textMuted}>confirm</text>
      </box>
    </box>
  )
}
