import { z } from "zod"
import { createStore } from "solid-js/store"
import { createSimpleContext } from "./helper"
import { KeybindsConfig } from "@/util/config"
import { useKV } from "./kv"

type Panes = "files"
type View = "diff" | "code"

type Config = {
  theme?: string
  activePane: Panes
  mainView: View
  keybinds: KeybindsConfig
  aiEnabled: boolean
}

const File = z.object({
  status: z.string(),
  path: z.string(),
  previousPath: z.string().optional(),
})
export type File = z.infer<typeof File>

export const { use: useApplication, provider: ApplicationProvider } = createSimpleContext({
  name: "Application",
  init: () => {
    const kv = useKV()
    const [store, setStore] = createStore<{
      file: File
      branch: string
      config: Config
    }>({
      file: {
        status: "",
        path: "",
      },
      branch: "",
      config: {
        activePane: "files",
        mainView: "diff",
        keybinds: KeybindsConfig.parse({}),
        theme: kv.get("theme", "opencode"),
        aiEnabled: false,
      },
    })

    return {
      get file() {
        return store.file
      },
      get branch() {
        return store.branch
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
      setConfig: (v: Config) => setStore("config", v),
    }
  },
})
