const baseUrl = process.env.EXPO_PUBLIC_BASE_URL ?? "";

module.exports = {
  expo: {
    scheme: "featherpunch",
    name: "FeatherPunch",
    slug: "featherpunch",
    userInterfaceStyle: "dark",
    backgroundColor: "#0a0a0b",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-screen.png",
      resizeMode: "contain",
      backgroundColor: "#0a0a0b",
    },
    favicon: "./assets/images/favicon.png",
    android: {
      package: "com.featherpunch.app",
      softwareKeyboardLayoutMode: "resize",
      navigationBar: { barStyle: "light" },
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
        backgroundColor: "#0a0a0b",
      },
    },
    androidStatusBar: {
      barStyle: "light-content",
    },
    ios: {
      bundleIdentifier: "com.featherpunch.app",
      backgroundColor: "#0a0a0b",
    },
    web: {
      output: "single",
    },
    ...(baseUrl && { experiments: { baseUrl } }),
    plugins: [
      "expo-font",
      "expo-router",
      "expo-web-browser",
      "expo-sqlite",
      "expo-secure-store",
      [
        "expo-navigation-bar",
        {
          barStyle: "light",
          enforceContrast: false,
        },
      ],
      "./plugins/withAndroidTransitionFix.js",
      "./plugins/withImmersiveMode.js",
    ],
  },
};
