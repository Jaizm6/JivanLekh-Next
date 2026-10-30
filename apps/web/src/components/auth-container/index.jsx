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

import { Button, Flex, Text } from "@theme-ui/components";
import { usePromise } from "@notesnook/common";
import { hosts } from "@notesnook/core";
import { SettingsDialog } from "../../dialogs/settings";
import { strings } from "@notesnook/intl";
import { FixedColorSchemeThemeProvider } from "../theme-provider";

function AuthContainer(props) {
  const version = usePromise(
    async () =>
      await fetch(`${hosts.API_HOST}/version`)
        .then((r) => r.json())
        .catch(() => undefined)
  );

  return (
    <Flex
      sx={{
        position: "relative",
        height: "100%",
        bg: "background"
      }}
    >
      <FixedColorSchemeThemeProvider
        colorScheme="dark"
        sx={{
          position: "relative",
          overflow: "hidden",
          flexDirection: "column",
          display: ["none", "none", "flex"],
          flex: 1,
          background:
            "radial-gradient(1200px 700px at 82% 18%, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 62%), var(--background-secondary)"
        }}
      >
        <Flex
          p={50}
          sx={{
            zIndex: 1,
            flex: 1,
            flexDirection: "column",
            alignItems: "start",
            justifyContent: "end"
          }}
        >
          <svg
            style={{
              height: 76,
              width: 76,
              alignSelf: "start",
              marginBottom: 18
            }}
          >
            <use href="#full-logo" />
          </svg>
          <Text
            variant="heading"
            sx={{ fontSize: 27, fontWeight: 700, mb: 3 }}
          >
            <span style={{ color: "#FFF7EF" }}>Jivan</span>
            <span style={{ color: "#E87526" }}>Lekh</span>
          </Text>
          <Text variant={"heading"} sx={{ fontSize: 48 }}>
            Make space for your ideas.
          </Text>
          <Text
            variant="body"
            mt={10}
            sx={{ fontSize: 16, color: "paragraph-secondary", maxWidth: 540 }}
          >
            Capture notes, organise your plans and keep the ideas that matter
            close. JivanLekh gives your thoughts a calm place to grow.
          </Text>

          <Flex
            mt={2}
            pt={2}
            sx={{
              justifyContent: "space-between",
              borderTop: "1px solid var(--border)",
              width: "100%"
            }}
          >
            <Text variant={"subBody"}>
              {version.status === "fulfilled" &&
              !!version.value &&
              version.value.instance !== "default" ? (
                <>
                  {strings.usingInstance(
                    version.value.instance,
                    version.value.version
                  )}
                </>
              ) : (
                <>{strings.usingOfficialInstance()}</>
              )}
            </Text>
            <Button
              variant="anchor"
              onClick={() => SettingsDialog.show({ activeSection: "servers" })}
            >
              {strings.configure()}
            </Button>
          </Flex>
        </Flex>
      </FixedColorSchemeThemeProvider>
      <FixedColorSchemeThemeProvider
        colorScheme="light"
        sx={{
          display: "flex",
          position: "relative",
          flex: 1.5,
          background: "var(--background-secondary)"
        }}
      >
        {props.children}
      </FixedColorSchemeThemeProvider>
    </Flex>
  );
}
export default AuthContainer;
