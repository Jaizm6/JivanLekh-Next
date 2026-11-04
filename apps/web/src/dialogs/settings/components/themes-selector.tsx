/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited
*/
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Box, Button, Flex, Input, Text } from "@theme-ui/components";
import { Loading } from "../../../components/icons";
import {
  THEME_COMPATIBILITY_VERSION,
  ThemeDark,
  ThemeLight,
  getPreviewColors,
  validateTheme,
  type ThemeDefinition
} from "@notesnook/theme";
import { debounce } from "@notesnook/common";
import { ThemeWarmSepia } from "../../../common/theme-presets";
import { useStore as useThemeStore } from "../../../stores/theme-store";
import { useStore as useUserStore } from "../../../stores/user-store";
import {
  ThemesRouter,
  THEME_SERVER_URL,
  ThemesTRPC
} from "../../../common/themes-router";
import { ThemeMetadata } from "@notesnook/themes-server";
import { ThemePreview } from "../../../components/theme-preview";
import { Loader } from "../../../components/loader";
import { showToast } from "../../../utils/toast";
import { showFilePicker, readFile } from "../../../utils/file-picker";
import { VirtualizedGrid } from "../../../components/virtualized-grid";
import { strings } from "@notesnook/intl";

const ThemesClient = ThemesTRPC.createClient({
  links: [httpBatchLink({ url: THEME_SERVER_URL })]
});
const ThemesQueryClient = new QueryClient();

export function ThemesSelector() {
  return (
    <ThemesTRPC.Provider client={ThemesClient} queryClient={ThemesQueryClient}>
      <QueryClientProvider client={ThemesQueryClient}>
        <ThemesList />
      </QueryClientProvider>
    </ThemesTRPC.Provider>
  );
}

const COLOR_SCHEMES = [
  { id: "all", title: strings.all() },
  { id: "dark", title: strings.dark() },
  { id: "light", title: strings.light() }
] as const;

function asThemeMetadata(theme: ThemeDefinition): ThemeMetadata {
  return {
    ...theme,
    totalInstalls: 0,
    previewColors: getPreviewColors(theme)
  };
}

