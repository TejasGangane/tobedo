import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import {
  PanGestureHandler,
  State,
  Swipeable,
} from "react-native-gesture-handler";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";

import { Colors } from "@/constants/Colors";
import type { Task } from "./types";

type Props = {
  tasks: Task[];
  onToggleDone: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onStartPomodoro: (taskId: string) => void;
  onCancelPomodoro: () => void;
  onReorder: (tasks: Task[]) => void;
  onRefreshToToday?: () => void;
  isRefreshing?: boolean;
  onSwipeEmptyDate?: (direction: "prev" | "next") => void;
};

const DASH_COUNT = 28;

export function TaskList({
  tasks,
  onToggleDone,
  onDelete,
  onStartPomodoro,
  onCancelPomodoro,
  onReorder,
  onRefreshToToday,
  isRefreshing,
  onSwipeEmptyDate,
}: Props) {
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
              <Text style={styles.emptyText}>No tasks for this day yet.</Text>
            </View>
          </ScrollView>
        </View>
      </PanGestureHandler>
    );
  }

  return (
    <PanGestureHandler {...swipeWrapperProps}>
      <View style={styles.listContainer}>
        <DraggableFlatList
          style={styles.list}
          data={tasks}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          activationDistance={4}
          contentContainerStyle={styles.listContent}
          onDragEnd={({ data }) => onReorder(data)}
          refreshControl={
            onRefreshToToday ? (
              <RefreshControl
                refreshing={Boolean(isRefreshing)}
                onRefresh={onRefreshToToday}
              />
            ) : undefined
          }
          renderItem={({
            item,
            getIndex,
            drag,
            isActive,
          }: RenderItemParams<Task>) => {
          let swipeableRef: Swipeable | null = null;

          const safeIndex = (() => {
            const currentIndex = getIndex?.();
            if (typeof currentIndex === "number" && currentIndex >= 0) {
              return currentIndex;
            }
            const fromTasks = tasks.findIndex((t) => t.id === item.id);
            if (fromTasks >= 0) return fromTasks;
            return 0;
          })();

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
                onLongPress={() => {
                  Alert.alert(
                    "Delete task?",
                    "This will remove the task from your list.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => onDelete(item.id),
                      },
                    ],
                  );
                }}
                delayLongPress={400}
                style={styles.taskRowPressable}
              >
                <Animated.View
                  style={[
                    styles.taskRowOuter,
                    isActive && styles.taskRowActive,
                  ]}
                  entering={FadeInDown.delay(safeIndex * 40)}
                  layout={Layout.springify()
                    .damping(18)
                    .stiffness(260)
                    .mass(0.9)}
                >
                  <Animated.View
                    style={[
                      styles.taskRow,
                    ]}
                  >
                    <Pressable
                      onPress={() => onToggleDone(item.id)}
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
          }}
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
    paddingBottom: 160,
  },
  emptyListContent: {
    alignItems: "center",
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
    paddingHorizontal: 14,
    marginHorizontal: -10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  taskRowPressable: {
    flex: 1,
    marginHorizontal: -24,
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
    borderColor: "#E5E7EB",
    marginLeft: 36,
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
    left: -24,
    right: -24,
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
    borderRadius: 0,
    flex: 1,
  },
  swipeDeleteButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 0,
    flex: 1,
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

