import { createEffect, createMemo, createSignal, For, Show, untrack } from "solid-js"
import type { ScrollBoxRenderable } from "@opentui/core"
import { useKeybind } from "@context/keybind"
import { tint, useTheme } from "@context/theme"
import { useKeyboard } from "@opentui/solid"
import { getNameStatusColor } from "@util/color"
import { Pane } from "@ui/pane"
import { useApplication } from "@context/application"
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

export default function Files(props: { visible: boolean }) {
  const app = useApplication()
  const dialog = useDialog()
  const theme = useTheme().theme
  const keybind = useKeybind()
  const active = () => app.config.activePane === "files"
  const faded = () => tint(theme.text, theme.background, 0.75)
  const restorePath = app.file.path

  const [highlighted, setHighlighted] = createSignal(restorePath)
  const [collapsed, setCollapsed] = createSignal<ReadonlySet<string>>(new Set())
  const [loaded, setLoaded] = createSignal(false)

  let fileListScrollbox: ScrollBoxRenderable | undefined
  let previous: string[] = []

  const files = () => app.files
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

  useKeyboard(async (event) => {
    if (dialog.stack.length > 0) return
    if (!props.visible) return
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
            await app.refreshFiles()
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
            await app.refreshFiles()
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

      await app.refreshFiles()
      return
    }
  })

  createEffect(() => {
    const next = rows()
    const all = allRows()
    const path = highlighted()
    if (!app.filesLoaded) return

    const index = previous.indexOf(path)
    previous = next.map((node) => node.fullPath)
    const first = all.find((node) => node.type === "file")

    if (!loaded()) {
      const restored = all.find((node) => node.fullPath === restorePath && node.type === "file")
      const target = restored ?? first
      setHighlighted(target?.fullPath ?? "")
      app.setFile(getFile(target) ?? { status: "", path: "" })
      setLoaded(true)
      return
    }

    const visible = next.find((node) => node.fullPath === path)
    if (!visible) {
      const target = next[Math.max(0, Math.min(next.length - 1, index))]
      setHighlighted(target?.fullPath ?? "")
      app.setFile(getFile(target) ?? getFile(first) ?? { status: "", path: "" })
      return
    }

    const current = all.find((node) => node.type === "file" && node.fullPath === untrack(() => app.file.path))
    app.setFile(getFile(visible) ?? getFile(current) ?? getFile(first) ?? { status: "", path: "" })
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

  return (
    <Pane
      subtitle={selected() >= 0 ? `${selected() + 1}/${fileCount().toString()}` : undefined}
      active={active()}
      open={active()}
      fill={active()}
      flexGrow={active() ? 1 : 0}
      contentPadding={0}
    >
      <box width="100%" height="100%">
        <Show when={app.filesLoaded && !app.filesError && files().length === 0}>
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
                    backgroundColor={row.fullPath === highlighted() ? theme.primary : theme.background}
                    paddingLeft={1}
                    paddingRight={1}
                    height={1}
                    onMouseUp={() => {
                      setHighlighted(row.fullPath)
                      if (row.type === "directory") toggle(row.fullPath)
                    }}
                  >
                    <box flexDirection="row" flexGrow={1} minWidth={0}>
                      <text
                        fg={row.fullPath === highlighted() ? theme.background : faded()}
                        wrapMode="none"
                        flexShrink={0}
                      >
                        {treePrefix(row, collapsed())}
                      </text>
                      <text
                        fg={
                          row.fullPath === highlighted()
                            ? theme.background
                            : row.type === "directory"
                              ? theme.textMuted
                              : theme.text
                        }
                        wrapMode="none"
                        truncate
                      >
                        {row.name}
                      </text>
                    </box>
                    <Show when={row.type === "file"}>
                      <text
                        flexShrink={0}
                        fg={
                          row.fullPath === highlighted()
                            ? theme.background
                            : getNameStatusColor(row.status || "")
                        }
                      >
                        {row.status}
                      </text>
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
