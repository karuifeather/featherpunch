import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import store, { persistor } from "@/state/store";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import ThemeAwareSystemBars, {
  ThemeAwareBackground,
} from "@/components/theme-aware-system-bars";
import { getDb } from "@/db/database";
import { seedDefaultRoles } from "@/db/roles";
import { DEFAULT_ROLE_PRESETS } from "@/constants/roles";

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    (async () => {
      await getDb();
      await seedDefaultRoles(DEFAULT_ROLE_PRESETS);
      setDbReady(true);
    })();
  }, []);

  if (!dbReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SafeAreaProvider>
            <ThemeAwareBackground>
              <ThemeAwareSystemBars />
              <Stack
                screenOptions={{
                  contentStyle: { backgroundColor: "transparent" },
                }}
              >
                <Stack.Screen name="(root)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack>
            </ThemeAwareBackground>
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}
