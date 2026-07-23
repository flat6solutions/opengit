import { z } from "zod"
import { createStore } from "solid-js/store"
import { createSimpleContext } from "./helper"
import { KeybindsConfig } from "@/util/config"
import { useKV } from "./kv"
import { onCleanup, onMount } from "solid-js"
import { Git } from "@lib/git"

type Panes = "files"
type View = "diff" | "code"
const DiffView = z.enum(["split", "unified"])
export type DiffView = z.infer<typeof DiffView>

type Config = {
  theme?: string
  activePane: Panes
  mainView: View
  diffView: DiffView
  diffWrap: boolean
  keybinds: KeybindsConfig
  aiEnabled: boolean
}

const File = z.object({
  status: z.string(),
  path: z.string(),
  previousPath: z.string().optional(),
  added: z.number().optional(),
  removed: z.number().optional(),
})
export type File = z.infer<typeof File>

export const { use: useApplication, provider: ApplicationProvider } = createSimpleContext({
  name: "Application",
  init: () => {
    const kv = useKV()
    const [store, setStore] = createStore<{
      file: File
      files: File[]
      filesLoaded: boolean
      filesError: boolean
      branch: string
      config: Config
    }>({
      file: {
        status: "",
        path: "",
      },
      files: [],
      filesLoaded: false,
      filesError: false,
      branch: "",
      config: {
        activePane: "files",
        mainView: "diff",
        diffView: DiffView.catch("split").parse(kv.get("diff_view")),
        diffWrap: z.boolean().catch(true).parse(kv.get("diff_wrap")),
        keybinds: KeybindsConfig.parse({}),
        theme: kv.get("theme", "opencode"),
        aiEnabled: false,
      },
    })

    let pending: Promise<void> | undefined

    function loadFiles() {
      pending = (async () => {
        const out = await Bun.$`git status --porcelain -z --untracked-files=all --find-renames=50%`.quiet().nothrow()
        if (out.exitCode !== 0) {
          setStore("filesLoaded", true)
          setStore("filesError", true)
          return
        }

        const entries = out.text().split("\x00").filter(Boolean)
        const files: Array<{ status: string; path: string; previousPath?: string }> = []

        for (let index = 0; index < entries.length; index++) {
          const entry = entries[index]
          const status = entry.slice(0, 2)
          const path = entry.slice(3)

          if (status.startsWith("R") || status.startsWith("C")) {
            files.push({ status, path, previousPath: entries[index + 1] })
            index++
            continue
          }
          files.push({ status, path })
        }

        setStore(
          "files",
          (
            await Promise.all(
              files.map(async (file) => ({
                ...file,
                ...Git.getLineCounts(await Git.getDiffAll(file.path, file.status)),
              })),
            )
          ).sort((a, b) => a.path.localeCompare(b.path)),
        )
        setStore("filesLoaded", true)
        setStore("filesError", false)
      })()
        .catch((error) => {
          console.error("Failed to refresh changed files", error)
          setStore("filesLoaded", true)
          setStore("filesError", true)
        })
        .finally(() => {
          pending = undefined
        })
      return pending
    }

    function refreshFiles() {
      const current = pending
      if (!current) return loadFiles()
      return current.then(() => pending ?? loadFiles())
    }

    onMount(() => {
      refreshFiles()
      const interval = setInterval(() => {
        if (!pending) loadFiles()
      }, 1000)
      onCleanup(() => clearInterval(interval))
    })

    return {
      get file() {
        return store.file
      },
      get branch() {
        return store.branch
      },
      get files() {
        return store.files
      },
      get filesLoaded() {
        return store.filesLoaded
      },
      get filesError() {
        return store.filesError
      },
      get config() {
        return store.config
      },

      setFile(v: File) {
        setStore("file", v)
      },
      setBranch(v: string) {
        setStore("branch", v)
      },
      setDiffView(v: DiffView) {
        setStore("config", "diffView", v)
        return kv.set("diff_view", v)
      },
      setDiffWrap(v: boolean) {
        setStore("config", "diffWrap", v)
        return kv.set("diff_wrap", v)
      },
      refreshFiles,
      setConfig: (v: Config) => setStore("config", v),
    }
  },
})
