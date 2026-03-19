import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/Colors";
import { buildMonthGrid, formatDateKey, parseDateKey } from "./dateUtils";
import { ScalePressable } from "@/components/ui/ScalePressable";

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

  useEffect(() => {
    if (!visible) return;
    // Reset to today's month/year each time the modal opens.
    setMonth(new Date());
  }, [visible]);

  const weeks = useMemo(() => {
    const base = buildMonthGrid(month);
    // Keep a stable 6-row grid so the modal height never jumps.
    if (base.length >= 6) return base;
    const paddingCount = 6 - base.length;
    const blanksWeek = (suffix: string) =>
      Array.from({ length: 7 }).map((_, i) => ({
        key: `blank-${suffix}-${i}`,
        dayNumber: 0,
      }));
    return [...base, ...Array.from({ length: paddingCount }, (_, i) => blanksWeek(`pad-${i}`))];
  }, [month]);
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
          <View style={styles.headerSection}>
            <View style={styles.monthHeader}>
              <ScalePressable
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
              </ScalePressable>
              <Text style={styles.monthTitle}>
                {month.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <ScalePressable
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
              </ScalePressable>
            </View>

            <View style={styles.weekdaysRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                <Text key={`${d}-${idx}`} style={styles.weekdayLabel}>
                  {d}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.gridSection}>
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
                    <ScalePressable
                      key={cell.key}
                      pressedScale={0.96}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        isToday && !isSelected && styles.dayCellToday,
                      ]}
                      onPress={() => {
                        onSelectDate(cellDateKey);
                        setMonth(parseDateKey(cellDateKey));
                      }}
                    >
                      <View style={styles.dayCellInner}>
                        <Text
                          style={[
                            styles.dayNumber,
                            isSelected && styles.dayNumberSelected,
                            isToday && !isSelected && styles.dayNumberToday,
                          ]}
                        >
                          {cell.dayNumber}
                        </Text>
                        {isToday && <View style={styles.todayDot} />}
                      </View>
                    </ScalePressable>
                  );
                })}
              </View>
            ))}
          </View>
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
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: Colors.background,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    minHeight: 360,
  },
  headerSection: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 0,
  },
  monthNavButton: {
    width: 38,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.actionButtonBg,
    borderWidth: 1,
    borderColor: Colors.actionButtonStroke,
  },
  monthNavText: {
    fontSize: 18,
    color: Colors.primaryText,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primaryText,
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.actionButtonBg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.actionButtonStroke,
  },
  weekdayLabel: {
    width: 30,
    textAlign: "center",
    fontSize: 11,
    color: Colors.secondaryText,
    fontWeight: "600",
  },
  gridSection: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.background,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Colors.highlightText,
  },
  dayCellSelected: {
    backgroundColor: Colors.actionButtonBg,
  },
  dayNumber: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  dayNumberToday: {
    color: Colors.highlightText,
    fontWeight: "700",
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

