import { useEffect, useMemo, useRef, useState } from "react";

interface Token {
  char: string;
  jyutping: string | null;
  ipa: string | null;
}

interface TranslateResponse {
  input: string;
  romanization: string;
  tokens: Token[];
}

const EXAMPLES = [
  "香港人講廣東話",
  "早晨，你食咗飯未呀？",
  "多謝晒！",
  "我哋一齊去飲茶啦",
];

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function App() {
  const [text, setText] = useState("香港人講廣東話");
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const debouncedText = useDebounced(text, 350);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!debouncedText.trim()) {
      setResult(null);
      setError(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: debouncedText }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        return res.json() as Promise<TranslateResponse>;
      })
      .then((data) => setResult(data))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setResult(null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedText]);

  const charCount = useMemo(() => [...text].length, [text]);

  async function copyRomanization() {
    if (!result?.romanization) return;
    await navigator.clipboard.writeText(result.romanization);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-800">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            Offline Cantonese engine
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            粵譯 <span className="text-indigo-600">YueTranslation</span>
          </h1>
          <p className="mt-3 text-slate-500">
            Convert Chinese text into Cantonese <strong>Jyutping</strong> romanization and{" "}
            <strong>IPA</strong> pronunciation.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label htmlFor="input" className="mb-2 block text-sm font-medium text-slate-600">
            Chinese text
          </label>
          <textarea
            id="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="輸入中文…"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-lg leading-relaxed outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setText(ex)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
                >
                  {ex}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400">{charCount} chars</span>
          </div>
        </div>

        <div className="mt-6 min-h-[3rem]">
          {loading && <p className="text-sm text-slate-400">Converting…</p>}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && !error && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Jyutping romanization
                  </h2>
                  <button
                    onClick={copyRomanization}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="select-all font-mono text-lg text-slate-800">{result.romanization}</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Character breakdown
                </h2>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
                  {result.tokens.map((t, i) => (
                    <div
                      key={`${t.char}-${i}`}
                      className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50 p-3 text-center"
                    >
                      <span className="text-2xl font-semibold text-slate-900">{t.char}</span>
                      <span className="mt-1 font-mono text-sm text-indigo-600">
                        {t.jyutping ?? "—"}
                      </span>
                      {t.ipa && (
                        <span className="mt-0.5 font-mono text-xs text-slate-400">/{t.ipa}/</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <footer className="mt-12 text-center text-xs text-slate-400">
          Powered by the <code className="rounded bg-slate-100 px-1 py-0.5">to-jyutping</code> engine ·
          runs fully offline
        </footer>
      </div>
    </div>
  );
}
