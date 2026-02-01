import { KVProvider } from "@context/kv"
import { ApplicationProvider } from "@context/application"
import { ThemeProvider, useTheme } from "@context/theme"
import { KeybindProvider, useKeybind } from "@context/keybind"
import { useKeyboard, useRenderer } from "@opentui/solid"

import Files from "@components/files"
import Diff from "@components/diff"
import DiffHeader from "@components/diff/header"

export function tui() {
    return (
        <KVProvider>
            <ApplicationProvider>
                <ThemeProvider mode="dark">
                    <KeybindProvider>
                        <App />
                    </KeybindProvider>
                </ThemeProvider>
            </ApplicationProvider>
        </KVProvider>
    )
}

function App() {
    const renderer = useRenderer()
    const keybind = useKeybind()
    const theme = useTheme()

    function exit() {
        renderer.setTerminalTitle('')
        renderer.destroy()
        process.exit(0)
    }

    useKeyboard(event => {
        if (keybind.match("app_exit", event)) {
            exit()
        }

        if (keybind.match("theme_mode_toggle", event)) {
            theme.setMode(theme.mode() === 'light' ? 'dark' : 'light')
        }

        if (keybind.match("debug_toggle", event)) {
            renderer?.console.toggle();
            renderer?.toggleDebugOverlay();
        }
    })

    return (
        <box
            width="100%"
            height="100%"
            flexDirection="row"
            gap={1}
            backgroundColor={theme.theme.background}
            padding={1}
        >
            <box height="100%" width="30%">
                <Files />
            </box>
            <box height="100%" width="70%" flexDirection="column" gap={1}>
                <DiffHeader />
                <Diff />
            </box>
        </box>
    )
}
