import React from "react";
import { render } from "@testing-library/react-native";

import { SignedIn, SignedOut } from "@clerk/expo";
import Index from "../app/index";

jest.mock("@clerk/expo", () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("expo-router", () => {
  const actual = jest.requireActual("expo-router");
  return {
    ...actual,
    Redirect: ({ href }: { href: string }) => <>{href}</>,
  };
});

describe("auth flow", () => {
  it("redirects signed-out users to sign-in", () => {
    const { getByText } = render(
      <SignedOut>
        <Index />
      </SignedOut>,
    );

    expect(getByText("/sign-in")).toBeTruthy();
  });
});

