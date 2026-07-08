import { createElement } from "../../components/createElement.js";
import { DeliveryStatusBadge } from "./components/DeliveryStatusBadge.js";

function MerchantDashboard({
    merchant = {},
    stats = {},
    activeDeliveries = [],

    onCreateDelivery = () => {},
    onViewDelivery = () => {},
    onManageDeliveries = () => {},
    onHistory = () => {},
    onSettings = () => {}
} = {}) {

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

    function quickAction(title, description, handler) {

        return createElement("button", {
            class: "btn",
            style: {
                width: "100%",
                padding: "16px",
                marginBottom: "12px",
                textAlign: "left"
            },
            events: {
                click: handler
            }
        }, [

            createElement("strong", {
                textContent: title
            }),

            createElement("br"),

            createElement("small", {
                textContent: description
            })

        ]);

    }

    function deliveryRow(delivery) {

        return createElement("div", {
            style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid #eee"
            }
        }, [

            createElement("div", {}, [

                createElement("strong", {
                    textContent: delivery.id
                }),

                createElement("p", {
                    textContent: `${delivery.pickup} → ${delivery.dropoff}`
                })

            ]),

            DeliveryStatusBadge(delivery.status),

            createElement("button", {
                class: "btn btn-primary",
                textContent: "View",
                events: {
                    click() {
                        onViewDelivery(delivery);
                    }
                }
            })

        ]);

    }

    const dashboard = createElement("section", {
        class: "merchant-dashboard",
        style: {
            display: "flex",
            flexDirection: "column",
            gap: "24px"
        }
    }, [

        createElement("div", {

            class: "card",

            style: {
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "20px"
            }

        }, [

            createElement("h2", {
                textContent: merchant.name || "Merchant Dashboard"
            }),

            createElement("p", {
                textContent: merchant.email || ""
            })

        ]),

        createElement("div", {
            style: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                gap: "20px"
            }
        }, [

            statCard("Active", stats.active || 0),

            statCard("Delivered", stats.delivered || 0),

            statCard("Cancelled", stats.cancelled || 0),

            statCard("Total Revenue", `₹${stats.revenue || 0}`)

        ]),

        createElement("div", {

            style: {
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "20px"
            }

        }, [

            createElement("div", {

                class: "card",

                style: {
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "20px"
                }

            }, [

                createElement("h3", {
                    textContent: "Quick Actions"
                }),

                quickAction(
                    "Create Delivery",
                    "Create a new delivery request.",
                    onCreateDelivery
                ),

                quickAction(
                    "Manage Deliveries",
                    "View all active deliveries.",
                    onManageDeliveries
                ),

                quickAction(
                    "Delivery History",
                    "Browse completed deliveries.",
                    onHistory
                ),

                quickAction(
                    "Settings",
                    "Merchant account settings.",
                    onSettings
                )

            ]),

            createElement("div", {

                class: "card",

                style: {
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "20px"
                }

            }, [

                createElement("h3", {
                    textContent: "Active Deliveries"
                }),

                activeDeliveries.length
                    ? activeDeliveries.map(deliveryRow)
                    : createElement("p", {
                        textContent: "No active deliveries."
                    })

            ])

        ])

    ]);

    return dashboard;

}

export { MerchantDashboard };