/*
This file is part of the Notesnook project (https://notesnook.com/)
Copyright (C) 2023 Streetwriters (Private) Limited
*/
import { Node, mergeAttributes } from "@tiptap/core";

export type ColumnCount = 2 | 3 | 4 | 5;

function normalizeColumnCount(value: unknown): ColumnCount {
  const count = Number(value);
  if (count === 3 || count === 4 || count === 5) return count;
  return 2;
}

export const Column = Node.create({
  name: "column",
  group: "column",
  content: "block+",
  defining: true,
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-jl-column]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-jl-column": "true",
        style: "min-width: 0;"
      }),
      0
    ];
  }
});

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,5}",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      count: {
        default: 2,
        parseHTML: (element: HTMLElement) =>
          normalizeColumnCount(element.getAttribute("data-column-count")),
        renderHTML: (attributes: { count?: number }) => ({
          "data-column-count": normalizeColumnCount(attributes.count)
        })
      }
    };
  },
  parseHTML() {
    return [{ tag: "div[data-jl-columns]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const count = normalizeColumnCount(node.attrs.count);
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-jl-columns": "true",
        style: `display: grid; grid-template-columns: repeat(${count}, minmax(0, 1fr)); gap: 12px; align-items: start;`
      }),
      0
    ];
  },
  addCommands() {
    return {
      insertColumns:
        (count: ColumnCount) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { count },
            content: Array.from({ length: count }, () => ({
              type: Column.name,
              content: [{ type: "paragraph" }]
            }))
          })
    };
  }
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      insertColumns: (count: ColumnCount) => ReturnType;
    };
  }
}
