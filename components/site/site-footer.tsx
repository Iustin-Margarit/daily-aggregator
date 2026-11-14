import { Engraving } from '@/components/site/engraving';
import { Masthead } from '@/components/site/logo';
import { siteConfig } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-16">
      <div className="container">
        <div className="card-ornate flex flex-col items-center gap-3 px-6 py-10 text-center">
          <Engraving name="kitten-curious" className="h-20" label="A small black cat, looking up" />
          <Masthead className="text-[2rem]" />
          <p className="font-display text-[1.02rem] italic text-muted-foreground">Read the world · Keep what matters · Read it your way</p>
          <div className="ornament my-2 w-56" />
          <p className="max-w-xl text-sm text-muted-foreground">
            Headlines and photographs belong to their publishers; every story links to the original reporting. Pictures by Edward
            Penfield, Théophile Steinlen, Auguste Edouart and Wenceslaus Hollar, from the public domain.
          </p>
          <p className="font-label text-[0.82rem] text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name} · Printed on the internet, daily
          </p>
        </div>
      </div>
      <div className="h-6" />
    </footer>
  );
}
