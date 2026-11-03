/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import { Box, Button, Flex, Text } from "@theme-ui/components";
import { Icon } from "@notesnook/ui";
import { TextSelection } from "@tiptap/pm/state";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PopupWrapper } from "../../components/popup-presenter/index.js";
import { Editor } from "../../types.js";
import { HeadingColors, Icons } from "../icons.js";
import { usePopupManager } from "../stores/toolbar-store.js";
import { FloatingMenuProps } from "./types.js";

type SlashRange = { from: number; to: number };
type SlashMenuState = SlashRange & { query: string; left: number; top: number };
type SlashCommand = {
  id: string;
  title: string;
  description: string;
  aliases: string[];
  icon: string;
  color: string;
  section?: string;
  isToggle?: boolean;
  run: (editor: Editor, range: SlashRange) => void;
};

const COMMAND_COLORS = {
  list: "var(--jl-icon-list)",
  table: "var(--jl-icon-code)",
  text: "var(--jl-icon-link)",
  callout: "var(--jl-icon-heading)",
  code: "var(--jl-icon-code)",
  media: "var(--jl-icon-media)",
  divider: "var(--jl-icon-muted)"
};

export function SlashCommandFloatingMenu({ editor }: FloatingMenuProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<SlashMenuState | null>(null);
  const selectedIndexRef = useRef(0);
  const filteredCommandsRef = useRef<SlashCommand[]>([]);
  const [menuState, setMenuState] = useState<SlashMenuState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { open, close } = usePopupManager({ id: "slash-commands", group: "slash-commands" });
  const isMenuOpen = Boolean(menuState);

  useEffect(() => {
    if (isMenuOpen) open();
    else close();
  }, [isMenuOpen, open, close]);

  const commands = useMemo<SlashCommand[]>(
    () => [
      ...Array.from({ length: 6 }, (_, index) => {
        const level = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6;
        const icon = [
          Icons.heading1,
          Icons.heading2,
          Icons.heading3,
          Icons.heading4,
          Icons.heading5,
          Icons.heading6
        ][index];
        return {
          id: `h${level}`,
          title: `Heading ${level}`,
          description: `Section heading · H${level}`,
          aliases: [`h${level}`, `heading ${level}`],
          icon,
          color: HeadingColors[level],
          section: "Headings",
          run: (editor: Editor, range: SlashRange) =>
            editor.chain().focus().deleteRange(range).setHeading({ level }).run()
        };
      }),
      ...([1, 2, 3] as const).map((level) => ({
        id: `toggle-h${level}`,
        title: `Toggle heading ${level}`,
        description: `Collapsible heading · H${level}`,
        aliases: [`toggle h${level}`, `toggle${level}`, `collapsible ${level}`],
        icon: [
          Icons.heading1,
          Icons.heading2,
          Icons.heading3
        ][level - 1],
        color: HeadingColors[level],
        section: "Toggle headings",
        isToggle: true,
        run: (editor: Editor, range: SlashRange) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setHeading({ level })
            .updateAttributes("heading", { collapsed: true })
            .run()
      })),
      {
        id: "paragraph",
        title: "Paragraph",
        description: "Plain text paragraph",
        aliases: ["text", "p", "normal", "paragraph"],
        icon: Icons.paragraph,
        color: "paragraph-secondary",
        section: "Text",
        run: (editor, range) =>
          editor.chain().focus().deleteRange(range).setParagraph().run()
      },
      {
        id: "checklist", title: "Checklist", description: "Simple checkbox list",
        aliases: ["check", "checklist", "todo", "to-do"], icon: Icons.checklist, color: COMMAND_COLORS.list,
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCheckList().run()
      },
      {
        id: "task-list", title: "Expense Checklist", description: "Tasks and expenses with live totals and settled status",
        aliases: ["task", "tasks", "tasklist", "progress", "expense", "expenses", "bill", "cost"], icon: Icons.checkbox, color: COMMAND_COLORS.list,
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run()
      },
      {
        id: "outline-list", title: "Outline list", description: "Expandable outline",
        aliases: ["outline", "toc", "table of contents"], icon: Icons.outlineList, color: COMMAND_COLORS.list,
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOutlineList().run()
      },
      {
        id: "bullet-list", title: "Bulleted list", description: "Unordered list",
        aliases: ["bullet", "bullets", "ul", "unordered"], icon: Icons.bulletList, color: COMMAND_COLORS.list,
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
      {
        id: "numbered-list", title: "Numbered list", description: "Ordered list",
        aliases: ["number", "numbers", "ol", "ordered"], icon: Icons.numberedList, color: COMMAND_COLORS.list,
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
      {
        id: "table", title: "Table", description: "Insert a table with a header row",
        aliases: ["grid", "database", "db", "rows", "tbl", "calc", "sum"], icon: Icons.table, color: COMMAND_COLORS.table,
        run: (editor, range) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      },
      {
        id: "simple-table", title: "Simple table", description: "Insert a plain 3 × 3 table",
        aliases: ["simpletable", "plain-table"], icon: Icons.table, color: COMMAND_COLORS.table,
        run: (editor, range) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()
      },
      {
        id: "callout", title: "Callout", description: "Highlighted information block",
        aliases: ["info", "note", "highlight"], icon: Icons.callout, color: COMMAND_COLORS.callout,
        run: (editor, range) => editor.chain().focus().deleteRange(range).setCallout({ type: "info" }).run()
      },
      {
        id: "quote", title: "Quote", description: "Block quote",
        aliases: ["blockquote", "citation"], icon: Icons.blockquote, color: COMMAND_COLORS.text,
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
      {
        id: "code", title: "Code block", description: "Insert a code block",
        aliases: ["codeblock", "pre", "programming"], icon: Icons.codeblock, color: COMMAND_COLORS.code,
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      },
      {
        id: "divider", title: "Divider", description: "Horizontal rule",
        aliases: ["hr", "horizontal-rule", "line", "separator"], icon: Icons.horizontalRule, color: COMMAND_COLORS.divider,
        run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run()
      },
      {
        id: "math",
        title: "Math equation",
        description: "Insert a block equation",
        aliases: ["math", "equation", "latex", "formula"],
        icon: Icons.mathBlock,
        color: COMMAND_COLORS.text,
        run: (editor, range) =>
          editor.chain().focus().deleteRange(range).insertMathBlock().run()
      },
      {
        id: "sketch",
        title: "Sketch",
        description: "Draw with a vector sketchpad",
        aliases: ["sketch", "draw", "canvas", "doodle"],
        icon: Icons.mathBlock,
        color: COMMAND_COLORS.media,
        run: (editor, range) =>
          editor.chain().focus().deleteRange(range).insertSketch().run()
      },
      {
        id: "math-inline",
        title: "Inline math",
        description: "Insert an inline LaTeX expression",
        aliases: ["inline math", "inline equation", "latex inline"],
        icon: Icons.mathBlock,
        color: COMMAND_COLORS.text,
        run: (editor, range) =>
          editor.chain().focus().deleteRange(range).insertMathInline().run()
      },
      {
        id: "audio",
        title: "Voice memo",
        description: "Record audio directly in this note",
        aliases: ["audio", "voice", "memo", "recording"],
        icon: Icons.attachment,
        color: COMMAND_COLORS.media,
        run: (editor, range) =>
          editor.chain().focus().deleteRange(range).insertAudio().run()
      },
      {
        id: "image", title: "Image", description: "Choose an image to insert",
        aliases: ["picture", "photo", "media"], icon: Icons.image, color: COMMAND_COLORS.media,
        run: (editor, range) => {
          editor.chain().focus().deleteRange(range).run();
          editor.storage.openAttachmentPicker?.("image");
        }
      }
    ],
    []
  );

  const filteredCommands = useMemo(() => {
    if (!menuState) return [];
    const query = menuState.query.toLowerCase();
    if (!query) return commands;
    return commands.filter((command) =>
      [command.id, command.title, command.description, ...command.aliases].join(" ").toLowerCase().includes(query)
    );
  }, [commands, menuState?.query]);

  filteredCommandsRef.current = filteredCommands;
  selectedIndexRef.current = selectedIndex;

  const closeMenu = useCallback(() => {
    menuRef.current = null;
    setMenuState(null);
    setSelectedIndex(0);
    selectedIndexRef.current = 0;
    close();
  }, [close]);

  const syncMenu = useCallback(() => {
    if (editor.isDestroyed || !editor.isEditable) {
      closeMenu();
      return;
    }
    const selection = editor.state.selection;
    if (!(selection instanceof TextSelection) || !selection.empty) {
      closeMenu();
      return;
    }
    const { $from } = selection;
    const parent = $from.parent;
    if (!parent.isTextblock || ["codeBlock", "mathBlock"].includes(parent.type.name)) {
      closeMenu();
      return;
    }
    const beforeCursor = parent.textBetween(0, $from.parentOffset, "\n", "\uFFFC");
    const match = /(?:^|\s)\/([a-zA-Z0-9_-]*)$/.exec(beforeCursor);
    if (!match) {
      closeMenu();
      return;
    }
    const query = match[1] || "";
    const range = { from: selection.from - query.length - 1, to: selection.from };
    let coords: { left: number; bottom: number };
    try {
      coords = editor.view.coordsAtPos(selection.from);
    } catch {
      closeMenu();
      return;
    }
    const next: SlashMenuState = { ...range, query, left: coords.left, top: coords.bottom };
    const previous = menuRef.current;
    if (!previous || previous.query !== query || previous.from !== range.from) {
      selectedIndexRef.current = 0;
      setSelectedIndex(0);
    }
    menuRef.current = next;
    setMenuState(next);
  }, [editor, closeMenu]);

  useEffect(() => {
    const dom = editor.view.dom;
    const onKeyDown = (event: KeyboardEvent) => {
      const current = menuRef.current;
      if (!current) return;
      const items = filteredCommandsRef.current;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeMenu();
      } else if (event.key === "ArrowDown" && items.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const next = (selectedIndexRef.current + 1) % items.length;
        selectedIndexRef.current = next;
        setSelectedIndex(next);
      } else if (event.key === "ArrowUp" && items.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const next = (selectedIndexRef.current - 1 + items.length) % items.length;
        selectedIndexRef.current = next;
        setSelectedIndex(next);
      } else if (event.key === "Enter" && items.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        items[Math.min(selectedIndexRef.current, items.length - 1)].run(editor, { from: current.from, to: current.to });
        closeMenu();
      }
    };
    dom.addEventListener("keydown", onKeyDown, true);
    editor.on("transaction", syncMenu);
    editor.on("selectionUpdate", syncMenu);
    window.addEventListener("resize", syncMenu);
    window.addEventListener("scroll", syncMenu, true);
    syncMenu();
    return () => {
      dom.removeEventListener("keydown", onKeyDown, true);
      editor.off("transaction", syncMenu);
      editor.off("selectionUpdate", syncMenu);
      window.removeEventListener("resize", syncMenu);
      window.removeEventListener("scroll", syncMenu, true);
      closeMenu();
    };
  }, [editor, syncMenu, closeMenu]);

  const selectCommand = useCallback((command: SlashCommand) => {
    const current = menuRef.current;
    if (!current) return;
    command.run(editor, { from: current.from, to: current.to });
    closeMenu();
  }, [editor, closeMenu]);

  return (
    <>
      {menuState ? (
        <div ref={anchorRef} aria-hidden="true" style={{ position: "fixed", left: menuState.left, top: menuState.top, width: 1, height: 1, pointerEvents: "none" }} />
      ) : null}
      {menuState ? (
        <PopupWrapper
          id="slash-commands"
          group="slash-commands"
          scope="editorToolbar"
          blocking={false}
          focusOnRender={false}
          position={{ target: anchorRef.current || "mouse", isTargetAbsolute: true, location: "below", align: "start", yOffset: 5 }}
          sx={{ maxWidth: "calc(100vw - 24px)" }}
        >
          <Box sx={{ width: 251, maxWidth: "calc(100vw - 24px)", maxHeight: 330, overflow: "hidden", bg: "background", border: "1px solid var(--border)", borderRadius: "default", boxShadow: "menu" }}>
            <Flex sx={{ px: 2, py: 1, alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--separator)" }}>
              <Text variant="subBody" sx={{ color: "paragraph-secondary" }}>Insert block</Text>
              <Text variant="subBody" sx={{ color: "paragraph-secondary" }}>/{menuState.query}</Text>
            </Flex>
            <Box sx={{ p: "3px", maxHeight: 285, overflowY: "auto" }}>
              {filteredCommands.length ? filteredCommands.map((command, index) => (
                <Fragment key={command.id}>
                {command.section && command.section !== filteredCommands[index - 1]?.section ? (
                  <Text sx={{ display: "block", px: "7px", pt: command.section === "Headings" ? "3px" : "7px", pb: "1px", fontSize: "9px", fontWeight: 650, letterSpacing: "0.045em", textTransform: "uppercase", color: "paragraph-secondary" }}>
                    {command.section}
                  </Text>
                ) : null}
                <Button
                  key={command.id}
                  type="button"
                  variant="menuitem"
                  role="option"
                  aria-selected={selectedIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => { selectedIndexRef.current = index; setSelectedIndex(index); }}
                  onClick={() => selectCommand(command)}
                  sx={{ width: "100%", display: "flex", alignItems: "center", textAlign: "left", px: "8px", py: "4px", minHeight: "34px", borderRadius: "small", bg: selectedIndex === index ? "background-selected" : "transparent", transition: "background 0.1s ease" }}
                >
                  {command.isToggle ? (
                    <Flex sx={{ alignItems: "center", gap: "1px", mr: 2, flexShrink: 0 }}>
                      <Icon path={Icons.chevronRight} color={command.color} size={12} />
                      <Icon path={command.icon} color={command.color} size={15} />
                    </Flex>
                  ) : command.id === "task-list" ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ flexShrink: 0, marginRight: 8 }}
                    >
                      <path
                        d="M21 11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"
                        stroke="#2563eb"
                      />
                      <path d="M13 6.5H8l2.5 2.5L8 11.5h5" stroke="#ef4444" />
                      <path d="m6.5 15 3.5 3.5 13.5-13" stroke="#2563eb" />
                    </svg>
                  ) : (
                    <Icon path={command.icon} color={command.color} size={18} sx={{ mr: 2 }} />
                  )}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Text sx={{ display: "block", fontSize: "12px", fontWeight: 500, lineHeight: 1.2 }}>
                      {command.title}
                    </Text>
                    <Text sx={{ display: "block", fontSize: "10.5px", lineHeight: 1.15, color: "paragraph-secondary", mt: "1px" }}>{command.description}</Text>
                  </Box>
                </Button>
                </Fragment>
              )) : (
                <Text variant="body" sx={{ px: 2, py: 3, color: "paragraph-secondary" }}>No matching commands</Text>
              )}
            </Box>
          </Box>
        </PopupWrapper>
      ) : null}
    </>
  );
}
