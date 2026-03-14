import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import React from "react";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(app)/home" />;
  }

  return <Redirect href="/sign-in" />;
}
