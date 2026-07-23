import { Match, Switch } from "solid-js";
import { useApplication } from "@context/application";
import { useKeybind } from "@context/keybind";
import { useKeyboard } from "@opentui/solid";
import { useDialog } from "@ui/dialog";

import Diff from "@components/panes/diff";
import Code from "@components/panes/code";

export default function Main() {
  const app = useApplication();
  const keybind = useKeybind();
  const dialog = useDialog();

  useKeyboard((event) => {
    if (dialog.stack.length > 0) return;
    if (app.config.activePane !== "files") return;
    if (keybind.match("trigger_diff", event)) {
      app.setConfig({
        ...app.config,
        mainView: app.config.mainView === "diff" ? "code" : "diff",
      });
      return;
    }
  });

  return (
    <box flexGrow={1} minWidth={0} minHeight={0}>
      <Switch>
        <Match when={app.config.mainView === "diff"}>
          <Diff />
        </Match>
        <Match when={app.config.mainView === "code"}>
          <Code />
        </Match>
      </Switch>
    </box>
  );
}
