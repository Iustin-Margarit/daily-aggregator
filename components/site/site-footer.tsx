import Link from 'next/link';
import { siteConfig } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-16">
      <div className="container">
        <div className="rule-double" />
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Link href="/" className="font-display text-2xl font-black uppercase tracking-tight">
            {siteConfig.masthead}
          </Link>
          <p className="max-w-xl text-sm italic text-muted-foreground">
            Headlines and photographs belong to their publishers. Every story links to the original reporting.
          </p>
          <p className="label text-[0.62rem] text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name} · Printed on the internet, daily
          </p>
        </div>
      </div>
    </footer>
  );
}
