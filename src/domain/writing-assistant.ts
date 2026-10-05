/** Provider-neutral contract. The prototype adapter is local and never calls AI. */
export type WritingAction = "grammar" | "formal" | "reflection";
export type JournalField = "tasks" | "learnings";
export interface WritingPreferences {
  language: "english" | "filipino" | "taglish";
  detail: "concise" | "detailed";
}
export const defaultWritingPreferences: WritingPreferences = {
  language: "english",
  detail: "concise",
};
export interface WritingRequest {
  action: WritingAction;
  text: string;
  preferences: WritingPreferences;
}
export interface WritingSuggestion {
  text: string;
  mode: "demo";
  note: string;
}
export function sampleWritingSuggestion(
  request: WritingRequest,
): WritingSuggestion {
  const input = request.text.trim();
  if (!input)
    throw new Error("Add activity notes or select some journal text first.");
  if (input.length > 6000)
    throw new Error("Select a shorter passage (up to 6,000 characters).");
  // Only small, deterministic formatting changes. No invented outcomes or hours.
  const cleaned = input.replace(/[ \t]+/g, " ").replace(/\bi\b/g, "I");
  const normalized = cleaned[0].toUpperCase() + cleaned.slice(1);
  const language = request.preferences.language;
  let text = normalized;
  if (request.action === "formal") {
    const intro = {
      english: "During this reporting period, I worked on the following:",
      filipino: "Sa panahong ito, ginawa ko ang mga sumusunod:",
      taglish: "During this period, ito ang mga ginawa ko:",
    }[language];
    text = `${intro}\n\n${normalized}`;
  }
  if (request.action === "reflection") {
    const prompts = {
      english: [
        "What I learned: [Add the specific skill or lesson.]",
        "What I will improve next: [Add a practical next step.]",
        "Evidence or outcome: [Add an actual result from your work.]",
      ],
      filipino: [
        "Natutuhan ko: [Ilagay ang tiyak na kasanayan o aral.]",
        "Susunod kong pagbutihin: [Ilagay ang praktikal na hakbang.]",
        "Ebidensya o resulta: [Ilagay ang tunay na resulta ng gawain.]",
      ],
      taglish: [
        "What I learned: [Ilagay ang actual skill o lesson.]",
        "Next improvement: [Ilagay ang practical next step.]",
        "Actual outcome: [Ilagay ang tunay na result ng work.]",
      ],
    }[language];
    text = `${normalized}\n\n${prompts.slice(0, request.preferences.detail === "detailed" ? 3 : 2).join("\n\n")}`;
  }
  return {
    text,
    mode: "demo",
    note:
      request.action === "reflection"
        ? "Fill in the bracketed prompts using your actual experience before submitting."
        : "Local formatting sample; original wording is preserved. AI rewriting and translation are not connected yet.",
  };
}
