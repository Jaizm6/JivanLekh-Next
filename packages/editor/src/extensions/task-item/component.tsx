/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import { Box, Flex } from "@theme-ui/components";
import { ReactNodeViewProps } from "../react/index.js";
import { Icon } from "@notesnook/ui";
import { Icons } from "../../toolbar/icons.js";
import { findChildrenInRange } from "@tiptap/core";
import { useCallback, useMemo } from "react";
import type { TaskItemAttributes } from "./task-item.js";
import { useIsMobile } from "../../toolbar/stores/toolbar-store.js";
import { isiOS } from "../../utils/platform.js";
import { startItemDrag } from "../drag-drop/index.js";
import { DesktopOnly } from "../../components/responsive/index.js";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { strings } from "@notesnook/intl";
import { formatExpenseAmount, getTaskItemText, parseExpenseAmount } from "../task-list/expense.js";

export function TaskItemComponent(
  props: ReactNodeViewProps<TaskItemAttributes>
) {
  const { editor, updateAttributes, getPos, forwardRef, node } = props;
  const {
    checked,
    readonly,
    expenseCurrencySymbol: itemCurrencySymbol = "₹",
    expenseShowCurrency: itemShowCurrency = true
  } = props.node.attrs;
  const isMobile = useIsMobile();
  const resolvedPosition = editor.state.doc.resolve(getPos());
  let rootTaskList: ProseMirrorNode | null = null;
  for (let depth = 1; depth <= resolvedPosition.depth; depth++) {
    const ancestor = resolvedPosition.node(depth);
    if (ancestor.type.name === TaskList.name) {
      rootTaskList = ancestor;
      break;
    }
  }
  const expenseCurrencySymbol =
    rootTaskList?.attrs.currencySymbol ?? itemCurrencySymbol;
  const expenseShowCurrency =
    rootTaskList?.attrs.showCurrency ?? itemShowCurrency;
  const amount = useMemo(
    () => parseExpenseAmount(getTaskItemText(node)),
    [node, node.textContent]
  );

  const toggle = useCallback(() => {
    if (!editor.isEditable || !editor) return false;

    const { empty, from, to } = editor.state.selection;
    const selectedTaskItems = findChildrenInRange(
      editor.state.doc,
      { from, to },
      (node) => node.type.name === TaskItem.name
    );
    if (!empty && selectedTaskItems.findIndex((a) => a.node === node) > -1) {
      editor.commands.command(({ tr }) => {
        for (const { pos } of selectedTaskItems) {
          const item = tr.doc.nodeAt(pos);
          if (item) tr.setNodeMarkup(pos, null, { ...item.attrs, checked: !checked });
        }
        return true;
      });
    } else {
      updateAttributes({ checked: !checked });
    }

    return true;
  }, [editor, checked, updateAttributes, node]);

  return (
    <Flex
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        justifyContent: "space-between",
        gap: "8px"
      }}
    >
      <Flex
        style={{
          flexDirection: "row",
          alignItems: "center",
          maxWidth: "100%",
          flexGrow: 1,
          minWidth: 0
        }}
      >
        {editor.isEditable && !readonly && (
          <Icon
            className="dragHandle"
            data-drag-handle
            onPointerDown={(e) => startItemDrag(editor, getPos, e.nativeEvent)}
            path={Icons.dragHandle}
            sx={{
              opacity: [1, 1, 0],
              alignSelf: "start",
              bg: "transparent",
              cursor: "grab",
              mr: "0.2rem",
              fontFamily: "inherit",
              marginTop: "calc((1lh - 18px) / 2)",
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              svg: { pointerEvents: "none" },
              position: "relative",
              "::before": {
                content: '""',
                position: "absolute",
                insetBlock: "-12px",
                insetInlineStart: "-16px",
                insetInlineEnd: "-2px"
              }
            }}
            size={isMobile ? "2.46ch" : "2.22ch"}
          />
        )}
        <Icon
          path={checked ? Icons.check : ""}
          stroke="1px"
          contentEditable={false}
          tabIndex={1}
          sx={{
            border: "2px solid",
            borderColor: checked ? "accent" : "icon",
            borderRadius: "4px",
            alignSelf: "start",
            p: "1px",
            marginInlineEnd: 1,
            cursor: editor.isEditable ? "pointer" : "unset",
            ":hover": isMobile ? undefined : { borderColor: "accent" },
            fontFamily: "inherit",
            marginTop: "calc((1lh - 16px) / 2)"
          }}
          onMouseDown={(e) => {
            if (globalThis.keyboardShown) e.preventDefault();
            toggle();
          }}
          onTouchEnd={(e) => {
            if (globalThis["keyboardShown"] || isiOS) {
              e.preventDefault();
              toggle();
            }
          }}
          color={checked ? "#059669" : "icon"}
          size={isMobile ? "1.70ch" : "1.36ch"}
        />

        <Box
          ref={forwardRef}
          sx={{
            "> .taskitem-content-wrapper > p": {
              textDecorationLine: checked ? "line-through" : "none",
              opacity: checked ? 0.8 : 1
            },
            flex: 1,
            minWidth: 0,
            mt: ["3px", "3px", 0],
            ml: ["2px", "2px", 0]
          }}
        />
      </Flex>

      {amount !== null ? (
        <Box
          as="span"
          contentEditable={false}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
            whiteSpace: "nowrap",
            px: 2,
            py: "2px",
            bg: checked ? "background-secondary" : "#ecfdf5",
            border: "1px solid",
            borderColor: checked ? "var(--border)" : "#a7f3d0",
            borderRadius: "6px",
            color: checked ? "paragraph-secondary" : "#065f46",
            textDecoration: checked ? "line-through" : "none",
            fontSize: "12px",
            fontWeight: 700,
            fontFamily: "monospace"
          }}
        >
          {formatExpenseAmount(amount, expenseCurrencySymbol, expenseShowCurrency)}
        </Box>
      ) : null}

      <DesktopOnly>
        {editor.isEditable && !readonly ? (
          <Flex
            className="taskItemTools"
            sx={{
              bg: "background",
              opacity: 0,
              position: "absolute",
              insetInlineEnd: 0,
              top: 0,
              marginTop: "calc((1lh - 14px) / 2)"
            }}
          >
            <Icon
              className="deleleTaskItem"
              title={strings.delete()}
              path={Icons.close}
              size={18}
              sx={{ cursor: "pointer" }}
              onClick={() => {
                const position = getPos();
                const current = editor.state.doc.nodeAt(position);
                if (!current) return;
                editor.commands.command(({ tr }) => {
                  tr.deleteRange(position, position + current.nodeSize);
                  return true;
                });
              }}
            />
          </Flex>
        ) : null}
      </DesktopOnly>
    </Flex>
  );
}
