import { EditionSelector } from '@/components/site/edition-selector';
import { Engraving } from '@/components/site/engraving';
import { Masthead } from '@/components/site/logo';
import { getI18n } from '@/lib/i18n/server';
import { siteConfig } from '@/lib/site';

export async function SiteFooter() {
  const { t } = await getI18n();
  return (
    <footer className="mt-16">
      <div className="container">
        <div className="card-ornate flex flex-col items-center gap-3 px-6 py-10 text-center">
          <Engraving name="kitten-curious" className="h-20" label={t.footer.catLabel} />
          {/* One line on the narrowest phones too (the title is about 8.9 times as wide as its font size). */}
          <Masthead className="whitespace-nowrap text-[1.75rem] min-[400px]:text-[2rem]" />
          <p className="text-balance font-display text-[1.02rem] italic text-muted-foreground">{t.footer.motto}</p>
          {/* The language of the paper, reachable from the foot of every page (and on phones, where the header has no room for it). */}
          <div className="font-label text-[0.82rem] text-muted-foreground">
            <EditionSelector align="center" />
          </div>
          <div className="ornament my-2 w-56" />
          <p className="max-w-xl text-pretty text-sm text-muted-foreground">{t.footer.credits}</p>
          <p className="font-label text-[0.82rem] text-muted-foreground">
            © {new Date().getFullYear()} <span lang="en">{siteConfig.name}</span> · {t.footer.printed}
          </p>
        </div>
      </div>
      <div className="h-6" />
    </footer>
  );
}
