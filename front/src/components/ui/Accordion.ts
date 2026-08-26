import "../../../css/ui/Accordion.css";

export interface AccordionSection {
  title: string;
  content: string | HTMLElement;
  open?: boolean;
}

const Accordion = (sections: AccordionSection[] = []): HTMLDivElement => {
  const container = document.createElement("div");
  container.className = "accordion";

  sections.forEach(({ title, content, open = false }) => {
    const details = document.createElement("details");
    details.className = "accordion-section";
    if (open) {
      details.open = true;
    }

    const summary = document.createElement("summary");
    summary.className = "accordion-header";
    summary.textContent = title;

    const abody = document.createElement("div");
    abody.className = "accordion-body";

    if (typeof content === "string") {
      abody.textContent = content;
    } else if (content instanceof HTMLElement) {
      abody.appendChild(content);
    }

    details.appendChild(summary);
    details.appendChild(abody);
    container.appendChild(details);
  });

  return container;
};

export { Accordion };
export default Accordion;
export { Accordion as AccordionComponent };