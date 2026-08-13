import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "3DC Multiservice",
  description: "Gestionale locale per entrate e uscite aziendali"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <head><link rel="icon" href="https://img.icons8.com/external-kiranshastry-gradient-kiranshastry/64/external-finance-business-and-management-kiranshastry-gradient-kiranshastry.png" /></head>
      <body>{children}</body>
    </html>
  );
}
