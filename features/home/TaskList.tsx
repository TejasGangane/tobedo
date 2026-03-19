import { FontAwesome } from "@expo/vector-icons";
import React, { useCallback } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  PanGestureHandler,
  State,
  Swipeable,
} from "react-native-gesture-handler";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Colors } from "@/constants/Colors";
import { FadeText } from "@/components/ui/FadeText";
import type { Task } from "./types";

type Props = {
  tasks: Task[];
  onToggleDone: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onStartPomodoro: (taskId: string) => void;
  onRefreshToToday?: () => void;
  isRefreshing?: boolean;
  onSwipeEmptyDate?: (direction: "prev" | "next") => void;
  onEditTask?: (task: Task) => void;
};

const DASH_COUNT = 28;

export function TaskList({
  tasks,
  onToggleDone,
  onDelete,
  onStartPomodoro,
  onRefreshToToday,
  isRefreshing,
  onSwipeEmptyDate,
  onEditTask,
}: Props) {
  const showTaskActions = useCallback((task: Task) => {
    if (!onEditTask) return;
    const title = task.title || "Task";

    if (Platform.OS === "ios") {
      const options = ["Edit task", "Cancel"];
      const cancelIndex = 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options,
          cancelButtonIndex: cancelIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === cancelIndex) return;
          if (buttonIndex === 0) onEditTask(task);
        },
      );
      return;
    }

    // Android and other platforms: simple system alert menu.
    const buttons = [
      {
        text: "Edit task",
        onPress: () => onEditTask(task),
      },
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ].filter(Boolean) as { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }[];

    Alert.alert(title, undefined, buttons, { cancelable: true });
  }, [onEditTask]);
  const handleSwipeDate = (translationX: number, velocityX: number) => {
    if (!onSwipeEmptyDate) return;
    // Reversed mapping:
    // - swipe right  -> yesterday (prev)
    // - swipe left   -> next date
    const swipeLeft = translationX < -50 || velocityX < -650;
    const swipeRight = translationX > 50 || velocityX > 650;

    if (swipeRight) onSwipeEmptyDate("prev");
    if (swipeLeft) onSwipeEmptyDate("next");
  };

  const swipeWrapperProps = {
    enabled: Boolean(onSwipeEmptyDate),
    activeOffsetX: [-18, 18] as [number, number],
    failOffsetY: [-40, 40] as [number, number],
    onHandlerStateChange: ({ nativeEvent }: any) => {
      if (nativeEvent.state !== State.END) return;
      handleSwipeDate(nativeEvent.translationX, nativeEvent.velocityX);
    },
  };

  if (tasks.length === 0) {
    return (
      <PanGestureHandler {...swipeWrapperProps}>
        <View style={styles.listContainer}>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.emptyScrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefreshToToday ? (
                <RefreshControl
                  refreshing={Boolean(isRefreshing)}
                  onRefresh={onRefreshToToday}
                />
              ) : undefined
            }
          >
            <View style={styles.emptyListContent}>
              <FadeText
                inputs={["No tasks for this day yet."]}
                duration={1100}
                wordDelay={140}
                blurTint="extraLight"
                fontSize={18}
                fontWeight="500"
                color={Colors.tertiaryText}
                containerStyle={styles.emptyFadeContainer}
                style={styles.emptyText}
              />
            </View>
          </ScrollView>
        </View>
      </PanGestureHandler>
    );
  }

  return (
    <PanGestureHandler {...swipeWrapperProps}>
      <View style={styles.listContainer}>
        <FlatList
          style={styles.list}
          data={tasks}
          keyExtractor={useCallback((item: Task) => item.id, [])}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            onRefreshToToday ? (
              <RefreshControl
                refreshing={Boolean(isRefreshing)}
                onRefresh={onRefreshToToday}
              />
            ) : undefined
          }
          renderItem={useCallback(({ item, index }: { item: Task; index: number }) => {
          let swipeableRef: Swipeable | null = null;

          const safeIndex = typeof index === "number" && index >= 0 ? index : 0;

          return (
            <Swipeable
              ref={(ref) => {
                swipeableRef = ref;
              }}
              friction={1.2}
              overshootLeft
              overshootRight
              overshootFriction={6}
              leftThreshold={64}
              rightThreshold={64}
              onSwipeableOpen={(direction) => {
                if (direction === "left") {
                  onStartPomodoro(item.id);
                } else if (direction === "right") {
                  onDelete(item.id);
                }

                swipeableRef?.close();
              }}
              renderLeftActions={() => (
                <View style={styles.swipeActionContainer}>
                  <View style={[styles.swipeButton, styles.swipePomodoroButton]}>
                    <Text style={styles.swipePomodoroText}>Pomodoro</Text>
                  </View>
                </View>
              )}
              renderRightActions={() => (
                <View style={styles.swipeActionContainer}>
                  <View style={[styles.swipeButton, styles.swipeDeleteButton]}>
                    <Text style={styles.swipeDeleteText}>Delete</Text>
                  </View>
                </View>
              )}
            >
              <Pressable
                style={styles.taskRowPressable}
                onLongPress={() => showTaskActions(item)}
              >
                <Animated.View
                  style={[
                    styles.taskRowOuter,
                  ]}
                  entering={FadeInDown.delay(safeIndex * 40)}
                >
                  <Animated.View
                    style={[
                      styles.taskRow,
                    ]}
                  >
                    <Pressable
                      onPress={() => onToggleDone(item.id)}
                      onLongPress={() => showTaskActions(item)}
                      style={[
                        styles.taskNumberWrapper,
                        item.isDone && styles.taskNumberDone,
                      ]}
                    >
                      {item.isDone ? (
                        <FontAwesome
                          name="check"
                          size={12}
                          color={Colors.secondaryText}
                        />
                      ) : (
                        <Text style={styles.taskNumberText}>
                          {safeIndex + 1}
                        </Text>
                      )}
                    </Pressable>
                    <View style={styles.taskMain}>
                      <Text
                        style={[
                          styles.taskTitle,
                          item.isDone && styles.taskTitleDone,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.title.length > 28
                          ? `${item.title.slice(0, 25)}...`
                          : item.title}
                      </Text>
                    </View>
                    <View style={styles.dashedSeparatorRow}>
                      {Array.from({ length: DASH_COUNT }).map((_, idx) => (
                        <View key={idx} style={styles.dashDot} />
                      ))}
                    </View>
                  </Animated.View>
                </Animated.View>
              </Pressable>
            </Swipeable>
          );
          }, [onDelete, onStartPomodoro, onToggleDone, showTaskActions])}
        />
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 160,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 160,
  },
  emptyListContent: {
    alignItems: "center",
  },
  emptyFadeContainer: {
    paddingHorizontal: 0,
  },
  emptyListRoot: {
    flex: 1,
    alignSelf: "stretch",
  },
  emptyText: {
    fontSize: 18,
    color: Colors.tertiaryText,
  },
  taskRowOuter: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginHorizontal: -10,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  taskRowPressable: {
    flex: 1,
    marginHorizontal: 0,
    paddingHorizontal: 24,
  },
  taskRowActive: {
    transform: [{ scale: 0.98 }],
  },
  taskNumberWrapper: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.actionButtonStroke,
    borderStyle: "dashed",
    marginLeft: 0,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  taskNumberDone: {
    backgroundColor: Colors.actionButtonBg,
    borderColor: Colors.actionButtonStroke,
    elevation: 2,
  },
  taskNumberText: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
  taskMain: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: Colors.primaryText,
  },
  taskTitleDone: {
    color: Colors.tertiaryText,
    textDecorationLine: "line-through",
  },
  dashedSeparatorRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    pointerEvents: "none",
  },
  dashDot: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 1,
    backgroundColor: Colors.actionButtonStroke,
  },
  swipeActionContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    marginHorizontal: -80,
  },
  swipeButton: {
    minWidth: 88,
    paddingHorizontal: 16,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  swipePomodoroButton: {
    backgroundColor: Colors.authButtonBg,
    flex: 1,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  swipeDeleteButton: {
    backgroundColor: "#FEE2E2",
    flex: 1,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  swipePomodoroText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 80,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  swipeDeleteText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 80,
    textAlign: "right",
    alignSelf: "flex-end",
  },
});

