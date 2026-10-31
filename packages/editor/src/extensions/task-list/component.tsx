/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import { Box, Button, Flex, Input, Select, Text } from "@theme-ui/components";
import { useEffect, useMemo, useRef, useState } from "react";
import { ToolButton } from "../../toolbar/components/tool-button.js";
import { ReactNodeViewProps } from "../react/index.js";
import { type TaskListAttributes } from "./task-list.js";
import { replaceDateTime } from "../date-time/index.js";
import {
  deleteCheckedItems,
  sortList,
  sortListByAmount,
  toggleChildren
} from "./utils.js";
import { getExpenseSummary, formatExpenseAmount } from "./expense.js";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Icons } from "../../toolbar/icons.js";
import { Icon } from "@notesnook/ui";
import { strings } from "@notesnook/intl";

const CURRENCIES = [
  { symbol: "₹", label: "₹ INR (India)" },
  { symbol: "$", label: "$ USD (US / Global)" },
  { symbol: "€", label: "€ EUR (Eurozone)" },
  { symbol: "£", label: "£ GBP (UK)" },
  { symbol: "¥", label: "¥ JPY (Japan)" },
  { symbol: "AED ", label: "AED (UAE)" },
  { symbol: "C$", label: "C$ CAD (Canada)" },
  { symbol: "A$", label: "A$ AUD (Australia)" }
];

