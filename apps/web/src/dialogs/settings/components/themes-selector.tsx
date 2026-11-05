/*
This file is part of the Notesnook project (https://notesnook.com/)
Copyright (C) 2023 Streetwriters (Private) Limited
*/
import { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Text } from "@theme-ui/components";
import {
  getPreviewColors,
  ThemeDefinition
} from "@notesnook/theme";
import { ThemeMetadata } from "@notesnook/themes-server";
import {
  BuiltInDarkThemes,
  BuiltInLightThemes
} from "../../../common/theme-presets";
import { useStore as useThemeStore } from "../../../stores/theme-store";
import { ThemePreview } from "../../../components/theme-preview";
import { strings } from "@notesnook/intl";

function asThemeMetadata(theme: ThemeDefinition): ThemeMetadata {
  return {
    ...theme,
    totalInstalls: 0,
    previewColors: getPreviewColors(theme)
  };
}

const LIGHT_THEMES = BuiltInLightThemes.map(asThemeMetadata);
const DARK_THEMES = BuiltInDarkThemes.map(asThemeMetadata);

export function ThemesSelector() {
  const activeTheme = useThemeStore((store) => store.activeTheme);
  const setTheme = useThemeStore((store) => store.setTheme);
  const [draftTheme, setDraftTheme] = useState<ThemeMetadata>(() =>
    asThemeMetadata(activeTheme)
  );

  useEffect(() => {
    setDraftTheme(asThemeMetadata(activeTheme));
  }, [activeTheme]);

  const hasUnsavedSelection = draftTheme.id !== activeTheme.id;
  const previewForScheme = useMemo(
    () => (scheme: "light" | "dark") => {
      if (draftTheme.colorScheme === scheme) return draftTheme;
      const current = activeTheme.colorScheme === scheme ? activeTheme : undefined;
      return asThemeMetadata(
        current ||
          (scheme === "light" ? BuiltInLightThemes[0] : BuiltInDarkThemes[0])
      );
    },
    [activeTheme, draftTheme]
  );

  return (
    <Flex sx={{ flexDirection: "column", gap: 3, width: "100%" }}>
      <Flex
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          minHeight: 42,
          position: "sticky",
          top: 0,
          zIndex: 3,
          bg: "background",
          py: 1
        }}
      >
        <Box>
          <Text sx={{ fontSize: 12, fontWeight: 600, color: "paragraph-secondary" }}>
            Theme preview
          </Text>
          <Text variant="title" sx={{ display: "block" }}>
            {draftTheme.name}
          </Text>
        </Box>
        <Button
          variant="primary"
          disabled={!hasUnsavedSelection}
          onClick={() => setTheme(draftTheme as ThemeDefinition)}
        >
          {strings.save()}
        </Button>
      </Flex>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: ["1fr", "1fr 1fr"],
          alignItems: "start",
          gap: 3,
          width: "100%"
        }}
      >
        <ThemeSection
          title={strings.light()}
          themes={LIGHT_THEMES}
          previewTheme={previewForScheme("light")}
          selectedId={draftTheme.id}
          activeId={activeTheme.id}
          onSelect={setDraftTheme}
        />
        <ThemeSection
          title={strings.dark()}
          themes={DARK_THEMES}
          previewTheme={previewForScheme("dark")}
          selectedId={draftTheme.id}
          activeId={activeTheme.id}
          onSelect={setDraftTheme}
        />
      </Box>
    </Flex>
  );
}

type ThemeSectionProps = {
  title: string;
  themes: ThemeMetadata[];
  previewTheme: ThemeMetadata;
  selectedId: string;
  activeId: string;
  onSelect: (theme: ThemeMetadata) => void;
};

function ThemeSection({
  title,
  themes,
  previewTheme,
  selectedId,
  activeId,
  onSelect
}: ThemeSectionProps) {
  return (
    <Flex
      sx={{
        flexDirection: "column",
        minWidth: 0,
        gap: 2,
        p: 2,
        border: "1px solid var(--border)",
        borderRadius: "large",
        bg: "background-secondary"
      }}
    >
      <Text variant="subheading" sx={{ color: "heading" }}>
        {title} themes
      </Text>
      <ThemePreview theme={previewTheme} />
      <Box
        role="radiogroup"
        aria-label={`${title} themes`}
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 1
        }}
      >
        {themes.map((theme) => (
          <ThemePalette
            key={theme.id}
            theme={theme}
            isSelected={selectedId === theme.id}
            isSaved={activeId === theme.id}
            onSelect={onSelect}
          />
        ))}
      </Box>
    </Flex>
  );
}

function ThemePalette({
  theme,
  isSelected,
  isSaved,
  onSelect
}: {
  theme: ThemeMetadata;
  isSelected: boolean;
  isSaved: boolean;
  onSelect: (theme: ThemeMetadata) => void;
}) {
  const colors = [
    theme.previewColors.navigationMenu.background,
    theme.previewColors.background,
    theme.previewColors.accent,
    theme.previewColors.list.heading
  ];

  return (
    <Button
      type="button"
      variant="secondary"
      role="radio"
      aria-checked={isSelected}
      onClick={() => onSelect(theme)}
      title={theme.name}
      sx={{
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 1,
        p: 1,
        borderRadius: "12px",
        border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
        bg: isSelected ? "shade" : "background",
        textAlign: "left",
        overflow: "hidden",
        transition: "background 160ms ease, border-color 160ms ease"
      }}
    >
      <Flex sx={{ width: "100%", height: 22, overflow: "hidden", borderRadius: 999 }}>
        {colors.map((color, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              bg: color,
              borderRight: index < colors.length - 1 ? "1px solid var(--border)" : "none"
            }}
          />
        ))}
      </Flex>
      <Text
        sx={{
          fontSize: 10,
          lineHeight: 1.2,
          color: "text",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {theme.name}
      </Text>
      {isSelected ? (
        <Text sx={{ fontSize: 9, lineHeight: 1, color: "accent" }}>
          {isSaved ? "Selected" : "Preview"}
        </Text>
      ) : null}
    </Button>
  );
}
