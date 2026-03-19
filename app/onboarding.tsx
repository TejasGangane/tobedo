import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/Colors";
import { FadeText } from "@/components/ui/FadeText";

const ONBOARDED_KEY = "tobedo.onboarded.v1";
const PRIVACY_POLICY_URL = "https://tejasgangane.github.io/tobedo-privacy-policy/";
const ONBOARDING_GIF = require("../assets/images/grid-animation.gif");

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pressScale = useSharedValue(1);
  const ctaProgress = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const stored = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (cancelled) return;
        if (stored === "1") {
          router.replace("/(app)/home");
        }
      } catch {
        // ignore
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onGetStarted = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    ctaProgress.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // If storage fails, still allow entering the app.
    }
    router.replace("/(app)/home");
  };

  const onOpenPrivacy = async () => {
    try {
      const canOpen = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (!canOpen) return;
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      // ignore
    }
  };

  const ctaAnimatedStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      ctaProgress.value,
      [0, 1],
      [Colors.authButtonBg, Colors.actionButtonBg],
    );
    return {
      transform: [{ scale: pressScale.value }],
      backgroundColor: bg,
    };
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.top}>
        <FadeText
          inputs={["Plan your day.", "Finish what matters."]}
          duration={1600}
          wordDelay={180}
          blurTint="extraLight"
          fontSize={32}
          fontWeight="700"
          color={Colors.primaryText}
          containerStyle={styles.fadeTitleContainer}
          style={styles.title}
        />
        <FadeText
          inputs={["A clean daily todo list with a calm focus."]}
          duration={1400}
          wordDelay={160}
          blurTint="extraLight"
          fontSize={14}
          fontWeight="400"
          color={Colors.supportingText}
          containerStyle={styles.fadeSubtitleContainer}
          style={styles.subtitle}
        />
      </View>

      <View style={styles.middle}>
        <Image source={ONBOARDING_GIF} style={styles.gif} resizeMode="contain" />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]}>
        <AnimatedPressable
          disabled={isSubmitting}
          onPress={onGetStarted}
          onPressIn={() => {
            if (isSubmitting) return;
            pressScale.value = withSpring(0.98, { damping: 18, stiffness: 320, mass: 0.7 });
          }}
          onPressOut={() => {
            pressScale.value = withSpring(1, { damping: 18, stiffness: 320, mass: 0.7 });
          }}
          style={[styles.cta, ctaAnimatedStyle]}
        >
          <Text style={[styles.ctaText, isSubmitting && styles.ctaTextSubmitting]}>
            {isSubmitting ? "Starting…" : "Get started"}
          </Text>
        </AnimatedPressable>

        <Text style={styles.privacyText}>
          By tapping Get started, you agree to our{" "}
          <Text style={styles.privacyLink} onPress={onOpenPrivacy}>
            Privacy Policy
          </Text>
          {" "}
          and understand how Tobedo handles your data.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  top: {
    paddingTop: 18,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  fadeTitleContainer: {
    paddingHorizontal: 0,
  },
  title: {
    textAlign: "center",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    color: Colors.primaryText,
  },
  subtitle: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: Colors.supportingText,
    maxWidth: 320,
  },
  fadeSubtitleContainer: {
    paddingHorizontal: 0,
    marginTop: 12,
  },
  middle: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 12,
  },
  gif: {
    width: "100%",
    maxWidth: 384,
    height: 364,
    borderRadius: 0,
  },
  bottom: {
    gap: 14,
    alignItems: "center",
    paddingTop: 8,
  },
  cta: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.authButtonBg,
    alignSelf: "stretch",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  ctaTextSubmitting: {
    color: Colors.primaryText,
  },
  privacyText: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
    color: Colors.secondaryText,
    maxWidth: 340,
  },
  privacyLink: {
    color: Colors.primaryText,
    textDecorationLine: "underline",
    textDecorationColor: Colors.primaryText,
  },
});

