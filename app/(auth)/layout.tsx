import { BackLink } from '@/components/article/back-link';
import { EditionName, EditionSelector } from '@/components/site/edition-selector';
import { Engraving, type EngravingName } from '@/components/site/engraving';
import { Masthead, MottoRibbon } from '@/components/site/logo';
import { getI18n } from '@/lib/i18n/server';

/** The three benefits beside the forms, with their engravings (words: auth.benefits). */
const BENEFIT_ENGRAVINGS: EngravingName[] = ['world', 'science', 'quill'];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex flex-col items-center pt-2 text-center sm:pt-3">
        {/* Back to reading on the left; the same edition stamp as in the header bar of every other page, in the
            same corner, on the right. The masthead below links to the front page too. */}
        <div className="flex w-full items-center justify-between gap-3">
          <BackLink href="/" className="min-w-0 px-3 text-[0.9rem] sm:px-4 sm:text-[0.95rem]" />
          <EditionSelector />
        </div>
        <Masthead className="text-[2.2rem] sm:text-[3.4rem]" />
        <MottoRibbon />
        <div className="mt-2 font-label text-[0.82rem] text-muted-foreground">
          <EditionName />
        </div>
      </header>

      <main className="container flex flex-1 justify-center py-8 sm:py-10">
        <div className="card-paper grid w-full min-w-0 max-w-5xl grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* The reader of 1897 and what an account gives you. */}
          <aside className="hidden flex-col gap-6 bg-panel/60 p-8 md:flex lg:p-10">
            {/* eslint-disable-next-line @next/next/no-img-element -- a small local picture */}
            <img
              src="/plates/reader.webp"
              alt={t.auth.pictureAlt}
              width={717}
              height={1000}
              className="mx-auto w-full max-w-[17rem] rounded-2xl shadow-lift"
            />
            <ul className="space-y-4">
              {t.auth.benefits.map(({ title, text }, index) => (
                <li key={title} className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[2px] border-[3px] border-double border-rule/30 bg-card shadow-paper">
                    <Engraving name={BENEFIT_ENGRAVINGS[index] ?? 'quill'} className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="font-display text-[1.08rem] font-semibold leading-tight">{title}</p>
                    <p className="text-[0.92rem] leading-snug text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
          <div className="min-w-0 px-5 py-9 min-[400px]:px-6 sm:px-10 lg:px-14">{children}</div>
        </div>
      </main>
    </div>
  );
}
