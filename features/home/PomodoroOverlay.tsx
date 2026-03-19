import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import type { PomodoroState } from "./types";
import { ScalePressable } from "@/components/ui/ScalePressable";

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
  onStopPomodoro: () => void;
  onMarkCompleted: () => void;
};

export function PomodoroOverlay({
  visible,
  pomodoro,
  pomodoroMinutes,
  minutesLabel,
  secondsLabel,
  onChangeMinutes,
  onTogglePlayPause,
  onStopPomodoro,
  onMarkCompleted,
}: Props) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (pomodoro.mode !== "ready") return;

    // No-op: duration UI is controlled locally by +/- buttons
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
        <ScalePressable style={styles.backButton} onPress={onStopPomodoro}>
          <Text style={styles.backText}>Cancel</Text>
        </ScalePressable>
      </View>
      <View style={styles.timeWrapper}>
        <Text style={styles.largeTime}>
          {minutesLabel}:{secondsLabel}
        </Text>
      </View>
      {pomodoro.mode === "ready" && (
        <View style={styles.inlinePickerContainer}>
          <ScalePressable
            style={styles.timeAdjustButton}
            onPress={() => {
              const next = Math.max(
                MIN_POMODORO_MINUTES,
                pomodoroMinutes - POMODORO_STEP_MINUTES,
              );
              onChangeMinutes(next);
            }}
          >
            <Text style={styles.timeAdjustButtonText}>-</Text>
          </ScalePressable>
          <BlurView intensity={30} tint="light" style={styles.inlinePickerPill}>
            <Animated.View layout={Layout.springify()} style={styles.inlinePickerValueWrapper}>
              <Text style={styles.inlinePickerChipTextSelected}>
                {pomodoroMinutes} min
              </Text>
            </Animated.View>
          </BlurView>
          <ScalePressable
            style={styles.timeAdjustButton}
            onPress={() => {
              const next = Math.min(
                MAX_POMODORO_MINUTES,
                pomodoroMinutes + POMODORO_STEP_MINUTES,
              );
              onChangeMinutes(next);
            }}
          >
            <Text style={styles.timeAdjustButtonText}>+</Text>
          </ScalePressable>
        </View>
      )}
      <View style={styles.footer}>
        <ScalePressable style={styles.playButton} onPress={onTogglePlayPause}>
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
        </ScalePressable>
        {pomodoro.mode === "ready" &&
          pomodoro.remainingSeconds < pomodoro.totalSeconds && (
            <View style={styles.footerActions}>
              <ScalePressable
                style={[styles.footerButton, styles.footerButtonComplete]}
                onPress={onMarkCompleted}
              >
                <Text style={styles.footerButtonText}>Mark as completed</Text>
              </ScalePressable>
            </View>
          )}
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
    backgroundColor: Colors.background,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 0,
    marginBottom: 8,
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
    letterSpacing: -1.5,
    textAlign: "center",
    color: Colors.secondaryText,
    fontVariant: ["tabular-nums"],
    minWidth: 180,
  },
  inlinePickerContainer: {
    marginBottom: 24,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  inlinePickerContent: {
    paddingHorizontal: 0,
  },
  inlinePickerPill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  inlinePickerValueWrapper: {
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  inlinePickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.actionButtonStroke,
    marginHorizontal: 4,
    backgroundColor: Colors.background,
  },
  inlinePickerChipSelected: {
    backgroundColor: Colors.actionButtonBg,
    borderColor: Colors.actionButtonBg,
  },
  inlinePickerChipText: {
    fontSize: 14,
    color: Colors.tertiaryText,
  },
  inlinePickerChipTextSelected: {
    color: Colors.primaryText,
    fontWeight: "600",
  },
  timeAdjustButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.actionButtonStroke,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  timeAdjustButtonText: {
    fontSize: 18,
    color: Colors.secondaryText,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 16,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.actionButtonBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
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
  footerActions: {
    width: "100%",
    marginTop: 24,
    paddingHorizontal: 24,
  },
  footerButton: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: -12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.actionButtonStroke,
  },
  footerButtonCancel: {
    // unused – kept for visual consistency if needed later
  },
  footerButtonComplete: {
    // subtle pill variant for mark completed
  },
  footerButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primaryText,
  },
});

