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
import { buildFileTree, flatIndexFromFileIndex, flattenTree, getFileCount, getFileByIndex } from "@util/tree"

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

  const flatNodes = createMemo(() => {
    const tree = buildFileTree(files())
    return flattenTree(tree)
  })

  const fileCount = createMemo(() => getFileCount(flatNodes()))

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

    const sorted = files.sort((a, b) => a.path.localeCompare(b.path))
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
      const file = getFileByIndex(flatNodes(), selected())
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
      const file = getFileByIndex(flatNodes(), selected()) || { status: "", path: "" }
      app.setFile(file)
    } else {
      app.setFile({ status: "", path: "" })
    }
  })

  createEffect(() => {
    selected()
    const scrollbox = fileListScrollbox
    if (!scrollbox) return

    const selectedFlatIndex = flatIndexFromFileIndex(flatNodes(), selected())
    if (selectedFlatIndex < 0) return

    const viewportHeight = Math.max(1, scrollbox.viewport.height)
    const visibleStart = scrollbox.scrollTop
    const visibleEnd = visibleStart + viewportHeight - 1
    const minVisibleIndex = visibleStart
    const maxVisibleIndex = visibleEnd
    const maxScrollTop = Math.max(0, scrollbox.scrollHeight - viewportHeight)

    if (selectedFlatIndex < minVisibleIndex) {
      scrollbox.scrollTo(selectedFlatIndex)
      return
    }

    if (selectedFlatIndex > maxVisibleIndex) {
      const targetScrollTop = selectedFlatIndex - (viewportHeight - 1)
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
      borderColor={active() ? theme.border : theme.backgroundPanel}
      title="Files"
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
        <Show when={flatNodes().length > 0}>
          <scrollbox
            width="100%"
            height="100%"
            ref={(r) => {
              fileListScrollbox = r
            }}
          >
            <For each={flatNodes()}>
              {(node) => {
                const indent = node.depth * 1

                if (node.type === "directory") {
                  return (
                    <box
                      flexDirection="row"
                      backgroundColor={theme.backgroundPanel}
                      paddingLeft={1 + indent}
                      paddingRight={1}
                      height={1}
                    >
                      <text fg={theme.textMuted}>▾ {node.name}</text>
                    </box>
                  )
                }

                return (
                  <box
                    flexDirection="row"
                    gap={2}
                    backgroundColor={node.fileIndex === selected() ? theme.border : theme.backgroundPanel}
                    paddingLeft={1 + indent}
                    paddingRight={1}
                    height={1}
                  >
                    <text fg={getNameStatusColor(node.status!)}>{node.status}</text>
                    <text fg={theme.text} wrapMode="none" truncate={true}>
                      {node.name}
                    </text>
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
