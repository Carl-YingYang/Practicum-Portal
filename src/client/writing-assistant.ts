import {
  sampleWritingSuggestion,
  type WritingRequest,
} from "@/domain/writing-assistant";
/** Replace this adapter with an authenticated Practo endpoint for live AI later. */
export async function requestWritingDemo(
  request: WritingRequest,
  signal: AbortSignal,
  simulateError = false,
) {
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException("Cancelled", "AbortError"));
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 450);
    signal.addEventListener("abort", abort, { once: true });
  });
  if (simulateError)
    throw new Error(
      "Demo error: the sample could not load. Retry to continue.",
    );
  return sampleWritingSuggestion(request);
}
