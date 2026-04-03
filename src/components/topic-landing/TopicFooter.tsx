export function TopicFooter() {
  return (
    <footer className="bg-white py-10 border-t border-gray-100 text-center">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-calm-900 font-bold">
          <i className="fa-solid fa-book-open text-calm-500" /> Bajkoterapia
        </div>
        <p className="text-sm text-gray-500 font-medium">
          &copy; 2026 Wszelkie prawa zastrzeżone. Projekt oparty na badaniach psychologicznych.
        </p>
        <div className="flex gap-4 text-sm text-gray-400">
          <a href="#" className="hover:text-calm-500 transition">
            Regulamin
          </a>
          <a href="#" className="hover:text-calm-500 transition">
            Prywatność
          </a>
        </div>
      </div>
    </footer>
  );
}
