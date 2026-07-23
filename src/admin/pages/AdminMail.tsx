import { useState, useRef } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';

// Mirrors backend limit in convex/admin/email.ts.
const MAX_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024;

interface Attachment {
  filename: string;
  contentBase64: string;
  sizeBytes: number;
}

function parseAddresses(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is "data:<mime>;base64,<data>" — strip the prefix.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error(`Nie udało się odczytać ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AdminMail() {
  const sendAction = useAction(api.admin.email.sendAdminEmail);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalAttachmentBytes = attachments.reduce((s, a) => s + a.sizeBytes, 0);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next = [...attachments];
    for (const file of Array.from(files)) {
      if (next.some((a) => a.filename === file.name)) continue;
      const contentBase64 = await readFileAsBase64(file);
      next.push({ filename: file.name, contentBase64, sizeBytes: file.size });
    }
    const total = next.reduce((s, a) => s + a.sizeBytes, 0);
    if (total > MAX_ATTACHMENT_TOTAL_BYTES) {
      toast.error(`Załączniki przekraczają limit ${formatSize(MAX_ATTACHMENT_TOTAL_BYTES)}`);
      return;
    }
    setAttachments(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (filename: string) =>
    setAttachments((prev) => prev.filter((a) => a.filename !== filename));

  const toList = parseAddresses(to);
  const canSend = toList.length > 0 && subject.trim() !== '' && body.trim() !== '' && !sending;

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await sendAction({
        to: toList,
        cc: parseAddresses(cc).length ? parseAddresses(cc) : undefined,
        bcc: parseAddresses(bcc).length ? parseAddresses(bcc) : undefined,
        subject: subject.trim(),
        body,
        attachments: attachments.length
          ? attachments.map(({ filename, contentBase64 }) => ({ filename, contentBase64 }))
          : undefined,
      });
      if (result.ok) {
        toast.success(`Wysłano do: ${toList.join(', ')}`);
        setSubject('');
        setBody('');
        setAttachments([]);
      } else {
        toast.error(`Nie wysłano: ${result.error ?? 'nieznany błąd'}`);
      }
    } catch (err) {
      toast.error(`Błąd wysyłki: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mail</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Wysyłka jako{' '}
          <span className="font-medium">Bajkoterapia &lt;info@bajkoterapia.org&gt;</span> —
          odpowiedzi wracają na info@.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">
            Do <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="adres@example.com, drugi@example.com"
            className={inputClass}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1">CC</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="kopia@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1">BCC</label>
            <input
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="ukryta@example.com"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">
            Temat <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Temat wiadomości"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">
            Treść <span className="text-red-500">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder={'Cześć,\n\n…\n\nPozdrawiamy,\nZespół Bajkoterapii'}
            className={`${inputClass} font-mono resize-y`}
          />
          <p className="text-xs text-neutral-400 mt-1">
            Zwykły tekst — wyślemy go w firmowym szablonie (nagłówek + stopka Bajkoterapii).
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">Załączniki</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => void handleFiles(e.target.files)}
            className="block text-sm text-neutral-500 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-700 hover:file:bg-neutral-200"
          />
          {attachments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {attachments.map((a) => (
                <li
                  key={a.filename}
                  className="flex items-center justify-between rounded-md bg-neutral-50 border border-neutral-200 px-3 py-1.5 text-xs"
                >
                  <span className="truncate">
                    📎 {a.filename}{' '}
                    <span className="text-neutral-400">({formatSize(a.sizeBytes)})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.filename)}
                    className="ml-3 text-neutral-400 hover:text-red-600 font-semibold"
                  >
                    usuń
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-neutral-400 mt-1">
            Łącznie {formatSize(totalAttachmentBytes)} / max{' '}
            {formatSize(MAX_ATTACHMENT_TOTAL_BYTES)}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
          <button
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
          >
            {sending ? 'Wysyłam…' : 'Wyślij'}
          </button>
          {toList.length > 1 && (
            <span className="text-xs text-neutral-400">{toList.length} odbiorców</span>
          )}
        </div>
      </div>
    </div>
  );
}
