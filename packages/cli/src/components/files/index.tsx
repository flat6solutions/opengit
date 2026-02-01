import {
    createEffect,
    createSignal,
    For,
    onMount,
    onCleanup,
} from "solid-js"
import { useKeybind } from "@context/keybind"
import { useTheme } from "@context/theme"
import { useKeyboard } from "@opentui/solid"
import { getNameStatusColor } from "@util/color"
import { Pane } from "@ui/pane"
import { useApplication } from "@context/application"
import type { File } from "@context/application"

export default function Files() {
    const app = useApplication()
    const theme = useTheme().theme
    const keybind = useKeybind()

    const [selected, setSelected] = createSignal(0)
    const [files, setFiles] = createSignal<Array<File>>([])

    async function getFiles() {
        const out = await Bun.$`git status --porcelain -z --untracked-files=all --find-renames=50%`.quiet().nothrow()
        const text = out.text()
        
        // Split by NUL character, filter out empty strings
        const entries = text.split("\x00").filter(Boolean)
        
        const files: Array<{ status: string, path: string, previousPath?: string }> = []
        
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            
            // Format is "XY PATH" where XY is 2 chars and there's a space before PATH
            const status = entry.slice(0, 2)  // e.g., "M ", " M", "??", "R "
            const path = entry.slice(3)        // everything after "XY "
            
            // Handle renames/copies - next entry is the original path
            if (status.startsWith("R") || status.startsWith("C")) {
                const previousPath = entries[i + 1]
                files.push({ status, path, previousPath })
                i++  // Skip the next entry (it's the previous path)
            } else {
                files.push({ status, path })
            }
        }
      
        setFiles(files)
    }

    useKeyboard(event => {
        if (keybind.match("next", event)) {
            if (selected() === files().length - 1) return
            setSelected(selected() + 1)
        }
        if (keybind.match("previous", event)) {
            if (selected() === 0) return
            setSelected(selected() - 1)
        }
    })

    createEffect(() => {
        if (files().length > 0) {
            const file = files().at(selected()) || { status: "", path: "" }
            app.setFile(file)
        }
    })

    onMount(() => {
        getFiles()
        const interval = setInterval(getFiles, 1000)
        onCleanup(() => clearInterval(interval))
    })

    return (
        <Pane borderColor={theme.border}>
            <box
                width="100%"
                height="100%"
            >
                <scrollbox>
                    <For each={files()}>
                        {(file, i) => {
                            const filename = file.path.split("/").at(-1)
                            return (
                                <box
                                    flexDirection="row"
                                    gap={2}
                                    backgroundColor={selected() === i() ? theme.border : theme.backgroundPanel}
                                    paddingLeft={1}
                                    paddingRight={1}
                                >
                                    <text fg={getNameStatusColor(file.status)}>{file.status}</text>
                                    <text
                                        fg={selected() === i() ? theme.text : theme.textMuted}
                                        wrapMode="none"
                                    >{filename}</text>
                                </box>
                            )
                        }}
                    </For>
                </scrollbox>
            </box>
        </Pane>
    )
}
