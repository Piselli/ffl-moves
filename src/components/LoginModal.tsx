"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useLoginWithEmail } from "@privy-io/react-auth";
import { usePrivyAuth } from "@/components/PrivyAppProvider";
import { usePrivyLoginSession } from "@/components/PrivyLoginSession";
import {
  LOGIN_SKINS,
  LOGIN_SKIN_THEMES,
  loadLoginSkin,
  saveLoginSkin,
  type LoginSkin,
  type LoginSkinTheme,
} from "@/components/loginSkins";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { isPrivyConfigured } from "@/lib/privy";
import { isMobileBrowser, solanaWalletDef } from "@/lib/solanaWallets";
import type { WalletConnectRow } from "@/lib/solanaWallets";
import { SPRING_PILL } from "@/lib/uiMotion";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

const plaqueEase = [0.23, 1, 0.32, 1] as const;

function GoogleMark({ mono = false }: { mono?: boolean }) {
  const fill = (color: string) => (mono ? "currentColor" : color);
  return (
    <svg className="h-[27px] w-[27px]" viewBox="0 0 24 24" aria-hidden>
      <path
        fill={fill("#4285F4")}
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46c-.28 1.5-1.12 2.77-2.39 3.63v3.02h3.87c2.26-2.08 3.55-5.14 3.55-8.68z"
      />
      <path
        fill={fill("#34A853")}
        d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.87-3.02c-1.08.72-2.45 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.96H1.27v3.12C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill={fill("#FBBC05")}
        d="M5.25 14.25A7.2 7.2 0 0 1 4.88 12c0-.78.13-1.54.37-2.25V6.63H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37l3.98-3.12z"
      />
      <path
        fill={fill("#EA4335")}
        d="M12 4.75c1.76 0 3.34.6 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.63l3.98 3.12C6.2 6.87 8.86 4.75 12 4.75z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h12.5M13 6.5 19.5 12 13 17.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrDivider({ theme, label }: { theme: LoginSkinTheme; label: string }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className={theme.orLineClass} />
      <span className={theme.orTextClass}>{label}</span>
      <span className={theme.orLineClass} />
    </div>
  );
}

function WalletLogo({
  row,
  pending,
  delay,
  reduce,
  onConnect,
}: {
  row: WalletConnectRow;
  pending: boolean;
  delay: number;
  reduce: boolean;
  onConnect: (name: string) => void;
}) {
  const def = solanaWalletDef(row.walletId);
  const missing = row.mode === "extension-missing";
  const href = isMobileBrowser() ? def.downloadUrl : def.chromeExtensionUrl;
  const icon =
    row.walletId === "jupiter"
      ? def.fallbackIcon
      : row.icon || def.fallbackIcon;
  const className = cn(
    "grid place-items-center bg-transparent transition-[transform,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
    "hover:scale-[1.06] hover:brightness-110 active:scale-[0.96]",
    "disabled:opacity-50",
    missing && "opacity-80",
  );
  const inner = icon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt=""
      className={cn(
        "h-16 w-16 rounded-[14px]",
        row.walletId === "jupiter" ? "object-cover" : "object-contain",
      )}
    />
  ) : (
    <span className="text-[15px] font-bold text-white/70">
      {row.displayName.slice(0, 1)}
    </span>
  );

  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 8, scale: 0.94 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { delay, duration: 0.28, ease: plaqueEase },
      };

  if (missing) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={row.displayName}
        aria-label={row.displayName}
        className={className}
        {...motionProps}
      >
        {inner}
      </motion.a>
    );
  }

  return (
    <motion.button
      type="button"
      title={row.displayName}
      aria-label={row.displayName}
      disabled={pending}
      onClick={() => onConnect(row.name)}
      className={className}
      {...motionProps}
    >
      {inner}
    </motion.button>
  );
}

