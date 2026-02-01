import { useApplication } from "@context/application";
import { useTheme } from "@context/theme";
import { Pane } from "@ui/pane";

export default function Header() {
    const app = useApplication()
    const theme = useTheme().theme

    return (
        <Pane>
            <box width="100%" height="auto" paddingLeft={2}>
                <text fg={theme.textMuted}>{app.file.path}</text>
            </box>
        </Pane>
    )
}
