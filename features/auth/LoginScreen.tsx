import React from "react";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Colors } from "@/constants/Colors";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { FontAwesome } from "@expo/vector-icons";
import { useOAuthLogin } from "./useOAuthLogin";

export default function LoginScreen() {
  const { signInWith } = useOAuthLogin();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Built for Daily Actions</Text>
        </View>

        <Image
          source={require("../../assets/images/grid-animation.gif")}
          style={styles.dotGrid}
        />

        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetInner}>
            <View style={styles.buttonStack}>
              <PrimaryButton
                label="Continue with Google"
                style={[styles.primaryButton, styles.primaryButtonFirst]}
                labelStyle={styles.primaryButtonLabel}
                leftIcon={
                  <FontAwesome
                    name="google"
                    size={20}
                    color="#FFFFFF"
                    style={styles.socialIcon}
                  />
                }
                onPress={() => signInWith("google")}
              />

              <PrimaryButton
                label="Continue with Apple"
                style={styles.primaryButton}
                labelStyle={styles.primaryButtonLabel}
                leftIcon={
                  <FontAwesome
                    name="apple"
                    size={22}
                    color="#FFFFFF"
                    style={styles.socialIcon}
                  />
                }
                onPress={() => signInWith("apple")}
              />
            </View>

            <Text style={styles.legalText}>
              If you are creating a new account,{"\n"}
              <Text style={styles.legalLink}>Terms &amp; Conditions</Text> and{" "}
              <Text style={styles.legalLink}>Privacy Policy</Text> will apply.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  root: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    width: "100%",
    alignItems: "center",
    marginTop: 80,
    marginBottom: 36,
  },
  title: {
    fontFamily: "Geist-Medium",
    fontSize: 28,
    fontWeight: "500",
    color: Colors.primaryText,
  },
  dotGrid: {
    width: 360,
    height: 360,
    borderRadius: 28,
    marginBottom: 40,
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.actionButtonStroke,
    backgroundColor: "#FFFFFF",
  },
  bottomSheetInner: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  buttonStack: {
    width: 364,
    marginBottom: 20,
  },
  primaryButton: {
    height: 60,
    borderRadius: 999,
    backgroundColor: Colors.authButtonBg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonFirst: {
    marginBottom: 12,
  },
  primaryButtonLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 16,
    letterSpacing: -0.16,
  },
  socialContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: {
    marginRight: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  legalText: {
    fontFamily: "Geist-Regular",
    fontSize: 12,
    textAlign: "center",
    color: Colors.supportingText,
    marginBottom: 4,
  },
  legalLink: {
    textDecorationLine: "underline",
  },
});

