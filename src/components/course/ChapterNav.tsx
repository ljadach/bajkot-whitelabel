interface ChapterNavProps {
  chapters: Array<{
    number: number;
    title: string;
  }>;
  selected: number;
  onSelect: (chapter: number) => void;
}

export function ChapterNav({ chapters, selected, onSelect }: ChapterNavProps) {
  return (
    <nav className="sticky top-8 w-56 shrink-0 hidden md:block" aria-label="Chapters">
      <div className="text-2xs font-medium uppercase tracking-wider text-neutral-400 mb-3">Chapters</div>
      <ul className="space-y-1">
        {chapters.map((chapter) => (
          <li key={chapter.number}>
            <button
              onClick={() => onSelect(chapter.number)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-start gap-2.5 ${selected === chapter.number ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'}`}
            >
              <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-medium ${selected === chapter.number ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'}`}>{chapter.number}</span>
              <span className="leading-tight">{chapter.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
