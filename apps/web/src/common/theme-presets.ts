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
      if (variant === "error" || variant === "success") continue;
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

export const ThemeLavenderMist = createPaletteTheme(
  ThemeLight,
  "lavender-mist",
  "Lavender Mist",
  "A soft lavender palette with a quiet, cool surface.",
  {
    accent: "#7453A6",
    background: "#FAF8FC",
    secondaryBackground: "#F1EDF7",
    selectedBackground: "#E9E0F4",
    paragraph: "#302A38",
    secondaryParagraph: "#756B82",
    heading: "#332940",
    border: "#E4DCEC",
    icon: "#6F6480",
    placeholder: "#958BA0",
    hover: "#EEE8F5"
  }
);

export const ThemeCoastalMist = createPaletteTheme(
  ThemeLight,
  "coastal-mist",
  "Coastal Mist",
  "A fresh, low-glare palette with muted teal accents.",
  {
    accent: "#2F737A",
    background: "#F5FAFA",
    secondaryBackground: "#EAF3F3",
    selectedBackground: "#DDEDEE",
    paragraph: "#263438",
    secondaryParagraph: "#64777A",
    heading: "#22363A",
    border: "#D8E5E6",
    icon: "#587377",
    placeholder: "#8A9B9D",
    hover: "#E8F1F2"
  }
);

export const ThemeDuskSlate = createPaletteTheme(
  ThemeDark,
  "dusk-slate",
  "Dusk Slate",
  "A gentle charcoal palette with muted violet highlights.",
  {
    accent: "#A9A7F5",
    accentForeground: "#1C1B27",
    background: "#1C1B27",
    secondaryBackground: "#252433",
    selectedBackground: "#333148",
    paragraph: "#E3E1F0",
    secondaryParagraph: "#B1AEC8",
    heading: "#F2F0FC",
    border: "#3B394D",
    icon: "#B8B5D3",
    placeholder: "#87849F",
    hover: "#302E43"
  }
);

export const ThemePlumNight = createPaletteTheme(
  ThemeDark,
  "plum-night",
  "Plum Night",
  "A warm dark palette with restrained plum accents.",
  {
    accent: "#D7A2C7",
    accentForeground: "#241B23",
    background: "#241B23",
    secondaryBackground: "#30242F",
    selectedBackground: "#443347",
    paragraph: "#EBDDE8",
    secondaryParagraph: "#C2ADBE",
    heading: "#F6EAF3",
    border: "#493A46",
    icon: "#CBB3C5",
    placeholder: "#957F90",
    hover: "#3B2D3A"
  }
);

export const BuiltInLightThemes = [
  ThemeLight,
  ThemeWarmSepia,
  ThemeSoftSage,
  ThemeLavenderMist,
  ThemeCoastalMist
] as const;
export const BuiltInDarkThemes = [
  ThemeDark,
  ThemeMidnightBlue,
  ThemeForestNight,
  ThemeDuskSlate,
  ThemePlumNight
] as const;
