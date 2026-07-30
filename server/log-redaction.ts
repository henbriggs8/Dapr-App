const SENSITIVE_KEY = /token|secret|authorization|password|checksum/i;
const SENSITIVE_QUERY = /([?&](?:token|access_token|capability)=)[^&#\s"]+/gi;

export function serializeSafeLogJson(value: unknown): string {
  return JSON.stringify(value, (key, nestedValue) => {
    if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
    if (typeof nestedValue === "string") {
      return nestedValue.replace(SENSITIVE_QUERY, "$1[REDACTED]");
    }
    return nestedValue;
  });
}
