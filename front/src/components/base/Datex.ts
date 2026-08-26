import { createElement } from "../createElement.js";

export type DateInput = string | number | Date | null | undefined;

// Overload signatures
function Datex(dateToPrint?: DateInput, asString?: true): string;
function Datex(dateToPrint: DateInput, asString: false): HTMLElement;
function Datex(
  dateToPrint: DateInput = new Date(),
  asString: boolean = true
): string | HTMLElement {
  let parsedDate: Date;

  if (dateToPrint instanceof Date) {
    parsedDate = dateToPrint;
  } else if (typeof dateToPrint === "number") {
    parsedDate = new Date(dateToPrint);
  } else if (typeof dateToPrint === "string") {
    parsedDate = new Date(dateToPrint);
  } else {
    parsedDate = new Date();
  }

  // Fallback if the date is invalid (NaN)
  if (isNaN(parsedDate.getTime())) {
    const fallbackText = "Invalid Date";
    return asString
      ? fallbackText
      : (createElement("span", { class: "datex-invalid" }, [fallbackText]) as HTMLElement);
  }

  const formatted = parsedDate.toLocaleString("en-GB", {
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

  return createElement("time", { dateTime: parsedDate.toISOString() }, [formatted]) as HTMLElement;
}

export default Datex;
export { Datex as DatexComponent };