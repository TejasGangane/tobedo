export type Task = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  isDone: boolean;
};

export type PomodoroState =
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

