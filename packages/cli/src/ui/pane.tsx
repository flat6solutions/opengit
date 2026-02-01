import { RGBA, TextAttributes } from '@opentui/core';
import type { BoxProps } from '@opentui/solid';
import { createEffect, createSignal, splitProps, type Accessor, type JSX } from 'solid-js';
import { SplitBorder } from '@util/border';
import { useTheme } from '@context/theme';

interface PaneProps extends Omit<BoxProps, 'borderColor'> {
    children?: JSX.Element;
    title?: string;
    borderColor?: Accessor<RGBA | undefined> | string | RGBA;
    active?: boolean;
}

export function Pane(props: PaneProps) {
    const [local, others] = splitProps(props, ['children', 'title', 'borderColor', 'active']);
    const theme = useTheme();
    const colors = theme.theme;
    const [bg, setBg] = createSignal(theme.mode() === 'dark' ? theme.theme.backgroundPanel : theme.theme.backgroundElement);

    function getBorderColor() {
        if (!local.borderColor) return bg();
        if (typeof local.borderColor === 'function') {
            if (local.borderColor() === undefined) {
                return bg();
            }

            return local.borderColor()
        };
        return local.borderColor;
    }

    createEffect(() => {
        setBg(theme.mode() === 'dark' ? theme.theme.backgroundPanel : theme.theme.backgroundElement);
    });

    return (
        <box
            border={['left']}
            customBorderChars={SplitBorder.customBorderChars}
            borderColor={getBorderColor()}
            {...others}
            {...(local.active === false ? { height: 3 } : {})}
        >
            <box
                backgroundColor={bg()}
                width="100%"
                height={local.active !== undefined ? "100%" : undefined}
                paddingTop={1}
                paddingBottom={1}
                paddingLeft={1}
                paddingRight={1}
            >
                {local.title && (
                    <text
                        attributes={TextAttributes.BOLD}
                        marginBottom={local.active ? 1 : 0}
                        marginLeft={1}
                        marginRight={1}
                        fg={colors.text}
                    >
                        {local.title}
                    </text>
                )}
                {local.children && local.children}
            </box>
        </box>
    );
}