function privyLoginHint(error: unknown, fallback: string, googleOff: string): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (/not allowed/i.test(raw) || /oauth.*disabled/i.test(raw)) return googleOff;
  return raw || fallback;
}

function ContinueControl({
  theme,
  disabled,
  label,
  type = "submit",
  onClick,
}: {
  theme: LoginSkinTheme;
  disabled: boolean;
  label: string;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={theme.continueClass}
      style={theme.continueStyle}
      aria-label={label}
    >
      {theme.continueKind === "arrow" ? <ArrowIcon /> : label}
    </button>
  );
}

function PrivyAuthFields({ theme }: { theme: LoginSkinTheme }) {
  const m = useSiteMessages();
  const privy = usePrivyAuth();
  const { initGoogle, googleLoading, oauthError, clearOauthError } =
    usePrivyLoginSession();
  const { sendCode, loginWithCode, state: emailState } = useLoginWithEmail();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [hint, setHint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const submittedCode = useRef("");
  const emailOk = email.trim().includes("@");
  const emailBusy =
    sending ||
    emailState.status === "sending-code" ||
    emailState.status === "submitting-code";
  const displayHint =
    hint ??
    (oauthError
      ? privyLoginHint(oauthError, m.nav.connectHintFailed, m.nav.googleLoginNotEnabled)
      : null);
  const reduce = Boolean(useReducedMotion());
  const stepMotion = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 8, filter: "blur(2px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -6, filter: "blur(2px)" },
        transition: { duration: 0.18, ease: plaqueEase },
      };

  useEffect(() => {
    if (step !== "code" || code.length !== 6 || submittedCode.current === code)
      return;
    submittedCode.current = code;
    void (async () => {
      setHint(null);
      setSending(true);
      try {
        await loginWithCode({ code });
      } catch (error) {
        submittedCode.current = "";
        setHint(error instanceof Error ? error.message : m.nav.connectHintFailed);
      } finally {
        setSending(false);
      }
    })();
  }, [code, loginWithCode, m.nav.connectHintFailed, step]);

  const onGoogle = async () => {
    setHint(null);
    clearOauthError();
    if (!privy.ready) return;
    try {
      await initGoogle();
    } catch (error) {
      setHint(
        privyLoginHint(error, m.nav.connectHintFailed, m.nav.googleLoginNotEnabled),
      );
    }
  };

  const onSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setHint(null);
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setHint(m.nav.emailInvalid);
      return;
    }
    setSending(true);
    try {
      await sendCode({ email: trimmed });
      setStep("code");
    } catch (error) {
      setHint(error instanceof Error ? error.message : m.nav.connectHintFailed);
    } finally {
      setSending(false);
    }
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    setHint(null);
    setSending(true);
    try {
      await loginWithCode({ code: code.trim() });
    } catch (error) {
      setHint(error instanceof Error ? error.message : m.nav.connectHintFailed);
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === "code" ? (
      <motion.form
        key="code"
        onSubmit={onVerify}
        className="flex flex-col gap-4"
        {...stepMotion}
      >
        <p className="text-center text-[20px] leading-snug text-white/50">
          {m.nav.codeSentTo(email.trim())}
        </p>
        <div className="relative">
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder={m.nav.enterCode}
            className={theme.inputClass}
          />
          <ContinueControl
            theme={theme}
            disabled={emailBusy || code.length < 4}
            label={m.nav.emailContinue}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setStep("form");
            setCode("");
            setHint(null);
          }}
          className="text-[18px] text-white/40 transition-colors duration-150 hover:text-white/70"
        >
          {m.nav.emailBack}
        </button>
        {hint ? (
          <p className="text-center text-[16px] leading-snug text-amber-200/85">
            {hint}
          </p>
        ) : null}
      </motion.form>
      ) : (
    <motion.div key="form" className="flex flex-col gap-4" {...stepMotion}>
      <button
        type="button"
        disabled={googleLoading || !privy.ready}
        onClick={() => void onGoogle()}
        className={theme.googleClass}
        style={theme.googleStyle}
      >
        <GoogleMark mono={theme.googleMono} />
        {m.nav.continueWithGoogle}
      </button>
      {theme.polyLayout ? <OrDivider theme={theme} label={m.nav.loginOr} /> : null}
      <form onSubmit={onSendCode} className="relative">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={
            theme.polyLayout ? m.nav.emailPlaceholderLong : m.nav.emailPlaceholder
          }
          className={theme.inputClass}
        />
        <ContinueControl
          theme={theme}
          disabled={emailBusy || (theme.continueKind === "text" && !emailOk)}
          label={m.nav.emailContinue}
        />
      </form>
      {displayHint ? (
        <p className="text-center text-[16px] leading-snug text-amber-200/85">
          {displayHint}
        </p>
      ) : null}
    </motion.div>
      )}
    </AnimatePresence>
  );
}

