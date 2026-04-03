export function TopicNav() {
  return (
    <nav className="w-full py-4 px-6 fixed top-0 bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <a href="/" className="flex items-center gap-2">
          <i className="fa-solid fa-book-open text-calm-500 text-2xl" />
          <span className="font-extrabold text-xl text-calm-900 tracking-tight">Bajkoterapia</span>
        </a>
        <a
          href="#kreator"
          className="bg-magic-500 hover:bg-magic-600 text-white px-5 py-2 rounded-full font-bold transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm md:text-base"
        >
          Stwórz Bajkę
        </a>
      </div>
    </nav>
  );
}
