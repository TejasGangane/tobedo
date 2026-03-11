import { useCallback } from "react";

import { useOAuth } from "@clerk/expo";

type Provider = "google" | "apple";

export function useOAuthLogin() {
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({
    strategy: "oauth_apple",
  });

  const signInWith = useCallback(
    async (provider: Provider) => {
      const start =
        provider === "google" ? startGoogleOAuthFlow : startAppleOAuthFlow;
      const result = await start();

      if (result?.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
      }
    },
    [startAppleOAuthFlow, startGoogleOAuthFlow],
  );

  return {
    signInWith,
  };
}