function FallbackAuthFields({ theme }: { theme: LoginSkinTheme }) {
  const m = useSiteMessages();
  const [hint, setHint] = useState(false);
  const show = () => setHint(true);
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={show}
        className={theme.googleClass}
        style={theme.googleStyle}
      >
        <GoogleMark mono={theme.googleMono} />
        {m.nav.continueWithGoogle}
      </button>
      {theme.polyLayout ? <OrDivider theme={theme} label={m.nav.loginOr} /> : null}
      <div className="relative">
        <input
          type="email"
          readOnly
          onFocus={show}
          placeholder={
            theme.polyLayout ? m.nav.emailPlaceholderLong : m.nav.emailPlaceholder
          }
          className={theme.inputClass}
        />
        <ContinueControl
          theme={theme}
          disabled={theme.continueKind === "text"}
          label={m.nav.emailContinue}
          type="button"
          onClick={show}
        />
      </div>
      {hint ? (
        <p className="text-center text-[16px] leading-snug text-amber-200/85">
          {m.nav.emailLoginNeedsAppId}
        </p>
      ) : null}
    </div>
  );
}

function LoginPlaqueBody({
  theme,
  titleId,
  walletRows,
  pending,
  reduce,
  connectWallet,
  hint,
  statusLine,
  lastError,
}: {
  theme: LoginSkinTheme;
  titleId: string;
  walletRows: WalletConnectRow[];
  pending: boolean;
  reduce: boolean;
  connectWallet: (name: string) => void;
  hint: string | null;
  statusLine: string | null;
  lastError: string | null;
}) {
  const m = useSiteMessages();
  return (
    <>
      <div
        className={cn(
          "flex flex-col items-center",
          theme.polyLayout ? "mb-9 pt-1" : "mb-8 pt-1",
        )}
      >
        <h2 id={titleId} className={theme.titleClass}>
          {theme.polyLayout ? m.nav.loginWelcome : m.nav.loginTitle}
        </h2>
      </div>

      {isPrivyConfigured() ? (
        <PrivyAuthFields theme={theme} />
      ) : (
        <FallbackAuthFields theme={theme} />
      )}

      <div className="mt-8 flex items-center justify-center gap-9">
        {walletRows.map((row, i) => (
          <WalletLogo
            key={row.walletId}
            row={row}
            pending={pending}
            delay={reduce ? 0 : 0.12 + i * 0.045}
            reduce={reduce}
            onConnect={connectWallet}
          />
        ))}
      </div>

      {hint || lastError || statusLine ? (
        <p
          className={
            hint || lastError
              ? "mt-4 text-center text-[16px] leading-snug text-amber-200/85"
              : "mt-4 text-center text-[16px] leading-snug text-white/50"
          }
        >
          {hint || lastError || statusLine}
        </p>
      ) : null}

      {theme.polyLayout ? (
        <p className={cn("mt-8 text-center", theme.footerClass)}>
          <Link href="/faq" className="transition-colors hover:text-white">
            {m.nav.loginTerms}
          </Link>
          <span className="mx-1.5 opacity-50">•</span>
          <Link href="/faq" className="transition-colors hover:text-white">
            {m.nav.loginPrivacy}
          </Link>
        </p>
      ) : null}
    </>
  );
}

