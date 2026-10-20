import "react-native-gesture-handler";
// Install soft ErrorUtils before App (and any other app modules) evaluate.
// Keep this as a dedicated import so Babel commonjs hoist preserves order —
// an IIFE between import statements can end up AFTER App is required.
import "./softFatal";

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
