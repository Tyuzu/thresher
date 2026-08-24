import { createElement } from "../createElement.js";
import Button from "../base/Button.js";
import Modal from "./Modal.js";

export interface ConfirmModalOptions {
  title?: string;
  message?: string;
}

export function confirmModal({
  title = "Confirm",
  message = "",
}: ConfirmModalOptions = {}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const modal = Modal({
      title,
      content: () => createElement("p", {}, [message]),
      actions: () => {
        const footer = createElement("div", {}) as HTMLDivElement;
        footer.append(
          Button({
            title: "Cancel",
            events: {
              click: () => {
                modal.close();
                resolve(false);
              },
            },
          }),
          Button({
            title: "Confirm",
            events: {
              click: () => {
                modal.close();
                resolve(true);
              },
            },
          })
        );
        return footer;
      },
    });
  });
}