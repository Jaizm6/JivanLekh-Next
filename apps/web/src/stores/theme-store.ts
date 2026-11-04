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

import createStore from "../common/store";
import BaseStore from "./index";
import Config from "../utils/config";
import { desktop } from "../common/desktop-bridge";
import {
  THEME_COMPATIBILITY_VERSION,
  ThemeDark,
  ThemeDefinition,
  ThemeLight
} from "@notesnook/theme";
import { ThemeWarmSepia } from "../common/theme-presets";
import { ThemesRouter } from "../common/themes-router";

type ColorScheme = "dark" | "light";

class ThemeStore extends BaseStore<ThemeStore> {
  activeTheme = getActiveTheme();
  colorScheme: ColorScheme = this.activeTheme.colorScheme;
  darkTheme =
    this.activeTheme.colorScheme === "dark" ? this.activeTheme : ThemeDark;
  lightTheme =
    this.activeTheme.colorScheme === "light" ? this.activeTheme : ThemeLight;
  followSystemTheme = Config.get("followSystemTheme", false);

  init = async () => {
    const { activeTheme, followSystemTheme } = this.get();
    await changeDesktopTheme(activeTheme, followSystemTheme);
    const updatedTheme = await updateTheme(activeTheme);
    // Persist the migration from the old per-scheme theme slots.
    this.selectTheme(updatedTheme, followSystemTheme);
  };

  setTheme = (theme: ThemeDefinition) => {
    // Selecting a palette commits one active theme and leaves system mode.
    this.selectTheme(theme, false);
  };

  setColorScheme = async (colorScheme: ColorScheme) => {
    const { activeTheme, followSystemTheme } = this.get();
    const theme =
      activeTheme.colorScheme === colorScheme
        ? activeTheme
        : getDefaultTheme(colorScheme);
    this.selectTheme(theme, followSystemTheme);

    const updatedTheme = await updateTheme(theme);
    if (
      updatedTheme !== theme &&
      this.get().activeTheme.id === theme.id &&
      this.get().colorScheme === colorScheme
    ) {
      this.selectTheme(updatedTheme, followSystemTheme);
    }
  };

  toggleColorScheme = () => {
    this.setColorScheme(this.get().colorScheme === "dark" ? "light" : "dark");
  };

  setFollowSystemTheme = async (followSystemTheme: boolean) => {
    const theme = followSystemTheme
      ? getDefaultTheme(getSystemColorScheme())
      : this.get().activeTheme;
    this.selectTheme(theme, followSystemTheme);
  };

  toggleFollowSystemTheme = () => {
    this.setFollowSystemTheme(!this.get().followSystemTheme);
  };

  isThemeCurrentlyApplied = (id: string) => this.get().activeTheme.id === id;

  private selectTheme = (
    theme: ThemeDefinition,
    followSystemTheme: boolean
  ) => {
    this.set({
      activeTheme: theme,
      colorScheme: theme.colorScheme,
      darkTheme: theme.colorScheme === "dark" ? theme : ThemeDark,
      lightTheme: theme.colorScheme === "light" ? theme : ThemeLight,
      followSystemTheme
    });

    Config.set("theme:active", theme);
    Config.set("colorScheme", theme.colorScheme);
    Config.remove("theme:light");
    Config.remove("theme:dark");
    Config.set("followSystemTheme", followSystemTheme);
    void changeDesktopTheme(theme, followSystemTheme);
  };
}

const [useStore, store] = createStore<ThemeStore>(
  (set, get) => new ThemeStore(set, get)
);
export { useStore, store };

function getActiveTheme(): ThemeDefinition {
  const savedTheme = Config.get("theme:active", null as ThemeDefinition | null);
  const followSystemTheme = Config.get("followSystemTheme", false);
  const colorScheme = followSystemTheme
    ? getSystemColorScheme()
    : Config.get<ColorScheme>("colorScheme", savedTheme?.colorScheme || "light");
  const defaultTheme = getDefaultTheme(colorScheme);

  if (savedTheme?.colorScheme === colorScheme) return savedTheme;

  // Migrate the current scheme's saved theme into the single active selection.
  if (!savedTheme) {
    const legacyTheme = Config.get(`theme:${colorScheme}`, defaultTheme);
    if (legacyTheme.colorScheme === colorScheme) return legacyTheme;
  }

  return defaultTheme;
}

function getSystemColorScheme(): ColorScheme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getDefaultTheme(colorScheme: ColorScheme) {
  return colorScheme === "dark" ? ThemeDark : ThemeLight;
}

async function updateTheme(theme: ThemeDefinition) {
  if (
    theme.id === ThemeLight.id ||
    theme.id === ThemeDark.id ||
    theme.id === ThemeWarmSepia.id
  ) {
    return theme;
  }
  const { id, version } = theme;
  try {
    const updatedTheme = await ThemesRouter.updateTheme.query({
      compatibilityVersion: THEME_COMPATIBILITY_VERSION,
      id,
      version
    });
    return updatedTheme || theme;
  } catch {
    return theme;
  }
}

function changeDesktopTheme(theme: ThemeDefinition, system: boolean) {
  return desktop?.integration.changeTheme.mutate({
    theme: system ? "system" : theme.colorScheme,
    backgroundColor: theme.scopes.base.primary.background,
    windowControlsIconColor: theme.scopes.base.primary.icon
  });
}
