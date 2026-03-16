import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/Colors";
import { formatDateKey, parseDateKey } from "./dateUtils";

type Props = {
  selectedDate: string;
  onChangeDate: (dateKey: string) => void;
};

// Ensure exactly 7 day pills fit within the screen width.
const SCREEN_WIDTH = Dimensions.get("window").width;
const DAYS_VISIBLE = 7;
const DAY_TOTAL_WIDTH = SCREEN_WIDTH / DAYS_VISIBLE;
const DAY_ITEM_WIDTH = DAY_TOTAL_WIDTH;

export function CalendarStrip({ selectedDate, onChangeDate }: Props) {
  const selectorX = useSharedValue(0);
  const selectorWidth = useSharedValue(DAY_ITEM_WIDTH);
  const calendarStripRef = useRef<ScrollView | null>(null);
  const [dayLayouts, setDayLayouts] = useState<
    Record<string, { x: number; width: number }>
  >({});

  const days = useMemo(() => {
    const anchor = parseDateKey(selectedDate);
    const rangeDays = 90; // ~3 months back and forward
    const start = new Date(anchor);
    start.setDate(start.getDate() - rangeDays);

    const result: { key: string; label: string; dayNumber: number }[] = [];

    for (let i = 0; i <= rangeDays * 2; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = formatDateKey(d);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      result.push({ key, label, dayNumber: d.getDate() });
    }

    return result;
  }, [selectedDate]);
  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  useEffect(() => {
    const layout = dayLayouts[selectedDate];
    if (!layout) return;

    const padding = 10;
    const targetX = layout.x - padding / 2;
    const targetWidth = layout.width + padding;

    selectorX.value = withTiming(targetX, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    selectorWidth.value = withTiming(targetWidth, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });

    const centerOfDay = layout.x + layout.width / 2;
    const scrollX = Math.max(0, centerOfDay - SCREEN_WIDTH / 2);

    calendarStripRef.current?.scrollTo({
      x: scrollX,
      animated: true,
    });
  }, [selectedDate, dayLayouts, selectorX, selectorWidth]);

  const selectorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: selectorX.value }],
    width: selectorWidth.value,
  }));

  return (
    <View style={styles.calendarStrip}>
      <ScrollView
        ref={calendarStripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={DAY_TOTAL_WIDTH}
        snapToAlignment="center"
        contentContainerStyle={styles.calendarStripContent}
      >
        <Animated.View style={[styles.calendarSelector, selectorStyle]} />
        {days.map((d, index) => {
          const isSelected = d.key === selectedDate;
          const isToday = d.key === todayKey;
          const selectedIndex = days.findIndex(
            (day) => day.key === selectedDate,
          );
          const distanceFromSelected =
            selectedIndex === -1 ? 0 : Math.abs(index - selectedIndex);
          const clampedDistance = Math.min(distanceFromSelected, 3);
          const scale = 1.1 - clampedDistance * 0.06; // small -> big -> small around selected

          return (
            <Pressable
              key={d.key}
              onPress={() => onChangeDate(d.key)}
              style={styles.dayPressable}
              onLayout={({ nativeEvent: { layout } }) => {
                setDayLayouts((prev) => ({
                  ...prev,
                  [d.key]: { x: layout.x, width: layout.width },
                }));
              }}
            >
              <Animated.View
                layout={Layout.springify()}
                style={[
                  styles.day,
                  {
                    transform: [{ scale }],
                  },
                ]}
              >
                <View style={styles.dayTextColumn}>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {d.dayNumber}
                  </Text>
                  <Text
                    style={[
                      styles.dayLabel,
                      isSelected && styles.dayLabelSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {d.label.toUpperCase()}
                  </Text>
                </View>
                {isToday && <View style={styles.todayDot} />}
              </Animated.View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
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
  },
  calendarStripContent: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
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
  },
  dayLabelSelected: {
    color: Colors.primaryText,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.secondaryText,
  },
});

