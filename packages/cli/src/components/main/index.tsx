import { Match, Switch } from "solid-js";
import { useApplication } from "@context/application";
import { useKeybind } from "@context/keybind";
import { useKeyboard } from "@opentui/solid";

import Diff from "@components/panes/diff";
import Code from "@components/panes/code";

export default function Main() {
  const app = useApplication();
  const keybind = useKeybind();

  useKeyboard((event) => {
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
    <box width="100%" height="100%">
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
