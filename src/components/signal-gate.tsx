"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AccessGatewayPanel } from "@/components/access-gateway-panel";
import { useAuth } from "@/providers/auth-provider";

type SignalGateProps = {
  children: React.ReactNode;
};

const introLines = [
  "Signal noir détecté",
  "Relais sécurisé en ligne",
  "Ouverture du sas NEST",
] as const;

const storageKey = "nest.signal-gate.seen";

export function SignalGate({ children }: SignalGateProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<"hidden" | "intro" | "access">("hidden");
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const gateActive = ready && pathname === "/" && phase !== "hidden";
  const totalCharacters = introLines.reduce((sum, line) => sum + line.length, 0);
  const completedCharacters =
    introLines
      .slice(0, lineIndex)
      .reduce((sum, line) => sum + line.length, 0) + charIndex;
  const progress = Math.min(
    100,
    totalCharacters > 0 ? (completedCharacters / totalCharacters) * 100 : 0,
  );

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
      }, 520);

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
    }, charIndex < currentLine.length ? 34 : 320);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [charIndex, lineIndex, phase, user]);

  useEffect(() => {
    document.body.dataset.gateActive = gateActive ? "true" : "false";

    return () => {
      delete document.body.dataset.gateActive;
    };
  }, [gateActive]);

  function dismissGate() {
    window.sessionStorage.setItem(storageKey, "1");
    setPhase("hidden");
  }

  return (
    <>
      {children}

      {ready && phase === "intro" ? (
        <div className="forum-gate-overlay" aria-hidden="true">
          <div className="forum-gate-curtain forum-gate-curtain-top" />
          <div className="forum-gate-curtain forum-gate-curtain-bottom" />

          <div className="forum-gate-terminal forum-gate-terminal-cinematic">
            <div className="forum-gate-brand">
              <div className="forum-gate-brandmark">
                <Image
                  src="/image.png"
                  alt=""
                  width={585}
                  height={427}
                  priority
                  className="forum-gate-brand-image"
                />
              </div>

              <div className="forum-gate-brandcopy">
                <span className="forum-inline-note">NEST // accès privé</span>
                <h1 className="forum-title forum-gate-title">Sas d&apos;entrée</h1>
              </div>
            </div>

            <div className="forum-gate-lines">
              {introLines.slice(0, lineIndex).map((line) => (
                <p key={line}>{line}</p>
              ))}

              {introLines[lineIndex] ? (
                <p>
                  {introLines[lineIndex].slice(0, charIndex)}
                  <span className="forum-caret" />
                </p>
              ) : null}
            </div>

            <div className="forum-gate-progress-shell">
              <div className="forum-gate-progress">
                <span style={{ width: `${progress}%` }} />
              </div>

              <div className="forum-gate-meter">
                {introLines.map((line, index) => {
                  const active =
                    index < lineIndex ||
                    (index === lineIndex && charIndex > 0) ||
                    (!introLines[lineIndex] && index === introLines.length - 1);

                  return (
                    <span
                      key={line}
                      className={
                        active
                          ? "forum-gate-meter-segment forum-gate-meter-segment-active"
                          : "forum-gate-meter-segment"
                      }
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {ready && phase === "access" ? (
        <div className="forum-gate-overlay forum-gate-overlay-access">
          <div className="forum-gate-curtain forum-gate-curtain-top" />
          <div className="forum-gate-curtain forum-gate-curtain-bottom" />

          <div className="forum-gate-access-shell">
            <div className="forum-gate-access-brand">
              <div className="forum-gate-access-mark">
                <Image
                  src="/image.png"
                  alt=""
                  width={585}
                  height={427}
                  priority
                  className="forum-gate-brand-image"
                />
              </div>
              <span className="forum-inline-note">NEST // accès</span>
            </div>

            <div className="forum-gate-access">
              <AccessGatewayPanel
                targetAfterAuth="/"
                showObserveAction
                onAuthenticated={dismissGate}
                onObservePublic={dismissGate}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
