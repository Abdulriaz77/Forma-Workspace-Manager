import './globals.css';
export const metadata = {
  title: 'Forma — Workspace Manager',
  description: 'A calmer place for your team’s work.',
  icons: {
    icon: '/favicon.svg',
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
