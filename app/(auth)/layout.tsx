import Link from 'next/link';
import { editionLabel, siteConfig } from '@/lib/site';

const BENEFITS = [
  { title: 'Only your sections', text: 'World, politics, business, technology, science, health, sports and entertainment, from 30+ publishers.' },
  { title: 'An edition that learns', text: 'The “For you” edition gives more room to the sections and papers you like and save.' },
  { title: 'Save stories for later', text: 'Keep the stories you want to read again, in folders if you like, with your own notes.' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container">
        <div className="flex items-center justify-between border-b border-rule py-2">
          <span className="label text-[0.62rem] text-muted-foreground">{editionLabel()}</span>
          <span className="label text-[0.62rem] text-muted-foreground">Free to read</span>
        </div>
        <div className="py-6 text-center">
          <Link href="/" className="font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-6xl">
            {siteConfig.masthead}
          </Link>
          <p className="mt-2 text-sm italic text-muted-foreground">“{siteConfig.motto}”</p>
        </div>
        <div className="rule-double" />
      </header>

      <main className="container flex flex-1 justify-center py-10">
        <div className="paper-box h-fit w-full max-w-md px-6 py-8 sm:px-8">{children}</div>
      </main>

      <section className="container pb-12">
        <div className="rule-thick" />
        <div className="grid gap-6 pt-5 md:grid-cols-3 md:gap-0">
          {BENEFITS.map(({ title, text }, index) => (
            <div key={title} className={index > 0 ? 'md:border-l md:border-border md:pl-6' : 'md:pr-6'}>
              <p className="kicker">No. {index + 1}</p>
              <h2 className="headline mt-1 text-xl">{title}</h2>
              <p className="news-text mt-1.5 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
