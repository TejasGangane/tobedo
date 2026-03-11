import { renderHook, act } from "@testing-library/react-hooks";

import { useOAuth } from "@clerk/expo";
import { useOAuthLogin } from "../features/auth/useOAuthLogin";

jest.mock("@clerk/expo", () => ({
  useOAuth: jest.fn(),
}));

describe("useOAuthLogin", () => {
  it("calls startOAuthFlow and sets active session", async () => {
    const setActive = jest.fn();
    const startOAuthFlow = jest.fn().mockResolvedValue({
      createdSessionId: "session_123",
      setActive,
    });

    (useOAuth as jest.Mock).mockReturnValue({ startOAuthFlow });

    const { result } = renderHook(() => useOAuthLogin());

    await act(async () => {
      await result.current.signInWith("google");
    });

    expect(startOAuthFlow).toHaveBeenCalled();
    expect(setActive).toHaveBeenCalledWith({ session: "session_123" });
  });
});

