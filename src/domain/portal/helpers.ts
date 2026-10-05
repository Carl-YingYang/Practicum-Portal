import {
  type ActivityLog,
  type ActivityType,
  type FormBlock,
  type FormBlockType,
} from "@/lib/types";
export function createHelpers(uuid: () => string) {
  function logActivity(
    list: ActivityLog[],
    type: ActivityType,
    message: string,
    actorId: string,
  ): ActivityLog[] {
    return [
      {
        id: uuid(),
        type,
        message,
        actorId,
        timestamp: new Date().toISOString(),
      },
      ...list,
    ].slice(0, 100);
  }
  function genTempPassword(): string {
    return "Tmp-" + uuid().replaceAll("-", "").slice(0, 12);
  }
  /** Default block factory for the form editor's "insert block" toolbar. */
  function buildDefaultBlock(type: FormBlockType, id: string): FormBlock {
    switch (type) {
      case "heading":
        return { id, type, level: 2, text: "New heading" };
      case "paragraph":
        return { id, type, text: "Write something..." };
      case "instruction":
        return { id, type, text: "Instruction text shown in muted italics." };
      case "divider":
        return { id, type };
      case "info-field":
        return { id, type, label: "Label", placeholder: "" };
      case "fill-in":
        return {
          id,
          type,
          label: "Question",
          placeholder: "",
          multiline: true,
        };
      case "rating-table":
        return {
          id,
          type,
          scaleLabels: [
            "Poor (1)",
            "Fair (2)",
            "Good (3)",
            "Very Good (4)",
            "Excellent (5)",
          ],
          criteria: [
            { id: uuid(), label: "Criterion 1" },
            { id: uuid(), label: "Criterion 2" },
          ],
        };
      case "signature":
        return { id, type, caption: "Signature over Printed Name" };
      default:
        return { id, type: "paragraph", text: "" };
    }
  }
  return { logActivity, genTempPassword, buildDefaultBlock };
}
