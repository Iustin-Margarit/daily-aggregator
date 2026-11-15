import { EditionName } from '@/components/site/edition-selector';
import { Engraving } from '@/components/site/engraving';
import { Masthead } from '@/components/site/logo';
import { Phrases } from '@/components/ui/phrases';
import { getI18n } from '@/lib/i18n/server';
import { siteConfig } from '@/lib/site';

export async function SiteFooter() {
  const { t, fmt, rich } = await getI18n();
  const { author } = siteConfig;
  return (
    <footer className="mt-16">
      <div className="container">
        <div className="card-ornate flex flex-col items-center gap-3 px-6 py-10 text-center">
          <Engraving name="kitten-curious" className="h-20" label={t.footer.catLabel} />
          {/* One line on the narrowest phones too (the title is about 8.9 times as wide as its font size). */}
          <Masthead className="whitespace-nowrap text-[1.75rem] min-[400px]:text-[2rem]" />
          <p className="text-balance font-display text-[1.02rem] italic text-muted-foreground">
            <Phrases text={t.footer.motto} />
          </p>
          <div className="font-label text-[0.82rem] text-muted-foreground">
            <EditionName />
          </div>
          <div className="ornament my-2 w-56" />
          <p className="max-w-xl text-pretty text-sm text-muted-foreground">{t.footer.credits}</p>
          <p className="font-label text-[0.82rem] text-muted-foreground">
            © {new Date().getFullYear()} <span lang="en">{siteConfig.name}</span> · {t.footer.printed}
          </p>
          {/* The colophon, set small in italic under the imprint, as printers signed their work. */}
          <p className="font-display text-[0.86rem] italic text-muted-foreground/90">
            {rich(t.footer.builtBy, {
              name: (
                <a
                  href={author.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={fmt(t.footer.github, { name: author.name })}
                  className="not-italic font-medium text-foreground/80 underline decoration-(--ink-gold)/60 underline-offset-4 transition-colors hover:text-foreground hover:decoration-(--ink-gold)"
                >
                  {author.name}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
      <div className="h-6" />
    </footer>
  );
}