function ThemesList() {
  const [searchQuery, setSearchQuery] = useState<string>();
  const [colorScheme, setColorScheme] = useState<"all" | "dark" | "light">(
    "all"
  );
  const [isApplying, setIsApplying] = useState(false);
  const activeTheme = useThemeStore((store) => store.activeTheme);
  const setCurrentTheme = useThemeStore((store) => store.setTheme);
  const user = useUserStore((store) => store.user);
  const isThemeCurrentlyApplied = useThemeStore(
    (store) => store.isThemeCurrentlyApplied
  );
  const [draftTheme, setDraftTheme] = useState<ThemeMetadata>(() =>
    asThemeMetadata(activeTheme)
  );

  useEffect(() => {
    setDraftTheme(asThemeMetadata(activeTheme));
  }, [activeTheme]);

  const filters = [];
  if (searchQuery) filters.push({ type: "term" as const, value: searchQuery });
  if (colorScheme !== "all")
    filters.push({ type: "colorScheme" as const, value: colorScheme });

  const themes = ThemesTRPC.themes.useInfiniteQuery(
    {
      limit: 10,
      compatibilityVersion: THEME_COMPATIBILITY_VERSION,
      filters
    },
    {
      keepPreviousData: true,
      select: (result) => ({
        pageParams: result.pageParams,
        pages: result.pages.map((page) => ({
          nextCursor: page.nextCursor,
          themes: page.themes.filter(
            (theme) => !isThemeCurrentlyApplied(theme.id)
          )
        }))
      }),
      getNextPageParam: (lastPage) => lastPage.nextCursor
    }
  );

  const normalizedSearch = searchQuery?.trim().toLowerCase();
  const localThemeItems: ThemeMetadata[] =
    (colorScheme === "all" || ThemeWarmSepia.colorScheme === colorScheme) &&
    (!normalizedSearch ||
      `${ThemeWarmSepia.name} ${ThemeWarmSepia.description} ${ThemeWarmSepia.tags?.join(" ")}`
        .toLowerCase()
        .includes(normalizedSearch))
      ? [asThemeMetadata(ThemeWarmSepia)]
      : [];

  const builtInThemeItems: ThemeMetadata[] = [ThemeDark, ThemeLight].map(
    (theme) =>
      asThemeMetadata({
        ...theme,
        description:
          theme.colorScheme === "dark"
            ? strings.defaultDarkThemeDesc()
            : strings.defaultLightThemeDesc()
      })
  );
  const builtInThemeIds = new Set([
    ThemeDark.id,
    ThemeLight.id,
    ThemeWarmSepia.id
  ]);
  const activeThemeMatchesFilter =
    (colorScheme === "all" || activeTheme.colorScheme === colorScheme) &&
    (!normalizedSearch ||
      `${activeTheme.name} ${activeTheme.description} ${activeTheme.tags?.join(" ")}`
        .toLowerCase()
        .includes(normalizedSearch));
  const activeCustomThemeItems: ThemeMetadata[] =
    !builtInThemeIds.has(activeTheme.id) && activeThemeMatchesFilter
      ? [asThemeMetadata(activeTheme)]
      : [];

  const items: ThemeMetadata[] = [
    ...builtInThemeItems,
    ...localThemeItems,
    ...activeCustomThemeItems,
    ...(themes.data?.pages.flatMap((page) => page.themes) || [])
  ];

  const saveTheme = useCallback(
    async (theme: ThemeMetadata) => {
      if (isThemeCurrentlyApplied(theme.id)) return;
      setIsApplying(true);
      try {
        let fullTheme: ThemeDefinition | undefined;
        if (theme.id === ThemeWarmSepia.id) fullTheme = ThemeWarmSepia;
        else if (theme.id === ThemeLight.id) fullTheme = ThemeLight;
        else if (theme.id === ThemeDark.id) fullTheme = ThemeDark;
        else {
          fullTheme = await ThemesRouter.installTheme.query({
            id: theme.id,
            compatibilityVersion: THEME_COMPATIBILITY_VERSION,
            userId: user?.id
          });
        }

        if (fullTheme) setCurrentTheme(fullTheme);
      } catch (error) {
        console.error(error);
        if (error instanceof Error)
          showToast(
            "error",
            `${strings.failedToInstallTheme()} ${strings.error()}: ${error.message}`
          );
      } finally {
        setIsApplying(false);
      }
    },
    [isThemeCurrentlyApplied, setCurrentTheme, user?.id]
  );

  const hasUnsavedSelection =
    draftTheme.id !== activeTheme.id || draftTheme.version !== activeTheme.version;

  return (
    <>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 3,
          bg: "background",
          pt: 2,
          pb: 2
        }}
      >
        <Flex sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Text sx={{ fontSize: 12, fontWeight: 600, color: "paragraph-secondary" }}>
              Theme preview
            </Text>
            <Text variant="title" sx={{ display: "block" }}>
              {draftTheme.name}
            </Text>
          </Box>
          <Flex sx={{ gap: 1, flexShrink: 0 }}>
            <Button
              variant="secondary"
              disabled={!hasUnsavedSelection || isApplying}
              onClick={() => setDraftTheme(asThemeMetadata(activeTheme))}
            >
              {strings.cancel()}
            </Button>
            <Button
              variant="primary"
              disabled={!hasUnsavedSelection || isApplying}
              onClick={() => void saveTheme(draftTheme)}
            >
              {isApplying ? <Loading color="accentForeground" size={18} /> : strings.save()}
            </Button>
          </Flex>
        </Flex>
        <ThemePreview theme={draftTheme} />
      </Box>

      <Input
        placeholder={strings.searchThemes()}
        sx={{ mt: 2 }}
        onChange={debounce((event) => setSearchQuery(event.target.value), 500)}
      />
      <Flex sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Flex sx={{ mt: 2, gap: 1 }}>
          {COLOR_SCHEMES.map((filter) => (
            <Button
              key={filter.id}
              variant="secondary"
              onClick={() => setColorScheme(filter.id)}
              sx={{
                borderRadius: 100,
                minWidth: 50,
                py: 1,
                px: 2,
                flexShrink: 0,
                bg: colorScheme === filter.id ? "shade" : "transparent",
                color: colorScheme === filter.id ? "accent" : "paragraph"
              }}
            >
              {filter.title}
            </Button>
          ))}
        </Flex>
        <Flex sx={{ mt: 2, gap: 1 }}>
          <Button
            variant="secondary"
            sx={{ px: 3, flexShrink: 0 }}
            onClick={async () => {
              const [file] = await showFilePicker({
                acceptedFileTypes: "application/json"
              });
              if (!file) return;
              try {
                const theme = JSON.parse(await readFile(file));
                const { error } = validateTheme(theme);
                if (error) return showToast("error", error);
                setDraftTheme(asThemeMetadata(theme as ThemeDefinition));
              } catch (error) {
                showToast(
                  "error",
                  error instanceof Error ? error.message : strings.error()
                );
              }
            }}
          >
            {strings.loadFromFile()}
          </Button>
        </Flex>
      </Flex>

      <Box sx={{ mt: 2 }}>
        {themes.isInitialLoading && items.length === 0 ? (
          <Loader title={strings.loadingThemes()} />
        ) : (
          <VirtualizedGrid
            columns={2}
            items={items}
            getItemKey={(index) => items[index].id}
            estimatedSize={112}
            mode="dynamic"
            onEndReached={() =>
              themes.hasNextPage ? themes.fetchNextPage() : null
            }
            renderItem={({ item: theme }) => (
              <ThemeItem
                key={theme.id}
                theme={theme}
                isSelected={draftTheme.id === theme.id}
                isSaved={activeTheme.id === theme.id}
                disabled={isApplying}
                onSelect={setDraftTheme}
              />
            )}
          />
        )}
        {!themes.isInitialLoading && themes.isFetching ? (
          <Loading color="accent" sx={{ mt: 2 }} />
        ) : null}
      </Box>
    </>
  );
}

