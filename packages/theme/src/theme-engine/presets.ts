/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import _ThemeLight from "./themes/default-light.json";
import type { ThemeDefinition } from "./types.js";

const baseTheme = _ThemeLight as ThemeDefinition;

const palette = {
  primary: {
    accent: "#9a693d",
    accentForeground: "#ffffff",
    paragraph: "#2e2824",
    background: "#fbf8f2",
    border: "#e9e0d3",
    heading: "#302820",
    icon: "#6b6157",
    separator: "#e9e0d3",
    placeholder: "#9e948a",
    hover: "#f0e9dc",
    backdrop: "#3c2a1820"
  },
  secondary: {
    accent: "#9a693d",
    accentForeground: "#ffffff",
    paragraph: "#756b60",
    background: "#f5f1e9",
    border: "#e9e0d3",
    heading: "#5c5147",
    icon: "#81776d",
    separator: "#e9e0d3",
    placeholder: "#9e948a",
    hover: "#eee7dc",
    backdrop: "#3c2a181a"
  },
  disabled: {
    accent: "#9a693d",
    accentForeground: "#ffffff",
    paragraph: "#a99f94",
    background: "#f8f5ef",
    border: "#eee8df",
    heading: "#a99f94",
    icon: "#a99f94",
    separator: "#eee8df",
    placeholder: "#b4aa9f",
    hover: "#f0e9dc",
    backdrop: "#3c2a181a"
  },
  selected: {
    accent: "#9a693d",
    accentForeground: "#ffffff",
    paragraph: "#2e2824",
    background: "#f0e9dc",
    border: "#cbb99f",
    heading: "#302820",
    icon: "#6b6157",
    separator: "#e9e0d3",
    placeholder: "#9e948a",
    hover: "#e9e0d3",
    backdrop: "#3c2a1820"
  },
  error: {
    accent: "#b84a44",
    accentForeground: "#ffffff",
    paragraph: "#b84a44",
    background: "#fff0ee",
    border: "#eed5d1",
    heading: "#b84a44",
    icon: "#b84a44",
    separator: "#eed5d1",
    placeholder: "#b98b86",
    hover: "#f8e5e2",
    backdrop: "#3c2a1820"
  },
  success: {
    accent: "#476b3f",
    accentForeground: "#ffffff",
    paragraph: "#476b3f",
    background: "#edf5eb",
    border: "#d9e8d5",
    heading: "#476b3f",
    icon: "#476b3f",
    separator: "#d9e8d5",
    placeholder: "#8b9d84",
    hover: "#e3efdf",
    backdrop: "#3c2a1820"
  }
};

function createWarmSepiaTheme(): ThemeDefinition {
  const theme = JSON.parse(JSON.stringify(baseTheme)) as ThemeDefinition;
  theme.id = "warm-sepia";
  theme.name = "Warm Sepia";
  theme.version = 1;
  theme.description =
    "A warm, eye-friendly light palette for the full JivanLekh interface.";
  theme.authors = [{ name: "JivanLekh" }];
  theme.tags = ["warm", "sepia", "eye-friendly"];

  for (const [scopeName, scope] of Object.entries(theme.scopes)) {
    if (!scope) continue;
    for (const [variantName, colors] of Object.entries(scope)) {
      const colorsForVariant =
        palette[variantName as keyof typeof palette];
      if (!colors || !colorsForVariant) continue;
      Object.assign(colors, colorsForVariant);
      if (
        (scopeName === "navigationMenu" || scopeName === "statusBar") &&
        variantName === "primary"
      ) {
        Object.assign(colors, { background: "#f5f1e9" });
      }
    }
  }

  return theme;
}

export const ThemeWarmSepia = createWarmSepiaTheme();
