interface ImagePlaceholderProps {
  prompt: string;
  model?: string;
}

export function ImagePlaceholder({ prompt, model = 'google-nano-banana' }: ImagePlaceholderProps) {
  return (
    <div className="my-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="mb-1 text-xs font-medium text-gray-500">Image will be generated</p>
        <p className="mb-2 text-[10px] uppercase tracking-wide text-gray-400">Model: {model}</p>
        <p className="max-w-xs text-xs italic text-gray-400">"{prompt}"</p>
      </div>
    </div>
  );
}
