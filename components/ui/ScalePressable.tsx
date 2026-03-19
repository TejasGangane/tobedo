import React from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  /** Defaults to 0.98. */
  pressedScale?: number;
  /** Optional extra wrapper style (in addition to Pressable's style prop). */
  containerStyle?: StyleProp<ViewStyle>;
};

export function ScalePressable({
  pressedScale = 0.98,
  disabled,
  containerStyle,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const isDisabled = Boolean(disabled);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, containerStyle]}>
      <AnimatedPressable
        {...rest}
        disabled={disabled}
        onPressIn={(e) => {
          onPressIn?.(e);
          if (isDisabled) return;
          scale.value = withSpring(pressedScale, {
            damping: 18,
            stiffness: 320,
            mass: 0.7,
          });
        }}
        onPressOut={(e) => {
          onPressOut?.(e);
          scale.value = withSpring(1, { damping: 18, stiffness: 320, mass: 0.7 });
        }}
        style={style}
      />
    </Animated.View>
  );
}

