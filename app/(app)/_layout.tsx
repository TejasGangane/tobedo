import { Stack } from "expo-router";

import { TasksProvider } from "@/features/home/TasksContext";

export default function AppLayout() {
  return (
    <TasksProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </TasksProvider>
  );
}

