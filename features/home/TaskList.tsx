import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";

import { Colors } from "@/constants/Colors";
import type { Task } from "./types";

type Props = {
  tasks: Task[];
  onToggleDone: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onStartPomodoro: (taskId: string) => void;
  onReorder: (tasks: Task[]) => void;
};

export function TaskList({
  tasks,
  onToggleDone,
  onDelete,
  onStartPomodoro,
  onReorder,
}: Props) {
  return (
    <View style={styles.listContainer}>
      <DraggableFlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        activationDistance={4}
        contentContainerStyle={
          tasks.length === 0 ? styles.emptyListContent : undefined
        }
        onDragEnd={({ data }) => onReorder(data)}
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
              <Animated.View
                style={[
                  styles.taskRow,
                  isActive && styles.taskRowActive,
                ]}
                entering={FadeInDown.delay(safeIndex * 40)}
                layout={Layout.springify()}
              >
                <Pressable
                  onLongPress={drag}
                  delayLongPress={120}
                  onPress={() => onToggleDone(item.id)}
                  style={[
                    styles.taskNumberWrapper,
                    item.isDone && styles.taskNumberDone,
                  ]}
                >
                  {item.isDone ? (
                    <FontAwesome name="check" size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={styles.taskNumberText}>{safeIndex + 1}</Text>
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
          <Text style={styles.emptyText}>No tasks for this day yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    marginBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 240,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.tertiaryText,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.actionButtonStroke,
  },
  taskRowActive: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
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
  taskNumberText: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  taskMain: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    color: Colors.primaryText,
  },
  taskTitleDone: {
    color: Colors.tertiaryText,
    textDecorationLine: "line-through",
  },
  swipeActionContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 12,
  },
  swipeButton: {
    minWidth: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  swipePomodoroButton: {
    backgroundColor: Colors.authButtonBg,
  },
  swipeDeleteButton: {
    backgroundColor: "#FEE2E2",
    marginLeft: "auto",
  },
  swipePomodoroText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  swipeDeleteText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "600",
  },
});

