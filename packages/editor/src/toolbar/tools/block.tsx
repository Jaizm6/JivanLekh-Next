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

import { ToolProps } from "../types.js";
import { Editor, hasPermission } from "../../types.js";
import { Icons } from "../icons.js";
import { useMemo, useRef, useState } from "react";
import { EmbedPopup } from "../popups/embed-popup.js";
import { TablePopup } from "../popups/table-popup.js";
import { MenuItem, Icon } from "@notesnook/ui";
import { useIsMobile, useToolbarLocation } from "../stores/toolbar-store.js";
import { ResponsivePresenter } from "../../components/responsive/index.js";
import { showPopup } from "../../components/popup-presenter/index.js";
import { ImageUploadPopup } from "../popups/image-upload.js";
import { Button } from "../../components/button.js";
import { strings } from "@notesnook/intl";
import { keybindings } from "@notesnook/common";
import { importCsvToTable } from "../../extensions/table/actions.js";

export function InsertBlock(props: ToolProps) {
  const { editor } = props;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const toolbarLocation = useToolbarLocation();
  const isMobile = useIsMobile();

  const menuItems = useMemo(() => {
    const items: MenuItem[] = [
      paragraph(editor),
      ...[1, 2, 3, 4, 5, 6].map((level) => heading(editor, level)),
      ...[1, 2, 3].map((level) => toggleHeading(editor, level)),
      { key: "list-separator", type: "separator" },
      checklist(editor),
      expenseChecklist(editor),
      bulletList(editor),
      numberedList(editor),
      outlinelist(editor),
      { key: "block-separator", type: "separator" },
      horizontalRule(editor),
      codeblock(editor),
      mathblock(editor),
      inlineMath(editor),
      columns(editor),
      callout(editor),
      blockquote(editor),
      sketch(editor),
      voiceMemo(editor),
      { key: "media-separator", type: "separator" },
      image(editor, isMobile),
      attachment(editor),
      isMobile ? embedMobile(editor) : embedDesktop(editor),
      table(editor)
    ];
    return colorizeMenuItems(items);
  }, [editor, isMobile]);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="secondary"
        sx={{
          p: 1,
          m: 0,
          bg: isOpen ? "var(--background-secondary)" : "transparent",
          mr: 1,
          display: "flex",
          alignItems: "center",
          ":last-of-type": {
            mr: 0
          }
        }}
        onMouseDown={(e) => {
          if (globalThis.keyboardShown) {
            e.preventDefault();
          }
        }}
        onClick={() => setIsOpen((s) => !s)}
      >
        <Icon path={Icons.plus} size="medium" color={"accent"} />
      </Button>

      <ResponsivePresenter
        desktop="menu"
        mobile="sheet"
        title={strings.chooseBlockToInsert()}
        isOpen={isOpen}
        items={menuItems}
        onClose={() => setIsOpen(false)}
        position={{
          target: buttonRef.current || undefined,
          isTargetAbsolute: true,
          location: toolbarLocation === "bottom" ? "top" : "below",
          yOffset: 5
        }}
      />
    </>
  );
}

const heading = (editor: Editor, level: number): MenuItem => ({
  key: `heading-${level}`,
  type: "button",
  title: `Heading ${level}`,
  icon: [
    Icons.heading1,
    Icons.heading2,
    Icons.heading3,
    Icons.heading4,
    Icons.heading5,
    Icons.heading6
  ][level - 1],
  isChecked: editor.isActive("heading", { level }),
  onClick: () =>
    editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
});

const toggleHeading = (editor: Editor, level: number): MenuItem => ({
  key: `toggle-heading-${level}`,
  type: "button",
  title: `Toggle Heading ${level}`,
  icon: [
    Icons.heading1,
    Icons.heading2,
    Icons.heading3
  ][level - 1],
  isChecked: editor.isActive("heading", { level, collapsed: true }),
  onClick: () =>
    editor
      .chain()
      .focus()
      .setHeading({ level: level as 1 | 2 | 3 })
      .updateAttributes("heading", { collapsed: true })
      .run()
});

