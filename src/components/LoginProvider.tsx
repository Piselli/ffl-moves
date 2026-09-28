"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useWallet } from "@/hooks/useSolanaWallet";
import {
  clearLoginIntent,
  markLoginIntent,
} from "@/lib/loginIntent";

const LoginModal = dynamic(
  () => import("@/components/LoginModal").then((m) => m.LoginModal),
  { ssr: false },
);

type LoginContextValue = {
  open: boolean;
  openLogin: () => void;
  closeLogin: () => void;
};

const LoginContext = createContext<LoginContextValue>({
  open: false,
  openLogin: () => {},
  closeLogin: () => {},
});

export function useLogin(): LoginContextValue {
  return useContext(LoginContext);
}

export function LoginProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const { connected } = useWallet();

  const openLogin = useCallback(() => {
    markLoginIntent();
    setOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setOpen(false);
    // Dismissed without a session — don't treat a later restore as this login.
    if (!connected) clearLoginIntent();
  }, [connected]);

  useEffect(() => {
    if (connected) setOpen(false);
  }, [connected]);

  const value = useMemo(
    () => ({ open, openLogin, closeLogin }),
    [closeLogin, open, openLogin],
  );

  return (
    <LoginContext.Provider value={value}>
      {children}
      {open ? <LoginModal open={open} onClose={closeLogin} /> : null}
    </LoginContext.Provider>
  );
}
