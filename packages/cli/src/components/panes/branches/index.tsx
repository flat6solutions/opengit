import { useApplication } from "@context/application"
import { useKeybind } from "@context/keybind"
import { useTheme } from "@context/theme"
import type { ScrollBoxRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import { Git, type Branch } from "@lib/git"
import { useDialog } from "@ui/dialog"
import { Pane } from "@ui/pane"
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js"

export default function Branches() {
  const theme = useTheme().theme
  const app = useApplication()
  const dialog = useDialog()
  const keybind = useKeybind()
  const active = () => app.config.activePane === "branches"

  const [branches, setBranches] = createSignal<Array<Branch>>([])
  const [selected, setSelected] = createSignal(0)
  let branchListScrollbox: ScrollBoxRenderable | undefined

  async function getBranches() {
    const list = await Git.getBranches()
    setBranches(list)

    const current = list.findIndex(branch => branch.name === app.branch)
    if (current >= 0) {
      setSelected(current)
      return
    }

    const head = list.findIndex(branch => branch.current)
    if (head >= 0) {
      const branch = list[head]
      if (!branch) return
      setSelected(head)
      app.setBranch(branch.name)
      return
    }

    if (list.length > 0) {
      const branch = list[0]
      if (!branch) return
      setSelected(0)
      app.setBranch(branch.name)
    }
  }

  useKeyboard(event => {
    if (dialog.stack.length > 0) return
    if (app.config.activePane !== "branches") return

    if (keybind.match("file_pane", event)) {
      app.setConfig({ ...app.config, activePane: "files" })
      return
    }

    if (keybind.match("next", event)) {
      if (selected() >= branches().length - 1) return
      setSelected(selected() + 1)
      return
    }

    if (keybind.match("previous", event)) {
      if (selected() <= 0) return
      setSelected(selected() - 1)
      return
    }
  })

  createEffect(() => {
    const branch = branches()[selected()]?.name ?? ""
    if (!branch) return
    if (app.branch === branch) return
    app.setBranch(branch)
  })

  createEffect(() => {
    selected()
    const scrollbox = branchListScrollbox
    if (!scrollbox) return

    const viewportHeight = Math.max(1, scrollbox.viewport.height)
    const visibleStart = scrollbox.scrollTop
    const visibleEnd = visibleStart + viewportHeight - 1
    const maxScrollTop = Math.max(0, scrollbox.scrollHeight - viewportHeight)

    if (selected() < visibleStart) {
      scrollbox.scrollTo(selected())
      return
    }

    if (selected() > visibleEnd) {
      const top = Math.min(maxScrollTop, Math.max(0, selected() - (viewportHeight - 1)))
      if (top !== visibleStart) {
        scrollbox.scrollTo(top)
      }
    }
  })

  onMount(() => {
    getBranches()
    const interval = setInterval(getBranches, 1000)
    onCleanup(() => clearInterval(interval))
  })

  return (
    <Pane
      borderColor={active() ? theme.border : theme.backgroundPanel}
      title="[2] Branches"
      subtitle={branches().length > 0 ? `${selected() + 1}/${branches().length.toString()}` : undefined}
      active={active()}
      open={active()}
      fill={active()}
      flexGrow={active() ? 1 : 0}
    >
      <box width="100%" height="100%">
        <Show when={branches().length === 0}>
          <box paddingLeft={1} paddingRight={1}>
            <text fg={theme.textMuted}>No branches to display</text>
          </box>
        </Show>
        <Show when={branches().length > 0}>
          <scrollbox width="100%" height="100%" ref={(r) => { branchListScrollbox = r }}>
            <For each={branches()}>
              {(branch, index) => (
                <box
                  flexDirection="row"
                  gap={1}
                  backgroundColor={
                    index() === selected() ? theme.border : theme.backgroundPanel
                  }
                  paddingLeft={1}
                  paddingRight={1}
                  height={1}
                >
                  <text fg={branch.current ? theme.success : theme.textMuted}>{branch.current ? "*" : " "}</text>
                  <text fg={index() === selected() ? theme.text : theme.textMuted} wrapMode="none" truncate={true}>{branch.name}</text>
                </box>
              )}
            </For>
          </scrollbox>
        </Show>
      </box>
    </Pane>
  )
}
