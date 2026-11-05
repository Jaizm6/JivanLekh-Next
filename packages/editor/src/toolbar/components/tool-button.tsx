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
  bold: "var(--jl-icon-muted)",
  italic: "var(--jl-icon-muted)",
  underline: "var(--jl-icon-muted)",
  strikethrough: "var(--jl-icon-muted)",
  subscript: "var(--jl-icon-muted)",
  superscript: "var(--jl-icon-muted)",
  formatClear: "var(--jl-icon-muted)",
  clear: "var(--jl-icon-muted)",
  heading: "var(--jl-icon-heading)",
  fontFamily: "var(--jl-icon-heading)",
  fontSize: "var(--jl-icon-heading)",
  checklist: "var(--jl-icon-list)",
  checkbox: "var(--jl-icon-list)",
  bulletList: "var(--jl-icon-list)",
  numberedList: "var(--jl-icon-list)",
  sortTaskList: "var(--jl-icon-list)",
  noteLink: "var(--jl-icon-link)",
  link: "var(--jl-icon-link)",
  linkEdit: "var(--jl-icon-link)",
  linkRemove: "var(--jl-icon-danger)",
  linkSettings: "var(--jl-icon-link)",
  openLink: "var(--jl-icon-link)",
  copyLink: "var(--jl-icon-link)",
  openSource: "var(--jl-icon-link)",
  url: "var(--jl-icon-link)",
  code: "var(--jl-icon-code)",
  codeRemove: "var(--jl-icon-code)",
  codeblock: "var(--jl-icon-code)",
  math: "var(--jl-icon-code)",
  mathBlock: "var(--jl-icon-code)",
  table: "var(--jl-icon-code)",
  tableSettings: "var(--jl-icon-code)",
  rowProperties: "var(--jl-icon-code)",
  columnProperties: "var(--jl-icon-code)",
  cellProperties: "var(--jl-icon-code)",
  insertColumnLeft: "var(--jl-icon-code)",
  insertColumnRight: "var(--jl-icon-code)",
  moveColumnLeft: "var(--jl-icon-code)",
  moveColumnRight: "var(--jl-icon-code)",
  deleteColumn: "var(--jl-icon-danger)",
  insertRowAbove: "var(--jl-icon-code)",
  insertRowBelow: "var(--jl-icon-code)",
  moveRowUp: "var(--jl-icon-code)",
  moveRowDown: "var(--jl-icon-code)",
  deleteRow: "var(--jl-icon-danger)",
  deleteTable: "var(--jl-icon-danger)",
  splitCells: "var(--jl-icon-code)",
  mergeCells: "var(--jl-icon-code)",
  backgroundColor: "var(--jl-icon-highlight)",
  cellBorderColor: "var(--jl-icon-highlight)",
  textColor: "var(--jl-icon-highlight)",
  highlight: "var(--jl-icon-highlight)",
  alignCenter: "var(--jl-icon-alignment)",
  alignLeft: "var(--jl-icon-alignment)",
  alignRight: "var(--jl-icon-alignment)",
  alignJustify: "var(--jl-icon-alignment)",
  ltr: "var(--jl-icon-alignment)",
  rtl: "var(--jl-icon-alignment)",
  image: "var(--jl-icon-media)",
  imageSettings: "var(--jl-icon-media)",
  attachment: "var(--jl-icon-media)",
  attachmentSettings: "var(--jl-icon-media)",
  previewAttachment: "var(--jl-icon-media)",
  download: "var(--jl-icon-media)",
  embed: "var(--jl-icon-media)",
  embedSettings: "var(--jl-icon-media)",
  webClip: "var(--jl-icon-media)",
  webclipSettings: "var(--jl-icon-media)",
  fullscreen: "var(--jl-icon-media)",
  upload: "var(--jl-icon-media)",
  camera: "var(--jl-icon-media)",
  delete: "var(--jl-icon-danger)",
  close: "var(--jl-icon-danger)",
  formatClear: "var(--jl-icon-muted)",
  outdent: "var(--jl-icon-list)",
  indent: "var(--jl-icon-list)",
  csv: "var(--jl-icon-code)",
  plus: "var(--jl-icon-heading)",
  more: "var(--jl-icon-muted)"
};

export type ToolButtonProps = ButtonProps & {
  icon: IconNames;
  iconColor?: SchemeColors;
  iconSize?: keyof Theme["iconSizes"] | number;
  toggled?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  variant?: ToolButtonVariant;
  iconElement?: React.ReactNode;
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
      iconElement,
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
          {iconElement ?? (
            <Icon
              path={Icons[icon]}
              color={toggled ? "icon-selected" : iconColor || TOOL_ICON_COLORS[icon] || "var(--jl-icon-muted)"}
              size={iconSize || (variant === "small" ? "medium" : "big")}
            />
          )}
        </Box>
      </Button>
    );
  },
  (prev, next) => {
    return (
      prev.toggled === next.toggled &&
      prev.icon === next.icon &&
      prev.iconElement === next.iconElement &&
      prev.disabled === next.disabled &&
      prev.onClick === next.onClick &&
      JSON.stringify(prev.sx) === JSON.stringify(next.sx)
    );
  }
);
