import { Global } from "@global"
import { createSignal, type Setter } from "solid-js"
import { createStore } from "solid-js/store"
import { createSimpleContext } from "./helper"
import path from "path"
import { Debug } from "@util/debug"

export const { use: useKV, provider: KVProvider } = createSimpleContext({
  name: "KV",
  init: () => {
    const [ready, setReady] = createSignal(false)
    const [store, setStore] = createStore<Record<string, any>>()
    const file = Bun.file(path.join(Global.Path.state, "kv.json"))

    Debug.log("kv init", { file: file.name })

    file
      .json()
      .then((x) => {
        Debug.log("kv loaded", { file: file.name })
        setStore(x)
      })
      .catch((error: unknown) => {
        Debug.error("kv load failed", error)
      })
      .finally(() => {
        Debug.log("kv ready", { file: file.name })
        setReady(true)
      })

    const result = {
      get ready() {
        return ready()
      },
      get store() {
        return store
      },
      signal<T>(name: string, defaultValue: T) {
        if (store[name] === undefined) setStore(name, defaultValue)
        return [
          function () {
            return result.get(name)
          },
          function setter(next: Setter<T>) {
            result.set(name, next)
          },
        ] as const
      },
      get(key: string, defaultValue?: any) {
        return store[key] ?? defaultValue
      },
      set(key: string, value: any) {
        setStore(key, value)
        return Bun.write(file, JSON.stringify(store, null, 2))
      },
    }
    return result
  },
})
