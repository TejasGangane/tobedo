import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/Colors";
import { buildMonthGrid, formatDateKey, parseDateKey } from "./dateUtils";

type Props = {
  visible: boolean;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onClose: () => void;
};

export function CalendarModal({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}: Props) {
  const [month, setMonth] = useState(() => parseDateKey(selectedDate));

  const weeks = useMemo(() => buildMonthGrid(month), [month]);
  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.container}>
        <View style={styles.sheet}>
          <View style={styles.monthHeader}>
            <Pressable
              style={styles.monthNavButton}
              onPress={() =>
                setMonth((prev) => {
                  const year = prev.getFullYear();
                  const m = prev.getMonth();
                  return new Date(year, m - 1, 1);
                })
              }
            >
              <Text style={styles.monthNavText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>
              {month.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Pressable
              style={styles.monthNavButton}
              onPress={() =>
                setMonth((prev) => {
                  const year = prev.getFullYear();
                  const m = prev.getMonth();
                  return new Date(year, m + 1, 1);
                })
              }
            >
              <Text style={styles.monthNavText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.weekdaysRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
              <Text key={`${d}-${idx}`} style={styles.weekdayLabel}>
                {d}
              </Text>
            ))}
          </View>
          {weeks.map((week, idx) => (
            <View key={idx} style={styles.weekRow}>
              {week.map((cell) => {
                if (cell.dayNumber === 0) {
                  return <View key={cell.key} style={styles.dayCell} />;
                }
                const cellDateKey = cell.key;
                const isSelected = cellDateKey === selectedDate;
                const isToday = cellDateKey === todayKey;
                return (
                  <Pressable
                    key={cell.key}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => {
                      onSelectDate(cellDateKey);
                      setMonth(parseDateKey(cellDateKey));
                    }}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        isSelected && styles.dayNumberSelected,
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>
                    {isToday && <View style={styles.todayDot} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "88%",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthNavButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  monthNavText: {
    fontSize: 18,
    color: Colors.primaryText,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  weekdayLabel: {
    width: 30,
    textAlign: "center",
    fontSize: 11,
    color: Colors.secondaryText,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellSelected: {
    backgroundColor: Colors.actionButtonBg,
  },
  dayNumber: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  dayNumberSelected: {
    color: Colors.primaryText,
    fontWeight: "600",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: Colors.highlightText,
  },
});

