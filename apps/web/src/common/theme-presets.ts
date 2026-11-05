/*
This file is part of the Notesnook project (https://notesnook.com/)
Copyright (C) 2023 Streetwriters (Private) Limited
*/
import { ThemeDefinition, ThemeDark, ThemeLight } from "@notesnook/theme";

type Palette = {
  accent: string;
  accentForeground?: string;
  background: string;
  secondaryBackground: string;
  selectedBackground: string;
  paragraph: string;
  secondaryParagraph: string;
  heading: string;
  border: string;
  icon: string;
  placeholder: string;
  hover: string;
};

function createPaletteTheme(
  base: ThemeDefinition,
  id: string,
  name: string,
  description: string,
  palette: Palette
): ThemeDefinition {
  const theme = JSON.parse(JSON.stringify(base)) as ThemeDefinition;
  theme.id = id;
  theme.name = name;
  theme.version = 1;
  theme.description = description;
  theme.authors = [{ name: "JivanLekh" }];
  theme.tags = ["built-in", palette.background === "#fbf8f2" ? "light" : base.colorScheme];

  for (const [scopeName, scope] of Object.entries(theme.scopes)) {
    if (!scope) continue;
    for (const [variantName, colors] of Object.entries(scope)) {
      if (!colors) continue;
      const isDark = theme.colorScheme === "dark";
      const variant = variantName.toLowerCase();
      const background =
        variant === "selected" ? palette.selectedBackground :
        variant === "disabled" ? palette.secondaryBackground :
        variant === "secondary" ? palette.secondaryBackground :
        palette.background;
      const foreground =
        variant === "disabled" ? palette.secondaryParagraph :
        variant === "secondary" ? palette.secondaryParagraph :
        palette.paragraph;
      Object.assign(colors, {
        accent: palette.accent,
        accentForeground: palette.accentForeground || "#ffffff",
        background,
        paragraph: foreground,
        heading: palette.heading,
        border: palette.border,
        separator: palette.border,
        icon: palette.icon,
        placeholder: palette.secondaryParagraph,
        hover: palette.hover,
        backdrop: isDark ? "#00000088" : "#00000020"
      });
      if (scopeName === "navigationMenu" || scopeName === "statusBar") {
        if (variantName === "primary") {
          Object.assign(colors, { background: palette.secondaryBackground });
        }
      }
    }
  }
  return theme;
}

export const ThemeWarmSepia = createPaletteTheme(
  ThemeLight,
  "warm-sepia",
  "Warm Sepia",
  "A warm, eye-friendly light palette.",
  {
    accent: "#9a693d",
    background: "#fbf8f2",
    secondaryBackground: "#f5f1e9",
    selectedBackground: "#f0e9dc",
    paragraph: "#2e2824",
    secondaryParagraph: "#756b60",
    heading: "#302820",
    border: "#e9e0d3",
    icon: "#6b6157",
    placeholder: "#9e948a",
    hover: "#f0e9dc"
  }
);

export const ThemeSoftSage = createPaletteTheme(
  ThemeLight,
  "soft-sage",
  "Soft Sage",
  "A calm light palette with gentle green accents.",
  {
    accent: "#52745e",
    background: "#f7faf6",
    secondaryBackground: "#edf3ed",
    selectedBackground: "#e3eee4",
    paragraph: "#26342a",
    secondaryParagraph: "#68776b",
    heading: "#26382c",
    border: "#dce7dc",
    icon: "#5e7564",
    placeholder: "#8d9d90",
    hover: "#eaf2ea"
  }
);

export const ThemeMidnightBlue = createPaletteTheme(
  ThemeDark,
  "midnight-blue",
  "Midnight Blue",
  "A deep dark palette with cool blue accents.",
  {
    accent: "#78a9e6",
    accentForeground: "#152238",
    background: "#151c28",
    secondaryBackground: "#1c2635",
    selectedBackground: "#26364b",
    paragraph: "#d7e0ec",
    secondaryParagraph: "#9aa9bc",
    heading: "#edf3fb",
    border: "#303d50",
    icon: "#a9bad0",
    placeholder: "#7f8da0",
    hover: "#243247"
  }
);

export const ThemeForestNight = createPaletteTheme(
  ThemeDark,
  "forest-night",
  "Forest Night",
  "A restful dark palette with muted forest accents.",
  {
    accent: "#85b78d",
    accentForeground: "#17251b",
    background: "#171f1b",
    secondaryBackground: "#202b24",
    selectedBackground: "#2b3b30",
    paragraph: "#d9e4dc",
    secondaryParagraph: "#a0b0a4",
    heading: "#edf5ef",
    border: "#34443a",
    icon: "#aec0b2",
    placeholder: "#829489",
    hover: "#28382d"
  }
);

export const BuiltInLightThemes = [ThemeLight, ThemeWarmSepia, ThemeSoftSage] as const;
export const BuiltInDarkThemes = [ThemeDark, ThemeMidnightBlue, ThemeForestNight] as const;
