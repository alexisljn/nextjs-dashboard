import '@/app/ui/global.css';
import {inter} from '@/app/ui/fonts';
import { Metadata } from 'next';

// Title template will be applied to all pages he handles
export const metadata: Metadata = {
  title: {
    template: '%s | Acme Dashboard',
    default: 'Acme Dashboard',
  },
  description: 'NextJS Learning Course Dashboard',
  metadataBase: new URL('https://next-learn-dashboard.vercel.sh'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
    {/*"antialiased" is a tailwind class that makes the text more readable*/}
      <body
          className={`${inter.className} antialiased`}
      >
      {children}
      </body>
    </html>
  );
}
