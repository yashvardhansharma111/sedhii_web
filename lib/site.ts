/**
 * Brand-wide constants for Sedhii. Change them here, not in the pages.
 * Mirrors the shape of lib/site.ts in the Sedhii app repo.
 */
export const SITE = {
  name: "Sedhii",
  domain: "sedhii.com",
  supportEmail: "support@sedhii.com",
  privacyEmail: "privacy@sedhii.com",

  /** Android application id — must match app.json and the EAS build. */
  androidPackage: "com.sedhiii.app",

  /** Admin panel — internal route in this same app. */
  adminUrl: "/admin",

  /** Android build. Swap this one constant when a new APK ships. */
  apkUrl:
    "https://www.dropbox.com/scl/fi/8oextti1ghwaw0xjdrvnb/sedhii-2.apk?rlkey=wtphg0f8p698uxlqmhynny710&st=j65novib&dl=1",
} as const;
