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
import { ButtonProps } from "@theme-ui/components";
import { IconNames, Icons } from "../icons.js";
import { ToolButtonVariant } from "../types.js";
import { Button } from "../../components/button.js";
import { Icon } from "@notesnook/ui";
import { useIsMobile } from "../stores/toolbar-store.js";

const TOOL_ICON_COLORS: Record<string, string> = {
  heading: "#C65A17", fontFamily: "#C65A17", fontSize: "#C65A17",
  checklist: "#278A59", checkbox: "#278A59", bulletList: "#278A59", numberedList: "#278A59",
  noteLink: "#168B91", link: "#168B91", linkEdit: "#168B91", linkRemove: "#C65A5A",
  linkSettings: "#168B91", openLink: "#168B91", copyLink: "#168B91",
  code: "#7957B5", codeRemove: "#7957B5", math: "#7957B5", table: "#7957B5",
  tableSettings: "#7957B5", rowProperties: "#7957B5", columnProperties: "#7957B5", cellProperties: "#7957B5",
  image: "#287FAF", imageSettings: "#287FAF", attachment: "#287FAF", embed: "#287FAF", webClip: "#287FAF",
  highlight: "#C17A21", textColor: "#C17A21", backgroundColor: "#C17A21",
  alignCenter: "#4B78A8", alignLeft: "#4B78A8", alignRight: "#4B78A8", alignJustify: "#4B78A8", ltr: "#4B78A8", rtl: "#4B78A8",
  formatClear: "#6B7280", delete: "#C64F4F", clear: "#C64F4F"
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
        <Icon
          path={Icons[icon]}
          color={toggled ? "icon-selected" : iconColor || TOOL_ICON_COLORS[icon] || "#4B83B8"}
          size={iconSize || (variant === "small" ? "medium" : "big")}
        />
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
