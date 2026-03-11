import React, { useEffect, useMemo, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import Animated, {
  FadeInDown,
  Layout,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import type { PomodoroState } from "./types";

const POMODORO_ITEM_HEIGHT = 44;
const MIN_POMODORO_MINUTES = 5;
const MAX_POMODORO_MINUTES = 60;
const POMODORO_STEP_MINUTES = 5;

type Props = {
  visible: boolean;
  pomodoro: PomodoroState;
  pomodoroMinutes: number;
  minutesLabel: string;
  secondsLabel: string;
  onChangeMinutes: (nextMinutes: number) => void;
  onTogglePlayPause: () => void;
  onCollapse: () => void;
};

export function PomodoroOverlay({
  visible,
  pomodoro,
  pomodoroMinutes,
  minutesLabel,
  secondsLabel,
  onChangeMinutes,
  onTogglePlayPause,
  onCollapse,
}: Props) {
  const insets = useSafeAreaInsets();
  const pomodoroPickerRef = useRef<ScrollView | null>(null);

  const pomodoroMinuteOptions = useMemo(
    () =>
      Array.from(
        {
          length:
            (MAX_POMODORO_MINUTES - MIN_POMODORO_MINUTES) /
              POMODORO_STEP_MINUTES +
            1,
        },
        (_, idx) => MIN_POMODORO_MINUTES + idx * POMODORO_STEP_MINUTES,
      ),
    [],
  );

  useEffect(() => {
    if (pomodoro.mode !== "ready") return;

    const clampedMinutes = Math.min(
      MAX_POMODORO_MINUTES,
      Math.max(MIN_POMODORO_MINUTES, pomodoroMinutes),
    );
    const index =
      (clampedMinutes - MIN_POMODORO_MINUTES) / POMODORO_STEP_MINUTES;
    const y = index * POMODORO_ITEM_HEIGHT;

    pomodoroPickerRef.current?.scrollTo({ y, animated: false });
  }, [pomodoro.mode, pomodoroMinutes]);

  if (!visible || pomodoro.mode === "idle") {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 32,
        },
      ]}
      entering={FadeInDown}
      layout={Layout.springify()}
    >
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onCollapse}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <View style={styles.timeWrapper}>
        <Text style={styles.largeTime}>
          {minutesLabel}:{secondsLabel}
        </Text>
      </View>
      {pomodoro.mode === "ready" && (
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHighlight} />
          <ScrollView
            ref={pomodoroPickerRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={POMODORO_ITEM_HEIGHT}
            decelerationRate="fast"
            contentContainerStyle={styles.pickerContent}
            onMomentumScrollEnd={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              const index = Math.round(offsetY / POMODORO_ITEM_HEIGHT);
              const clampedIndex = Math.max(
                0,
                Math.min(pomodoroMinuteOptions.length - 1, index),
              );
              const nextMinutes = pomodoroMinuteOptions[clampedIndex];
              onChangeMinutes(nextMinutes);
            }}
          >
            {pomodoroMinuteOptions.map((value) => {
              const isSelected = value === pomodoroMinutes;
              return (
                <View
                  key={value}
                  style={[
                    styles.pickerItem,
                    isSelected && styles.pickerItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      isSelected && styles.pickerItemTextSelected,
                    ]}
                  >
                    {value} min
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
      <View style={styles.footer}>
        <Pressable style={styles.playButton} onPress={onTogglePlayPause}>
          {pomodoro.mode === "focus" ? (
            <View style={styles.pauseIcon}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <FontAwesome
              name="play"
              size={28}
              color={Colors.supportingText}
            />
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "space-between",
    alignItems: "stretch",
    paddingHorizontal: 24,
    backgroundColor: Colors.backgroud,
  },
  header: {
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.actionButtonBg,
  },
  backText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.primaryText,
  },
  timeWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  largeTime: {
    fontSize: 72,
    letterSpacing: -2,
    textAlign: "center",
    color: Colors.secondaryText,
  },
  pickerContainer: {
    height: POMODORO_ITEM_HEIGHT * 5,
    marginBottom: 24,
    marginTop: 12,
    overflow: "hidden",
  },
  pickerContent: {
    paddingVertical: POMODORO_ITEM_HEIGHT * 2,
  },
  pickerHighlight: {
    position: "absolute",
    top: POMODORO_ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: POMODORO_ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: Colors.backgroud,
    borderWidth: 1,
    borderColor: Colors.actionButtonStroke,
  },
  pickerItem: {
    height: POMODORO_ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerItemSelected: {},
  pickerItemText: {
    fontSize: 16,
    color: Colors.tertiaryText,
  },
  pickerItemTextSelected: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 8,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.actionButtonBg,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseIcon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pauseBar: {
    width: 6,
    height: 24,
    borderRadius: 3,
    backgroundColor: Colors.supportingText,
  },
});

