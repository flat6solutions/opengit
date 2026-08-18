import { z } from "zod"
import { createStore } from "solid-js/store"
import { createSimpleContext } from "./helper"
import { KeybindsConfig } from "@/util/config"
import { useKV } from "./kv"
import { onCleanup, onMount } from "solid-js"
import { Git } from "@lib/git"
import { Opencode } from "@lib/opencode"

type Panes = "files"
type View = "diff" | "code"
const DiffView = z.enum(["split", "unified"])
export type DiffView = z.infer<typeof DiffView>
const AIModel = z.object({
  providerID: z.string(),
  modelID: z.string(),
})
export type AIModel = z.infer<typeof AIModel>

type Config = {
  theme?: string
  activePane: Panes
  mainView: View
  diffView: DiffView
  diffWrap: boolean
  diffDimStaged: boolean
  keybinds: KeybindsConfig
  aiEnabled: boolean
  aiModel: AIModel
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
        diffDimStaged: z.boolean().catch(true).parse(kv.get("diff_dim_staged")),
        keybinds: KeybindsConfig.parse({}),
        theme: kv.get("theme", "opencode"),
        aiEnabled: false,
        aiModel: AIModel.catch(Opencode.defaultModel).parse(kv.get("ai_model")),
      },
    })

    let pending: Promise<void> | undefined

    function loadFiles() {
      pending = (async () => {
        setStore(
          "files",
          (await Git.getChangedFiles()).sort((a, b) => a.path.localeCompare(b.path)),
        )
        setStore("filesLoaded", true)
        setStore("filesError", false)
      })()
        .catch(() => {
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
      loadFiles()
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
      setDiffDimStaged(v: boolean) {
        setStore("config", "diffDimStaged", v)
        return kv.set("diff_dim_staged", v)
      },
      setAiModel(v: AIModel) {
        setStore("config", "aiModel", v)
        return kv.set("ai_model", v)
      },
      refreshFiles,
      setConfig: (v: Config) => setStore("config", v),
    }
  },
})
