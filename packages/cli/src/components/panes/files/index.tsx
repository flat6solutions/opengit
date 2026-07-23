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
import {
  buildFileTree,
  firstTreeChild,
  flattenTree,
  getFile,
  moveTreeSelection,
  treeParent,
  treePrefix,
} from "@util/tree"

export default function Files() {
  const app = useApplication()
  const dialog = useDialog()
  const theme = useTheme().theme
  const keybind = useKeybind()
  const active = () => app.config.activePane === "files"
  const restorePath = app.file.path

  const [files, setFiles] = createSignal<Array<File>>([])
  const [highlighted, setHighlighted] = createSignal(restorePath)
  const [collapsed, setCollapsed] = createSignal<ReadonlySet<string>>(new Set())
  const [loaded, setLoaded] = createSignal(false)

  let fileListScrollbox: ScrollBoxRenderable | undefined

  const tree = createMemo(() => buildFileTree(files()))
  const rows = createMemo(() => flattenTree(tree(), collapsed()))
  const allRows = createMemo(() => flattenTree(tree()))
  const fileCount = createMemo(() => files().length)
  const selected = createMemo(() =>
    allRows()
      .filter((node) => node.type === "file")
      .findIndex((node) => node.fullPath === highlighted()),
  )

  const toggle = (path: string) => {
    const next = new Set(collapsed())
    if (next.has(path)) next.delete(path)
    else next.add(path)
    setCollapsed(next)
  }

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
    const previous = rows()
    const previousIndex = previous.findIndex((node) => node.fullPath === highlighted())
    setFiles(sorted)
    const focused = rows().find((node) => node.type === "file" && node.fullPath === highlighted())
    const current = allRows().find((node) => node.type === "file" && node.fullPath === app.file.path)
    const first = allRows().find((node) => node.type === "file")
    app.setFile(getFile(focused ?? current ?? first) ?? { status: "", path: "" })
    if (!loaded()) {
      const restored = allRows().find((node) => node.fullPath === restorePath && node.type === "file")
      setHighlighted(restored?.fullPath ?? first?.fullPath ?? "")
      setLoaded(true)
      return
    }

    if (rows().some((node) => node.fullPath === highlighted())) return
    setHighlighted(rows()[Math.max(0, Math.min(rows().length - 1, previousIndex))]?.fullPath ?? "")
  }

  useKeyboard(async (event) => {
    if (dialog.stack.length > 0) return
    if (app.config.activePane !== "files") return

    if (keybind.match("next", event)) {
      setHighlighted(moveTreeSelection(rows(), highlighted(), 1))
      return
    }

    if (keybind.match("previous", event)) {
      setHighlighted(moveTreeSelection(rows(), highlighted(), -1))
      return
    }

    const node = rows().find((node) => node.fullPath === highlighted())

    if (keybind.match("tree_expand", event)) {
      if (node?.type !== "directory") return
      if (collapsed().has(node.fullPath)) {
        toggle(node.fullPath)
        return
      }
      setHighlighted(firstTreeChild(rows(), node.fullPath))
      return
    }

    if (keybind.match("tree_collapse", event)) {
      if (node?.type === "directory" && !collapsed().has(node.fullPath)) {
        toggle(node.fullPath)
        return
      }
      setHighlighted(treeParent(rows(), highlighted()))
      return
    }

    if (keybind.match("confirm", event) && node?.type === "directory") {
      toggle(node.fullPath)
      return
    }

    if (keybind.match("discard_file", event)) {
      const file = getFile(node)
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
      const file = getFile(node)
      if (!file) return
      if (Git.isFileStaged(file.status)) {
        await Git.unstageFile(file.path)
      } else {
        await Git.stageFile(file.path)
      }

      await getFiles()
      return
    }
  })

  createEffect(() => {
    if (!loaded()) return
    const file = getFile(rows().find((node) => node.fullPath === highlighted()))
    if (file) {
      app.setFile(file)
      return
    }
    if (fileCount() === 0) {
      app.setFile({ status: "", path: "" })
    }
  })

  createEffect(() => {
    highlighted()
    const scrollbox = fileListScrollbox
    if (!scrollbox) return

    const selectedRowIndex = rows().findIndex((row) => row.fullPath === highlighted())
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
      subtitle={selected() >= 0 ? `${selected() + 1}/${fileCount().toString()}` : undefined}
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
                return (
                  <box
                    flexDirection="row"
                    justifyContent="space-between"
                    backgroundColor={row.fullPath === highlighted() ? theme.border : theme.backgroundPanel}
                    paddingLeft={1}
                    paddingRight={1}
                    height={1}
                    onMouseUp={() => {
                      setHighlighted(row.fullPath)
                      if (row.type === "directory") toggle(row.fullPath)
                    }}
                  >
                    <box flexDirection="row" flexGrow={1} minWidth={0}>
                      <text fg={theme.textMuted} wrapMode="none" flexShrink={0}>
                        {treePrefix(row, collapsed())}
                      </text>
                      <text fg={row.type === "directory" ? theme.textMuted : theme.text} wrapMode="none" truncate>
                        {row.name}
                      </text>
                    </box>
                    <Show when={row.type === "file"}>
                      <box flexDirection="row" gap={1} flexShrink={0}>
                        {(row.added || 0) > 0 && <text fg={theme.success}>+{row.added}</text>}
                        {(row.removed || 0) > 0 && <text fg={theme.error}>-{row.removed}</text>}
                        <text fg={getNameStatusColor(row.status || "")}>{row.status}</text>
                      </box>
                    </Show>
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