type ThemeItemProps = {
  theme: ThemeMetadata;
  isSelected: boolean;
  isSaved: boolean;
  disabled: boolean;
  onSelect: (theme: ThemeMetadata) => void;
};

function ThemeItem({
  theme,
  isSelected,
  isSaved,
  disabled,
  onSelect
}: ThemeItemProps) {
  const swatches = [
    theme.previewColors.navigationMenu.background,
    theme.previewColors.background,
    theme.previewColors.accent,
    theme.previewColors.list.heading,
    theme.previewColors.statusBar.background
  ];

  return (
    <Button
      type="button"
      variant="secondary"
      role="radio"
      aria-checked={isSelected}
      disabled={disabled}
      onClick={() => onSelect(theme)}
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        textAlign: "left",
        gap: 2,
        p: 2,
        borderRadius: "18px",
        border: isSelected
          ? "2px solid var(--accent)"
          : "1px solid var(--border)",
        bg: isSelected ? "shade" : "background-secondary",
        transition: "transform 180ms ease, background 180ms ease",
        ":hover": { transform: "translateY(-1px)" }
      }}
    >
      <Flex sx={{ width: "100%", height: 28, overflow: "hidden", borderRadius: 999 }}>
        {swatches.map((color, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              bg: color,
              borderRight:
                index < swatches.length - 1 ? "1px solid var(--border)" : "none"
            }}
          />
        ))}
      </Flex>
      <Flex sx={{ alignItems: "center", justifyContent: "space-between", minWidth: 0 }}>
        <Box sx={{ minWidth: 0 }}>
          <Text sx={{ fontSize: 13, fontWeight: 600, color: "text", display: "block" }}>
            {theme.name}
          </Text>
          <Text sx={{ fontSize: 10, color: "paragraph-secondary" }}>
            {theme.colorScheme === "dark" ? strings.dark() : strings.light()}
            {theme.totalInstalls ? ` · ${theme.totalInstalls} ${strings.installs()}` : ""}
          </Text>
        </Box>
        {isSelected ? (
          <Text sx={{ fontSize: 10, fontWeight: 600, color: "accent", flexShrink: 0 }}>
            {isSaved ? "Saved" : "Selected"}
          </Text>
        ) : null}
      </Flex>
    </Button>
  );
}
