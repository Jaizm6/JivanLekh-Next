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

import { FeatureId, FeatureResult } from "@notesnook/common";
import { ToastManager } from "../../../services/event-manager";

/**
 * Legacy name retained for existing feature-check call sites.
 * JivanLekh has no subscription paywall; quota limits are explained locally.
 */
function PaywallSheet(_props: { feature: FeatureResult<FeatureId> }) {
  return null;
}

PaywallSheet.present = <Tid extends FeatureId>(feature: FeatureResult<Tid>) => {
  ToastManager.show({ message: feature.error, context: "local" });
};

export default PaywallSheet;
