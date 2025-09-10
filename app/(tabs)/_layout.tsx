import { Tabs } from "expo-router";
import React from "react";

import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  useColorScheme(); // retained hook call if side-effects/theme detection needed; ignore value

  return (
    <Tabs
      initialRouteName="chess"
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
    >
      <Tabs.Screen name="chess" />
    </Tabs>
  );
}
