import React from "react";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";
import { FontAwesome5 } from "@expo/vector-icons";

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <FontAwesome5 name="cube" size={22} color={Colors.primaryText} />
            </View>
          </View>
          <Text style={styles.title}>Tobedo</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroud,
  },
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  logoOuter: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: Colors.primaryText,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -1,
    color: Colors.primaryText,
  },
});

