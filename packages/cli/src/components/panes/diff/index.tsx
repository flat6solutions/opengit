import { createEffect, createMemo, createSignal, Show, on, onCleanup } from "solid-js"
import { useApplication, type File } from "@context/application"
import { Pane } from "@ui/pane"
import { useTheme } from "@context/theme"
import { filetype } from "@util/code"
import { Git } from "@lib/git"
import { watchFile, unwatchFile } from "fs"
import { join } from "path"
import KeybindHelper from "@components/keybind-helper"

export default function Diff() {
  const app = useApplication()
  const { theme, syntax } = useTheme()

  const [diff, setDiff] = createSignal("")
  const [watchedPath, setWatchedPath] = createSignal<string | null>(null)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const counts = createMemo(() => Git.getLineCounts(diff()))

  const subtitle = createMemo(() => {
    const d = diff()
    if (!d) return undefined
    const c = counts()
    if (c.added === 0 && c.removed === 0) return undefined
    return (
      <box flexDirection="row" gap={1} paddingRight={1}>
        {c.added > 0 && <text fg={theme.success}>+{c.added}</text>}
        {c.removed > 0 && <text fg={theme.error}>-{c.removed}</text>}
      </box>
    )
  })

  async function refreshDiff(file: File) {
    const diff = await Git.getDiff(file.path, file.status)
    setDiff(diff)
  }

  async function setup(file: File) {
    const existing = watchedPath()
    if (existing) {
      unwatchFile(existing)
    }

    if (!file || !file.path) return

    const root = await Git.getGitRoot()
    const absolutePath = join(root, file.path)

    watchFile(absolutePath, { interval: 200 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        if (debounceTimer) clearTimeout(debounceTimer)

        debounceTimer = setTimeout(() => {
          refreshDiff(file)
        }, 150)
      }
    })

    setWatchedPath(absolutePath)
  }

  createEffect(
    on(
      () => app.file.path,
      () => {
        const file = app.file
        if (file && file.path) {
          refreshDiff(file)
          setup(file)
        } else {
          setDiff("")
          const existing = watchedPath()
          if (existing) {
            unwatchFile(existing)
            setWatchedPath(null)
          }
        }
      },
    ),
  )

  onCleanup(() => {
    const existing = watchedPath()
    if (existing) unwatchFile(existing)
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  return (
    <Pane borderColor={theme.backgroundPanel} title="Diff" subtitle={subtitle()}>
      <box width="100%" height="100%" paddingLeft={1} paddingRight={1} flexDirection="column" gap={1}>
        <Show when={!diff()} keyed>
          <box>
            <text fg={theme.textMuted}>No changes to display</text>
          </box>
        </Show>
        <Show when={diff()} keyed>
          {(d: string) => (
            <>
              <scrollbox width="100%" height="100%" scrollX={true}>
                <diff
                  keyed
                  diff={d}
                  view="unified"
                  filetype={filetype(app.file.path)}
                  syntaxStyle={syntax()}
                  showLineNumbers={true}
                  width="100%"
                  fg={theme.text}
                  // addedBg={theme.diffAddedBg}
                  addedBg="#1F3025"
                  // removedBg={theme.diffRemovedBg}
                  removedBg="#372526"
                  contextBg={theme.diffContextBg}
                  // addedSignColor={theme.diffHighlightAdded}
                  addedSignColor="#88d39b"
                  // removedSignColor={theme.diffHighlightRemoved}
                  removedSignColor="#f0a0a0"
                  lineNumberFg={theme.diffLineNumber}
                  lineNumberBg={theme.diffContextBg}
                  // addedLineNumberBg={theme.diffAddedLineNumberBg}
                  addedLineNumberBg="#1F3025"
                  // removedLineNumberBg={theme.diffRemovedLineNumberBg}
                  removedLineNumberBg="#372526"
                />
              </scrollbox>
              <KeybindHelper label="View File" key="trigger_diff" />
            </>
          )}
        </Show>
      </box>
    </Pane>
  )
}
