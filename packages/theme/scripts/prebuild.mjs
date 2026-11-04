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
import "isomorphic-fetch";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_THEMES = ["default-light", "default-dark"];

const THEMES_DIRECTORY = path.resolve(
  path.join(__dirname, "..", "src", "theme-engine", "themes")
);

const THEME_COMPATIBILITY_VERSION = 1;

async function main() {
  await mkdir(THEMES_DIRECTORY, { recursive: true });

  for (const themeId of DEFAULT_THEMES) {
    const themePath = path.join(THEMES_DIRECTORY, `${themeId}.json`);
    let theme;
    if (existsSync(themePath)) {
      // Apply the app-wide light palette to generated or cached themes as well.
      if (themeId !== "default-light") continue;
      theme = JSON.parse(await readFile(themePath, "utf8"));
    } else {
      console.log("Getting", themeId);
      const BASE_URL = `https://raw.githubusercontent.com/streetwriters/notesnook-themes/main/themes/${themeId}/v${THEME_COMPATIBILITY_VERSION}`;
      theme = await fetch(`${BASE_URL}/theme.json`).then((r) => r.json());
      const codeBlockCSS = await fetch(`${BASE_URL}/code-block.css`).then((r) =>
        r.text()
      );
      if (!theme) continue;
      theme = { ...theme, $schema: undefined, codeBlockCSS };
    }

    if (themeId === "default-light") applyWarmSepia(theme);
    await writeFile(themePath, JSON.stringify(theme));
  }
}

main();


function applyWarmSepia(theme) {
  theme.name = "Warm Sepia";
  theme.description = "A warm, eye-friendly palette applied across the full light interface.";
  theme.tags = [...new Set([...(theme.tags || []), "warm", "sepia", "eye-friendly"])];

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

  for (const [scopeName, scope] of Object.entries(theme.scopes || {})) {
    for (const [variantName, colors] of Object.entries(scope || {})) {
      const colorsForVariant = palette[variantName];
      if (!colors || !colorsForVariant) continue;
      Object.assign(colors, colorsForVariant);
      if (
        (scopeName === "navigationMenu" || scopeName === "statusBar") &&
        variantName === "primary"
      ) {
        colors.background = "#f5f1e9";
      }
    }
  }
}
