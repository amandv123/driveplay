const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleIdentity = {
  oauth2: {
    initTokenClient: (options: {
      client_id: string;
      scope: string;
      callback: (response: GoogleTokenResponse) => void;
      error_callback?: (error: { type?: string }) => void;
    }) => GoogleTokenClient;
  };
};

declare global {
  interface Window {
    google?: {
      accounts: GoogleIdentity;
    };
  }
}

let scriptPromise: Promise<void> | undefined;

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_SCRIPT_URL}"]`,
      );

      const script = existing ?? document.createElement("script");
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (window.google?.accounts?.oauth2) {
          resolve();
        } else {
          reject(new Error("Google sign-in could not initialize."));
        }
      };

      script.onerror = () => {
        scriptPromise = undefined;
        reject(new Error("Could not load Google sign-in."));
      };

      if (!existing) {
        document.head.appendChild(script);
      }
    });
  }

  return scriptPromise;
}

export async function requestGoogleDriveAccessToken(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("Google Client ID is not configured.");
  }

  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_READONLY_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || "Google sign-in failed."));
          return;
        }

        resolve(response.access_token);
      },
      error_callback: () => {
        reject(new Error("Google sign-in was interrupted or blocked."));
      },
    });

    client.requestAccessToken({ prompt: "consent" });
  });
}
