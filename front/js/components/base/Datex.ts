import { createElement } from "../../components/createElement.js";

function Datex(DATE_TO_PRINT?: string, asString?: true): string;
function Datex(DATE_TO_PRINT: string | undefined, asString: false): HTMLElement;
function Datex(
  DATE_TO_PRINT: string = "2026-01-03T12:39:00Z",
  asString: boolean = true
): string | HTMLElement {
  const formatted = new Date(DATE_TO_PRINT).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  if (asString) {
    return formatted;
  }

  return createElement("span", {}, [formatted]);
}

export default Datex;
export { Datex };