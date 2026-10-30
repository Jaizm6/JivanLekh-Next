import { describe, expect, test } from "vitest";
import { parseExpenseAmount } from "../expense.js";

const validExpenses: Array<[string, number]> = [
  ["60", 60],
  ["sum(50*2)", 100],
  ["Metro up - 50", 50],
  ["90 for pizza", 90],
  ["₹1,200 groceries", 1200],
  ["Coffee $4.50", 4.5],
  ["AED 25", 25],
  ["1.25 + 2.75", 4]
];

const invalidExpenses = ["Call the bank", "50 / 0", "-50", ""];

describe("expense checklist amount parsing", () => {
  test.each(validExpenses)("parses %s as %s", (text, expected) => {
    expect(parseExpenseAmount(text)).toBe(expected);
  });

  test.each(invalidExpenses)(
    "does not treat %s as a valid positive expense",
    (text) => {
      expect(parseExpenseAmount(text)).toBeNull();
    }
  );
});
