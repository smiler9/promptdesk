"use client";

import { useState } from "react";

export default function CopyButton({
  text,
  label = "복사",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 클립보드 API 미지원 환경 fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300"
    >
      {copied ? "✓ 복사됨" : `⧉ ${label}`}
    </button>
  );
}
