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
import { PrivyLoginSession } from "@/components/PrivyLoginSession";
import { useWallet } from "@/hooks/useSolanaWallet";

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
  const openLogin = useCallback(() => setOpen(true), []);
  const closeLogin = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (connected) setOpen(false);
  }, [connected]);

  const value = useMemo(
    () => ({ open, openLogin, closeLogin }),
    [closeLogin, open, openLogin],
  );

  return (
    <LoginContext.Provider value={value}>
      <PrivyLoginSession>
        {children}
        {open ? <LoginModal open={open} onClose={closeLogin} /> : null}
      </PrivyLoginSession>
    </LoginContext.Provider>
  );
}
