import { Link } from 'react-router';

export function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Bajkot Admin</h1>
        <p className="text-neutral-500 text-sm mt-1">Book pipeline management</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/admin/batch"
          className="group flex items-start gap-3 p-6 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 text-purple-600">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75l-5.571-3m11.142 0 4.179 2.25L12 17.25l-9.75-5.25 4.179-2.25m11.142 0 4.179 2.25L12 21.75l-9.75-5.25 4.179-2.25"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-700">
              Book Batch
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">
              Process book orders, monitor pipeline status
            </p>
          </div>
        </Link>

        <Link
          to="/admin/config"
          className="group flex items-start gap-3 p-6 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-700">
              Config
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">
              System configuration and settings
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
