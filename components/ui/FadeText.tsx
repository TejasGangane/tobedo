import { BlurView, type BlurViewProps } from "expo-blur";
import React, { memo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type FadeTextProps = {
  /** One or more input strings; each will be split into words. */
  inputs: string[];
  wordDelay?: number;
  duration?: number;
  blurIntensity?: [number, number, number];
  blurTint?: BlurViewProps["tint"];
  scaleRange?: [number, number];
  translateYRange?: [number, number];
  opacityRange?: [number, number, number];
  fontSize?: number;
  fontWeight?: TextStyle["fontWeight"];
  color?: string;
  textAlign?: TextStyle["textAlign"];
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
};

type AnimatedWordProps = {
  word: string;
  delay: number;
  duration: number;
  blurIntensity: [number, number, number];
  blurTint?: BlurViewProps["tint"];
  scaleRange: [number, number];
  translateYRange: [number, number];
  opacityRange: [number, number, number];
  fontSize: number;
  fontWeight?: TextStyle["fontWeight"];
  color: string;
  textAlign?: TextStyle["textAlign"];
  style?: StyleProp<TextStyle>;
};

const AnimatedBlurView =
  Animated.createAnimatedComponent<BlurViewProps>(BlurView);

export const FadeText: React.FC<FadeTextProps> = memo<FadeTextProps>(
  ({
    inputs,
    wordDelay = 300,
    duration = 800,
    blurIntensity = [30, 10, 0],
    blurTint = "dark",
    scaleRange = [0.97, 1],
    translateYRange = [10, 0],
    opacityRange = [0, 0.5, 1],
    fontSize = 32,
    fontWeight = "600",
    color = "#ffffff",
    textAlign = "center",
    containerStyle,
    style,
  }: FadeTextProps) => {
    const words = inputs.flatMap((text) =>
      text.split(" ").map((word) => ({ word })),
    );

    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.textWrapper}>
          {words.map((item, index) => (
            <AnimatedWord
              key={`${item.word}-${index}`}
              word={item.word}
              delay={index * wordDelay}
              duration={duration}
              blurIntensity={blurIntensity}
              blurTint={blurTint}
              scaleRange={scaleRange}
              translateYRange={translateYRange}
              opacityRange={opacityRange}
              fontSize={fontSize}
              style={style}
              fontWeight={fontWeight}
              color={color}
              textAlign={textAlign}
            />
          ))}
        </View>
      </View>
    );
  },
);
FadeText.displayName = "FadeText";

const AnimatedWord: React.FC<AnimatedWordProps> = memo<AnimatedWordProps>(
  ({
    word,
    delay,
    duration,
    blurIntensity,
    blurTint,
    scaleRange,
    translateYRange,
    opacityRange,
    fontSize,
    fontWeight,
    color,
    textAlign,
    style,
  }: AnimatedWordProps) => {
    const animationValue = useSharedValue(0);

    useEffect(() => {
      animationValue.value = withDelay(
        delay,
        withTiming(1, {
          duration,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }, [delay, duration, animationValue]);

    const animatedStyle = useAnimatedStyle<
      Pick<ViewStyle, "opacity" | "transform">
    >(() => {
      const opacity = interpolate(
        animationValue.value,
        [0, 0.8, 1],
        opacityRange,
        Extrapolation.CLAMP,
      );

      const scale = interpolate(
        animationValue.value,
        [0, 1],
        scaleRange,
        Extrapolation.CLAMP,
      );

      const translateY = interpolate(
        animationValue.value,
        [0, 1],
        translateYRange,
        Extrapolation.CLAMP,
      );

      return {
        opacity,
        transform: [{ scale }, { translateY }],
      };
    });

    const blurAnimatedProps = useAnimatedProps<
      Pick<BlurViewProps, "intensity">
    >(() => {
      const intensity = withSpring(
        interpolate(
          animationValue.value,
          [0, 0.3, 1],
          blurIntensity,
          Extrapolation.CLAMP,
        ),
      );

      return {
        intensity,
      };
    });

    return (
      <Animated.View style={[styles.wordContainer, animatedStyle]}>
        <Text
          style={[
            styles.word,
            {
              fontSize,
              fontWeight,
              color,
              textAlign,
            },
            style,
          ]}
        >
          {word}{" "}
        </Text>
        <AnimatedBlurView
          style={StyleSheet.absoluteFillObject}
          animatedProps={blurAnimatedProps}
          tint={blurTint}
        />
      </Animated.View>
    );
  },
);
AnimatedWord.displayName = "FadeTextWord";

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  textWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  wordContainer: {
    overflow: "hidden",
    borderRadius: 4,
  },
  word: {},
});

