import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import * as WebBrowser from "expo-web-browser";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Text, View } from "react-native";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  if (!publishableKey) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            Clerk publishable key is not configured.
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              textAlign: "center",
            }}
          >
            Make sure EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is set in your .env and
            available to the Expo app.
          </Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <Slot />
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
