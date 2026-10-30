/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Theme } from "@notesnook/theme";
import { SchemeColors } from "@notesnook/theme";
import React from "react";
import { Box, ButtonProps } from "@theme-ui/components";
import { IconNames, Icons } from "../icons.js";
import { ToolButtonVariant } from "../types.js";
import { Button } from "../../components/button.js";
import { Icon } from "@notesnook/ui";
import { useIsMobile } from "../stores/toolbar-store.js";

const TOOL_ICON_COLORS: Record<string, string> = {
  heading: "var(--jl-icon-heading)", fontFamily: "var(--jl-icon-heading)", fontSize: "var(--jl-icon-heading)",
  checklist: "var(--jl-icon-list)", checkbox: "var(--jl-icon-list)", bulletList: "var(--jl-icon-list)", numberedList: "var(--jl-icon-list)",
  noteLink: "var(--jl-icon-link)", link: "var(--jl-icon-link)", linkEdit: "var(--jl-icon-link)", linkRemove: "var(--jl-icon-danger)",
  linkSettings: "var(--jl-icon-link)", openLink: "var(--jl-icon-link)", copyLink: "var(--jl-icon-link)",
  code: "var(--jl-icon-code)", codeRemove: "var(--jl-icon-code)", math: "var(--jl-icon-code)", table: "var(--jl-icon-code)",
  tableSettings: "var(--jl-icon-code)", rowProperties: "var(--jl-icon-code)", columnProperties: "var(--jl-icon-code)", cellProperties: "var(--jl-icon-code)",
  image: "var(--jl-icon-media)", imageSettings: "var(--jl-icon-media)", attachment: "var(--jl-icon-media)", embed: "var(--jl-icon-media)", webClip: "var(--jl-icon-media)",
  highlight: "var(--jl-icon-highlight)", textColor: "var(--jl-icon-highlight)", backgroundColor: "var(--jl-icon-highlight)",
  alignCenter: "var(--jl-icon-alignment)", alignLeft: "var(--jl-icon-alignment)", alignRight: "var(--jl-icon-alignment)", alignJustify: "var(--jl-icon-alignment)", ltr: "var(--jl-icon-alignment)", rtl: "var(--jl-icon-alignment)",
  formatClear: "var(--jl-icon-muted)", delete: "var(--jl-icon-danger)", clear: "var(--jl-icon-danger)"
};

export type ToolButtonProps = ButtonProps & {
  icon: IconNames;
  iconColor?: SchemeColors;
  iconSize?: keyof Theme["iconSizes"] | number;
  toggled?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  variant?: ToolButtonVariant;
};
export const ToolButton = React.memo(
  function ToolButton(props: ToolButtonProps) {
    const {
      id,
      icon,
      iconSize,
      iconColor,
      toggled,
      sx,
      buttonRef,
      variant = "normal",
      ...buttonProps
    } = props;
    const isMobile = useIsMobile();

    return (
      <Button
        variant="secondary"
        ref={buttonRef}
        tabIndex={-1}
        id={`tool-${id || icon}`}
        sx={{
          height: "unset",
          flexShrink: 0,
          p: variant === "small" ? "small" : 1,
          borderRadius: variant === "small" ? "small" : "default",
          m: 0,
          bg: toggled ? "background-selected" : "transparent",
          mr: variant === "small" ? 0 : 1,
          ":last-of-type": {
            mr: 0
          },
          ":hover:not(:disabled):not(:active)": !isMobile
            ? undefined
            : {
                bg: "transparent"
              },
          ...sx
        }}
        onMouseDown={(e) => {
          if (globalThis.keyboardShown) {
            e.preventDefault();
          }
        }}
        {...buttonProps}
      >
        <Box sx={{ position: "relative", display: "inline-flex" }}>
          <Icon
            path={Icons[icon]}
            color={toggled ? "icon-selected" : iconColor || TOOL_ICON_COLORS[icon] || "#4B83B8"}
            size={iconSize || (variant === "small" ? "medium" : "big")}
          />
        </Box>
      </Button>
    );
  },
  (prev, next) => {
    return (
      prev.toggled === next.toggled &&
      prev.icon === next.icon &&
      prev.disabled === next.disabled &&
      prev.onClick === next.onClick &&
      JSON.stringify(prev.sx) === JSON.stringify(next.sx)
    );
  }
);
