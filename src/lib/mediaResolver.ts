export type MediaSource = {
  url: string;
  type?: string;
  provider: "google-drive";
  fileId: string;
};

export type MediaResolveResult =
  | {
      ok: true;
      source: MediaSource;
    }
  | {
      ok: false;
      error: string;
    };
