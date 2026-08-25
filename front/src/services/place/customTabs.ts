import { createElement } from "../../components/createElement.js";
import Button, { ButtonOptions } from "../../components/base/Button.js";
import { apiFetch } from "../../api/api.js";
import { displayMenu } from "../menu/menuService.js";

// ─── Interfaces & Types ────────────────────────────────────────────────────────

export interface FormField {
  name: string;
  placeholder: string;
  type?: string;
  value?: string | number;
}

export interface Room {
  _id: string;
  name: string;
  capacity: number;
  price: number | string;
}

export interface FacilityObject {
  _id?: string;
  name: string;
}

export type Facility = string | FacilityObject;

export interface Service {
  _id: string;
  name: string;
}

export interface Exhibit {
  _id: string;
  title: string;
  desc: string;
}

export interface MembershipPlan {
  _id: string;
  name: string;
  price: number | string;
}

export interface Show {
  _id: string;
  title: string;
  date: string;
  time: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function showLoading(container: HTMLElement): void {
  container.appendChild(
    createElement("div", { class: "loading" }, [
      createElement("p", {}, ["Loading…"])
    ])
  );
}

function showError(container: HTMLElement, message: string): void {
  container.appendChild(
    createElement("div", { class: "tab-section error" }, [
      createElement("p", {}, [message])
    ])
  );
  console.warn(message);
}

function createInlineForm(
  fields: FormField[],
  onSubmit: (data: Record<string, string>, formEl: HTMLFormElement) => void,
  onCancel: (formEl: HTMLFormElement) => void
): HTMLFormElement {
  const form = createElement("form", { class: "inline-form" }, []) as HTMLFormElement;

  fields.forEach((f) => {
    const label = createElement("label", { for: f.name }, [f.placeholder]);
    const input = createElement("input", {
      type: f.type || "text",
      name: f.name,
      id: f.name,
      value: f.value !== undefined ? String(f.value) : ""
    });
    form.appendChild(label);
    form.appendChild(input);
  });

  const submitBtn = Button({
    title: "Submit",
    id: "form-submit",
    events: {
      click: (e: Event) => {
        e.preventDefault();
        const data: Record<string, string> = {};
        fields.forEach((f) => {
          const inputEl = form.querySelector<HTMLInputElement>(`[name="${f.name}"]`);
          data[f.name] = inputEl ? inputEl.value : "";
        });
        onSubmit(data, form);
      }
    }
  });

  const cancelBtn = Button({
    title: "Cancel",
    id: "form-cancel",
    events: {
      click: (e: Event) => {
        e.preventDefault();
        onCancel(form);
      }
    }
  });

  const btnContainer = createElement("div", { class: "form-buttons" }, [
    submitBtn,
    cancelBtn
  ]);

  form.appendChild(btnContainer);
  return form;
}

// 🍽️ Restaurant / Café → Menu
async function displayPlaceMenu(
  container: HTMLElement,
  placeId: string,
  isCreator: boolean,
  isLoggedIn: boolean
): Promise<void> {
  container.replaceChildren();
  try {
    const menuContainer = createElement("div", {}, []);
    container.appendChild(menuContainer);
    displayMenu(menuContainer, placeId, isCreator, isLoggedIn);
  } catch (err) {
    container.appendChild(
      createElement("div", { class: "tab-section error" }, [
        createElement("p", {}, ["Menu unavailable."])
      ])
    );
    console.warn("Menu tab failed:", err);
  }
}

// 🍽️ Saloon
async function displaySaloonSlots(
  container: HTMLElement,
  _placeId?: string,
  _isCreator?: boolean,
  _isLoggedIn?: boolean
): Promise<void> {
  container.replaceChildren();
}

// ─── Rooms (Hotel) ──────────────────────────────────────────────────────────────

async function displayPlaceRooms(
  container: HTMLElement,
  placeId: string,
  isCreator: boolean
): Promise<void> {
  container.replaceChildren();
  showLoading(container);

  try {
    const rooms = await apiFetch<Room[]>(`/place/${placeId}/rooms`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Available Rooms"]));
    const roomSection = createElement("div", { class: "room-section vflex" }, []);

    rooms.forEach((room) => {
      const roomDiv = createElement("div", { class: "room-item" }, [
        createElement("h4", {}, [room.name]),
        createElement("p", {}, [`Capacity: ${room.capacity}`]),
        createElement("p", {}, [`Price: ${room.price}`])
      ]);

      const bookBtn = Button({
        title: "Book Now",
        id: `book-${room._id}`,
        events: {
          click: () => {
            const dateField = createElement("input", {
              type: "date",
              name: "bookingDate"
            }) as HTMLInputElement;

            const submitField = Button({
              title: "Submit Booking",
              id: `submit-book-${room._id}`,
              events: {
                click: async () => {
                  const bookingDate = dateField.value;
                  if (!bookingDate) {
                    alert("Choose a date");
                    return;
                  }
                  try {
                    await apiFetch(`/place/${placeId}/rooms/${room._id}/book`, "POST", {
                      date: bookingDate
                    });
                    alert(`Booked ${room.name} on ${bookingDate}`);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    alert(`Booking failed: ${message}`);
                  }
                }
              }
            });

            roomDiv.appendChild(dateField);
            roomDiv.appendChild(submitField);
          }
        }
      });
      roomDiv.appendChild(bookBtn);

      if (isCreator) {
        const editBtn = Button({
          title: "Edit",
          id: `edit-room-${room._id}`,
          events: {
            click: () => {
              const roomDivClone = roomDiv.cloneNode(true) as HTMLElement;
              const formFields: FormField[] = [
                { name: "name", placeholder: "Name", value: room.name },
                { name: "capacity", placeholder: "Capacity", value: room.capacity },
                { name: "price", placeholder: "Price", value: room.price }
              ];
              const editForm = createInlineForm(
                formFields,
                async (data) => {
                  try {
                    await apiFetch(`/place/${placeId}/rooms/${room._id}`, "PUT", data);
                    displayPlaceRooms(container, placeId, isCreator);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    alert(`Update failed: ${message}`);
                  }
                },
                () => roomDiv.replaceWith(roomDivClone)
              );
              roomDiv.replaceChildren(editForm);
            }
          }
        });

        const deleteBtn = Button({
          title: "Delete",
          id: `delete-room-${room._id}`,
          events: {
            click: async () => {
              if (!confirm(`Delete room "${room.name}"?`)) return;
              try {
                await apiFetch(`/place/${placeId}/rooms/${room._id}`, "DELETE");
                displayPlaceRooms(container, placeId, isCreator);
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                alert(`Delete failed: ${message}`);
              }
            }
          }
        });

        roomDiv.appendChild(editBtn);
        roomDiv.appendChild(deleteBtn);
      }

      roomSection.appendChild(roomDiv);
    });

    container.appendChild(roomSection);

    if (isCreator) {
      const addBtnOptions: ButtonOptions = {
        title: "Add New Room",
        id: "add-room-item",
        events: {
          click: () => {
            const formFields: FormField[] = [
              { name: "name", placeholder: "Name" },
              { name: "capacity", placeholder: "Capacity", type: "number" },
              { name: "price", placeholder: "Price" }
            ];
            const addForm = createInlineForm(
              formFields,
              async (data) => {
                try {
                  await apiFetch(`/place/${placeId}/rooms`, "POST", data);
                  displayPlaceRooms(container, placeId, isCreator);
                } catch (err) {
                  const message = err instanceof Error ? err.message : String(err);
                  alert(`Creation failed: ${message}`);
                }
              },
              (formEl) => {
                container.removeChild(formEl);
                (addBtn as HTMLButtonElement).disabled = false;
              }
            );
            container.appendChild(addForm);
            (addBtn as HTMLButtonElement).disabled = true;
          }
        }
      };
      const addBtn = Button(addBtnOptions);
      container.appendChild(addBtn);
    }
  } catch (_err) {
    container.replaceChildren();
    showError(container, "Rooms unavailable.");
  }
}

// ─── Facilities (Park) ─────────────────────────────────────────────────────────

async function displayPlaceFacilities(
  container: HTMLElement,
  placeId: string,
  isCreator: boolean
): Promise<void> {
  container.replaceChildren();
  showLoading(container);

  try {
    const facilities = await apiFetch<Facility[]>(`/place/${placeId}/facilities`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Park Facilities"]));
    const ul = createElement("ul", { class: "facility-list" }, []);

    facilities.forEach((f) => {
      const name = typeof f === "string" ? f : f.name;
      const id = typeof f === "string" ? name : f._id || name;

      const li = createElement("li", {}, [name]);

      if (isCreator) {
        const deleteBtn = Button({
          title: "Delete",
          id: `delete-facility-${id}`,
          events: {
            click: async () => {
              if (!confirm(`Delete facility "${name}"?`)) return;
              try {
                await apiFetch(`/place/${placeId}/facilities/${id}`, "DELETE");
                displayPlaceFacilities(container, placeId, isCreator);
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                alert(`Delete failed: ${message}`);
              }
            }
          }
        });
        li.appendChild(deleteBtn);
      }

      ul.appendChild(li);
    });

    container.appendChild(ul);

    if (isCreator) {
      const addBtnOptions: ButtonOptions = {
        title: "Add Facility",
        id: "add-facility",
        events: {
          click: () => {
            const formFields: FormField[] = [{ name: "name", placeholder: "Facility Name" }];
            const addForm = createInlineForm(
              formFields,
              async (data) => {
                try {
                  await apiFetch(`/place/${placeId}/facilities`, "POST", data);
                  displayPlaceFacilities(container, placeId, isCreator);
                } catch (err) {
                  const message = err instanceof Error ? err.message : String(err);
                  alert(`Creation failed: ${message}`);
                }
              },
              (formEl) => {
                container.removeChild(formEl);
                (addBtn as HTMLButtonElement).disabled = false;
              }
            );
            container.appendChild(addForm);
            (addBtn as HTMLButtonElement).disabled = true;
          }
        }
      };
      const addBtn = Button(addBtnOptions);
      container.appendChild(addBtn);
    }
  } catch (_err) {
    container.replaceChildren();
    showError(container, "Facilities unavailable.");
  }
}

// ─── Services (Business) ───────────────────────────────────────────────────────

async function displayPlaceServices(
  container: HTMLElement,
  placeId: string,
  isCreator: boolean
): Promise<void> {
  container.replaceChildren();
  showLoading(container);

  try {
    const services = await apiFetch<Service[]>(`/place/${placeId}/services`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Business Services"]));
    const ul = createElement("ul", { class: "service-list" }, []);

    services.forEach((s) => {
      const name = s.name;
      const id = s._id;
      const li = createElement("li", {}, [name]);

      if (isCreator) {
        const editBtn = Button({
          title: "Edit",
          id: `edit-service-${id}`,
          events: {
            click: () => {
              const liClone = li.cloneNode(true) as HTMLElement;
              const formFields: FormField[] = [{ name: "name", placeholder: "Name", value: name }];
              const editForm = createInlineForm(
                formFields,
                async (data) => {
                  try {
                    await apiFetch(`/place/${placeId}/services/${id}`, "PUT", data);
                    displayPlaceServices(container, placeId, isCreator);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    alert(`Update failed: ${message}`);
                  }
                },
                () => li.replaceWith(liClone)
              );
              li.replaceChildren(editForm);
            }
          }
        });

        const deleteBtn = Button({
          title: "Delete",
          id: `delete-service-${id}`,
          events: {
            click: async () => {
              if (!confirm(`Delete service "${name}"?`)) return;
              try {
                await apiFetch(`/place/${placeId}/services/${id}`, "DELETE");
                displayPlaceServices(container, placeId, isCreator);
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                alert(`Delete failed: ${message}`);
              }
            }
          }
        });

        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
      }

      ul.appendChild(li);
    });

    container.appendChild(ul);

    if (isCreator) {
      const addBtnOptions: ButtonOptions = {
        title: "Add Service",
        id: "add-service",
        events: {
          click: () => {
            const formFields: FormField[] = [{ name: "name", placeholder: "Service Name" }];
            const addForm = createInlineForm(
              formFields,
              async (data) => {
                try {
                  await apiFetch(`/place/${placeId}/services`, "POST", data);
                  displayPlaceServices(container, placeId, isCreator);
                } catch (err) {
                  const message = err instanceof Error ? err.message : String(err);
                  alert(`Creation failed: ${message}`);
                }
              },
              (formEl) => {
                container.removeChild(formEl);
                (addBtn as HTMLButtonElement).disabled = false;
              }
            );
            container.appendChild(addForm);
            (addBtn as HTMLButtonElement).disabled = true;
          }
        }
      };
      const addBtn = Button(addBtnOptions);
      container.appendChild(addBtn);
    }
  } catch (_err) {
    container.replaceChildren();
    showError(container, "Services unavailable.");
  }
}

// ─── Exhibits (Museum) ─────────────────────────────────────────────────────────

async function displayPlaceExhibits(
  container: HTMLElement,
  placeId: string,
  isCreator: boolean
): Promise<void> {
  container.replaceChildren();
  showLoading(container);

  try {
    const exhibits = await apiFetch<Exhibit[]>(`/place/${placeId}/exhibits`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Exhibits"]));
    const exhibitSection = createElement("div", { class: "exhibit-section" }, []);

    exhibits.forEach((ex) => {
      const exDiv = createElement("div", { class: "exhibit-item" }, [
        createElement("h4", {}, [ex.title]),
        createElement("p", {}, [ex.desc])
      ]);

      if (isCreator) {
        const editBtn = Button({
          title: "Edit",
          id: `edit-exhibit-${ex._id}`,
          events: {
            click: () => {
              const exDivClone = exDiv.cloneNode(true) as HTMLElement;
              const formFields: FormField[] = [
                { name: "title", placeholder: "Title", value: ex.title },
                { name: "desc", placeholder: "Description", value: ex.desc }
              ];
              const editForm = createInlineForm(
                formFields,
                async (data) => {
                  try {
                    await apiFetch(`/place/${placeId}/exhibits/${ex._id}`, "PUT", data);
                    displayPlaceExhibits(container, placeId, isCreator);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    alert(`Update failed: ${message}`);
                  }
                },
                () => exDiv.replaceWith(exDivClone)
              );
              exDiv.replaceChildren(editForm);
            }
          }
        });

        const deleteBtn = Button({
          title: "Delete",
          id: `delete-exhibit-${ex._id}`,
          events: {
            click: async () => {
              if (!confirm(`Delete exhibit "${ex.title}"?`)) return;
              try {
                await apiFetch(`/place/${placeId}/exhibits/${ex._id}`, "DELETE");
                displayPlaceExhibits(container, placeId, isCreator);
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                alert(`Delete failed: ${message}`);
              }
            }
          }
        });

        exDiv.appendChild(editBtn);
        exDiv.appendChild(deleteBtn);
      }

      exhibitSection.appendChild(exDiv);
    });

    container.appendChild(exhibitSection);

    if (isCreator) {
      const addBtnOptions: ButtonOptions = {
        title: "Add Exhibit",
        id: "add-exhibit",
        events: {
          click: () => {
            const formFields: FormField[] = [
              { name: "title", placeholder: "Title" },
              { name: "desc", placeholder: "Description" }
            ];
            const addForm = createInlineForm(
              formFields,
              async (data) => {
                try {
                  await apiFetch(`/place/${placeId}/exhibits`, "POST", data);
                  displayPlaceExhibits(container, placeId, isCreator);
                } catch (err) {
                  const message = err instanceof Error ? err.message : String(err);
                  alert(`Creation failed: ${message}`);
                }
              },
              (formEl) => {
                container.removeChild(formEl);
                (addBtn as HTMLButtonElement).disabled = false;
              }
            );
            container.appendChild(addForm);
            (addBtn as HTMLButtonElement).disabled = true;
          }
        }
      };
      const addBtn = Button(addBtnOptions);
      container.appendChild(addBtn);
    }
  } catch (_err) {
    container.replaceChildren();
    showError(container, "Exhibits unavailable.");
  }
}

// ─── Membership (Gym) ─────────────────────────────────────────────────────────

async function displayPlaceMembership(
  container: HTMLElement,
  placeId: string,
  isCreator: boolean,
  isLoggedIn: boolean
): Promise<void> {
  container.replaceChildren();
  showLoading(container);

  try {
    const plans = await apiFetch<MembershipPlan[]>(`/place/${placeId}/membership`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Membership Plans"]));
    const planSection = createElement("div", { class: "membership-section" }, []);

    plans.forEach((plan) => {
      const planDiv = createElement("div", { class: "plan-item" }, [
        createElement("h4", {}, [plan.name]),
        createElement("p", {}, [`Price: ${plan.price}`])
      ]);

      if (isLoggedIn) {
        const joinBtn = Button({
          title: "Join",
          id: `join-${plan._id}`,
          events: {
            click: () => {
              apiFetch(`/place/${placeId}/membership/${plan._id}/join`, "POST")
                .then(() => alert(`Joined ${plan.name} plan`))
                .catch((err) => {
                  const message = err instanceof Error ? err.message : String(err);
                  alert(`Join failed: ${message}`);
                });
            }
          }
        });
        planDiv.appendChild(joinBtn);
      }

      if (isCreator) {
        const editBtn = Button({
          title: "Edit",
          id: `edit-plan-${plan._id}`,
          events: {
            click: () => {
              const planDivClone = planDiv.cloneNode(true) as HTMLElement;
              const formFields: FormField[] = [
                { name: "name", placeholder: "Name", value: plan.name },
                { name: "price", placeholder: "Price", value: plan.price }
              ];
              const editForm = createInlineForm(
                formFields,
                async (data) => {
                  try {
                    await apiFetch(`/place/${placeId}/membership/${plan._id}`, "PUT", data);
                    displayPlaceMembership(container, placeId, isCreator, isLoggedIn);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    alert(`Update failed: ${message}`);
                  }
                },
                () => planDiv.replaceWith(planDivClone)
              );
              planDiv.replaceChildren(editForm);
            }
          }
        });

        const deleteBtn = Button({
          title: "Delete",
          id: `delete-plan-${plan._id}`,
          events: {
            click: async () => {
              if (!confirm(`Delete plan "${plan.name}"?`)) return;
              try {
                await apiFetch(`/place/${placeId}/membership/${plan._id}`, "DELETE");
                displayPlaceMembership(container, placeId, isCreator, isLoggedIn);
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                alert(`Delete failed: ${message}`);
              }
            }
          }
        });

        planDiv.appendChild(editBtn);
        planDiv.appendChild(deleteBtn);
      }

      planSection.appendChild(planDiv);
    });

    container.appendChild(planSection);

    if (isCreator) {
      const addBtnOptions: ButtonOptions = {
        title: "Add Plan",
        id: "add-plan",
        events: {
          click: () => {
            const formFields: FormField[] = [
              { name: "name", placeholder: "Name" },
              { name: "price", placeholder: "Price" }
            ];
            const addForm = createInlineForm(
              formFields,
              async (data) => {
                try {
                  await apiFetch(`/place/${placeId}/membership`, "POST", data);
                  displayPlaceMembership(container, placeId, isCreator, isLoggedIn);
                } catch (err) {
                  const message = err instanceof Error ? err.message : String(err);
                  alert(`Creation failed: ${message}`);
                }
              },
              (formEl) => {
                container.removeChild(formEl);
                (addBtn as HTMLButtonElement).disabled = false;
              }
            );
            container.appendChild(addForm);
            (addBtn as HTMLButtonElement).disabled = true;
          }
        }
      };
      const addBtn = Button(addBtnOptions);
      container.appendChild(addBtn);
    }
  } catch (_err) {
    container.replaceChildren();
    showError(container, "Membership data unavailable.");
  }
}

// ─── Shows (Theater) ───────────────────────────────────────────────────────────

async function displayPlaceShows(
  container: HTMLElement,
  placeId: string,
  isCreator: boolean,
  isLoggedIn: boolean
): Promise<void> {
  container.replaceChildren();
  showLoading(container);

  try {
    const shows = await apiFetch<Show[]>(`/place/${placeId}/shows`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Upcoming Shows"]));
    const showSection = createElement("div", { class: "show-section" }, []);

    shows.forEach((show) => {
      const showDiv = createElement("div", { class: "show-item" }, [
        createElement("h4", {}, [show.title]),
        createElement("p", {}, [`Date: ${show.date}`]),
        createElement("p", {}, [`Time: ${show.time}`])
      ]);

      if (isLoggedIn) {
        const bookBtn = Button({
          title: "Book Seat",
          id: `book-${show._id}`,
          events: {
            click: () => {
              apiFetch(`/place/${placeId}/shows/${show._id}/book`, "POST")
                .then(() => alert(`Booked seat for ${show.title}`))
                .catch((err) => {
                  const message = err instanceof Error ? err.message : String(err);
                  alert(`Booking failed: ${message}`);
                });
            }
          }
        });
        showDiv.appendChild(bookBtn);
      }

      if (isCreator) {
        const editBtn = Button({
          title: "Edit",
          id: `edit-show-${show._id}`,
          events: {
            click: () => {
              const showDivClone = showDiv.cloneNode(true) as HTMLElement;
              const formFields: FormField[] = [
                { name: "title", placeholder: "Title", value: show.title },
                { name: "date", placeholder: "Date", type: "date", value: show.date },
                { name: "time", placeholder: "Time", value: show.time }
              ];
              const editForm = createInlineForm(
                formFields,
                async (data) => {
                  try {
                    await apiFetch(`/place/${placeId}/shows/${show._id}`, "PUT", data);
                    displayPlaceShows(container, placeId, isCreator, isLoggedIn);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    alert(`Update failed: ${message}`);
                  }
                },
                () => showDiv.replaceWith(showDivClone)
              );
              showDiv.replaceChildren(editForm);
            }
          }
        });

        const deleteBtn = Button({
          title: "Delete",
          id: `delete-show-${show._id}`,
          events: {
            click: async () => {
              if (!confirm(`Delete show "${show.title}"?`)) return;
              try {
                await apiFetch(`/place/${placeId}/shows/${show._id}`, "DELETE");
                displayPlaceShows(container, placeId, isCreator, isLoggedIn);
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                alert(`Delete failed: ${message}`);
              }
            }
          }
        });

        showDiv.appendChild(editBtn);
        showDiv.appendChild(deleteBtn);
      }

      showSection.appendChild(showDiv);
    });

    container.appendChild(showSection);

    if (isCreator) {
      const addBtnOptions: ButtonOptions = {
        title: "Add Show",
        id: "add-show",
        events: {
          click: () => {
            const formFields: FormField[] = [
              { name: "title", placeholder: "Title" },
              { name: "date", placeholder: "Date", type: "date" },
              { name: "time", placeholder: "Time" }
            ];
            const addForm = createInlineForm(
              formFields,
              async (data) => {
                try {
                  await apiFetch(`/place/${placeId}/shows`, "POST", data);
                  displayPlaceShows(container, placeId, isCreator, isLoggedIn);
                } catch (err) {
                  const message = err instanceof Error ? err.message : String(err);
                  alert(`Creation failed: ${message}`);
                }
              },
              (formEl) => {
                container.removeChild(formEl);
                (addBtn as HTMLButtonElement).disabled = false;
              }
            );
            container.appendChild(addForm);
            (addBtn as HTMLButtonElement).disabled = true;
          }
        }
      };
      const addBtn = Button(addBtnOptions);
      container.appendChild(addBtn);
    }
  } catch (_err) {
    container.replaceChildren();
    showError(container, "Shows unavailable.");
  }
}

// ─── Fallback (Unknown Category) ───────────────────────────────────────────────

async function displayPlaceDetailsFallback(
  container: HTMLElement,
  categoryRaw: string,
  _placeId?: string
): Promise<void> {
  container.replaceChildren();

  container.appendChild(
    createElement("div", { class: "fallback-message" }, [
      createElement("p", {}, [`No special section for "${categoryRaw}".`])
    ])
  );
}

export {
  displayPlaceExhibits,
  displayPlaceMembership,
  displayPlaceShows,
  displayPlaceDetailsFallback,
  displayPlaceMenu,
  displayPlaceRooms,
  displayPlaceFacilities,
  displayPlaceServices,
  displaySaloonSlots
};

export { displayPlaceEvents } from "./tabscond/events.js";
export { displayPlaceProducts } from "./tabscond/products.js";
export { displayPlaceNearby } from "./tabscond/nearbyPlaces.js";