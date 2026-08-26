import { Button } from "../../components/base/Button.js";
import Modal from "../../components/ui/Modal.js";
import { createElement } from "../../components/createElement.js";
import { Accordion } from "../../components/ui/Accordion.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import { createFaqForEvent } from "./api.js";

// --- Type Definitions ---

export interface FAQItemData {
    id?: string | number;
    title: string;
    content: string;
    [key: string]: unknown;
}

async function displayEventFAQs(
    isCreator: boolean, 
    faqContainer: HTMLElement, 
    eventId: string | number, 
    faques: FAQItemData[]
): Promise<void> {
    faqContainer.innerHTML = "";
    faqContainer.appendChild(createElement("h2", {}, ["FAQs"]));

    if (isCreator) {
        // Updated to use ButtonOptions object structure
        const addFaqButton = Button({
            title: "Add FAQs",
            id: "add-faq-btn",
            classes: "buttonx",
            events: {
                click: () => showFaqForm(faqContainer, eventId)
            }
        });
        faqContainer.appendChild(addFaqButton);
    }

    faqContainer.appendChild(Accordion(faques));
}

function renderFaqItem(
    title: string, 
    content: string, 
    container: HTMLElement
): void {
    const faqItem = createElement("div", { class: "faq-item" });
    const faqTitle = createElement("h3", { class: "faq-title" }, [title]);
    const faqContent = createElement("p", { class: "faq-content" }, [content]);

    faqItem.appendChild(faqTitle);
    faqItem.appendChild(faqContent);
    container.appendChild(faqItem);
}

function showFaqForm(
    faqContainer: HTMLElement, 
    eventId: string | number
): void {
    // Prevent multiple modals
    if (document.getElementById("faq-form")) {
        return;
    }

    const form = createElement("form", { id: "faq-form", class: "faq-form" }) as HTMLFormElement;

    const questionGroup = createFormGroup({
        label: "FAQ Title",
        type: "text",
        id: "faq-title",
        placeholder: "Enter FAQ title",
        required: true,
    }) as HTMLElement;

    const answerGroup = createFormGroup({
        label: "FAQ Content",
        type: "textarea",
        id: "faq-content",
        placeholder: "Enter FAQ content",
        required: true,
    }) as HTMLElement;

    form.append(questionGroup, answerGroup);

    const submitButton = createElement("input", {
        type: "submit",
        value: "Add New FAQ",
        class: "submit-faq-btn buttonx",
    }) as HTMLInputElement;

    form.appendChild(submitButton);

    // Create modal instance first so we can call close() later
    const { close } = Modal({
        title: "Add New FAQ",
        content: form,
        onClose: () => {},
    });

    form.addEventListener("submit", async (e: SubmitEvent) => {
        e.preventDefault();
        submitButton.disabled = true;

        const titleInput = form.querySelector("#faq-title") as HTMLInputElement | null;
        const contentInput = form.querySelector("#faq-content") as HTMLTextAreaElement | null;

        const title = titleInput ? titleInput.value.trim() : "";
        const content = contentInput ? contentInput.value.trim() : "";

        if (!title || !content) {
            alert("Please fill out both fields.");
            submitButton.disabled = false;
            return;
        }

        try {
            const response = await createFaqForEvent(eventId, title, content);

            if (response?.success) {
                renderFaqItem(title, content, faqContainer);
                close(); // Properly close the modal
            } else {
                alert("Failed to add FAQ. Please try again.");
            }
        } catch (error) {
            console.error("Failed to add FAQ:", error);
            alert("An error occurred while adding the FAQ.");
        } finally {
            submitButton.disabled = false;
        }
    });
}

export { displayEventFAQs };