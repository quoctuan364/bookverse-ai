let fallbackSequence = 0;

type ClientCrypto = {
  randomUUID?: () => `${string}-${string}-${string}-${string}-${string}`;
  getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
};

/**
 * Tạo ID tạm cho giao diện mà không phụ thuộc vào secure context.
 * `crypto.randomUUID()` có thể không tồn tại khi demo qua HTTP bằng địa chỉ IP.
 */
export function createClientId(
  prefix: string,
  cryptoProvider: ClientCrypto | null | undefined = globalThis.crypto,
): string {
  if (typeof cryptoProvider?.randomUUID === "function") {
    return `${prefix}-${cryptoProvider.randomUUID()}`;
  }

  fallbackSequence = (fallbackSequence + 1) % Number.MAX_SAFE_INTEGER;
  const timePart = Date.now().toString(36);
  const randomValues = new Uint32Array(2);
  if (typeof cryptoProvider?.getRandomValues === "function") {
    cryptoProvider.getRandomValues(randomValues);
  } else {
    // Môi trường rất cũ vẫn có ID duy nhất trong cùng phiên nhờ thời gian + sequence.
    randomValues[0] = fallbackSequence;
    randomValues[1] = Math.floor(
      typeof performance === "undefined" ? 0 : performance.now() * 1_000,
    );
  }
  const randomPart = Array.from(randomValues, (value) => value.toString(36)).join("");
  return `${prefix}-${timePart}-${fallbackSequence.toString(36)}-${randomPart}`;
}
