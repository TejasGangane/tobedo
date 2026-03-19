import { ScalePressable } from "@/components/ui/ScalePressable";
import { Colors } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  BackHandler,
  Alert,
  InteractionManager,
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
  FadeInDown,
  Layout,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
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

const DEFAULT_POMODORO_MINUTES = 25;
const initialToday = formatDateKey(new Date());
const POMODORO_STORAGE_KEY = "tobedo.pomodoro.v1";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const [displayedDate, setDisplayedDate] = useState(initialToday);
  const {
    tasks,
    reloadTasks,
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
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false);
  const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addScale = useSharedValue(0.9);
  const addInputRef = useRef<TextInput | null>(null);
  const headerScale = useSharedValue(1);
  const weekdayTransition = useSharedValue(0);

  // Restore persisted Pomodoro state (for background/resume continuity).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(POMODORO_STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as PomodoroState | unknown;
        if (parsed && typeof parsed === "object" && "mode" in (parsed as any)) {
          if (!cancelled) setPomodoro(parsed as PomodoroState);
        }
      } catch {
        // ignore corrupt storage
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist Pomodoro state (debounced slightly).
  useEffect(() => {
    const timeout = setTimeout(() => {
      void AsyncStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(pomodoro));
    }, 200);
    return () => clearTimeout(timeout);
  }, [pomodoro]);

  useEffect(() => {
    addScale.value = withTiming(1, { duration: 300 });
  }, [addScale]);

  useEffect(() => {
    if (displayedDate === selectedDate) return;
    weekdayTransition.value = 0;
    // Blur (fade/soften) -> swap -> unblur.
    // The selection updates instantly; this header updates after the blur peaks.
    weekdayTransition.value = withTiming(1, { duration: 220 }, (finished) => {
      if (!finished) return;
      runOnJS(setDisplayedDate)(selectedDate);
      weekdayTransition.value = withDelay(120, withTiming(0, { duration: 260 }));
    });
  }, [displayedDate, selectedDate, weekdayTransition]);

  useEffect(() => {
    if (!isAddingTask) return;

    let cancelled = false;
    const focus = () => {
      if (cancelled) return;
      addInputRef.current?.focus();
    };

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      focus();
      // small retry for Android / slower devices
      setTimeout(focus, 120);
    });

    return () => {
      cancelled = true;
      interactionHandle.cancel();
    };
  }, [isAddingTask]);

  const focusAddInput = useCallback(() => {
    const attempt = () => {
      addInputRef.current?.focus();
    };
    // Run after the modal is mounted & animations settle.
    InteractionManager.runAfterInteractions(() => {
      attempt();
      setTimeout(attempt, 80);
      setTimeout(attempt, 180);
      setTimeout(attempt, 420);
      setTimeout(attempt, 800);
      setTimeout(attempt, 1200);
    });
  }, []);

  // Android: prevent exiting app when an overlay is open.
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isAddingTask) {
        setIsAddingTask(false);
        return true;
      }
      if (isCalendarOpen) {
        setIsCalendarOpen(false);
        return true;
      }
      if (isPomodoroExpanded) {
        setIsPomodoroExpanded(false);
        return true;
      }
      if (pomodoro.mode !== "idle") {
        // If a Pomodoro is active and the alert is showing, keep user on home.
        // (They can cancel explicitly.)
        return true;
      }
      return false;
    });

    return () => sub.remove();
  }, [isAddingTask, isCalendarOpen, isPomodoroExpanded, pomodoro.mode]);

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

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const weekdayBlurStyle = useAnimatedStyle(() => {
    const t = weekdayTransition.value; // 0 -> crisp, 1 -> blurred
    return {
      opacity: 1 - t * 0.55,
      textShadowColor: "rgba(0,0,0,0.22)",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: t * 6,
    };
  });


  const tasksForSelectedDate = useMemo(
    () => {
      const toKey = (raw: unknown) => {
        const s = String(raw ?? "").trim();
        const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) return formatDateKey(d);
        return s.slice(0, 10);
      };

      const selectedKey = toKey(selectedDate);
      return tasks.filter((t) => toKey(t.date) === selectedKey);
    },
    [tasks, selectedDate],
  );

  const totalTasksForSelectedDate = tasksForSelectedDate.length;
  const remainingTasksForSelectedDate = useMemo(
    () => tasksForSelectedDate.filter((t) => !t.isDone).length,
    [tasksForSelectedDate],
  );

  const handleRefreshTasks = useCallback(async () => {
    setIsRefreshingTasks(true);
    await reloadTasks();
    setIsRefreshingTasks(false);
  }, [reloadTasks]);

  const recomputeFocusRemaining = useCallback(() => {
    setPomodoro((current) => {
      if (current.mode !== "focus") return current;
      const startedAtMs = current.startedAtMs;
      const remainingAtStartSeconds = current.remainingAtStartSeconds;
      if (!startedAtMs || remainingAtStartSeconds == null) {
        return current;
      }
      const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
      const nextRemaining = remainingAtStartSeconds - elapsedSeconds;
      if (nextRemaining <= 0) {
        return { mode: "completed", taskId: current.taskId };
      }
      return {
        ...current,
        remainingSeconds: nextRemaining,
      };
    });
  }, []);

  useEffect(() => {
    if (pomodoro.mode !== "focus") return;
    // tick while foregrounded
    const interval = setInterval(recomputeFocusRemaining, 1000);
    return () => clearInterval(interval);
  }, [pomodoro.mode, recomputeFocusRemaining]);

  useEffect(() => {
    // when app comes back, immediately recompute remaining time
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        recomputeFocusRemaining();
      }
    });
    return () => sub.remove();
  }, [recomputeFocusRemaining]);

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
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.isDone) {
      Alert.alert("Pomodoro unavailable", "This task is already completed.");
      return;
    }

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

  const markPomodoroCompletedNow = () => {
    if (pomodoro.mode === "idle" || !pomodoro.taskId) {
      return;
    }
    completeTask(pomodoro.taskId);
    stopPomodoro();
  };

  const togglePomodoroPlayPause = () => {
    setPomodoro((prev) => {
      if (prev.mode === "ready") {
        return {
          ...prev,
          mode: "focus",
          startedAtMs: Date.now(),
          remainingAtStartSeconds: prev.remainingSeconds,
        };
      }
      if (prev.mode === "focus") {
        const startedAtMs = prev.startedAtMs ?? Date.now();
        const remainingAtStartSeconds =
          prev.remainingAtStartSeconds ?? prev.remainingSeconds;
        const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
        const nextRemaining = Math.max(
          1,
          remainingAtStartSeconds - elapsedSeconds,
        );
        return {
          ...prev,
          mode: "ready",
          remainingSeconds: nextRemaining,
          startedAtMs: undefined,
          remainingAtStartSeconds: undefined,
        };
      }
      return prev;
    });
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
    pomodoro.mode === "focus" || pomodoro.mode === "ready"
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

  const isSelectedDateToday = useMemo(() => {
    const todayKey = formatDateKey(new Date());
    return selectedDate === todayKey;
  }, [selectedDate]);

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
          <Animated.View style={headerAnimatedStyle}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setIsCalendarOpen(true);
                headerScale.value = withSpring(0.96, {
                  damping: 16,
                  stiffness: 220,
                  mass: 0.9,
                });
                headerScale.value = withSpring(1, {
                  damping: 18,
                  stiffness: 260,
                  mass: 0.9,
                });
              }}
              style={styles.headerRow}
            >
              <View style={styles.weekdayWrapper}>
                <Animated.Text style={[styles.weekdayText, weekdayBlurStyle]}>
                  {parseDateKey(displayedDate).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </Animated.Text>
                {isSelectedDateToday && <View style={styles.todayDot} />}
              </View>
              <View style={styles.dateTextWrapper}>
                <Text style={styles.dateText}>
                  {parseDateKey(displayedDate).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
                <Text style={styles.dateSubText}>
                  {parseDateKey(displayedDate).getFullYear()}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <CalendarStrip
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
          />

          <View style={styles.taskListWrapper}>
            <TaskList
              tasks={tasksForSelectedDate}
              onToggleDone={handleToggleDone}
              onDelete={handleDeleteTask}
              onStartPomodoro={startPomodoro}
              onCancelPomodoro={stopPomodoro}
              onReorder={(orderedTasks: Task[]) =>
                reorderTasksForDate(
                  selectedDate,
                  orderedTasks.map((t: Task) => t.id),
                )
              }
              onRefreshToToday={handleRefreshTasks}
              isRefreshing={isRefreshingTasks}
              onSwipeEmptyDate={(direction) => {
                const d = parseDateKey(selectedDate);
                d.setDate(d.getDate() + (direction === "next" ? 1 : -1));
                setSelectedDate(formatDateKey(d));
              }}
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
                <Text style={styles.stopButtonText}>Cancel</Text>
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
            onTogglePlayPause={togglePomodoroPlayPause}
            onStopPomodoro={stopPomodoro}
            onMarkCompleted={markPomodoroCompletedNow}
          />

          {lastDeletedTask && (
            <Animated.View
              style={styles.undoBar}
              entering={FadeInDown}
              layout={Layout.springify()}
            >
              <Text style={styles.undoText}>Task deleted</Text>
              <ScalePressable pressedScale={0.97} onPress={handleUndoDelete}>
                <Text style={styles.undoAction}>Undo</Text>
              </ScalePressable>
            </Animated.View>
          )}

          <View style={styles.bottomDock} pointerEvents="box-none">
            {pomodoro.mode === "idle" && totalTasksForSelectedDate > 0 && (
              <View style={styles.taskStatusPillRow}>
                <View style={styles.taskStatusPill}>
                  {(() => {
                    const done =
                      totalTasksForSelectedDate - remainingTasksForSelectedDate;
                    const remaining = remainingTasksForSelectedDate;

                    if (done === 0) {
                      return (
                        <Text style={styles.taskStatusText}>
                          {remaining} remaining
                        </Text>
                      );
                    }

                    if (remaining === 0) {
                      return <Text style={styles.taskStatusText}>{done} done</Text>;
                    }

                    return (
                      <>
                        <Text style={styles.taskStatusText}>
                          {done}/{totalTasksForSelectedDate} completed
                        </Text>
                        <View style={styles.taskStatusDot} />
                        <Text style={styles.taskStatusText}>
                          {remaining} remaining
                        </Text>
                      </>
                    );
                  })()}
                </View>
              </View>
            )}

            {pomodoro.mode === "idle" && (
              <Animated.View style={[styles.addTaskBar, addAnimatedStyle]}>
                <ScalePressable
                  style={styles.addButton}
                  onPress={() => {
                    setDraftTitle("");
                    setIsAddingTask(true);
                    setTimeout(focusAddInput, 60);
                  }}
                >
                  <Text style={styles.addButtonText}>+</Text>
                </ScalePressable>
              </Animated.View>
            )}
          </View>

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
        onShow={focusAddInput}
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
                  showSoftInputOnFocus
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
    backgroundColor: Colors.background,
  },
  root: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 0,
    minHeight: 0,
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
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.actionButtonBg,
    borderWidth: 1,
    borderColor: Colors.actionButtonStroke,
    marginBottom: 24,
    marginLeft: 0,
    alignSelf: "center",
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EF4444",
  },
  stopButtonText: {
    fontSize: 13,
    fontWeight: "600",
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
    marginHorizontal: -24,
    borderTopWidth: 1,
    borderTopColor: Colors.actionButtonStroke,
    alignSelf: "stretch",
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
  taskListWrapper: {
    flex: 1,
    marginHorizontal: 0,
    minHeight: 0,
  },
  bottomDock: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 0,
  },
  taskStatusPillRow: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  taskStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.actionButtonBg,
    borderWidth: 1,
    borderColor: Colors.actionButtonStroke,
  },
  taskStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.secondaryText,
  },
  taskStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.tertiaryText,
    marginHorizontal: 10,
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

