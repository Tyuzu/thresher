import "../../../css/subpages/notices.css";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Modal, { ModalResult } from "../../components/ui/Modal.js";
import Datex from "../../components/base/Datex.js";
import {
  fetchNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  type Notice as ApiNotice,
  type DeleteNoticeResponse as ApiDeleteNoticeResponse
} from "./api.js";

/* ------------------------------------------------------
   Types & Interfaces
------------------------------------------------------ */
export interface Notice {
  noticeid?: string | number;
  title?: string;
  content?: string;
  summary?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface OpenNoticeFormOptions {
  notice?: Partial<ApiNotice>;
  entityType: string;
  entityId: string | number;
  container: HTMLElement;
  isEdit?: boolean;
}

export interface OpenNoticeModalOptions {
  entityType: string;
  entityId: string | number;
  container: HTMLElement;
  isCreator: boolean;
}

export interface DeleteNoticeResponse {
  success?: boolean;
}

/** --- Modal Form for Add/Edit --- */
function openNoticeForm({
  notice = {},
  entityType,
  entityId,
  container,
  isEdit = false
}: OpenNoticeFormOptions): void {
  let modalInstance: ModalResult<boolean> | null = null;

  const modalContent = createElement("div", { class: "notice-form" }, [
    createElement("label", {}, ["Title:"]),
    createElement("input", { type: "text", value: notice.title || "", id: "notice-title-input" }),
    createElement("label", {}, ["Content:"]),
    createElement("textarea", { id: "notice-content-input" }, [notice.content || ""])
  ]);

  const saveBtn = Button({
    title: isEdit ? "Save Changes" : "Create Notice",
    classes: "buttonx",
    events: {
      click: async () => {
        const titleInput = modalContent.querySelector<HTMLInputElement>("#notice-title-input");
        const contentInput = modalContent.querySelector<HTMLTextAreaElement>("#notice-content-input");
        const title = titleInput ? titleInput.value.trim() : "";
        const content = contentInput ? contentInput.value.trim() : "";

        if (!title || !content) {
          alert("Both fields are required.");
          return;
        }

        let res: Notice | null = null;
        if (isEdit && notice.noticeid != null) {
          res = await updateNotice(entityType, entityId, notice.noticeid, { title, content });
        } else {
          res = await createNotice(entityType, entityId, { title, content });
        }

        if (res && (res.noticeid || res === null)) {
          modalInstance?.close(true);
          await displayNotices(entityType, entityId, container, true);
        } else {
          alert("Failed to save notice.");
        }
      }
    }
  });

  modalContent.appendChild(saveBtn);

  modalInstance = Modal<boolean>({
    title: isEdit ? "Edit Notice" : "Add Notice",
    content: modalContent,
    size: "medium",
    autofocusSelector: "#notice-title-input"
  });
}

/** --- Single Notice Modal --- */
function openNoticeModal(
  notice: Notice,
  { entityType, entityId, container, isCreator }: OpenNoticeModalOptions
): void {
  let modalInstance: ModalResult<boolean> | null = null;
  const modalContent = createElement("div", { class: "notice-modal-content" });

  const titleEl = createElement("h3", {}, [notice.title || "Untitled Notice"]);
  const contentEl = createElement("p", { class: "notice-modal-text" }, [
    notice.content || notice.summary || ""
  ]);
  const dateEl = createElement("small", {}, [`Posted on ${Datex(notice.createdAt, true)}`]);

  modalContent.append(titleEl, contentEl, dateEl);

  if (isCreator && notice.noticeid != null) {
    const actions = createElement("div", { class: "notice-modal-actions" });

    const editBtn = Button({
      title: "✏️ Edit",
      classes: "buttonx",
      events: {
        click: () => {
          modalInstance?.close(false);
          openNoticeForm({ notice, entityType, entityId, container, isEdit: true });
        }
      }
    });

    const delBtn = Button({
      title: "🗑️ Delete",
      classes: "buttonx",
      events: {
        click: async () => {
          if (!confirm("Delete this notice?")) return;
          const res = await deleteNotice(entityType, entityId, notice.noticeid!);
          if (res === null || (res && res.success)) {
            modalInstance?.close(true);
            await displayNotices(entityType, entityId, container, isCreator);
          } else {
            alert("Failed to delete notice.");
          }
        }
      }
    });

    actions.append(editBtn, delBtn);
    modalContent.appendChild(actions);
  }

  modalInstance = Modal<boolean>({
    title: "Notice",
    content: modalContent,
    size: "medium"
  });
}

/** --- Display Notices with Search/Filter --- */
export async function displayNotices(
  entityType: string,
  entityId: string | number,
  container: HTMLElement,
  isCreator: boolean
): Promise<void> {
  container.replaceChildren();

  // Header + Add button
  const header = createElement("div", { id: "notice-header" }, [
    createElement("h3", {}, ["Notices"])
  ]);

  if (isCreator) {
    const addBtn = Button({
      title: "➕ Add Notice",
      id: "addNoticeBtn",
      classes: "buttonx secondary notice-add-btn",
      events: {
        click: () => openNoticeForm({ entityType, entityId, container })
      }
    });
    header.appendChild(addBtn);
  }
  container.appendChild(header);

  // Search + filter controls
  const controls = createElement("div", { class: "notice-controls" });
  const searchInput = createElement("input", {
    type: "text",
    placeholder: "Search title or summary...",
    class: "notice-search"
  }) as HTMLInputElement;

  const dateInput = createElement("input", {
    type: "date",
    class: "notice-date-filter"
  }) as HTMLInputElement;

  controls.append(searchInput, dateInput);
  container.appendChild(controls);

  // Loading indicator
  const loading = createElement("p", {}, ["Loading notices..."]);
  container.appendChild(loading);

  const notices = await fetchNotices(entityType, entityId);
  loading.remove();

  const list = createElement("div", { id: "notice-list" });
  container.appendChild(list);

  function renderList(filtered: Notice[]): void {
    list.replaceChildren();
    if (filtered.length === 0) {
      list.appendChild(createElement("p", {}, ["No notices match the criteria."]));
      return;
    }

    filtered.forEach((notice) => {
      const textSource = notice.summary || notice.content || "";
      const summaryText = textSource.length > 80 ? textSource.slice(0, 80) + "..." : textSource;

      const noticeBox = createElement("div", { class: "notice-item", tabindex: "0", role: "button" }, [
        createElement("h4", {}, [notice.title || "Untitled"]),
        createElement("p", {}, [summaryText]),
        createElement("small", {}, [`Posted on ${Datex(notice.createdAt, true)}`])
      ]);

      noticeBox.addEventListener("click", () =>
        openNoticeModal(notice, { entityType, entityId, container, isCreator })
      );
      list.appendChild(noticeBox);
    });
  }

  renderList(notices);

  // Filter handler
  function applyFilters(): void {
    const search = searchInput.value.trim().toLowerCase();
    const date = dateInput.value;
    const filtered = notices.filter((n) => {
      const textToSearch = `${n.title || ""} ${n.summary || ""} ${n.content || ""}`.toLowerCase();
      const matchesText = !search || textToSearch.includes(search);
      const matchesDate = !date || (n.createdAt && n.createdAt.split("T")[0] === date);
      return matchesText && matchesDate;
    });
    renderList(filtered);
  }

  searchInput.addEventListener("input", applyFilters);
  dateInput.addEventListener("change", applyFilters);
}