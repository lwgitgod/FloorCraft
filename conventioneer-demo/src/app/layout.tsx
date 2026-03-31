import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conventioneer - Floor Plan Editor",
  description: "Convention floor plan management tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
