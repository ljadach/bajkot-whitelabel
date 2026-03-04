interface LandingTestimonialProps {
  quote: string;
  author: string;
  role?: string;
}

export function LandingTestimonial({ quote, author, role }: LandingTestimonialProps) {
  return (
    <section className="testimonials-section py-16 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <svg
            className="w-8 h-8 text-neutral-600 mx-auto mb-6 opacity-60"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <blockquote className="text-lg sm:text-xl text-neutral-200 leading-[1.7] mb-8 italic">
            "{quote}"
          </blockquote>
          <div className="text-neutral-400">
            <span className="font-medium text-neutral-300 text-sm tracking-wide uppercase">
              {author}
            </span>
            {role && <span className="block text-sm mt-1.5 opacity-75">{role}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
