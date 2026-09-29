"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Page chrome already shows the document title — drop the leading `# …` from the MD body. */
function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#[^\n]*\n+/, "");
}

const components: Components = {
  a({ href, children }) {
    const url = href ?? "";
    const internal = url.startsWith("/") && !url.startsWith("//");
    if (internal) {
      return (
        <Link href={url} className="text-[#00f948]/90 underline-offset-2 hover:underline">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#00f948]/90 underline-offset-2 hover:underline"
      >
        {children}
      </a>
    );
  },
  h1({ children }) {
    return (
      <h2 className="mt-8 border-t border-white/[0.06] pt-5 font-display text-[13px] font-black uppercase tracking-[0.08em] text-white/80 first:mt-0 first:border-t-0 first:pt-0 sm:text-sm">
        {children}
      </h2>
    );
  },
  h2({ children }) {
    return (
      <h2 className="mt-8 border-t border-white/[0.06] pt-5 font-display text-[13px] font-black uppercase tracking-[0.08em] text-white/80 first:mt-0 first:border-t-0 first:pt-0 sm:text-sm">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="mt-5 text-[13px] font-bold uppercase tracking-[0.06em] text-white/70">
        {children}
      </h3>
    );
  },
  p({ children }) {
    return <p className="mt-3 text-[14px] leading-relaxed text-white/55 first:mt-0">{children}</p>;
  },
  ul({ children }) {
    return (
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] text-white/55 marker:text-white/30">
        {children}
      </ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px] text-white/55 marker:text-white/35">
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="leading-relaxed pl-0.5">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] leading-relaxed text-white/45 first:mt-0 [&_p]:mt-0">
        {children}
      </blockquote>
    );
  },
  strong({ children }) {
    return <strong className="font-semibold text-white/75">{children}</strong>;
  },
  table({ children }) {
    return (
      <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="min-w-full text-left text-[13px] text-white/55">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-white/[0.04] text-white/70">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="px-3 py-2.5 font-display text-[11px] font-black uppercase tracking-[0.06em]">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border-t border-white/[0.06] px-3 py-2.5 align-top">{children}</td>;
  },
  hr() {
    return <hr className="my-6 border-white/[0.06]" />;
  },
};

export function LegalMarkdown({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
  /** @deprecated Title is always shown by the page chrome. */
  skipFirstH1?: boolean;
}) {
  return (
    <div className={cn("legal-prose", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {stripLeadingH1(markdown)}
      </ReactMarkdown>
    </div>
  );
}
