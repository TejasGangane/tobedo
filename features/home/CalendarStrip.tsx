import React, { useEffect, useMemo, useRef } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ScalePressable } from "@/components/ui/ScalePressable";
import { Colors } from "@/constants/Colors";
import { formatDateKey } from "./dateUtils";

type Props = {
  selectedDate: string;
  onChangeDate: (dateKey: string) => void;
};

type DayItem = { key: string; label: string; dayNumber: number };

// Ensure exactly 7 day pills fit within the screen width.
const SCREEN_WIDTH = Dimensions.get("window").width;
const DAYS_VISIBLE = 7;
const DAY_TOTAL_WIDTH = SCREEN_WIDTH / DAYS_VISIBLE;
const DAY_ITEM_WIDTH = DAY_TOTAL_WIDTH;
const SELECTOR_PADDING = 10;
const SIDE_PADDING = (SCREEN_WIDTH - DAY_ITEM_WIDTH) / 2;

function CalendarDayPill({
  d,
  isSelected,
  isToday,
  onPress,
}: {
  d: DayItem;
  isSelected: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  return (
    <ScalePressable onPress={onPress} style={styles.dayPressable}>
      <View style={styles.day}>
        <View style={styles.dayTextColumn}>
          <Text
            style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}
            numberOfLines={1}
          >
            {d.dayNumber}
          </Text>
          <Text
            style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}
            numberOfLines={1}
          >
            {d.label.toUpperCase()}
          </Text>
        </View>
        {isToday && <View style={styles.todayDot} />}
      </View>
    </ScalePressable>
  );
}

export function CalendarStrip({ selectedDate, onChangeDate }: Props) {
  const selectorX = useSharedValue(0);
  const selectorWidth = useSharedValue(DAY_ITEM_WIDTH);
  const nudgeX = useSharedValue(0);
  const calendarStripRef = useRef<Animated.ScrollView | null>(null);
  const lastSelectedTapRef = useRef(0);

  const days = useMemo(() => {
    const anchor = new Date();
    const rangeDays = 90; // ~3 months back and forward
    const start = new Date(anchor);
    start.setDate(start.getDate() - rangeDays);

    const result: DayItem[] = [];

    for (let i = 0; i <= rangeDays * 2; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = formatDateKey(d);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      result.push({ key, label, dayNumber: d.getDate() });
    }

    return result;
  }, []);
  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const selectedIndex = useMemo(
    () => days.findIndex((d) => d.key === selectedDate),
    [days, selectedDate],
  );

  useEffect(() => {
    if (selectedIndex < 0) return;

    const targetX =
      SIDE_PADDING + selectedIndex * DAY_ITEM_WIDTH - SELECTOR_PADDING / 2;
    const targetWidth = DAY_ITEM_WIDTH + SELECTOR_PADDING;

    selectorX.value = withTiming(targetX, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    selectorWidth.value = withTiming(targetWidth, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });

    // With SIDE_PADDING applied, centering index i means scrollX = i * DAY_TOTAL_WIDTH.
    const nextScrollX = Math.max(0, selectedIndex * DAY_TOTAL_WIDTH);

    calendarStripRef.current?.scrollTo({
      x: nextScrollX,
      animated: true,
    });
  }, [selectedIndex, selectorX, selectorWidth]);

  const selectorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: selectorX.value }],
    width: selectorWidth.value,
  }));

  const nudgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudgeX.value }],
  }));

  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-18, 18])
    .onUpdate((event) => {
      // Small rubber-band nudge; no actual scrolling.
      const next = event.translationX * 0.18;
      nudgeX.value = Math.max(-16, Math.min(16, next));
    })
    .onFinalize(() => {
      nudgeX.value = withSpring(0, { damping: 16, stiffness: 260, mass: 0.7 });
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.calendarStrip, nudgeStyle]}>
        <Animated.ScrollView
          ref={calendarStripRef}
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarStripContent}
        >
          <Animated.View style={[styles.calendarSelector, selectorStyle]} />
          {days.map((d) => {
            const isSelected = d.key === selectedDate;
            const isToday = d.key === todayKey;

            return (
              <CalendarDayPill
                key={d.key}
                d={d}
                isSelected={isSelected}
                isToday={isToday}
                onPress={() => {
                  if (isSelected) {
                    const now = Date.now();
                    const delta = now - lastSelectedTapRef.current;
                    lastSelectedTapRef.current = now;
                    if (delta > 0 && delta < 320) {
                      onChangeDate(todayKey);
                      return;
                    }
                  } else {
                    lastSelectedTapRef.current = 0;
                  }
                  onChangeDate(d.key);
                }}
              />
            );
          })}
        </Animated.ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  calendarStrip: {
    width: SCREEN_WIDTH,
    alignSelf: "center",
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 8,
    overflow: "visible",
    borderBottomWidth: 1,
    borderBottomColor: Colors.actionButtonStroke,
    position: "relative",
  },
  calendarStripContent: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIDE_PADDING,
  },
  calendarSelector: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.actionButtonBg,
  },
  dayPressable: {
    width: DAY_ITEM_WIDTH,
    flexShrink: 0,
    alignItems: "center",
  },
  day: {
    height: 60,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  dayTextColumn: {
    flexDirection: "column",
    alignItems: "center",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: Colors.highlightText,
  },
  dayLabel: {
    fontSize: 10,
    color: Colors.tertiaryText,
  },
  dayNumberSelected: {
    color: Colors.primaryText,
    fontWeight: "700",
  },
  dayLabelSelected: {
    color: Colors.primaryText,
    fontWeight: "700",
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.secondaryText,
  },
});

