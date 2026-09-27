"use client";

/**
 * ConsentProvider — Context quản lý trạng thái đồng ý nghiên cứu
 *
 * Wrap toàn bộ app. Khi user đồng ý, enableResearchTracking = true.
 * Khi từ chối hoặc chưa trả lời, không ghi tương tác.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ConsentStatus = "pending" | "consented" | "declined" | "loading";

interface ConsentContextValue {
  status: ConsentStatus;
  consentVersion: string;
  enableResearchTracking: boolean;
  setConsent: (consented: boolean) => Promise<void>;
}

const ConsentContext = createContext<ConsentContextValue>({
  status: "loading",
  consentVersion: "v1",
  enableResearchTracking: false,
  setConsent: async () => {},
});

export function useConsent() {
  return useContext(ConsentContext);
}

interface ConsentProviderProps {
  children: React.ReactNode;
}

export function ConsentProvider({ children }: ConsentProviderProps) {
  const [status, setStatus] = useState<ConsentStatus>("loading");
  const [consentVersion, setConsentVersion] = useState("v1");

  // Lấy trạng thái consent từ server khi mount
  useEffect(() => {
    let cancelled = false;

    async function fetchConsent() {
      try {
        const response = await fetch("/api/consent", {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) setStatus("declined");
          return;
        }
        const data = (await response.json()) as {
          consented: boolean | null;
          consentVersion?: string;
          reason?: string;
        };
        if (cancelled) return;

        if (data.reason === "NOT_AUTHENTICATED") {
          // User chưa đăng nhập — không hiển thị banner
          setStatus("declined");
          return;
        }

        if (data.consented === true) {
          setStatus("consented");
        } else if (data.consented === false) {
          setStatus("declined");
        } else {
          setStatus("declined");
        }

        if (data.consentVersion) {
          setConsentVersion(data.consentVersion);
        }
      } catch {
        if (!cancelled) setStatus("declined");
      }
    }

    void fetchConsent();
    return () => {
      cancelled = true;
    };
  }, []);

  const setConsent = useCallback(async (consented: boolean) => {
    setStatus(consented ? "consented" : "declined");
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consented }),
      });
    } catch {
      // Bỏ qua lỗi mạng
    }
  }, []);

  return (
    <ConsentContext.Provider
      value={{
        status,
        consentVersion,
        enableResearchTracking: status === "consented",
        setConsent,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}