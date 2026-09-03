// src/lib/scan/psl.d.ts
//
// Ambient shim for `psl` (npm), narrow to what `src/lib/scan/domain.ts`
// calls. `psl`'s own `types/index.d.ts` is bundled in the package but its
// `package.json` `exports` map declares no `types` condition, so under
// `moduleResolution: "bundler"` (this repo's `tsconfig.json`) TypeScript
// resolves the module to `dist/psl.mjs` with an implicit `any` and refuses
// the fallback to the root `types` field — "Could not find a declaration
// file for module 'psl'". A `declare module "psl"` written inside
// `domain.ts` itself fails for the same reason from the opposite side: TS
// treats it as an *augmentation* of an already-resolved (untyped) module
// and refuses ("Invalid module name in augmentation … resolves to an
// untyped module"). A standalone ambient `.d.ts` file is the only form TS
// accepts here — the same shape `@types/*` stub packages use for an
// untyped dependency — so it lives beside `domain.ts` rather than as a
// third work-order file plan entry: WO-051 § deviation note names it.
declare module "psl" {
  export type ParsedDomain = {
    input: string;
    tld: string | null;
    sld: string | null;
    domain: string | null;
    subdomain: string | null;
    listed: boolean;
  };
  export type ParseError = {
    input: string;
    error: { code: string; message: string };
  };
  export function parse(input: string): ParsedDomain | ParseError;
}
