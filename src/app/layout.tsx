import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ActionDialogProvider } from "@/components/ui/action-dialog";

export const metadata: Metadata = {
  title: "Nexus AI",
  description: "Nexus AI platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface text-on-surface">
        <ToastProvider>
          <ActionDialogProvider>
            <AuthProvider>{children}</AuthProvider>
          </ActionDialogProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
