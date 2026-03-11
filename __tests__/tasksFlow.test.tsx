import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { TasksProvider } from "../features/home/TasksContext";
import HomeScreen from "../features/home/HomeScreen";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("tasks flow", () => {
  it("allows adding a task", () => {
    const { getByText, getByPlaceholderText } = render(
      <TasksProvider>
        <HomeScreen />
      </TasksProvider>,
    );

    fireEvent.press(getByText("+"));

    const input = getByPlaceholderText("Create");
    fireEvent.changeText(input, "New task");
    fireEvent.press(getByText("Add"));

    expect(getByText("New task")).toBeTruthy();
  });
});