const bulletList = (editor: Editor): MenuItem => ({
  key: "bullet-list",
  type: "button",
  title: strings.bulletList(),
  icon: Icons.bulletList,
  isChecked: editor.isActive("bulletList"),
  onClick: () => editor.chain().focus().toggleBulletList().run()
});

const numberedList = (editor: Editor): MenuItem => ({
  key: "numbered-list",
  type: "button",
  title: strings.numberedList(),
  icon: Icons.numberedList,
  isChecked: editor.isActive("orderedList"),
  onClick: () => editor.chain().focus().toggleOrderedList().run()
});

const columns = (editor: Editor): MenuItem => ({
  key: "columns",
  type: "button",
  title: "Columns",
  icon: Icons.columnProperties,
  menu: {
    title: "Insert columns",
    items: ([2, 3, 4, 5] as const).map((count) => ({
      key: `columns-${count}`,
      type: "button" as const,
      title: `${count} columns`,
      icon: Icons.columnProperties,
      onClick: () => editor.chain().focus().insertColumns(count).run()
    }))
  }
});

const paragraph = (editor: Editor): MenuItem => ({
  key: "paragraph",
  type: "button",
  title: "Text",
  icon: Icons.paragraph,
  isChecked: editor.isActive("paragraph"),
  onClick: () => editor.chain().focus().setParagraph().run()
});

const expenseChecklist = (editor: Editor): MenuItem => ({
  key: "expense-checklist",
  type: "button",
  title: "Expense Checklist",
  icon: Icons.checkbox,
  isChecked: editor.isActive("taskList"),
  onClick: () => editor.chain().focus().toggleTaskList().run(),
  modifier: keybindings.toggleTaskList.keys
});

const inlineMath = (editor: Editor): MenuItem => ({
  key: "inline-math",
  type: "button",
  title: strings.mathInline(),
  icon: Icons.math,
  isChecked: editor.isActive("mathInline"),
  onClick: () => editor.chain().focus().insertMathInline().run()
});

const sketch = (editor: Editor): MenuItem => ({
  key: "sketch",
  type: "button",
  title: "Sketch",
  icon: Icons.sketch,
  isChecked: editor.isActive("sketch"),
  onClick: () => editor.chain().focus().insertSketch().run()
});

const voiceMemo = (editor: Editor): MenuItem => ({
  key: "voice-memo",
  type: "button",
  title: "Voice memo",
  icon: Icons.attachment,
  isChecked: editor.isActive("audio"),
  onClick: () => editor.chain().focus().insertAudio().run()
});

const horizontalRule = (editor: Editor): MenuItem => ({
  key: "hr",
  type: "button",
  title: strings.horizontalRule(),
  icon: Icons.horizontalRule,
  isChecked: editor.isActive("horizontalRule"),
  onClick: () => editor.chain().focus().setHorizontalRule().run()
});

const codeblock = (editor: Editor): MenuItem => ({
  key: "codeblock",
  type: "button",
  title: strings.codeBlock(),
  icon: Icons.codeblock,
  isChecked: editor.isActive("codeBlock"),
  onClick: () => editor.chain().focus().toggleCodeBlock().run(),
  modifier: keybindings.toggleCodeBlock.keys
});

const blockquote = (editor: Editor): MenuItem => ({
  key: "blockquote",
  type: "button",
  title: strings.quote(),
  icon: Icons.blockquote,
  isChecked: editor.isActive("blockQuote"),
  onClick: () => editor.chain().focus().toggleBlockquote().run(),
  modifier: keybindings.insertBlockquote.keys
});

const mathblock = (editor: Editor): MenuItem => ({
  key: "math",
  type: "button",
  title: strings.mathAndFormulas(),
  icon: Icons.mathBlock,
  isChecked: editor.isActive("mathBlock"),
  onClick: () => editor.chain().focus().insertMathBlock().run(),
  modifier: keybindings.insertMathBlock.keys
});

