import { Colors } from "@/constants/Colors";
import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Task = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  isDone: boolean;
};

type PomodoroState =
  | { mode: "idle" }
  | {
    mode: "ready" | "focus";
    taskId: string;
    remainingSeconds: number;
    totalSeconds: number;
  }
  | {
    mode: "completed";
    taskId: string;
  };

const DEFAULT_POMODORO_MINUTES = 30;

const formatDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDayStrip = (center: Date, total = 21) => {
  const days: { key: string; label: string; dayNumber: number }[] = [];
  const half = Math.floor(total / 2);
  const base = new Date(center);

  for (let offset = -half; offset <= half; offset++) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    const key = formatDateKey(d);
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    days.push({ key, label, dayNumber: d.getDate() });
  }

  return days;
};

const buildMonthGrid = (month: Date) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const firstWeekday = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const weeks: { key: string; dayNumber: number }[][] = [];
  let currentWeek: { key: string; dayNumber: number }[] = [];

  // leading blanks
  for (let i = 0; i < firstWeekday; i++) {
    currentWeek.push({ key: `blank-${i}`, dayNumber: 0 });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    currentWeek.push({ key: formatDateKey(date), dayNumber: day });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length) {
    while (currentWeek.length < 7) {
      const idx = currentWeek.length;
      currentWeek.push({ key: `blank-tail-${idx}`, dayNumber: 0 });
    }
    weeks.push(currentWeek);
  }

  return weeks;
};

const initialToday = formatDateKey(new Date());
// Ensure exactly 7 day pills fit within the padded content width.
const SCREEN_WIDTH = Dimensions.get("window").width;
const ROOT_HORIZONTAL_PADDING = 24; // matches styles.root.paddingHorizontal
const CALENDAR_AVAILABLE_WIDTH = SCREEN_WIDTH - ROOT_HORIZONTAL_PADDING * 2;
const DAYS_VISIBLE = 7;
const DAY_TOTAL_WIDTH = Math.floor(CALENDAR_AVAILABLE_WIDTH / DAYS_VISIBLE);
const DAY_ITEM_WIDTH = DAY_TOTAL_WIDTH - 4; // leave 4px total horizontal gap per item

const parseDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Plan today’s focus sessions",
    date: initialToday,
    isDone: false,
  },
  {
    id: "2",
    title: "Deep work: main project",
    date: initialToday,
    isDone: false,
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [pomodoro, setPomodoro] = useState<PomodoroState>({ mode: "idle" });
  const [pomodoroMinutes, setPomodoroMinutes] = useState(
    DEFAULT_POMODORO_MINUTES,
  );
  const [draftTitle, setDraftTitle] = useState("");
  const [isPomodoroExpanded, setIsPomodoroExpanded] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(parseDateKey(initialToday));
  const [isAddingTask, setIsAddingTask] = useState(false);
  const addScale = useSharedValue(0.9);
  const addInputRef = useRef<TextInput | null>(null);
  const selectorX = useSharedValue(0);
  const selectorWidth = useSharedValue(DAY_ITEM_WIDTH);
  const calendarStripRef = useRef<ScrollView | null>(null);
  const [dayLayouts, setDayLayouts] = useState<
    Record<string, { x: number; width: number }>
  >({});

  useEffect(() => {
    addScale.value = withTiming(1, { duration: 300 });
  }, [addScale]);

  const addAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }));

  const days = useMemo(
    // Fixed 21-day window around "today" so item positions stay stable
    // and the indicator can smoothly animate between them.
    () => buildDayStrip(new Date(initialToday), 21),
    [],
  );

  const tasksForSelectedDate = useMemo(
    () => tasks.filter((t) => t.date === selectedDate),
    [tasks, selectedDate],
  );

  // Slide the calendar selector smoothly as the selected date changes,
  // using measured layout so it aligns perfectly with the day pill.
  useEffect(() => {
    const layout = dayLayouts[selectedDate];
    if (!layout) return;

    // Expand the selector slightly beyond the pill width.
    const padding = 10;
    const targetX = layout.x - padding / 2;
    const targetWidth = layout.width + padding;

    selectorX.value = withTiming(targetX, {
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
    });
    selectorWidth.value = withTiming(targetWidth, {
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
    });

    // Center the selected date in the viewport so it appears roughly
    // as the middle item when ~7 dates are visible.
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

  useEffect(() => {
    if (pomodoro.mode !== "focus") return;

    const interval = setInterval(() => {
      setPomodoro((current) => {
        if (current.mode !== "focus") return current;
        if (current.remainingSeconds <= 1) {
          return {
            mode: "completed",
            taskId: current.taskId,
          };
        }
        return {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pomodoro.mode]);

  // When a Pomodoro completes, mark the task done, briefly show completion, then reset.
  useEffect(() => {
    if (pomodoro.mode !== "completed") return;

    // Cross out the associated task
    setTasks((prev) =>
      prev.map((t) =>
        t.id === pomodoro.taskId
          ? {
            ...t,
            isDone: true,
          }
          : t,
      ),
    );

    const timeout = setTimeout(() => {
      setPomodoro({ mode: "idle" });
      setIsPomodoroExpanded(false);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [pomodoro.mode, pomodoro.taskId]);

  const startPomodoro = (taskId: string) => {
    const totalSeconds = pomodoroMinutes * 60;
    setPomodoro({
      mode: "ready",
      taskId,
      totalSeconds,
      remainingSeconds: totalSeconds,
    });
    setIsPomodoroExpanded(true);
  };

  const stopPomodoro = () => {
    setPomodoro({ mode: "idle" });
    setIsPomodoroExpanded(false);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (pomodoro.mode === "focus" && pomodoro.taskId === taskId) {
      setPomodoro({ mode: "idle" });
    }
  };

  const handleToggleDone = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
            ...t,
            isDone: !t.isDone,
          }
          : t,
      ),
    );
  };

  const handleAddTask = () => {
    const title = draftTitle.trim();
    if (!title) return;
    setTasks((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        title,
        date: selectedDate,
        isDone: false,
      },
    ]);
    setDraftTitle("");
    setIsAddingTask(false);
  };

  const updatePomodoroMinutes = (nextMinutes: number) => {
    const clamped = Math.min(60, Math.max(5, nextMinutes));
    setPomodoroMinutes(clamped);
    setPomodoro((prev) => {
      if (prev.mode === "ready") {
        const totalSeconds = clamped * 60;
        return {
          ...prev,
          totalSeconds,
          remainingSeconds: totalSeconds,
        };
      }
      return prev;
    });
  };

  const activeTaskTitle =
    pomodoro.mode === "focus" ||
      pomodoro.mode === "ready" ||
      pomodoro.mode === "completed"
      ? tasks.find((t) => t.id === pomodoro.taskId)?.title
      : undefined;

  const remainingTime =
    pomodoro.mode === "focus" || pomodoro.mode === "ready"
      ? pomodoro.remainingSeconds
      : 0;

  const minutes = Math.floor(remainingTime / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remainingTime % 60).toString().padStart(2, "0");

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.root}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsCalendarOpen(true)}
          style={styles.headerRow}
        >
          <View style={styles.weekdayWrapper}>
            <Text style={styles.weekdayText}>
              {parseDateKey(selectedDate).toLocaleDateString(undefined, {
                weekday: "short",
              })}
            </Text>
            <View style={styles.todayDot} />
          </View>
          <View style={styles.dateTextWrapper}>
            <Text style={styles.dateText}>
              {parseDateKey(selectedDate).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
            </Text>
            <Text style={styles.dateSubText}>
              {parseDateKey(selectedDate).getFullYear()}
            </Text>
          </View>
        </TouchableOpacity>

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
            {days.map((d) => {
              const isSelected = d.key === selectedDate;
              return (
                <Pressable
                  key={d.key}
                  onPress={() => setSelectedDate(d.key)}
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
                      isSelected && styles.daySelected,
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
                    {isSelected && <View style={styles.dayIndicator} />}
                  </Animated.View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listContainer}>
          <FlatList
            data={tasksForSelectedDate}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              tasksForSelectedDate.length === 0
                ? styles.emptyListContent
                : undefined
            }
            renderItem={({ item, index }) => {
              let swipeableRef: any = null;

              return (
                <Swipeable
                  ref={(ref) => {
                    swipeableRef = ref;
                  }}
                  friction={2}
                  overshootLeft={false}
                  overshootRight={false}
                  onSwipeableOpen={(direction) => {
                    // Swipe right (open left actions) → Pomodoro
                    // Swipe left (open right actions) → Delete
                    if (direction === "left") {
                      startPomodoro(item.id);
                    } else if (direction === "right") {
                      handleDeleteTask(item.id);
                    }

                    // Smoothly slide the row back to its initial position
                    swipeableRef?.close();
                  }}
                  renderLeftActions={() => (
                    <View style={styles.swipeLeftAction}>
                      <Text style={styles.swipeLeftText}>Pomodoro</Text>
                    </View>
                  )}
                  renderRightActions={() => (
                    <View style={styles.swipeRightAction}>
                      <Text style={styles.swipeRightText}>Delete</Text>
                    </View>
                  )}
                >
                  <Animated.View
                    style={styles.taskRow}
                    entering={FadeInDown.delay(index * 60)}
                    layout={Layout.springify()}
                  >
                    <Pressable
                      onPress={() => handleToggleDone(item.id)}
                      style={[
                        styles.taskNumberWrapper,
                        item.isDone && styles.taskNumberDone,
                      ]}
                    >
                      {item.isDone && (
                        <FontAwesome name="check" size={14} color="#FFFFFF" />
                      )}
                    </Pressable>
                    <View style={styles.taskMain}>
                      <Text
                        style={[
                          styles.taskTitle,
                          item.isDone && styles.taskTitleDone,
                        ]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                    </View>
                  </Animated.View>
                </Swipeable>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No tasks for this day yet.
              </Text>
            }
          />
        </View>

        {pomodoro.mode !== "idle" && !isPomodoroExpanded && (
          <Animated.View
            style={styles.pomodoroBar}
            entering={FadeInDown}
            layout={Layout.springify()}
          >
            <Pressable
              style={styles.pomodoroBarContent}
              onPress={() => setIsPomodoroExpanded(true)}
            >
              <View>
                <Text style={styles.pomodoroLabel}>Focus session</Text>
                {activeTaskTitle ? (
                  <Text style={styles.pomodoroTaskTitle} numberOfLines={1}>
                    {activeTaskTitle}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.pomodoroTime}>
                {minutes}:{seconds}
              </Text>
            </Pressable>
            <Pressable style={styles.stopButton} onPress={stopPomodoro}>
              <Text style={styles.stopButtonText}>×</Text>
            </Pressable>
          </Animated.View>
        )}

        {pomodoro.mode !== "idle" && isPomodoroExpanded && (
          <Animated.View
            style={[
              styles.pomodoroOverlay,
              {
                paddingTop: insets.top + 8,
                paddingBottom: insets.bottom + 32,
              },
            ]}
            entering={FadeInDown}
            layout={Layout.springify()}
          >
            <View style={styles.pomodoroOverlayHeader}>
              <Pressable
                style={styles.pomodoroBackButton}
                onPress={() => setIsPomodoroExpanded(false)}
              >
                <Text style={styles.pomodoroBackText}>Back</Text>
              </Pressable>
            </View>
            <View style={styles.pomodoroTimeWrapper}>
              <Text style={styles.pomodoroLargeTime}>
                {minutes}:{seconds}
              </Text>
            </View>
            {pomodoro.mode === "ready" && (
              <View style={styles.pomodoroAdjustRow}>
                <Pressable
                  style={styles.pomodoroAdjustButton}
                  onPress={() => updatePomodoroMinutes(pomodoroMinutes - 5)}
                >
                  <Text style={styles.pomodoroAdjustText}>-5</Text>
                </Pressable>
                <Text style={styles.pomodoroAdjustLabel}>
                  {pomodoroMinutes} min
                </Text>
                <Pressable
                  style={styles.pomodoroAdjustButton}
                  onPress={() => updatePomodoroMinutes(pomodoroMinutes + 5)}
                >
                  <Text style={styles.pomodoroAdjustText}>+5</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.pomodoroOverlayFooter}>
              <Pressable
                style={styles.pomodoroPlayButton}
                onPress={() => {
                  setPomodoro((prev) => {
                    if (prev.mode === "ready") {
                      return { ...prev, mode: "focus" };
                    }
                    if (prev.mode === "focus") {
                      return { ...prev, mode: "ready" };
                    }
                    return prev;
                  });
                }}
              >
                {pomodoro.mode === "focus" ? (
                  <FontAwesome
                    name="pause"
                    size={28}
                    color={Colors.supportingText}
                  />
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
        )}

        {pomodoro.mode === "idle" && (
          <Animated.View style={[styles.addTaskBar, addAnimatedStyle]}>
            <Pressable
              style={styles.addButton}
              onPress={() => {
                setDraftTitle("");
                setIsAddingTask(true);
              }}
            >
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
      </KeyboardAvoidingView>
      <Modal
        visible={isCalendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCalendarOpen(false)}
      >
        <Pressable
          style={styles.calendarModalBackdrop}
          onPress={() => setIsCalendarOpen(false)}
        >
          <View />
        </Pressable>
        <View style={styles.calendarModalContainer}>
          <View style={styles.calendarModalSheet}>
            <View style={styles.calendarMonthHeader}>
              <Pressable
                style={styles.calendarMonthNavButton}
                onPress={() =>
                  setCalendarMonth((prev) => {
                    const year = prev.getFullYear();
                    const month = prev.getMonth();
                    return new Date(year, month - 1, 1);
                  })
                }
              >
                <Text style={styles.calendarMonthNavText}>‹</Text>
              </Pressable>
              <Text style={styles.calendarMonthTitle}>
                {calendarMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Pressable
                style={styles.calendarMonthNavButton}
                onPress={() =>
                  setCalendarMonth((prev) => {
                    const year = prev.getFullYear();
                    const month = prev.getMonth();
                    return new Date(year, month + 1, 1);
                  })
                }
              >
                <Text style={styles.calendarMonthNavText}>›</Text>
              </Pressable>
            </View>
            <View style={styles.calendarWeekdaysRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                <Text key={`${d}-${idx}`} style={styles.calendarWeekdayLabel}>
                  {d}
                </Text>
              ))}
            </View>
            {buildMonthGrid(calendarMonth).map((week, idx) => (
              <View key={idx} style={styles.calendarWeekRow}>
                {week.map((cell) => {
                  if (cell.dayNumber === 0) {
                    return <View key={cell.key} style={styles.calendarDayCell} />;
                  }
                  const cellDateKey = cell.key;
                  const isSelected = cellDateKey === selectedDate;
                  return (
                    <Pressable
                      key={cell.key}
                      style={[
                        styles.calendarDayCell,
                        isSelected && styles.calendarDayCellSelected,
                      ]}
                      onPress={() => {
                        setSelectedDate(cellDateKey);
                        setCalendarMonth(parseDateKey(cellDateKey));
                        setIsCalendarOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.calendarDayNumber,
                          isSelected && styles.calendarDayNumberSelected,
                        ]}
                      >
                        {cell.dayNumber}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </Modal>
      <Modal
        visible={isAddingTask}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddingTask(false)}
      >
        <View style={styles.addModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              setIsAddingTask(false);
            }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.addModalKeyboard}
          >
            <View style={styles.addModalSheet}>
              <View style={styles.addRow}>
                <View style={styles.taskNumberWrapper}>
                  <Text style={styles.addRowNumberText}>
                    {tasksForSelectedDate.length + 1}
                  </Text>
                </View>
                <TextInput
                  ref={addInputRef}
                  autoFocus
                  multiline
                  placeholder="Create"
                  placeholderTextColor={Colors.secondaryText}
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  style={styles.addRowInput}
                  returnKeyType="done"
                  keyboardAppearance={Platform.OS === "ios" ? "dark" : "default"}
                />
              </View>
              <View style={styles.addActionsRow}>
                <Pressable
                  style={styles.addPrimaryButton}
                  onPress={handleAddTask}
                >
                  <Text style={styles.addPrimaryButtonText}>Add</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroud,
  },
  root: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  weekdayWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  weekdayText: {
    fontSize: 42,
    fontWeight: "700",
    color: Colors.primaryText,
  },
  todayDot: {
    marginLeft: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.highlightText,
  },
  dateTextWrapper: {
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.primaryText,
  },
  dateSubText: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
  calendarStrip: {
    marginTop: 0,
    marginBottom: 8,
    paddingVertical: 16,
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
    marginHorizontal: 2,
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
  dayIndicator: {
    marginTop: 4,
    width: 6,
    height: 6,
    borderRadius: 44,
    backgroundColor: Colors.highlightText,
  },
  listContainer: {
    flex: 1,
    marginBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: Colors.tertiaryText,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.actionButtonStroke,
  },
  taskNumberWrapper: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.actionButtonStroke,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  taskNumberDone: {
    backgroundColor: Colors.authButtonBg,
    borderColor: Colors.authButtonBg,
  },
  taskMain: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    color: Colors.primaryText,
    marginBottom: 6,
  },
  taskTitleDone: {
    color: Colors.tertiaryText,
    textDecorationLine: "line-through",
  },
  pomodoroBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: Colors.actionButtonBg,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pomodoroBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    marginRight: 8,
  },
  pomodoroLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: Colors.supportingText,
    textTransform: "uppercase",
  },
  pomodoroTaskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  pomodoroTime: {
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    color: Colors.primaryText,
  },
  stopButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.authButtonBg,
  },
  stopButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  swipeLeftAction: {
    justifyContent: "center",
    alignItems: "flex-start",
    backgroundColor: Colors.authButtonBg,
    paddingHorizontal: 20,
  },
  swipeLeftText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  swipeRightAction: {
    justifyContent: "center",
    alignItems: "flex-end",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 20,
  },
  swipeRightText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "600",
  },
  addTaskBar: {
    alignItems: "center",
    paddingVertical: 6,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.actionButtonBg,
  },
  addButtonText: {
    fontSize: 32,
    color: Colors.authButtonBg,
    marginTop: -4,
  },
  pomodoroOverlay: {
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
  pomodoroOverlayHeader: {
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
  },
  pomodoroTaskPill: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  pomodoroTaskPillText: {
    fontSize: 16,
    color: Colors.secondaryText,
  },
  pomodoroBackButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.actionButtonBg,
  },
  pomodoroBackText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.primaryText,
  },
  pomodoroTimeWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pomodoroLargeTime: {
    fontSize: 72,
    letterSpacing: -2,
    textAlign: "center",
    color: Colors.secondaryText,
  },
  pomodoroOverlayFooter: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 8,
  },
  pomodoroPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.actionButtonBg,
    alignItems: "center",
    justifyContent: "center",
  },
  pomodoroPlayIcon: {
    fontSize: 28,
    color: Colors.supportingText,
  },
  pomodoroAdjustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  } as any,
  pomodoroAdjustButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.actionButtonBg,
  },
  pomodoroAdjustText: {
    fontSize: 14,
    color: Colors.primaryText,
  },
  pomodoroAdjustLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.primaryText,
  },
  addModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  addModalKeyboard: {
    flex: 1,
    justifyContent: "flex-end",
  },
  calendarModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  calendarModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarModalSheet: {
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
  calendarMonthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarMonthNavButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  calendarMonthNavText: {
    fontSize: 18,
    color: Colors.primaryText,
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  calendarWeekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  calendarWeekdayLabel: {
    width: 30,
    textAlign: "center",
    fontSize: 11,
    color: Colors.secondaryText,
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  calendarDayCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayCellSelected: {
    backgroundColor: Colors.actionButtonBg,
  },
  calendarDayNumber: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  calendarDayNumberSelected: {
    color: Colors.primaryText,
    fontWeight: "600",
  },
  addModalSheet: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.actionButtonStroke,
  },
  addRowNumberText: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: "center",
  },
  addRowInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 17,
    color: Colors.primaryText,
    minHeight: 120,
    textAlignVertical: "top",
  },
  addActionsRow: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  addPrimaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.authButtonBg,
  },
  addPrimaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

