"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AccessGatewayPanel } from "@/components/access-gateway-panel";
import { useAuth } from "@/providers/auth-provider";

type SignalGateProps = {
  children: React.ReactNode;
};

const introLines = [
  "Initialisation…",
  "Vérification…",
  "Ouverture de session…",
] as const;

const storageKey = "nest.signal-gate.seen";

export function SignalGate({ children }: SignalGateProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<"hidden" | "intro" | "access">("hidden");
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (pathname !== "/") {
        setReady(true);
        setPhase("hidden");
        return;
      }

      const seen = window.sessionStorage.getItem(storageKey) === "1";
      setReady(true);
      setPhase(seen ? "hidden" : "intro");
      setLineIndex(0);
      setCharIndex(0);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  useEffect(() => {
    if (phase !== "intro") {
      return;
    }

    const currentLine = introLines[lineIndex];

    if (!currentLine) {
      const timeout = window.setTimeout(() => {
        setPhase(user ? "hidden" : "access");
      }, 420);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    const timeout = window.setTimeout(() => {
      if (charIndex < currentLine.length) {
        setCharIndex((current) => current + 1);
        return;
      }

      setLineIndex((current) => current + 1);
      setCharIndex(0);
    }, charIndex < currentLine.length ? 28 : 280);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [charIndex, lineIndex, phase, user]);

  function dismissGate() {
    window.sessionStorage.setItem(storageKey, "1");
    setPhase("hidden");
  }

  return (
    <>
      {children}

      {ready && phase === "intro" ? (
        <div className="forum-gate-overlay" aria-hidden="true">
          <div className="forum-gate-terminal">
            {introLines.slice(0, lineIndex).map((line) => (
              <p key={line}>{line}</p>
            ))}
            {introLines[lineIndex] ? (
              <p>
                {introLines[lineIndex].slice(0, charIndex)}
                <span className="forum-caret" />
              </p>
            ) : null}
            <div className="forum-gate-progress">
              <span
                style={{
                  width: `${Math.min(
                    100,
                    ((lineIndex + charIndex / 24) / introLines.length) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {ready && phase === "access" ? (
        <div className="forum-gate-overlay">
          <div className="forum-gate-access">
            <AccessGatewayPanel
              targetAfterAuth="/"
              showObserveAction
              onAuthenticated={dismissGate}
              onObservePublic={dismissGate}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
