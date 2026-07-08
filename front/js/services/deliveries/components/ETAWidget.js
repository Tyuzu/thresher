import { createElement } from "../../../components/createElement.js";

function ETAWidget(eta = "--") {

    return createElement("div", {
        class: "eta-widget",
        style: {
            textAlign: "center",
            padding: "16px"
        }
    }, [

        createElement("div", {
            style: {
                fontSize: "13px",
                color: "#777"
            },
            textContent: "Estimated Arrival"
        }),

        createElement("div", {
            style: {
                fontSize: "28px",
                fontWeight: "bold"
            },
            textContent: eta
        })

    ]);

}

export { ETAWidget };