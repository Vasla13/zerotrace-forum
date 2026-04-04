"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/providers/auth-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            borderRadius: "18px",
          },
        }}
      />
    </AuthProvider>
  );
}
