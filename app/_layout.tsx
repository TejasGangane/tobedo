import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Colors } from "@/constants/Colors";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <Slot />
    </GestureHandlerRootView>
  );
}
