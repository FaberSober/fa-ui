export * from "./core"
export * from "./base"

/** -------------------------------- declare global -------------------------------- */
declare global {
  interface Window {
    FaFrom: any;
    FaVersionCode: any;
    FaVersionName: any;
    fa: any;
  }
}