import "./globals.css";

export const metadata = {
  title: "Adminterview — AI-automated hiring for admin roles",
  description: "Screen candidates with scenario questions, score them fairly with AI, and get a ranked shortlist.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
