// components/ui/confirmModal.js
import { createElement } from "../createElement";
import Button from "../base/Button.ts";
import Modal from "./Modal.ts";

export function confirmModal({ title = "Confirm", message = "" }) {
    return new Promise(resolve => {
        const modal = Modal({
            title,
            content: () =>
                createElement("p", {}, [message]),
            actions: () => {
                const footer = createElement("div", {});
                footer.append(
                    Button("Cancel", "", {
                        click: () => {
                            modal.close();
                            resolve(false);
                        }
                    }),
                    Button("Confirm", "", {
                        click: () => {
                            modal.close();
                            resolve(true);
                        }
                    })
                );
                return footer;
            }
        });
    });
}
