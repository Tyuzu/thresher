import "../../../css/ui/Owl.css";
import { createElement } from "../../components/createElement.js"; // Adjust path as needed

const Owl = (eventsArray = []) => {
  const eventCards = eventsArray.map((event) => {
    const img = createElement("img", {
      src: event.image || "",
      alt: event.name || "Event Image",
      class: "event-image"
    });

    const details = createElement("div", { class: "event-details" }, [
      createElement("h3", {}, [event.name || "Event Name"]),
      createElement("p", {}, [`Date: ${event.date || "TBD"}`]),
      createElement("p", {}, [`Location: ${event.location || "TBD"}`])
    ]);

    return createElement("div", {
      class: "event-card",
      events: {
        click: () => {
          alert(`You clicked on ${event.name}`); // Replace with desired functionality
        }
      }
    }, [img, details]);
  });

  const owlContainer = createElement("div", { class: "owl" }, eventCards);

  return owlContainer;
};

export default Owl;