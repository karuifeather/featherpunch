import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { getSetting } from "@/db/settings";
import "./style.css";

export default function IndexScreen(): React.JSX.Element {
  const [onboardingCompleted, setOnboardingCompleted] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    getSetting("onboarding_completed").then((value) => {
      setOnboardingCompleted(value === "1");
    });
  }, []);

  if (onboardingCompleted === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (onboardingCompleted) {
    return <Redirect href="/(root)/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
