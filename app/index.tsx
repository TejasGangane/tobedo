import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";

const ONBOARDED_KEY = "tobedo.onboarded.v1";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (cancelled) return;
        setHasOnboarded(stored === "1");
      } catch {
        if (cancelled) return;
        setHasOnboarded(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return hasOnboarded ? (
    <Redirect href="/(app)/home" />
  ) : (
    <Redirect href="/onboarding" />
  );
}
