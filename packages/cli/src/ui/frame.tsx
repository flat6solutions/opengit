import { Show, type JSX } from "solid-js"
import { useTheme } from "@context/theme"

const sidebar = 42
const divider = sidebar
const header = 2

export function Frame(props: { sidebar: boolean; side: JSX.Element; children: JSX.Element }) {
  const theme = useTheme().theme
  const background = () => theme.background

  return (
    <box position="relative" flexGrow={1} minWidth={0} minHeight={0} backgroundColor={background()}>
      <box
        position="absolute"
        left={0}
        right={0}
        top={1}
        bottom={1}
        flexDirection="row"
        minWidth={0}
        minHeight={0}
        backgroundColor={background()}
      >
        <box
          width={props.sidebar ? sidebar : 0}
          height="100%"
          flexShrink={0}
          overflow="hidden"
          backgroundColor={background()}
        >
          {props.side}
        </box>
        <box
          width={props.sidebar ? 1 : 0}
          height="100%"
          flexShrink={0}
          overflow="hidden"
          backgroundColor={background()}
        />
        <box flexGrow={1} minWidth={0} minHeight={0} backgroundColor={background()}>
          {props.children}
        </box>
      </box>

      <box
        position="absolute"
        left={0}
        right={0}
        top={0}
        height={1}
        zIndex={10}
        border={["top"]}
        borderColor={theme.border}
        backgroundColor={background()}
        shouldFill={false}
      />
      <box
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        height={1}
        zIndex={10}
        border={["bottom"]}
        borderColor={theme.border}
        backgroundColor={background()}
        shouldFill={false}
      />
      <Show when={props.sidebar}>
        <box
          position="absolute"
          left={divider}
          top={0}
          bottom={0}
          width={1}
          zIndex={11}
          border={["left"]}
          borderColor={theme.border}
          backgroundColor={background()}
          shouldFill={false}
        />
      </Show>
      <box
        position="absolute"
        left={props.sidebar ? divider : 0}
        right={0}
        top={header}
        height={1}
        zIndex={11}
        border={["top"]}
        borderColor={theme.border}
        backgroundColor={background()}
        shouldFill={false}
      />

      <Show when={props.sidebar}>
        <text position="absolute" left={divider} top={0} zIndex={12} fg={theme.border} bg={background()}>
          ┬
        </text>
        <text position="absolute" left={divider} bottom={0} zIndex={12} fg={theme.border} bg={background()}>
          ┴
        </text>
      </Show>
      <Show when={props.sidebar}>
        <text position="absolute" left={divider} top={header} zIndex={12} fg={theme.border} bg={background()}>
          ├
        </text>
      </Show>
    </box>
  )
}
