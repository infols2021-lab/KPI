import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata = {
  title: "KPI",
  description: "KPI boards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}