"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useLoginWithOAuth } from "@privy-io/react-auth";
import { isPrivyConfigured } from "@/lib/privy";

type PrivyLoginSessionValue = {
  initGoogle: () => Promise<void>;
  googleLoading: boolean;
  oauthError: string | null;
  clearOauthError: () => void;
};

const EMPTY: PrivyLoginSessionValue = {
  initGoogle: async () => {},
  googleLoading: false,
  oauthError: null,
  clearOauthError: () => {},
};

const PrivyLoginSessionContext = createContext<PrivyLoginSessionValue>(EMPTY);

export function usePrivyLoginSession(): PrivyLoginSessionValue {
  return useContext(PrivyLoginSessionContext);
}

function PrivyLoginSessionInner({ children }: PropsWithChildren) {
  const [oauthError, setOauthError] = useState<string | null>(null);
  const { initOAuth, loading, state } = useLoginWithOAuth({
    onComplete: () => setOauthError(null),
    onError: (error) => {
      setOauthError(typeof error === "string" ? error : String(error ?? ""));
    },
  });

  const initGoogle = useCallback(async () => {
    setOauthError(null);
    await initOAuth({ provider: "google" });
  }, [initOAuth]);

  const value = useMemo<PrivyLoginSessionValue>(
    () => ({
      initGoogle,
      googleLoading: loading || state.status === "loading",
      oauthError:
        oauthError ||
        (state.status === "error" ? state.error?.message ?? String(state.error ?? "") : null),
      clearOauthError: () => setOauthError(null),
    }),
    [initGoogle, loading, oauthError, state],
  );

  return (
    <PrivyLoginSessionContext.Provider value={value}>
      {children}
    </PrivyLoginSessionContext.Provider>
  );
}

/** Must stay mounted on the page Google redirects back to, or the OAuth code never completes. */
export function PrivyLoginSession({ children }: PropsWithChildren) {
  if (!isPrivyConfigured()) {
    return (
      <PrivyLoginSessionContext.Provider value={EMPTY}>
        {children}
      </PrivyLoginSessionContext.Provider>
    );
  }
  return <PrivyLoginSessionInner>{children}</PrivyLoginSessionInner>;
}
