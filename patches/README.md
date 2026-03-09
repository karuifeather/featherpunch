# patch-package patches

These patches are applied on `yarn install` (postinstall). **Keep them** unless you upgrade the packages and the fixes are no longer needed.

- **tailwindcss-react-native+1.7.10.patch** — Uses `SafeAreaView` from `react-native-safe-area-context` in the Tailwind/NativeWind component set so safe area insets work correctly when using styled safe area views.
- **react-native-css-interop+0.2.2.patch** — Stops css-interop from wrapping React Native’s built-in `SafeAreaView` so the context-based one (from the above patch) is used instead.

If you upgrade `tailwindcss-react-native` or `react-native-css-interop`, re-apply or recreate the patches as needed, or remove them if the upstream packages fix the behavior.
