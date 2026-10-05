/** Demo access never implicitly enables database reset or real account access. */
export function isDemoLoginEnabled(env: {
  appEnv?: string;
  nodeEnv?: string;
  enabled?: string;
}): boolean {
  if (env.enabled === "false") return false;
  if (env.appEnv === "testing") return env.enabled === "true";
  // An existing local .env may predate the testing flags. Keep npm run dev usable.
  // Builds, deployed servers and any explicit non-testing environment fail closed.
  return !env.appEnv && env.nodeEnv === "development";
}
