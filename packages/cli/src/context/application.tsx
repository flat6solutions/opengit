import { z } from 'zod'
import { createStore } from 'solid-js/store';
import { createSimpleContext } from './helper'
import { KeybindsConfig } from '@/util/config';


type Config = {
    theme?: string,
    keybinds: KeybindsConfig,
}

const File = z.object({
    status: z.string(),
    path: z.string(),
})
export type File = z.infer<typeof File>

export const { use: useApplication, provider: ApplicationProvider } = createSimpleContext({
    name: "Application",
    init: () => {
        const [store, setStore] = createStore<{
            file: File,
            config: Config 
        }>({
            file: {
                status: "",
                path: "",
            },
            config: {
                keybinds: KeybindsConfig.parse({}),
                theme: 'opencode',
            },
        });

        return {
            get file() { return store.file },
            get config() { return store.config },

            setFile(v: File) { setStore("file", v) },
            setConfig: (v: Config) => setStore("config", v),
        }
    },
})
