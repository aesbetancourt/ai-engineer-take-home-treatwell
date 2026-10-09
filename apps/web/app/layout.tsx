import Link from 'next/link';
import './globals.css';

export const metadata = { title: 'Venue Backoffice' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <strong>Venue Backoffice</strong>
          <Link href="/">Overview</Link>
          <Link href="/appointments">Appointments</Link>
          <Link href="/customers">Customers</Link>
          <Link href="/treatments">Treatments</Link>
          <Link href="/staff">Staff</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
