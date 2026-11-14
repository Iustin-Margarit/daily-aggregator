import { EditionLanguage } from '@/components/site/almanac';
import { Engraving, type EngravingName } from '@/components/site/engraving';
import { Masthead, MottoRibbon } from '@/components/site/logo';

const BENEFITS: { title: string; text: string; engraving: EngravingName }[] = [
  { engraving: 'world', title: 'Only your sections', text: 'Eight sections from 30+ newspapers. Read the ones you like.' },
  { engraving: 'science', title: 'An edition that learns', text: '“For you” gives more room to the kind of stories you save.' },
  { engraving: 'quill', title: 'Save for later', text: 'Keep stories in folders, with your own notes.' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex flex-col items-center pt-8 text-center">
        <Masthead className="text-[2.2rem] sm:text-[3.4rem]" />
        <MottoRibbon />
        <EditionLanguage className="mt-2 font-label text-[0.82rem] text-muted-foreground" />
      </header>

      <main className="container flex flex-1 justify-center py-8 sm:py-10">
        <div className="card-paper grid w-full max-w-5xl overflow-hidden md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* The reader of 1897 and what an account gives you. */}
          <aside className="hidden flex-col gap-6 bg-panel/60 p-8 md:flex lg:p-10">
            {/* eslint-disable-next-line @next/next/no-img-element -- a small local picture */}
            <img
              src="/plates/reader.webp"
              alt="A woman in a straw hat reading the paper in a green rocking chair (after Edward Penfield, 1897)"
              width={717}
              height={1000}
              className="mx-auto w-full max-w-[17rem] rounded-2xl shadow-lift"
            />
            <ul className="space-y-4">
              {BENEFITS.map(({ title, text, engraving }) => (
                <li key={title} className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[2px] border-[3px] border-double border-rule/30 bg-card shadow-paper">
                    <Engraving name={engraving} className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="font-display text-[1.08rem] font-semibold leading-tight">{title}</p>
                    <p className="text-[0.92rem] leading-snug text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
          <div className="px-6 py-9 sm:px-10 lg:px-14">{children}</div>
        </div>
      </main>
    </div>
  );
}
