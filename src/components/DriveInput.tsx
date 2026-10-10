import { ArrowRight, Link2 } from "lucide-react";
import { useState } from "react";
import { extractDriveFileId } from "../lib/googleDrive";

type DriveInputProps = {
  onSubmit: (fileId: string, url: string) => void;
};

export function DriveInput({ onSubmit }: DriveInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = extractDriveFileId(url);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    onSubmit(result.fileId, url.trim());
  }

  function handleChange(value: string) {
    setUrl(value);

    if (error) {
      setError("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl">
      <div
        className={[
          "group flex items-center gap-3 rounded-2xl border bg-white/[0.045]",
          "px-4 py-3 backdrop-blur-xl transition-all duration-200",
          error
            ? "border-red-400/50"
            : "border-white/10 focus-within:border-white/25 focus-within:bg-white/[0.065]",
        ].join(" ")}
      >
        <Link2 className="h-5 w-5 shrink-0 text-white/35" />

        <input
          type="url"
          value={url}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Paste your Google Drive video link..."
          aria-label="Google Drive video link"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30 sm:text-base"
        />

        <button
          type="submit"
          aria-label="Open video"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 min-h-5 px-1 text-left">
        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : (
          <p className="text-xs text-white/30">
            Use a video you own or have permission to access.
          </p>
        )}
      </div>
    </form>
  );
}