const callout = (editor: Editor): MenuItem => ({
  key: "callout",
  type: "button",
  title: strings.callout(),
  icon: Icons.callout,
  menu: {
    title: strings.callout(),
    items: [
      { key: "Abstract", title: strings.abstract() },
      { key: "Hint", title: strings.hint() },
      { key: "Info", title: strings.info() },
      { key: "Success", title: strings.success() },
      { key: "Warn", title: strings.warn() },
      { key: "Error", title: strings.error() },
      { key: "Example", title: strings.example() },
      { key: "Quote", title: strings.quote() }
    ].map((item) => ({
      title: item.title,
      key: item.key,
      type: "button",
      isChecked: editor.isActive("callout", { type: item.key.toLowerCase() }),
      onClick: () =>
        editor
          .chain()
          .focus()
          .setCallout({ type: item.key.toLowerCase() as any })
          .run()
    }))
  }
});

const image = (editor: Editor, isMobile: boolean): MenuItem => ({
  key: "image",
  type: "button",
  title: strings.image(),
  icon: Icons.image,
  menu: {
    title: strings.insertImage(),
    items: [
      {
        key: "upload-from-disk",
        type: "button",
        title: strings.uploadFromDisk(),
        icon: Icons.upload,
        onClick: () => editor.storage.openAttachmentPicker?.("image"),
        modifier: keybindings.addImage.keys
      },
      {
        key: "camera",
        type: "button",
        title: strings.takePhotoUsingCamera(),
        icon: Icons.camera,
        isHidden: !isMobile,
        onClick: () => editor.storage.openAttachmentPicker?.("camera")
      },
      isMobile ? uploadImageFromURLMobile(editor) : uploadImageFromURL(editor)
    ]
  }
});

const table = (editor: Editor): MenuItem => ({
  key: "table",
  type: "button",
  title: strings.table(),
  icon: Icons.table,
  menu: {
    title: strings.insertTable(),
    items: [
      {
        key: "import-csv",
        type: "button",
        title: strings.importCsv(),
        icon: Icons.csv,
        onClick: async () => {
          if (!hasPermission("importCsvToTable")) return;

          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".csv,text/csv";
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
              const text = await file.text();
              importCsvToTable(text, editor);
            } catch (error) {
              console.error("Error importing CSV:", error);
            }
          };

          input.click();
        }
      },
      {
        key: "sep",
        type: "separator"
      },
      {
        key: "table-size-selector",
        type: "popup",
        component: (props) => (
          <TablePopup
            onInsertTable={(size) => {
              editor
                ?.chain()
                .focus()
                .insertTable({
                  rows: size.rows,
                  cols: size.columns
                })
                .run();
              props.onClick?.();
            }}
          />
        )
      }
    ]
  }
});

const embedMobile = (editor: Editor): MenuItem => ({
  key: "embed",
  type: "button",
  title: strings.embed(),
  icon: Icons.embed,
  menu: {
    title: strings.insertEmbed(),
    items: [
      {
        key: "embed-popup",
        type: "popup",
        component: function ({ onClick }) {
          return (
            <EmbedPopup
              title={strings.insertEmbed()}
              onClose={(embed) => {
                if (!embed) return onClick?.();
                editor.chain().insertEmbed(embed).run();
                onClick?.();
              }}
            />
          );
        }
      }
    ]
  }
});

const embedDesktop = (editor: Editor): MenuItem => ({
  key: "embed",
  type: "button",
  title: strings.embed(),
  icon: Icons.embed,
  onClick: () => {
    if (!editor) return;
    showPopup({
      popup: (hide) => (
        <EmbedPopup
          title={strings.insertEmbed()}
          onClose={(embed) => {
            if (!embed) return hide();
            editor.chain().insertEmbed(embed).run();
            hide();
          }}
        />
      )
    });
  }
});

const attachment = (editor: Editor): MenuItem => ({
  key: "attachment",
  type: "button",
  title: strings.attachment(),
  icon: Icons.attachment,
  isChecked: editor.isActive("attachment"),
  onClick: () => editor.storage.openAttachmentPicker?.("file"),
  modifier: keybindings.addAttachment.keys
});

