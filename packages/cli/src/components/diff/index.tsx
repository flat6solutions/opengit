import { createEffect, createSignal, Show } from "solid-js";
import { useApplication, type File } from "@context/application";
import { Pane } from "@ui/pane";
import { useTheme } from "@context/theme";
import { filetype } from "@util/diff";

export default function Diff() {
    const app = useApplication()
    const { theme, syntax } = useTheme()

    const [diff, setDiff] = createSignal("")

    async function getDiff(file: File) {
        const status = file.status
        const isUntracked = status === "??"
        const isStaged = status[0] !== ' ' && status[0] !== '?'
        const hasUnstagedChanges = status[1] !== ' '

        let out;
        if (isUntracked) {
            // Untracked file - compare against nothing (shows all content as additions)
            out = await Bun.$`git diff --no-index -- /dev/null ${file.path}`.quiet().nothrow()
        } else if (isStaged && !hasUnstagedChanges) {
            // Only staged changes (e.g., "M ", "A ", "D ")
            out = await Bun.$`git diff --cached -- ${file.path}`.quiet().nothrow()
        } else {
            // Unstaged changes (e.g., " M", " D") or mixed (e.g., "MM"m "AM")
            // Shows work tree changes by default
            out = await Bun.$`git diff -- ${file.path}`.quiet().nothrow()
        }

        const res = out.text()
        setDiff(res)
    }

    createEffect(() => {
        const file = app.file
        if (file) getDiff(file)
    })

    return (
        <Pane>
            <box
                width="100%"
                height="100%"
                paddingLeft={1}
                paddingRight={1}
                flexDirection="column"
                gap={1}
            >
                <scrollbox>
                    <Show when={diff()} keyed>
                        {(d: string) => (
                            <diff
                                keyed
                                diff={d}
                                view="unified"
                                filetype={filetype(app.file.path)}
                                syntaxStyle={syntax()}
                                showLineNumbers={true}
                                width="100%"
                                fg={theme.text}
                                addedBg={theme.diffAddedBg}
                                removedBg={theme.diffRemovedBg}
                                contextBg={theme.diffContextBg}
                                addedSignColor={theme.diffHighlightAdded}
                                removedSignColor={theme.diffHighlightRemoved}
                                lineNumberFg={theme.textMuted}
                                lineNumberBg={theme.diffContextBg}
                                addedLineNumberBg={theme.diffAddedLineNumberBg}
                                removedLineNumberBg={theme.diffRemovedLineNumberBg}
                            />
                        )}
                    </Show>
                </scrollbox>
            </box>
        </Pane>
    )
}
