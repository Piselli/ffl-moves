"use client";

import {
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LOGIN_THEME,
  type LoginSkinTheme,
} from "@/components/loginSkins";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { useHeliusAuth } from "@/components/HeliusAppProvider";
import { useLogin } from "@/components/LoginProvider";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { isLocalDevHost } from "@/lib/helius";
import { solanaWalletDef } from "@/lib/solanaWallets";
import type { WalletConnectRow } from "@/lib/solanaWallets";
import {
  isInAppBrowser,
  isMobileBrowser,
  preferredSystemBrowserName,
} from "@/lib/solanaWallets";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

const plaqueEase = [0.23, 1, 0.32, 1] as const;

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
  const href = row.installUrl;
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

function OrDivider({ theme, label }: { theme: LoginSkinTheme; label: string }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className={theme.orLineClass} />
      <span className={theme.orTextClass}>{label}</span>
      <span className={theme.orLineClass} />
    </div>
  );
}

function HeliusAuthFields({ theme }: { theme: LoginSkinTheme }) {
  const m = useSiteMessages();
  const helius = useHeliusAuth();
  const { closeLogin, openLogin } = useLogin();
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onEmail = async () => {
    setHint(null);
    if (!helius.ready) {
      setHint(
        isLocalDevHost() ? m.nav.emailLoginNeedsAppIdLocal : m.nav.emailLoginNeedsAppId,
      );
      return;
    }
    setLoading(true);
    // Helius/Turnkey always opens its own OTP modal — close ours so they
    // don't stack (their sheet sat under z-[200] with a broken empty logo).
    closeLogin();
    try {
      await helius.login();
    } catch (error) {
      openLogin();
      setHint(error instanceof Error ? error.message : m.nav.connectHintFailed);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        disabled={loading || !helius.ready}
        onClick={() => void onEmail()}
        className={theme.googleClass}
        style={theme.googleStyle}
      >
        {loading ? m.nav.emailContinue : m.nav.continueWithEmail}
      </button>
      {hint ? (
        <p className="text-center text-[16px] leading-snug text-amber-200/85">{hint}</p>
      ) : null}
    </div>
  );
}

function InAppBrowserBanner() {
  const m = useSiteMessages();
  const [copied, setCopied] = useState(false);
  const browser = preferredSystemBrowserName();
  const title =
    browser === "browser"
      ? m.nav.inAppBrowserTitleGeneric
      : m.nav.inAppBrowserTitle(browser);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-dashed border-[#00f948]/35 bg-[#00f948]/[0.06] px-3.5 py-3 text-center">
      <p className="font-display text-[13px] font-bold uppercase tracking-wide text-[#00f948]">
        {title}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-white/65">
        {m.nav.inAppBrowserBody}
      </p>
      <button
        type="button"
        onClick={() => void onCopy()}
        className="mt-2.5 text-[13px] font-semibold text-white/85 underline-offset-2 hover:underline"
      >
        {copied ? m.nav.inAppBrowserCopied : m.nav.inAppBrowserCopyLink}
      </button>
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
  const [inApp, setInApp] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [walletsOpen, setWalletsOpen] = useState(false);

  useEffect(() => {
    setInApp(isInAppBrowser());
    setMobile(isMobileBrowser());
  }, []);

  const demoteWallets = mobile || inApp;

  const walletLogos = (
    <div className="flex items-center justify-center gap-9">
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
  );

  return (
    <>
      <div className="mb-9 flex flex-col items-center pt-1">
        <h2 id={titleId} className={theme.titleClass}>
          {m.nav.loginWelcome}
        </h2>
      </div>

      {inApp ? <InAppBrowserBanner /> : null}

      <HeliusAuthFields theme={theme} />

      <div className="mt-6">
        <OrDivider theme={theme} label={m.nav.loginOr} />
      </div>

      {demoteWallets ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setWalletsOpen((v) => !v)}
            className="mx-auto block text-center text-[14px] text-white/40 transition-colors hover:text-white/65"
          >
            {m.nav.walletMoreToggle}
            <span className="ml-1 opacity-60" aria-hidden>
              {walletsOpen ? "▴" : "▾"}
            </span>
          </button>
          {walletsOpen ? <div className="mt-5">{walletLogos}</div> : null}
        </div>
      ) : (
        <div className="mt-6">{walletLogos}</div>
      )}

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

      <p className={cn("mt-8 text-center", theme.footerClass)}>
        <Link href="/faq" className="transition-colors hover:text-white">
          {m.nav.loginTerms}
        </Link>
        <span className="mx-1.5 opacity-50">•</span>
        <Link href="/faq" className="transition-colors hover:text-white">
          {m.nav.loginPrivacy}
        </Link>
      </p>
    </>
  );
}

export function LoginModal({ open, onClose }: Props) {
  const m = useSiteMessages();
  const titleId = useId();
  const reduce = Boolean(useReducedMotion());
  const { walletRows, connectWallet, pending, hint, statusLine, lastError } =
    useWalletConnect();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const theme = LOGIN_THEME;

  useEffect(() => {
    setPortalRoot(document.body);
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

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[200] flex min-h-[100dvh] items-center justify-center p-4 sm:p-6">
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
          >
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
            <button
              type="button"
              onClick={onClose}
              className={theme.closeClass}
              aria-label={m.nav.menuClose}
            >
              <CloseIcon />
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
