/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

const CURRENCY_PATTERN = "(?:C\\$|A\\$|AED\\s*|₹|\\$|€|£|¥|Rs\\.?|INR)";

function evaluateMathString(raw: string): number | null {
  let expression = raw.trim().replace(/^sum\s*\((.*)\)$/i, "$1");
  expression = expression
    .replace(new RegExp(CURRENCY_PATTERN, "gi"), "")
    .replace(/,/g, "")
    .replace(/\s+/g, "");

  if (!expression || !/^[\d.+\-*/()]+$/.test(expression)) return null;

  const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+|[()+\-*/])/g);
  if (!tokens || tokens.join("") !== expression) return null;

  let index = 0;

  const parsePrimary = (): number => {
    const token = tokens[index];
    if (token === "+" || token === "-") {
      index++;
      const value = parsePrimary();
      return token === "-" ? -value : value;
    }
    if (token === "(") {
      index++;
      const value = parseAddSubtract();
      if (tokens[index] !== ")") return Number.NaN;
      index++;
      return value;
    }
    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
      return Number.NaN;
    }
    index++;
    return Number(token);
  };

  const parseMultiplyDivide = (): number => {
    let value = parsePrimary();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const operator = tokens[index++];
      const right = parsePrimary();
      if (!Number.isFinite(value) || !Number.isFinite(right)) {
        return Number.NaN;
      }
      if (operator === "/" && right === 0) return Number.NaN;
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };

  const parseAddSubtract = (): number => {
    let value = parseMultiplyDivide();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = parseMultiplyDivide();
      if (!Number.isFinite(value) || !Number.isFinite(right)) {
        return Number.NaN;
      }
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  const value = parseAddSubtract();
  if (index !== tokens.length || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseExpenseAmount(rawText: string): number | null {
  const text = rawText.trim();
  if (!text) return null;

  // A number or calculation on its own, optionally wrapped in sum(...).
  // Do not fall through to the "amount at either end" rules when a pure
  // arithmetic expression is malformed (for example, division by zero).
  const numericCandidate = text
    .replace(new RegExp(CURRENCY_PATTERN, "gi"), "")
    .replace(/,/g, "")
    .trim();
  if (/^sum\s*\(/i.test(text) || /^[\d\s.+\-*/()]+$/.test(numericCandidate)) {
    return evaluateMathString(text);
  }

  // Explicit currency, e.g. ₹120, 120 INR or AED 45.
  const currencyMatch = text.match(
    new RegExp(
      "(?:^|\\s)" +
        CURRENCY_PATTERN +
        "\\s*([\\d.,+\\-*/()]+)|([\\d.,+\\-*/()]+)\\s*" +
        CURRENCY_PATTERN +
        "(?:\\s|$)",
      "i"
    )
  );
  if (currencyMatch) {
    const amount = evaluateMathString(currencyMatch[1] || currencyMatch[2] || "");
    if (amount !== null) return amount;
  }

  // Amount at the beginning: "50 for groceries", "50*2 groceries".
  const startMatch = text.match(
    /^([\d.+\-*/()]+)\s*(?:[-:–—=]|\bfor\b|\bon\b|\bat\b|\bto\b|\s)\s*(.+)$/i
  );
  if (startMatch && !/^[.+\-*/]/.test(startMatch[1])) {
    const amount = evaluateMathString(startMatch[1]);
    if (amount !== null) return amount;
  }

  // Amount at the end: "Metro fare - 50", "pizza 90".
  const endMatch = text.match(
    /^(.+?)\s*(?:[-:–—=]|\bfor\b|\bon\b|\bat\b|\bof\b|\s)\s*([\d.+\-*/()]+)$/i
  );
  if (endMatch) {
    const amount = evaluateMathString(endMatch[2]);
    if (amount !== null) return amount;
  }

  return null;
}

export function getTaskItemText(node: ProseMirrorNode): string {
  const parts: string[] = [];
  node.forEach((child) => {
    // Do not include nested checklist text in the parent's own amount.
    if (child.type.name !== TaskList.name && child.textContent.trim()) {
      parts.push(child.textContent.trim());
    }
  });
  return parts.join(" ");
}

export type ExpenseSummary = {
  pending: number;
  settled: number;
  total: number;
};

export function getExpenseSummary(node: ProseMirrorNode): ExpenseSummary {
  const summary: ExpenseSummary = { pending: 0, settled: 0, total: 0 };
  node.descendants((child) => {
    if (child.type.name !== TaskItem.name) return;
    const amount = parseExpenseAmount(getTaskItemText(child));
    if (amount === null) return;
    summary.total += amount;
    if (child.attrs.checked) summary.settled += amount;
    else summary.pending += amount;
  });
  summary.pending = Math.round(summary.pending * 100) / 100;
  summary.settled = Math.round(summary.settled * 100) / 100;
  summary.total = Math.round(summary.total * 100) / 100;
  return summary;
}

export function formatExpenseAmount(
  amount: number,
  currencySymbol = "₹",
  showCurrency = true
): string {
  const formatted = (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2);
  return showCurrency ? currencySymbol + formatted : formatted;
}
