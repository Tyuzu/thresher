import { createElement } from "../../components/createElement.js";

function DriverDashboard({
    driver = {},
    stats = {},
    onAvailableDeliveries = () => {},
    onCurrentDelivery = () => {},
    onHistory = () => {},
    onProfile = () => {}
} = {}) {

    function statCard(title, value) {

        return createElement("div", {
            class: "card",
            style: {
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                textAlign: "center"
            }
        }, [

            createElement("div", {
                style: {
                    fontSize: "14px",
                    color: "#666"
                },
                textContent: title
            }),

            createElement("h2", {
                textContent: value
            })

        ]);

    }

    function menuButton(title, description, handler) {

        return createElement("button", {
            class: "btn",
            style: {
                width: "100%",
                padding: "18px",
                marginBottom: "15px",
                textAlign: "left",
                cursor: "pointer"
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

    const profileCard = createElement("div", {
        class: "card",
        style: {
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px"
        }
    }, [

        createElement("h2", {
            textContent: driver.name || "Driver"
        }),

        createElement("p", {
            textContent: driver.vehicle || "-"
        }),

        createElement("p", {
            textContent: driver.phone || "-"
        }),

        createElement("button", {
            class: "btn",
            textContent: "View Profile",
            events: {
                click: onProfile
            }
        })

    ]);

    const statsGrid = createElement("div", {
        style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: "20px"
        }
    }, [

        statCard("Today's Earnings", `₹${stats.earnings || 0}`),

        statCard("Completed Today", stats.completed || 0),

        statCard("Available Jobs", stats.available || 0),

        statCard("Rating", stats.rating || "N/A")

    ]);

    const menu = createElement("div", {

        style: {
            display: "flex",
            flexDirection: "column"
        }

    }, [

        menuButton(
            "Available Deliveries",
            "Browse and accept nearby deliveries.",
            onAvailableDeliveries
        ),

        menuButton(
            "Current Delivery",
            "Continue your active delivery.",
            onCurrentDelivery
        ),

        menuButton(
            "Delivery History",
            "View completed deliveries and earnings.",
            onHistory
        )

    ]);

    return createElement("section", {

        class: "driver-dashboard",

        style: {
            display: "flex",
            flexDirection: "column",
            gap: "25px"
        }

    }, [

        profileCard,

        statsGrid,

        createElement("div", {

            class: "card",

            style: {
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "8px"
            }

        }, [

            createElement("h3", {
                textContent: "Quick Actions"
            }),

            menu

        ])

    ]);

}

export { DriverDashboard };