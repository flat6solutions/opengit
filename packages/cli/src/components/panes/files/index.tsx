import { createEffect, createMemo, createSignal, onMount, onCleanup, For, Show } from "solid-js"
import type { ScrollBoxRenderable } from "@opentui/core"
import { useKeybind } from "@context/keybind"
import { useTheme } from "@context/theme"
import { useKeyboard } from "@opentui/solid"
import { getNameStatusColor } from "@util/color"
import { Pane } from "@ui/pane"
import { useApplication } from "@context/application"
import type { File } from "@context/application"
import { Git } from "@lib/git"
import { useDialog } from "@ui/dialog"
import DiscardDialog from "@components/dialogs/discard"

type Row =
  | { type: "directory"; path: string }
  | { type: "file"; file: File; fileIndex: number; name: string }

export default function Files() {
  const app = useApplication()
  const dialog = useDialog()
  const theme = useTheme().theme
  const keybind = useKeybind()
  const active = () => app.config.activePane === "files"

  const [files, setFiles] = createSignal<Array<File>>([])
  const [selected, setSelected] = createSignal(0)
  const [loaded, setLoaded] = createSignal(false)
  const restorePath = app.file.path

  let fileListScrollbox: ScrollBoxRenderable | undefined

  const rows = createMemo(() =>
    files().flatMap((file, index, list): Row[] => {
      const parts = file.path.split("/")
      const path = parts.slice(0, -1).join("/")
      const previous = list[index - 1]
      const previousPath = previous ? previous.path.split("/").slice(0, -1).join("/") : undefined
      const row = { type: "file" as const, file, fileIndex: index, name: parts[parts.length - 1] }

      if (path === previousPath) return [row]
      if (!path) return [row]
      return [{ type: "directory", path }, row]
    }),
  )

  const fileCount = createMemo(() => files().length)

  async function getFiles() {
    const out = await Bun.$`git status --porcelain -z --untracked-files=all --find-renames=50%`.quiet().nothrow()
    const text = out.text()

    const entries = text.split("\x00").filter(Boolean)

    const files: Array<{ status: string; path: string; previousPath?: string }> = []

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]

      const status = entry.slice(0, 2)
      const path = entry.slice(3)

      if (status.startsWith("R") || status.startsWith("C")) {
        const previousPath = entries[i + 1]
        files.push({ status, path, previousPath })
        i++
      } else {
        files.push({ status, path })
      }
    }

    const counted = await Promise.all(
      files.map(async (file) => {
        const counts = Git.getLineCounts(await Git.getDiff(file.path, file.status))
        return { ...file, ...counts }
      }),
    )
    const sorted = counted.sort((a, b) => a.path.localeCompare(b.path))
    setFiles(sorted)
    if (!loaded()) {
      const idx = restorePath ? sorted.findIndex((f) => f.path === restorePath) : -1
      if (idx >= 0) setSelected(idx)
      setLoaded(true)
    }
  }

  useKeyboard(async (event) => {
    if (dialog.stack.length > 0) return
    if (app.config.activePane !== "files") return

    if (keybind.match("next", event)) {
      if (selected() >= fileCount() - 1) return
      setSelected(selected() + 1)
      return
    }

    if (keybind.match("previous", event)) {
      if (selected() <= 0) return
      setSelected(selected() - 1)
      return
    }

    if (keybind.match("discard_file", event)) {
      const file = files()[selected()]
      if (!file) return
      dialog.replace(() => (
        <DiscardDialog
          file={file}
          onConfirm={async () => {
            await getFiles()
            dialog.clear()
          }}
          onCancel={() => {}}
        />
      ))
      return
    }

    if (keybind.match("discard_all_files", event)) {
      if (files().length === 0) return
      dialog.replace(() => (
        <DiscardDialog
          all
          onConfirm={async () => {
            await getFiles()
            dialog.clear()
          }}
          onCancel={() => {}}
        />
      ))
      return
    }

    if (keybind.match("stage_unstage_file", event)) {
      if (Git.isFileStaged(app.file.status)) {
        await Git.unstageFile(app.file.path)
      } else {
        await Git.stageFile(app.file.path)
      }

      await getFiles()
      return
    }
  })

  createEffect(() => {
    const count = fileCount()
    if (count === 0) {
      setSelected(0)
    } else if (selected() >= count) {
      setSelected(count - 1)
    }
  })

  createEffect(() => {
    if (!loaded()) return
    if (fileCount() > 0) {
      const file = files()[selected()] || { status: "", path: "" }
      app.setFile(file)
    } else {
      app.setFile({ status: "", path: "" })
    }
  })

  createEffect(() => {
    selected()
    const scrollbox = fileListScrollbox
    if (!scrollbox) return

    const selectedRowIndex = rows().findIndex((row) => row.type === "file" && row.fileIndex === selected())
    if (selectedRowIndex < 0) return

    const viewportHeight = Math.max(1, scrollbox.viewport.height)
    const visibleStart = scrollbox.scrollTop
    const visibleEnd = visibleStart + viewportHeight - 1
    const minVisibleIndex = visibleStart
    const maxVisibleIndex = visibleEnd
    const maxScrollTop = Math.max(0, scrollbox.scrollHeight - viewportHeight)

    if (selectedRowIndex < minVisibleIndex) {
      scrollbox.scrollTo(selectedRowIndex)
      return
    }

    if (selectedRowIndex > maxVisibleIndex) {
      const targetScrollTop = selectedRowIndex - (viewportHeight - 1)
      const clampedScrollTop = Math.min(maxScrollTop, Math.max(0, targetScrollTop))
      if (clampedScrollTop !== visibleStart) {
        scrollbox.scrollTo(clampedScrollTop)
      }
    }
  })

  onMount(() => {
    getFiles()
    const interval = setInterval(getFiles, 1000)
    onCleanup(() => clearInterval(interval))
  })

  return (
    <Pane
      borderColor={theme.border}
      subtitle={files().length > 0 ? `${selected() + 1}/${fileCount().toString()}` : undefined}
      active={active()}
      open={active()}
      fill={active()}
      flexGrow={active() ? 1 : 0}
    >
      <box width="100%" height="100%">
        <Show when={files().length === 0}>
          <box paddingLeft={1} paddingRight={1}>
            <text fg={theme.textMuted}>Working directory clean</text>
          </box>
        </Show>
        <Show when={rows().length > 0}>
          <scrollbox
            width="100%"
            height="100%"
            ref={(r) => {
              fileListScrollbox = r
            }}
          >
            <For each={rows()}>
              {(row) => {
                if (row.type === "directory") {
                  return (
                    <box
                      flexDirection="row"
                      backgroundColor={theme.backgroundPanel}
                      paddingLeft={1}
                      paddingRight={1}
                      height={1}
                    >
                      <text fg={theme.textMuted} wrapMode="none" truncate={true}>
                        {row.path}/
                      </text>
                    </box>
                  )
                }

                return (
                  <box
                    flexDirection="row"
                    justifyContent="space-between"
                    backgroundColor={row.fileIndex === selected() ? theme.border : theme.backgroundPanel}
                    paddingLeft={1}
                    paddingRight={1}
                    height={1}
                  >
                    <box flexDirection="row" gap={2} flexGrow={1}>
                      <text fg={getNameStatusColor(row.file.status || "")}>{row.file.status}</text>
                      <text fg={theme.text} wrapMode="none" truncate={true}>
                        {row.name}
                      </text>
                    </box>
                    <box flexDirection="row" gap={1}>
                      {(row.file.added || 0) > 0 && <text fg={theme.success}>+{row.file.added}</text>}
                      {(row.file.removed || 0) > 0 && <text fg={theme.error}>-{row.file.removed}</text>}
                    </box>
                  </box>
                )
              }}
            </For>
          </scrollbox>
        </Show>
      </box>
    </Pane>
  )
}
