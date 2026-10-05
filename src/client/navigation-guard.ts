/** A dirty editor registers one save guard for navigation, logout and role switches. */
let guard: (() => Promise<void>) | undefined;
let transition: Promise<void> | undefined;
export function registerNavigationGuard(save: () => Promise<void>) {
  guard = save;
  return () => {
    if (guard === save) guard = undefined;
  };
}
export async function prepareToLeave() {
  if (guard) await guard();
}
export function guardedNavigation(action: () => void) {
  if (!guard) {
    action();
    return;
  }
  if (transition) return;
  transition = prepareToLeave()
    .then(action)
    .catch(() => {
      /* Editor retains text and exposes retry. */
    })
    .finally(() => {
      transition = undefined;
    });
}
