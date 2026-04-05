"use client";

import { Toaster } from "sonner";
import { SignalGate } from "@/components/signal-gate";
import { AuthProvider } from "@/providers/auth-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <SignalGate>{children}</SignalGate>
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            borderRadius: "2px",
          },
        }}
      />
    </AuthProvider>
  );
}
