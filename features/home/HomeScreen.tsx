import { Colors } from "@/constants/Colors";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarModal } from "./CalendarModal";
import { CalendarStrip } from "./CalendarStrip";
import { formatDateKey, parseDateKey } from "./dateUtils";
import { PomodoroOverlay } from "./PomodoroOverlay";
import { TaskList } from "./TaskList";
import { useTasksContext } from "./TasksContext";
import type { PomodoroState, Task } from "./types";

const DEFAULT_POMODORO_MINUTES = 30;
const COMPLETION_CONFETTI_COUNT = 14;
const COMPLETION_CONFETTI_COLORS = [
  "#F97316",
  "#10B981",
  "#3B82F6",
  "#EC4899",
  "#FACC15",
  "#22C55E",
];
const initialToday = formatDateKey(new Date());

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const {
    tasks,
    addTask,
    toggleTaskDone,
    deleteTask,
    completeTask,
    restoreTask,
    reorderTasksForDate,
  } = useTasksContext();
  const [pomodoro, setPomodoro] = useState<PomodoroState>({ mode: "idle" });
  const [pomodoroMinutes, setPomodoroMinutes] = useState(
    DEFAULT_POMODORO_MINUTES,
  );
  const [draftTitle, setDraftTitle] = useState("");
  const [isPomodoroExpanded, setIsPomodoroExpanded] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addScale = useSharedValue(0.9);
  const addInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    addScale.value = withTiming(1, { duration: 300 });
  }, [addScale]);

  useEffect(() => {
    if (!isAddingTask) return;

    const timeout = setTimeout(() => {
      addInputRef.current?.focus();
    }, 80);

    return () => clearTimeout(timeout);
  }, [isAddingTask]);

  // Each time this screen gains focus, jump to "today".
  useFocusEffect(
    useCallback(() => {
      const todayKey = formatDateKey(new Date());
      setSelectedDate(todayKey);
    }, []),
  );

  const addAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }));

  const tasksForSelectedDate = useMemo(
    () => tasks.filter((t) => t.date === selectedDate),
    [tasks, selectedDate],
  );

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

    const { taskId } = pomodoro;

    completeTask(taskId);

    const timeout = setTimeout(() => {
      setPomodoro({ mode: "idle" });
      setIsPomodoroExpanded(false);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [pomodoro]);

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
    const task = tasks.find((t) => t.id === taskId) ?? null;

    deleteTask(taskId);

    if (pomodoro.mode === "focus" && pomodoro.taskId === taskId) {
      setPomodoro({ mode: "idle" });
    }

    if (task) {
      setLastDeletedTask(task);

      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      undoTimeoutRef.current = setTimeout(() => {
        setLastDeletedTask(null);
        undoTimeoutRef.current = null;
      }, 5000);
    }
  };

  const handleToggleDone = (taskId: string) => {
    toggleTaskDone(taskId);
  };

  const handleAddTask = () => {
    const title = draftTitle.trim();
    if (!title) return;
    addTask(title, selectedDate);
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

  const handleUndoDelete = () => {
    if (!lastDeletedTask) return;

    restoreTask(lastDeletedTask);
    setLastDeletedTask(null);

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  };

  return (
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom - 32, 0),
        },
      ]}
    >
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

          <CalendarStrip
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
          />

          <TaskList
            tasks={tasksForSelectedDate}
            onToggleDone={handleToggleDone}
            onDelete={handleDeleteTask}
            onStartPomodoro={startPomodoro}
            onReorder={(orderedTasks: Task[]) =>
              reorderTasksForDate(
                selectedDate,
                orderedTasks.map((t: Task) => t.id),
              )
            }
          />

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

          <PomodoroOverlay
            visible={pomodoro.mode !== "idle" && isPomodoroExpanded}
            pomodoro={pomodoro}
            pomodoroMinutes={pomodoroMinutes}
            minutesLabel={minutes}
            secondsLabel={seconds}
            onChangeMinutes={updatePomodoroMinutes}
            onTogglePlayPause={() => {
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
            onCollapse={() => setIsPomodoroExpanded(false)}
          />

          {lastDeletedTask && (
            <Animated.View
              style={styles.undoBar}
              entering={FadeInDown}
              layout={Layout.springify()}
            >
              <Text style={styles.undoText}>Task deleted</Text>
              <Pressable onPress={handleUndoDelete}>
                <Text style={styles.undoAction}>Undo</Text>
              </Pressable>
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

          {pomodoro.mode === "completed" && (
            <View pointerEvents="none" style={styles.completionOverlay}>
              <Animated.View
                entering={FadeInDown.duration(450)}
                exiting={FadeInDown.duration(300)}
                style={styles.completionContent}
                layout={Layout.springify()}
              >
                <View style={styles.completionCircle}>
                  <FontAwesome name="check" size={30} color="#FFFFFF" />
                </View>
                <View style={styles.completionConfettiLayer}>
                  {Array.from({ length: COMPLETION_CONFETTI_COUNT }).map(
                    (_, index) => {
                      const color =
                        COMPLETION_CONFETTI_COLORS[
                        index % COMPLETION_CONFETTI_COLORS.length
                        ];
                      return (
                        <Animated.View
                          // eslint-disable-next-line react/no-array-index-key
                          key={index}
                          entering={FadeInDown.delay(index * 30)
                            .duration(500)
                            .easing(Easing.out(Easing.cubic))}
                          style={[
                            styles.completionConfettiPiece,
                            { backgroundColor: color },
                          ]}
                        />
                      );
                    },
                  )}
                </View>
              </Animated.View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      <CalendarModal
        visible={isCalendarOpen}
        selectedDate={selectedDate}
        onSelectDate={(dateKey) => {
          setSelectedDate(dateKey);
          setIsCalendarOpen(false);
        }}
        onClose={() => setIsCalendarOpen(false)}
      />
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
                  placeholder="Create"
                  placeholderTextColor={Colors.secondaryText}
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  onSubmitEditing={handleAddTask}
                  style={styles.addRowInput}
                  returnKeyType="done"
                  keyboardAppearance={Platform.OS === "ios" ? "dark" : "default"}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
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
    paddingBottom: 0,
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
  listContainer: {
    flex: 1,
    marginBottom: 0,
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
    borderWidth: 1,
    borderColor: Colors.actionButtonStroke,
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
    paddingTop: 10,
    paddingBottom: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.actionButtonStroke,
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
  undoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.actionButtonBg,
    borderWidth: 1,
    borderColor: Colors.actionButtonStroke,
    marginBottom: 12,
  },
  undoText: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
  undoAction: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.highlightText,
  },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  completionContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  completionCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: Colors.backgroud,
    borderWidth: 4,
    borderColor: Colors.highlightText,
    alignItems: "center",
    justifyContent: "center",
  },
  completionConfettiLayer: {
    position: "absolute",
    width: 140,
    height: 140,
  },
  completionConfettiPiece: {
    position: "absolute",
    width: 6,
    height: 10,
    borderRadius: 3,
    opacity: 0.9,
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
    paddingBottom: 40,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    // Aggressively overlap into the rounded keyboard area on iOS
    marginBottom: Platform.OS === "ios" ? -24 : 0,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
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
    minHeight: 52,
  },
});

