import { createElement } from "../../components/createElement.js";
import { DeliveryStatusBadge } from "../components/DeliveryStatusBadge.js";

function DeliveryHistoryPage({
    deliveries = [],
    onView = () => {},
    onBack = () => {}
} = {}) {

    function historyCard(delivery) {

        return createElement("div", {
            class: "card",
            style: {
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "16px"
            }
        }, [

            createElement("div", {
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }
            }, [

                createElement("strong", {
                    textContent: `#${delivery.id}`
                }),

                DeliveryStatusBadge(delivery.status)

            ]),

            createElement("hr"),

            createElement("p", {
                textContent: `Pickup: ${delivery.pickup}`
            }),

            createElement("p", {
                textContent: `Destination: ${delivery.dropoff}`
            }),

            createElement("p", {
                textContent: `Completed: ${delivery.completedAt}`
            }),

            createElement("p", {
                textContent: `Distance: ${delivery.distance}`
            }),

            createElement("p", {
                textContent: `Reward: ₹${delivery.reward}`
            }),

            createElement("div", {
                style: {
                    display: "flex",
                    justifyContent: "flex-end"
                }
            }, [

                createElement("button", {
                    class: "btn",
                    textContent: "View",
                    events: {
                        click() {
                            onView(delivery);
                        }
                    }
                })

            ])

        ]);

    }

    const totalDeliveries = deliveries.length;

    const totalRewards = deliveries.reduce((sum, delivery) => {
        return sum + Number(delivery.reward || 0);
    }, 0);

    const stats = createElement("div", {
        style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: "20px"
        }
    }, [

        statCard("Completed Deliveries", totalDeliveries),

        statCard("Total Earnings", `₹${totalRewards}`)

    ]);

    function statCard(title, value) {

        return createElement("div", {
            class: "card",
            style: {
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "20px",
                textAlign: "center"
            }
        }, [

            createElement("div", {
                style: {
                    color: "#666"
                },
                textContent: title
            }),

            createElement("h2", {
                textContent: value
            })

        ]);

    }

    const list = createElement("div", {
        style: {
            display: "flex",
            flexDirection: "column",
            gap: "16px"
        }
    });

    if (!deliveries.length) {

        list.appendChild(

            createElement("div", {
                class: "card",
                style: {
                    padding: "40px",
                    textAlign: "center",
                    border: "1px solid #ddd",
                    borderRadius: "8px"
                }
            }, [

                createElement("h3", {
                    textContent: "No Delivery History"
                }),

                createElement("p", {
                    textContent: "Completed deliveries will appear here."
                })

            ])

        );

    } else {

        deliveries.forEach(delivery => {
            list.appendChild(historyCard(delivery));
        });

    }

    return createElement("section", {
        class: "delivery-history-page",
        style: {
            display: "flex",
            flexDirection: "column",
            gap: "24px"
        }
    }, [

        createElement("div", {
            style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }
        }, [

            createElement("h2", {
                textContent: "Delivery History"
            }),

            createElement("button", {
                class: "btn",
                textContent: "Back",
                events: {
                    click: onBack
                }
            })

        ]),

        stats,

        list

    ]);

}

export { DeliveryHistoryPage };