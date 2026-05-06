import { useRouter } from "expo-router";
import { View, Text, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/hooks/useThemeColors";
import BrandButton from "@/components/ui/brand-button";
import "../style.css";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bg, text, subtext } = useThemeColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View
      className={`flex-1 ${bg}`}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="absolute inset-0">
        <View
          className="absolute top-[-20%] right-[-10%] w-80 h-80 rounded-full opacity-[0.06]"
          style={{ backgroundColor: "#8b5cf6" }}
        />
        <View
          className="absolute bottom-[10%] left-[-15%] w-72 h-72 rounded-full opacity-[0.04]"
          style={{ backgroundColor: "#f59e0b" }}
        />
      </View>

      <View className="flex-1 justify-center items-center px-8">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 36,
              fontWeight: "200",
              letterSpacing: -1,
            }}
            className={text}
          >
            FeatherPunch
          </Text>
          <Text
            className={`${subtext} text-base text-center mt-4 max-w-[280px] leading-6`}
          >
            You do not live one life.{"\n"}You live many roles.
          </Text>
          <Text
            className={`${subtext} text-sm text-center mt-2 max-w-[260px] leading-5 opacity-70`}
          >
            This app shows which ones are truly yours.
          </Text>
        </Animated.View>

        <View className="w-full mt-14 px-2">
          <BrandButton
            label="Get started"
            onPress={() => router.push("./onboarding/")}
            fullWidth
            style={{ minHeight: 56 }}
          />
        </View>
      </View>
    </View>
  );
}