function SkinPicker({
  skin,
  onChange,
}: {
  skin: LoginSkin;
  onChange: (id: LoginSkin) => void;
}) {
  const m = useSiteMessages();
  const reduce = Boolean(useReducedMotion());
  const labels: Record<LoginSkin, string> = {
    current: m.nav.loginSkinCurrent,
    crystal: m.nav.loginSkinIpad,
    locker: m.nav.loginSkinLocker,
  };

  return (
    <LayoutGroup id="login-skin">
    <div
      role="radiogroup"
      aria-label={m.nav.loginSkinLabel}
      className="relative z-10 flex items-center gap-1 rounded-full border border-white/12 bg-black/50 p-1 backdrop-blur-xl"
    >
      {LOGIN_SKINS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={skin === id}
          onClick={() => onChange(id)}
          className={cn(
            "relative rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
            skin === id ? "text-black" : "text-white/55 hover:text-white",
          )}
        >
          {skin === id ? (
            <motion.span
              layoutId="login-skin-pill"
              className="absolute inset-0 rounded-full bg-white"
              transition={reduce ? { duration: 0 } : SPRING_PILL}
            />
          ) : null}
          <span className="relative z-10">{labels[id]}</span>
        </button>
      ))}
    </div>
    </LayoutGroup>
  );
}

export function LoginModal({ open, onClose }: Props) {
  const m = useSiteMessages();
  const titleId = useId();
  const reduce = Boolean(useReducedMotion());
  const { walletRows, connectWallet, pending, hint, statusLine, lastError } =
    useWalletConnect();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [skin, setSkin] = useState<LoginSkin>("current");
  const theme = LOGIN_SKIN_THEMES[skin];

  useEffect(() => {
    setPortalRoot(document.body);
    setSkin(loadLoginSkin());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onPickSkin = (id: LoginSkin) => {
    setSkin(id);
    saveLoginSkin(id);
  };

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[200] flex min-h-[100dvh] items-center justify-center p-4 pb-20 sm:p-6">
          <motion.button
            type="button"
            aria-label={m.nav.menuClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.12 : 0.22 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, filter: "blur(10px)" }
            }
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, filter: "blur(10px)" }
            }
            transition={
              reduce
                ? { duration: 0.14 }
                : { type: "spring", duration: 0.42, bounce: 0 }
            }
            className={theme.plaqueClass}
            style={theme.glass ? undefined : theme.plaqueStyle}
          >
            {theme.glass ? (
              <GlassPanel crystal className="w-full !rounded-2xl p-8 sm:p-9">
                <LoginPlaqueBody
                  theme={theme}
                  titleId={titleId}
                  walletRows={walletRows}
                  pending={pending}
                  reduce={reduce}
                  connectWallet={connectWallet}
                  hint={hint}
                  statusLine={statusLine}
                  lastError={lastError}
                />
              </GlassPanel>
            ) : (
              <LoginPlaqueBody
                theme={theme}
                titleId={titleId}
                walletRows={walletRows}
                pending={pending}
                reduce={reduce}
                connectWallet={connectWallet}
                hint={hint}
                statusLine={statusLine}
                lastError={lastError}
              />
            )}
            <button
              type="button"
              onClick={onClose}
              className={theme.closeClass}
              aria-label={m.nav.menuClose}
            >
              <CloseIcon />
            </button>
          </motion.div>

          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 sm:bottom-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: reduce ? 0.12 : 0.22, ease: plaqueEase }}
          >
            <div className="pointer-events-auto">
              <SkinPicker skin={skin} onChange={onPickSkin} />
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
