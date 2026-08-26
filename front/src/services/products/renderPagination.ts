import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";

export function renderPagination(
  container: HTMLElement,
  total: number,
  limit: number,
  offset: number,
  onPageChange: (newPage: number) => void
): void {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  const pagination = createElement("div", { class: "pagination" }, [
    Button({
      title: "Prev",
      id: "page-prev-btn",
      disabled: offset === 0,
      classes: "secondary-button",
      events: {
        click: () => onPageChange(currentPage - 1),
      },
    }),
    createElement("span", {}, [`Page ${currentPage} of ${pageCount}`]),
    Button({
      title: "Next",
      id: "page-next-btn",
      disabled: offset + limit >= total || total === 0,
      classes: "secondary-button",
      events: {
        click: () => onPageChange(currentPage + 1),
      },
    }),
  ]);

  container.appendChild(pagination);
}