const checklist = (editor: Editor): MenuItem => ({
  key: "checklist",
  type: "button",
  title: strings.checklist(),
  icon: Icons.checklist,
  isChecked: editor.isActive("checkList"),
  onClick: () => editor.chain().focus().toggleCheckList().run()
});

const outlinelist = (editor: Editor): MenuItem => ({
  key: "outlinelist",
  type: "button",
  title: strings.outlineList(),
  icon: Icons.outlineList,
  isChecked: editor.isActive("outlineList"),
  onClick: () => editor.chain().focus().toggleOutlineList().run(),
  modifier: keybindings.toggleOutlineList.keys
});

const uploadImageFromURLMobile = (editor: Editor): MenuItem => ({
  key: "upload-from-url",
  type: "button",
  title: strings.attachImageFromURL(),
  icon: Icons.link,
  menu: {
    title: strings.attachImageFromURL(),
    items: [
      {
        key: "attach-image",
        type: "popup",
        component: ({ onClick }) => (
          <ImageUploadPopup
            onInsert={(image) => {
              editor?.chain().focus().insertImage(image).run();
              onClick?.();
            }}
            onClose={() => {
              onClick?.();
            }}
          />
        )
      }
    ]
  }
});

const uploadImageFromURL = (editor: Editor): MenuItem => ({
  key: "upload-from-url",
  type: "button",
  title: strings.attachImageFromURL(),
  icon: Icons.link,
  onClick: () => {
    showPopup({
      popup: (hide) => (
        <ImageUploadPopup
          onInsert={(image) => {
            editor?.chain().focus().insertImage(image).run();
            hide();
          }}
          onClose={hide}
        />
      )
    });
  }
});


const BLOCK_MENU_ICON_COLORS: Record<string, string> = {
  paragraph: "var(--jl-icon-muted)",
  "heading-1": "#e11d48",
  "heading-2": "#ea580c",
  "heading-3": "#16a34a",
  "heading-4": "#2563eb",
  "heading-5": "#9333ea",
  "heading-6": "#4f46e5",
  "toggle-heading-1": "#e11d48",
  "toggle-heading-2": "#ea580c",
  "toggle-heading-3": "#16a34a",
  "expense-checklist": "var(--jl-icon-list)",
  checklist: "var(--jl-icon-list)",
  "bullet-list": "var(--jl-icon-list)",
  "numbered-list": "var(--jl-icon-list)",
  outlinelist: "var(--jl-icon-alignment)",
  hr: "var(--jl-icon-muted)",
  codeblock: "var(--jl-icon-code)",
  math: "var(--jl-icon-code)",
  "inline-math": "var(--jl-icon-code)",
  columns: "var(--jl-icon-alignment)",
  "columns-2": "var(--jl-icon-alignment)",
  "columns-3": "var(--jl-icon-alignment)",
  "columns-4": "var(--jl-icon-alignment)",
  "columns-5": "var(--jl-icon-alignment)",
  callout: "var(--jl-icon-heading)",
  blockquote: "var(--jl-icon-link)",
  sketch: "var(--jl-icon-media)",
  "voice-memo": "var(--jl-icon-media)",
  image: "var(--jl-icon-media)",
  attachment: "var(--jl-icon-media)",
  embed: "var(--jl-icon-media)",
  table: "var(--jl-icon-code)",
  "upload-from-disk": "var(--jl-icon-media)",
  camera: "var(--jl-icon-media)",
  "upload-from-url": "var(--jl-icon-link)",
  "import-csv": "var(--jl-icon-code)"
};
function colorizeMenuItems(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    if (item.type !== "button") return item;
    const color = BLOCK_MENU_ICON_COLORS[item.key] || "var(--jl-icon-muted)";
    return {
      ...item,
      styles: { ...item.styles, icon: { ...item.styles?.icon, color } },
      ...(item.menu ? { menu: { ...item.menu, items: colorizeMenuItems(item.menu.items) } } : {})
    };
  });
}
