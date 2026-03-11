import React, {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { Task } from "./types";
import { useTasks } from "./useTasks";

type TasksContextValue = {
  tasks: Task[];
  addTask: (title: string, date: string) => void;
  toggleTaskDone: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  restoreTask: (task: Task) => void;
  reorderTasksForDate: (date: string, orderedIds: string[]) => void;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const value = useTasks();

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasksContext() {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error("useTasksContext must be used within a TasksProvider");
  }
  return ctx;
}

