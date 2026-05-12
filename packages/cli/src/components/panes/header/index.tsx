import { createEffect, createSignal } from "solid-js"
import { useTheme } from "@context/theme"
import { Git } from "@lib/git"
import { Pane } from "@ui/pane"

export default function Header() {
  const theme = useTheme().theme
  const [reponame, setReponame] = createSignal("")
  const [branch, setBranch] = createSignal("")

  async function setup() {
    const repoName = (await Git.getRepoName()) ?? ""
    const branch = (await Git.getCurrentBranch()) ?? ""
    setReponame(repoName)
    setBranch(branch)
  }

  createEffect(() => {
    setup()
  })

  return (
    <Pane borderColor={theme.border} height={4}>
      <box
        flexDirection="row"
        alignItems="center"
        justifyContent="flex-start"
        gap={2}
        paddingLeft={1}
        paddingRight={1}
        paddingBottom={1}
        height={3}
      >
        <box flexDirection="column">
          <text fg={theme.textMuted}>Repo</text>
          <text fg={theme.text} truncate={false} wrapMode="none" height={1}>
            {reponame()}
          </text>
        </box>
        <box flexDirection="column">
          <text fg={theme.textMuted}>Branch</text>
          <text fg={theme.text} truncate={false} wrapMode="none" height={1}>
            {branch()}
          </text>
        </box>
      </box>
    </Pane>
  )
}
