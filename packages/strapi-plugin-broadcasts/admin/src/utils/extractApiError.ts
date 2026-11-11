interface ApiErrorEnvelope {
  response?: {
    data?: {
      error?: string | { message?: string };
      message?: string;
    };
  };
  message?: string;
}

export function extractApiErrorMessage(
  err: unknown,
  fallbackMessage: string
): string {
  if (err && typeof err === "object") {
    const candidate = err as ApiErrorEnvelope;
    const nestedError = candidate.response?.data?.error;
    if (typeof nestedError === "string" && nestedError.trim()) {
      return nestedError.trim();
    }
    if (
      nestedError &&
      typeof nestedError === "object" &&
      typeof nestedError.message === "string" &&
      nestedError.message.trim()
    ) {
      return nestedError.message.trim();
    }
    const dataMsg = candidate.response?.data?.message;
    if (typeof dataMsg === "string" && dataMsg.trim()) {
      return dataMsg.trim();
    }
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message.trim();
    }
  }
  return fallbackMessage;
}
