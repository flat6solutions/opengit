import { RGBA, TextAttributes } from "@opentui/core"
import type { BoxProps } from "@opentui/solid"
import { createEffect, createSignal, splitProps, type Accessor, type JSX } from "solid-js"
import { SplitBorder } from "@util/border"
import { useTheme } from "@context/theme"

interface PaneProps extends Omit<BoxProps, "borderColor"> {
  children?: JSX.Element
  title?: string
  subtitle?: string | JSX.Element
  borderColor?: Accessor<RGBA | undefined> | string | RGBA
  active?: boolean
  open?: boolean
  fill?: boolean
}

export function Pane(props: PaneProps) {
  const [local, others] = splitProps(props, ["children", "title", "subtitle", "borderColor", "active", "open", "fill"])
  const theme = useTheme()
  const colors = theme.theme
  const [bg, setBg] = createSignal(theme.mode() === "dark" ? theme.theme.backgroundPanel : theme.theme.backgroundElement)
  const open = () => local.open ?? true
  const fill = () => local.fill ?? false

  function getBorderColor() {
    if (!local.borderColor) return bg()
    if (typeof local.borderColor === "function") {
      if (local.borderColor() === undefined) {
        return bg()
      }

      return local.borderColor()
    }
    return local.borderColor
  }

  function getBackgroundColor() {
    return theme.mode() === "dark" ? theme.theme.backgroundPanel : theme.theme.backgroundElement
  }

  createEffect(() => {
    theme.mode()
    setBg(getBackgroundColor())
  })

  return (
    <box
      border={["left"]}
      customBorderChars={SplitBorder.customBorderChars}
      borderColor={getBorderColor()}
      {...others}
      height={!open() ? 3 : others.height}
      flexGrow={fill() ? 1 : others.flexGrow}
    >
      <box
        backgroundColor={bg()}
        width="100%"
        height={fill() ? "100%" : undefined}
        paddingTop={1}
        paddingBottom={open() ? 1 : 0}
        paddingLeft={1}
        paddingRight={1}
      >
        {local.title && (
          <box flexDirection="row" justifyContent="space-between">
            <text
              attributes={TextAttributes.BOLD}
              marginBottom={1}
              marginLeft={1}
              marginRight={1}
              fg={colors.text}
            >
              {local.title}
            </text>
            {local.subtitle && (
              typeof local.subtitle === "string" ? (
                <text
                  marginBottom={open() ? 1 : 0}
                  marginLeft={1}
                  marginRight={1}
                  fg={colors.textMuted}
                >
                  {local.subtitle}
                </text>
              ) : (
                  <box marginBottom={open() ? 1 : 0} marginLeft={1} marginRight={1}>
                     {local.subtitle}
                   </box>
                 )
            )}
          </box>
        )}
        {open() && local.children && local.children}
      </box>
    </box>
  )
}
