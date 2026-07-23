import type { BoxProps } from "@opentui/solid"
import { splitProps, type JSX } from "solid-js"
import { useTheme } from "@context/theme"

interface PaneProps extends BoxProps {
  children?: JSX.Element
  title?: string
  subtitle?: string | JSX.Element
  active?: boolean
  open?: boolean
  fill?: boolean
  contentPadding?: number
}

export function Pane(props: PaneProps) {
  const [local, others] = splitProps(props, [
    "children",
    "title",
    "subtitle",
    "active",
    "open",
    "fill",
    "contentPadding",
  ])
  const colors = useTheme().theme
  const open = () => local.open ?? true
  const fill = () => local.fill ?? false
  const padding = () => local.contentPadding ?? 1

  return (
    <box
      {...others}
      width={others.width ?? "100%"}
      height={!open() ? 3 : (others.height ?? "100%")}
      flexGrow={fill() ? 1 : others.flexGrow}
      flexDirection="column"
      backgroundColor={colors.background}
      minWidth={0}
      minHeight={0}
    >
      {local.title !== undefined && (
        <box
          flexDirection="row"
          justifyContent="space-between"
          width="100%"
          flexShrink={0}
          paddingLeft={1}
          paddingRight={1}
          height={2}
          overflow="hidden"
        >
          <text marginLeft={1} marginRight={1} fg={colors.text} wrapMode="none" truncate flexGrow={1} minWidth={1}>
            {local.title}
          </text>
          {local.subtitle &&
            (typeof local.subtitle === "string" ? (
              <text
                marginLeft={1}
                marginRight={1}
                fg={colors.textMuted}
                wrapMode="none"
                truncate
                flexShrink={1}
                maxWidth={20}
              >
                {local.subtitle}
              </text>
            ) : (
              <box marginLeft={1} marginRight={1} flexShrink={1} minWidth={0} maxWidth={20} overflow="hidden">
                {local.subtitle}
              </box>
            ))}
        </box>
      )}
      <box
        backgroundColor={colors.background}
        width="100%"
        flexGrow={open() ? 1 : 0}
        minHeight={0}
        paddingTop={local.title === undefined ? padding() : 0}
        paddingBottom={open() ? padding() : 0}
        paddingLeft={padding()}
        paddingRight={padding()}
      >
        {open() && local.children && local.children}
      </box>
    </box>
  )
}
