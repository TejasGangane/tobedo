import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/Colors";

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  leftIcon?: ReactNode;
  labelStyle?: StyleProp<TextStyle>;
};

export function PrimaryButton({
  label,
  loading,
  style,
  leftIcon,
  labelStyle,
  ...rest
}: Props) {
  const isDisabled = rest.disabled || loading;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn: PressableProps["onPressIn"] = (event) => {
    rest.onPressIn?.(event);
    if (!isDisabled) {
      scale.value = withTiming(0.97, { duration: 120 });
    }
  };

  const handlePressOut: PressableProps["onPressOut"] = (event) => {
    rest.onPressOut?.(event);
    scale.value = withTiming(1, { duration: 160 });
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        {...rest}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.base,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            {leftIcon}
            <Text
              style={[
                styles.label,
                leftIcon && styles.labelWithIcon,
                labelStyle,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: 999,
    backgroundColor: Colors.authButtonBg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  labelWithIcon: {
    marginLeft: 12,
  },
});

