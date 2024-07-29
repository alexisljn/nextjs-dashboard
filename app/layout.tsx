import '@/app/ui/global.css';
import {inter} from '@/app/ui/fonts';

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
