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

import { mergeAttributes } from "@tiptap/core";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskItemComponent } from "./component.js";
import { createNodeView } from "../react/index.js";
import { ensureLeadingParagraph } from "../../utils/prosemirror.js";

export type TaskItemAttributes = {
  checked: boolean;
  readonly: boolean;
  expenseCurrencySymbol: string;
  expenseShowCurrency: boolean;
};

export const TaskItemNode = TaskItem.extend({
  draggable: true,

  addAttributes() {
    return {
      checked: {
        default: false,
        keepOnSplit: false,
        parseHTML: (element) => element.classList.contains("checked"),
        renderHTML: (attributes) => ({
          class: attributes.checked ? "checked" : ""
        })
      },
      readonly: {
        default: false,
        parseHTML: (element) => element.dataset.readonly === "true",
        renderHTML: (attributes) =>
          attributes.readonly ? { "data-readonly": "true" } : {}
      },
      expenseCurrencySymbol: {
        default: "₹",
        parseHTML: (element) => element.dataset.expenseCurrencySymbol || "₹",
        renderHTML: (attributes) =>
          attributes.expenseCurrencySymbol !== "₹"
            ? { "data-expense-currency-symbol": attributes.expenseCurrencySymbol }
            : {}
      },
      expenseShowCurrency: {
        default: true,
        parseHTML: (element) => element.dataset.expenseShowCurrency !== "false",
        renderHTML: (attributes) =>
          attributes.expenseShowCurrency === false
            ? { "data-expense-show-currency": "false" }
            : {}
      }
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "checklist--item"
      }),
      0
    ];
  },

  parseHTML() {
    return [
      {
        tag: ".checklist > li",
        priority: 100,
        getContent: ensureLeadingParagraph
      }
    ];
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.()
    };
  },

  addNodeView() {
    return createNodeView(TaskItemComponent, {
      contentDOMFactory: true,
      wrapperFactory: () => {
        const li = document.createElement("li");
        li.dataset.dragImage = "true";
        return li;
      },
      shouldUpdate: (prev, next) => {
        return (
          prev.attrs.checked !== next.attrs.checked ||
          prev.attrs.readonly !== next.attrs.readonly ||
          prev.attrs.expenseCurrencySymbol !== next.attrs.expenseCurrencySymbol ||
          prev.attrs.expenseShowCurrency !== next.attrs.expenseShowCurrency ||
          prev.textContent !== next.textContent
        );
      }
    });
  },

  addInputRules() {
    return [];
  }
});