export function TaskListComponent(
  props: ReactNodeViewProps<TaskListAttributes>
) {
  const { editor, getPos, node, updateAttributes, forwardRef, pos } = props;
  const {
    title,
    textDirection,
    readonly,
    stats,
    currencySymbol = "₹",
    showCurrency = true
  } = node.attrs;
  const summary = useMemo(
    () => getExpenseSummary(node),
    [node, node.textContent]
  );
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!optionsContainerRef.current?.contains(event.target as Node)) {
        setOptionsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [optionsOpen]);

  const isNested = useMemo(() => {
    if (pos === undefined || !(pos >= 0 && pos <= editor.state.doc.content.size))
      return false;
    return editor.state.doc.resolve(pos).parent.type.name === TaskItem.name;
  }, [editor.state.doc, pos]);

  const updateExpenseSettings = (
    patch: Partial<Pick<TaskListAttributes, "currencySymbol" | "showCurrency">>
  ) => {
    const parentPos = getPos();
    editor.commands.command(({ tr }) => {
      const listNode = tr.doc.nodeAt(parentPos);
      if (!listNode) return false;

      const nextCurrency = patch.currencySymbol ?? listNode.attrs.currencySymbol ?? "₹";
      const nextShowCurrency =
        patch.showCurrency ?? listNode.attrs.showCurrency !== false;

      tr.setNodeMarkup(parentPos, undefined, {
        ...listNode.attrs,
        currencySymbol: nextCurrency,
        showCurrency: nextShowCurrency
      });

      // Mirror display preferences onto items so their independent node views
      // refresh immediately when the checklist currency changes.
      listNode.descendants((child, childPos) => {
        if (child.type.name !== TaskItem.name) return;
        const itemPos = tr.mapping.map(parentPos + childPos + 1);
        const itemNode = tr.doc.nodeAt(itemPos);
        if (!itemNode) return;
        tr.setNodeMarkup(itemPos, undefined, {
          ...itemNode.attrs,
          expenseCurrencySymbol: nextCurrency,
          expenseShowCurrency: nextShowCurrency
        });
      });
      return true;
    });
  };

  const runListAction = (
    action: "moveChecked" | "sortHigh" | "sortLow" | "uncheckAll" | "checkAll" | "deleteChecked"
  ) => {
    const parentPos = getPos();
    editor.chain().focus().command(({ tr }) => {
      const listNode = tr.doc.nodeAt(parentPos);
      if (!listNode) return false;

      switch (action) {
        case "moveChecked":
          return !!sortList(tr, parentPos);
        case "sortHigh":
          return !!sortListByAmount(tr, parentPos, "desc");
        case "sortLow":
          return !!sortListByAmount(tr, parentPos, "asc");
        case "uncheckAll":
          toggleChildren(tr, listNode, false, parentPos);
          return true;
        case "checkAll":
          toggleChildren(tr, listNode, true, parentPos);
          return true;
        case "deleteChecked":
          return !!deleteCheckedItems(tr, parentPos);
      }
    }).run();
    setOptionsOpen(false);
  };

  const toggleReadOnly = () => {
    const parentPos = getPos();
    editor.commands.command(({ tr }) => {
      const listNode = tr.doc.nodeAt(parentPos);
      if (!listNode) return false;
      const nextReadonly = !listNode.attrs.readonly;
      tr.setNodeMarkup(parentPos, undefined, {
        ...listNode.attrs,
        readonly: nextReadonly
      });
      listNode.descendants((child, childPos) => {
        const childPosInDoc = tr.mapping.map(parentPos + childPos + 1);
        if (child.type.name === TaskList.name || child.type.name === TaskItem.name) {
          const current = tr.doc.nodeAt(childPosInDoc);
          if (current) {
            tr.setNodeMarkup(childPosInDoc, undefined, {
              ...current.attrs,
              readonly: nextReadonly
            });
          }
        }
      });
      return true;
    });
  };

  const addTask = () => {
    const parentPos = getPos();
    const listNode = editor.state.doc.nodeAt(parentPos);
    if (!listNode) return;
    const insertPos = parentPos + listNode.nodeSize - 1;
    editor.chain().focus().insertContentAt(insertPos, {
      type: TaskItem.name,
      attrs: {
        expenseCurrencySymbol: currencySymbol,
        expenseShowCurrency: showCurrency,
        readonly: false
      },
      content: [{ type: "paragraph" }]
    }).run();
    editor.commands.setTextSelection(insertPos + 2);
  };

  return (
    <>
      {isNested ? null : (
        <Flex
          className="task-list-tools expense-checklist-tools"
          dir={textDirection}
          contentEditable={false}
          sx={{
            position: "relative",
            width: "100%",
            bg: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderBottom: "1px solid #bbf7d0",
            borderRadius: "10px 10px 0 0",
            py: "0.5rem",
            px: "0.65rem",
            mb: 0,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            overflow: "visible",
            color: "#1e293b"
          }}
        >
          <Flex sx={{ alignItems: "center", gap: 2, flex: "1 1 180px", minWidth: 0 }}>
            <Input
              readOnly={!editor.isEditable || readonly}
              value={title ?? "Expense Checklist"}
              variant="clean"
              aria-label="Checklist title"
              sx={{
                flex: 1,
                minWidth: 0,
                p: 0,
                px: 1,
                color: "#1e293b",
                fontSize: "15px",
                fontWeight: 600,
                fontFamily: "inherit"
              }}
              placeholder="Expense Checklist"
              onChange={(e) => {
                e.target.value = replaceDateTime(
                  e.target.value,
                  editor.storage.dateFormat,
                  editor.storage.timeFormat,
                  editor.storage.dayFormat
                );
                updateAttributes(
                  { title: e.target.value },
                  { addToHistory: true, preventUpdate: false }
                );
              }}
            />
          </Flex>

          <Flex sx={{ alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Box
              as="span"
              title="Total checklist amount"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: "3px",
                bg: "#fff",
                border: "1px solid #a7f3d0",
                borderRadius: "6px",
                color: "#047857",
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "12px",
                whiteSpace: "nowrap"
              }}
            >
              <Box as="span" sx={{ fontSize: "10px", color: "#64748b" }}>SUM</Box>
              {formatExpenseAmount(summary.total, currencySymbol, showCurrency)}
            </Box>
            <Text variant="body" sx={{ color: "#64748b", fontSize: "12px", fontFamily: "monospace", px: 1 }}>
              {stats.checked}/{stats.total}
            </Text>

            {editor.isEditable ? (
              <>
                <ToolButton
                  toggled={readonly}
                  title={strings.readonlyTaskList()}
                  icon={readonly ? "readonlyOn" : "readonlyOff"}
                  variant="small"
                  sx={{ color: "#475569", zIndex: 2 }}
                  onClick={toggleReadOnly}
                />
                <ToolButton
                  toggled={false}
                  title="Move checked tasks to bottom"
                  icon="sortTaskList"
                  variant="small"
                  sx={{ color: "#475569", zIndex: 2 }}
                  onClick={() => runListAction("moveChecked")}
                />
                <Box ref={optionsContainerRef} sx={{ position: "relative", display: "inline-flex" }}>
                  <ToolButton
                    toggled={optionsOpen}
                    title="Checklist options"
                    icon="more"
                    variant="small"
                    sx={{ color: "#475569", zIndex: 2 }}
                    onClick={() => setOptionsOpen((open) => !open)}
                  />
                  {optionsOpen ? (
                    <Box
                      role="menu"
                      onClick={(event) => event.stopPropagation()}
                      sx={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        right: 0,
                        width: "260px",
                        maxWidth: "calc(100vw - 36px)",
                        p: 2,
                        bg: "background",
                        color: "paragraph",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        boxShadow: "0 10px 28px rgba(0,0,0,.16)",
                        zIndex: 100
                      }}
                    >
                      <Text sx={{ fontSize: "10px", fontWeight: 700, letterSpacing: ".6px", color: "paragraph-secondary", textTransform: "uppercase", mb: 1 }}>
                        Currency Settings
                      </Text>
                      <Flex sx={{ alignItems: "center", justifyContent: "space-between", gap: 2, py: 1 }}>
                        <Text sx={{ fontSize: "12px" }}>Show Currency</Text>
                        <Flex sx={{ bg: "background-secondary", p: "2px", borderRadius: "6px", gap: "2px" }}>
                          <Button
                            type="button"
                            onClick={() => updateExpenseSettings({ showCurrency: true })}
                            sx={{ border: 0, borderRadius: "4px", px: 2, py: "3px", bg: showCurrency ? "background" : "transparent", color: showCurrency ? "paragraph" : "paragraph-secondary", boxShadow: showCurrency ? "0 1px 2px rgba(0,0,0,.08)" : "none", fontSize: "11px", fontWeight: 600 }}
                          >
                            Yes
                          </Button>
                          <Button
                            type="button"
                            onClick={() => updateExpenseSettings({ showCurrency: false })}
                            sx={{ border: 0, borderRadius: "4px", px: 2, py: "3px", bg: !showCurrency ? "background" : "transparent", color: !showCurrency ? "paragraph" : "paragraph-secondary", boxShadow: !showCurrency ? "0 1px 2px rgba(0,0,0,.08)" : "none", fontSize: "11px", fontWeight: 600 }}
                          >
                            No
                          </Button>
                        </Flex>
                      </Flex>
                      <Flex sx={{ alignItems: "center", justifyContent: "space-between", gap: 2, py: 1 }}>
                        <Text sx={{ fontSize: "12px" }}>Currency Symbol</Text>
                        <Select
                          value={currencySymbol}
                          disabled={!showCurrency}
                          onChange={(event) => updateExpenseSettings({ currencySymbol: event.target.value })}
                          sx={{ maxWidth: "125px", bg: "background-secondary", color: "paragraph", border: "1px solid var(--border)", borderRadius: "6px", px: 2, py: "4px", fontSize: "11px" }}
                        >
                          {CURRENCIES.map((currency) => (
                            <option key={currency.symbol} value={currency.symbol}>
                              {currency.label}
                            </option>
                          ))}
                        </Select>
                      </Flex>
                      <Box sx={{ height: "1px", bg: "border", my: 1 }} />
                      <Text sx={{ fontSize: "10px", fontWeight: 700, letterSpacing: ".6px", color: "paragraph-secondary", textTransform: "uppercase", mb: 1 }}>
                        Checklist Actions
                      </Text>
                      {[
                        { id: "moveChecked", label: "Move checked to bottom" },
                        { id: "sortHigh", label: "Sort by Amount (High to Low)" },
                        { id: "sortLow", label: "Sort by Amount (Low to High)" },
                        { id: "uncheckAll", label: "Uncheck all tasks" },
                        { id: "checkAll", label: "Check all tasks" },
                        { id: "deleteChecked", label: "Delete checked tasks", danger: true }
                      ].map((action) => (
                        <Button
                          key={action.id}
                          type="button"
                          role="menuitem"
                          onClick={() => runListAction(action.id as "moveChecked" | "sortHigh" | "sortLow" | "uncheckAll" | "checkAll" | "deleteChecked")}
                          sx={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            border: 0,
                            borderRadius: "6px",
                            py: 2,
                            px: 2,
                            bg: "transparent",
                            color: action.danger ? "#dc2626" : "paragraph",
                            fontSize: "12px",
                            cursor: "pointer",
                            ":hover": { bg: "background-secondary" }
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </Box>
                  ) : null}
                </Box>
              </>
            ) : null}
          </Flex>
        </Flex>
      )}

      <Box
        ref={forwardRef}
        dir={textDirection}
        contentEditable={editor.isEditable && !readonly}
        onPaste={(event) => {
          if (readonly) event.preventDefault();
        }}
        sx={{
          "ul.tasklist-content-wrapper": {
            display: "block",
            paddingInlineStart: 0,
            marginBlockStart: 0,
            marginBlockEnd: 0,
            marginInlineStart: isNested ? (editor.isEditable ? -35 : -10) : 0,
            padding: 0,
            listStyle: "none",
            borderLeft: "1px solid #bbf7d0",
            borderRight: "1px solid #e2e8f0",
            bg: "background"
          },
          li: {
            listStyleType: "none",
            position: "relative",
            margin: 0,
            py: "0.3rem",
            px: "0.7rem",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            bg: "background",
            borderRadius: 0,
            ":hover > div > div > .dragHandle": {
              opacity: editor.isEditable && !readonly ? 1 : 0
            },
            ":hover > div > .taskItemTools": {
              opacity: editor.isEditable && !readonly ? 1 : 0
            }
          }
        }}
      />

      {isNested ? null : (
        <Flex
          contentEditable={false}
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            py: 2,
            px: 3,
            bg: "background-secondary",
            border: "1px solid var(--border)",
            borderTop: "1px solid #e2e8f0",
            borderRadius: "0 0 10px 10px"
          }}
        >
          {!readonly && editor.isEditable ? (
            <Button
              type="button"
              onClick={addTask}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                border: "1px dashed #cbd5e1",
                borderRadius: "6px",
                px: 2,
                py: 1,
                bg: "transparent",
                color: "paragraph-secondary",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                ":hover": { color: "#047857", bg: "#ecfdf5", borderColor: "#059669" }
              }}
            >
              <Icon path={Icons.plus} size="small" />
              Add task or expense
            </Button>
          ) : <Box />}
          <Flex sx={{ alignItems: "center", gap: 2, flexWrap: "wrap", fontFamily: "monospace", fontSize: "11px" }}>
            <Text sx={{ color: "paragraph-secondary", fontSize: "11px" }}>
              Pending: <Box as="span" sx={{ color: "#d97706", fontWeight: 700 }}>{formatExpenseAmount(summary.pending, currencySymbol, showCurrency)}</Box>
            </Text>
            <Text sx={{ color: "paragraph-secondary", fontSize: "11px" }}>
              Settled: <Box as="span" sx={{ color: "#2563eb", fontWeight: 700 }}>{formatExpenseAmount(summary.settled, currencySymbol, showCurrency)}</Box>
            </Text>
            <Text sx={{ color: "paragraph-secondary", fontSize: "11px" }}>
              Total: <Box as="span" sx={{ color: "#047857", fontWeight: 700 }}>{formatExpenseAmount(summary.total, currencySymbol, showCurrency)}</Box>
            </Text>
          </Flex>
        </Flex>
      )}
    </>
  );
}
