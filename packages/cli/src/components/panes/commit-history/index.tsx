import { useTheme } from "@context/theme"
import { Git, type Commit } from "@lib/git"
import type { ScrollBoxRenderable } from "@opentui/core"
import { Pane } from "@ui/pane"
import { useApplication } from "@context/application"
import { createEffect, createSignal, For, Match, onCleanup, Show, Switch } from "solid-js"

const size = 10

type Row =
  | { kind: "top", hash: string, refs: string }
  | { kind: "meta", label: string, value: string }
  | { kind: "subject", value: string }
  | { kind: "spacer" }

function toRows(commit: Commit): Array<Row> {
  return [
    { kind: "top", hash: commit.hash, refs: commit.refs },
    { kind: "meta", label: "Author:", value: `${commit.author} <${commit.email}>` },
    { kind: "meta", label: "Date:", value: commit.relative },
    { kind: "spacer" },
    { kind: "subject", value: commit.subject },
    { kind: "spacer" },
  ]
}

export default function CommitHistory() {
  const app = useApplication()
  const theme = useTheme().theme
  const [rows, setRows] = createSignal<Array<Row>>([])
  const [loading, setLoading] = createSignal(false)
  const [more, setMore] = createSignal(false)
  const [done, setDone] = createSignal(false)
  const [count, setCount] = createSignal(0)
  let run = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let next: ReturnType<typeof setTimeout> | undefined
  let box: ScrollBoxRenderable | undefined
  let off: (() => void) | undefined

  function clearBox() {
    off?.()
    off = undefined
    box = undefined
  }

  function queue(branch: string) {
    if (next) clearTimeout(next)
    next = setTimeout(() => {
      next = undefined
      void loadMore(branch)
    }, 0)
  }

  function bind(next: ScrollBoxRenderable) {
    clearBox()
    box = next
    const onChange = () => {
      void loadMore(app.branch)
    }
    next.verticalScrollBar.on("change", onChange)
    off = () => next.verticalScrollBar.off("change", onChange)
    queue(app.branch)
  }

  async function load(branch: string, skip: number) {
    return await Git.getCommits(branch, size, skip).catch(error => {
      console.log(`[commit-history] load error branch=${branch} skip=${skip} error=${error instanceof Error ? error.message : String(error)}`)
      return null
    })
  }

  async function setup(branch: string) {
    const id = ++run
    const start = Date.now()
    console.log(`[commit-history] setup start run=${id} branch=${branch}`)
    clearBox()
    setLoading(true)
    setMore(false)
    setDone(false)
    setCount(0)
    setRows([])
    const commits = await load(branch, 0)
    if (id !== run) {
      console.log(`[commit-history] setup stale run=${id} active=${run} branch=${branch} ms=${Date.now() - start}`)
      return
    }
    if (!commits) {
      setLoading(false)
      setRows([])
      return
    }
    setRows(commits.flatMap(toRows))
    setCount(commits.length)
    setDone(commits.length < size)
    setLoading(false)
    console.log(`[commit-history] setup end run=${id} branch=${branch} commits=${commits.length} rows=${rows().length} ms=${Date.now() - start}`)
    queue(branch)
  }

  async function loadMore(branch: string) {
    const scrollbox = box
    if (!scrollbox) return
    if (!branch) return
    if (loading()) return
    if (more()) return
    if (done()) return
    const max = Math.max(0, scrollbox.scrollHeight - scrollbox.viewport.height)
    if (scrollbox.scrollTop < max) return
    const id = run
    const skip = count()
    setMore(true)
    console.log(`[commit-history] more start run=${id} branch=${branch} skip=${skip}`)
    const commits = await load(branch, skip)
    if (id !== run || branch !== app.branch) return
    if (!commits) {
      setMore(false)
      return
    }
    setRows(rows => rows.concat(commits.flatMap(toRows)))
    setCount(skip + commits.length)
    setDone(commits.length < size)
    setMore(false)
    console.log(`[commit-history] more end run=${id} branch=${branch} loaded=${commits.length} total=${skip + commits.length}`)
    if (commits.length === 0) return
    queue(branch)
  }

  createEffect(() => {
    const branch = app.branch
    console.log(`[commit-history] effect branch=${branch}`)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      console.log(`[commit-history] debounce fire branch=${branch}`)
      void setup(branch)
    }, 200)
  })

  onCleanup(() => {
    if (timer) clearTimeout(timer)
    if (next) clearTimeout(next)
    clearBox()
  })

  return (
    <Pane title="Commit History" subtitle={app.branch || undefined} borderColor={theme.backgroundPanel}>
      <box height="100%" width="100%" paddingLeft={1} paddingRight={1}>
        <Show when={!loading() && rows().length === 0}>
          <box>
            <text fg={theme.textMuted}>No commits to display</text>
          </box>
        </Show>
        <Show when={loading() && rows().length === 0}>
          <box>
            <text fg={theme.textMuted}>Loading commits...</text>
          </box>
        </Show>
        <Show when={rows().length > 0}>
          <scrollbox width="100%" height="100%" ref={(r) => { bind(r) }}>
            <For each={rows()}>
              {row => (
                <box flexDirection="row" height={1} width="100%">
                  <Switch>
                    <Match when={row.kind === "top"}>
                      <box flexDirection="row" minWidth={0}>
                        <text fg={theme.warning} wrapMode="none">commit {row.kind === "top" ? row.hash : ""}</text>
                        <Show when={row.kind === "top" && row.refs.trim()}>
                          <text fg={theme.success} wrapMode="none"> {row.kind === "top" ? row.refs : ""}</text>
                        </Show>
                      </box>
                    </Match>
                    <Match when={row.kind === "meta"}>
                      <box flexDirection="row" minWidth={0}>
                        <text fg={theme.textMuted} wrapMode="none">{row.kind === "meta" ? row.label : ""} </text>
                        <text fg={theme.text} wrapMode="none" truncate={true}>{row.kind === "meta" ? row.value : ""}</text>
                      </box>
                    </Match>
                    <Match when={row.kind === "subject"}>
                      <text fg={theme.text} wrapMode="none" truncate={true}>  {row.kind === "subject" ? row.value : ""}</text>
                    </Match>
                    <Match when={row.kind === "spacer"}>
                      <text fg={theme.textMuted} wrapMode="none"> </text>
                    </Match>
                  </Switch>
                </box>
              )}
            </For>
            <Show when={more()}>
              <box height={1} width="100%">
                <text fg={theme.textMuted}>Loading more...</text>
              </box>
            </Show>
          </scrollbox>
        </Show>
      </box>
    </Pane>
  )
}
