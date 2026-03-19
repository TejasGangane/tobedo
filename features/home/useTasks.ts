import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import type { Task } from "./types";

const BASE_TASKS_STORAGE_KEY = "tobedo.tasks.v1";

const formatDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDateKey = (raw: unknown): string => {
  const s = String(raw ?? "").trim();
  // Accept:
  // - YYYY-MM-DD
  // - YYYY-M-D
  // - ISO-like starting with a date (YYYY-MM-DD...)
  const ymdPadded = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdPadded) {
    const [, y, m, d] = ymdPadded;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  // Fallback: if it's parseable as a date, normalize to local YYYY-MM-DD.
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateKey(parsed);
  }
  return s;
};

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [storageKey, setStorageKey] = useState<string | null>(null);

  const reloadTasks = useCallback(async () => {
    const key = BASE_TASKS_STORAGE_KEY;
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) {
        setTasks([]);
        return;
      }
      const parsed = JSON.parse(stored) as Task[] | unknown;
      if (Array.isArray(parsed)) {
        setTasks(
          parsed.map((t) => ({
            id: String((t as Task).id),
            title: (t as Task).title,
            date: normalizeDateKey((t as Task).date),
            isDone: Boolean((t as Task).isDone),
          })),
        );
      } else {
        setTasks([]);
      }
    } catch {
      // ignore corrupt storage
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    const key = BASE_TASKS_STORAGE_KEY;
    setStorageKey(key);

    // Reset to empty while loading this user's data,
    // so we don't leak tasks between users.
    setTasks([]);

    const loadTasks = async () => {
      try {
        const stored = await AsyncStorage.getItem(key);
        if (!stored) return;
        const parsed = JSON.parse(stored) as Task[] | unknown;
        if (Array.isArray(parsed)) {
          setTasks(
            parsed.map((t) => ({
              id: String((t as Task).id),
              title: (t as Task).title,
              date: normalizeDateKey((t as Task).date),
              isDone: Boolean((t as Task).isDone),
            })),
          );
        }
      } catch {
        // ignore corrupt storage
      }
    };

    loadTasks();
  }, []);

  useEffect(() => {
    if (!tasks || !storageKey) return;

    const timeout = setTimeout(() => {
      const saveTasks = async () => {
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(tasks));
        } catch {
          // ignore write errors
        }
      };

      void saveTasks();
    }, 300);

    return () => clearTimeout(timeout);
  }, [tasks, storageKey]);

  const addTask = (title: string, date: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setTasks((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        title: trimmed,
        date: normalizeDateKey(date),
        isDone: false,
      },
    ]);
  };

  const toggleTaskDone = (taskId: string) => {
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

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const completeTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              isDone: true,
            }
          : t,
      ),
    );
  };

  const restoreTask = (task: Task) => {
    setTasks((prev) => [...prev, task]);
  };

  const reorderTasksForDate = (date: string, orderedIds: string[]) => {
    setTasks((prev) => {
      const currentForDate = prev.filter((t) => t.date === date);
      if (!currentForDate.length) return prev;

      const byId = new Map(currentForDate.map((t) => [t.id, t]));
      const reordered: Task[] = [];

      orderedIds.forEach((id) => {
        const task = byId.get(id);
        if (task) reordered.push(task);
      });

      const remainingForDate = currentForDate.filter(
        (t) => !orderedIds.includes(t.id),
      );

      const others = prev.filter((t) => t.date !== date);
      return [...others, ...reordered, ...remainingForDate];
    });
  };

  return {
    tasks,
    reloadTasks,
    addTask,
    toggleTaskDone,
    deleteTask,
    completeTask,
    restoreTask,
    reorderTasksForDate,
  };
}

