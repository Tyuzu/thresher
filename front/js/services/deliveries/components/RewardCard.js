import { createElement } from "../../../components/createElement.js";

function RewardCard(reward = 0) {

    return createElement("div", {
        class: "reward-card",
        style: {
            textAlign: "center",
            padding: "20px"
        }
    }, [

        createElement("div", {
            style: {
                fontSize: "13px",
                color: "#666"
            },
            textContent: "Reward"
        }),

        createElement("div", {
            style: {
                fontSize: "32px",
                fontWeight: "bold"
            },
            textContent: `₹${reward}`
        })

    ]);

}

export { RewardCard };