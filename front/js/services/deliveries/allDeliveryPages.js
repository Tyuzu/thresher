import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";
import { apiFetch } from "../../api/api.js";

import { DriverDashboard } from "./DriverDashboard.js";
import { AvailableDeliveriesPage } from "./AvailableDeliveriesPage.js";
import { DeliveryDetailsPage } from "./DeliveryDetailsPage.js";
import { DeliveryProgressPage } from "./DeliveryProgressPage.js";
import { TrackDeliveryPage } from "./TrackDeliveryPage.js";
import { DeliveryHistoryPage } from "./DeliveryHistoryPage.js";
import { MerchantDashboard } from "./MerchantDashboard.js";

function buildDemoData() {
    const driver = {
        name: "Alex",
        phone: "+91 9999999999",
        vehicle: "Honda Activa"
    };

    const delivery = {
        id: "DEL-1001",
        status: "Accepted",
        updatedAt: "Just now",

        packageName: "Laptop",
        weight: "2 kg",

        pickup: "Warehouse A",
        dropoff: "John Smith",

        distance: "5.2 km",
        eta: "18 min",

        reward: 120,

        customerName: "John Smith",
        customerPhone: "+91 8888888888",

        notes: "Leave at reception.",

        driver
    };

    const history = [
        {
            id: "DEL-0999",
            pickup: "Warehouse",
            dropoff: "Emily",
            completedAt: "Yesterday",
            distance: "4 km",
            reward: 95,
            status: "Delivered"
        }
    ];

    const available = [
        delivery,
        {
            ...delivery,
            id: "DEL-1002",
            reward: 180,
            pickup: "Restaurant ABC",
            dropoff: "Michael"
        }
    ];

    return { driver, delivery, history, available };
}

function buildDeliveryShape(raw = {}, fallback = {}) {
    return {
        id: raw.deliveryid || raw.orderid || fallback.deliveryid || "",
        orderid: raw.orderid || raw.deliveryid || fallback.orderid || "",
        status: raw.status || fallback.status || "Pending",
        updatedAt: raw.updatedAt || fallback.updatedAt || "",
        packageName: raw.packageName || fallback.packageName || "Order shipment",
        weight: raw.weight || fallback.weight || "1 kg",
        pickup: raw.pickup || fallback.pickup || "",
        dropoff: raw.dropoff || fallback.dropoff || "",
        distance: raw.distance || fallback.distance || "5 km",
        eta: raw.eta || fallback.eta || "20 min",
        reward: raw.reward || fallback.reward || 0,
        customerName: raw.customerName || fallback.customerName || "",
        customerPhone: raw.customerPhone || fallback.customerPhone || "",
        notes: raw.notes || fallback.notes || "",
        driver: raw.driver || fallback.driver || {
            name: "Assigned driver",
            phone: "",
            vehicle: ""
        }
    };
}

function DemoPage() {
    const { driver, delivery, history, available } = buildDemoData();

    function section(title, content) {
        return createElement("section", {
            style: {
                marginBottom: "60px"
            }
        }, [
            createElement("h1", {
                textContent: title
            }),
            content
        ]);
    }

    return createElement("div", {
        class: "demo-page",
        style: {
            maxWidth: "1200px",
            margin: "40px auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "60px"
        }
    }, [
        section("Driver Dashboard", DriverDashboard({
            driver,
            stats: {
                earnings: 860,
                completed: 9,
                available: 12,
                rating: "4.9 ★"
            }
        })),

        section("Available Deliveries", AvailableDeliveriesPage({
            deliveries: available
        })),

        section("Delivery Details", DeliveryDetailsPage({ delivery })),

        section("Delivery Progress", DeliveryProgressPage({ delivery })),

        section("Customer Tracking", TrackDeliveryPage({ delivery })),

        section("Delivery History", DeliveryHistoryPage({ deliveries: history })),

        section("Merchant Dashboard", MerchantDashboard({
            merchant: {
                name: "ABC Electronics",
                email: "orders@example.com"
            },
            stats: {
                active: 8,
                delivered: 143,
                cancelled: 2,
                revenue: 25480
            },
            activeDeliveries: available
        }))
    ]);
}

function createPageShell(title, subtitle, content) {
    return createElement("div", {
        class: "delivery-shell",
        style: {
            maxWidth: "1200px",
            margin: "32px auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
        }
    }, [
        createElement("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                gap: "6px"
            }
        }, [
            createElement("h1", {
                textContent: title
            }),
            createElement("p", {
                textContent: subtitle,
                style: {
                    color: "#666",
                    margin: 0
                }
            })
        ]),
        content
    ]);
}

export async function displayDeliveries(contentContainer, isLoggedIn) {
    contentContainer.replaceChildren();

    const { delivery } = buildDemoData();
    const notice = createElement("div", {
        style: {
            padding: "12px 16px",
            borderRadius: "8px",
            background: "#f8f9fb",
            color: "#444"
        }
    }, [
        isLoggedIn
            ? "Track, accept, and manage delivery missions from one place."
            : "Sign in to manage delivery requests and follow progress."
    ]);

    const initialContent = createElement("div", {
        style: {
            display: "flex",
            flexDirection: "column",
            gap: "24px"
        }
    }, [
        notice,
        DriverDashboard({
            driver: delivery.driver,
            stats: {
                earnings: 860,
                completed: 9,
                available: 12,
                rating: "4.9 ★"
            }
        })
    ]);

    const page = createPageShell(
        "Deliveries",
        "Browse nearby jobs, review progress, and check recent delivery history.",
        initialContent
    );

    contentContainer.appendChild(page);

    if (!isLoggedIn) {
        return;
    }

    try {
        const payload = await apiFetch("/deliveries", "GET");
        const deliveries = Array.isArray(payload?.deliveries)
            ? payload.deliveries.map((item) => buildDeliveryShape(item, delivery))
            : [];

        const history = deliveries.filter((item) => String(item.status).toLowerCase().includes("deliver"));
        const available = deliveries.filter((item) => !String(item.status).toLowerCase().includes("deliver"));

        const content = createElement("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                gap: "24px"
            }
        }, [
            notice,
            DriverDashboard({
                driver: delivery.driver,
                stats: {
                    earnings: 860,
                    completed: history.length,
                    available: available.length,
                    rating: "4.9 ★"
                }
            }),
            AvailableDeliveriesPage({
                deliveries: available,
                onView: (item) => navigate(`/deliveries/${item.deliveryid}`),
                onAccept: () => {
                    notice.replaceChildren("Delivery accepted. You can review the route and progress from the tracking view.");
                }
            }),
            DeliveryHistoryPage({
                deliveries: history,
                onView: (item) => navigate(`/deliveries/${item.deliveryid}`),
                onBack: () => navigate("/deliveries")
            })
        ]);

        contentContainer.replaceChildren(createPageShell(
            "Deliveries",
            "Browse nearby jobs, review progress, and check recent delivery history.",
            content
        ));
    } catch (err) {
        console.error("Failed to load deliveries:", err);
        notice.replaceChildren("Unable to load deliveries right now. Please try again shortly.");
    }
}

export async function displayDelivery(contentContainer, deliveryid, isLoggedIn) {
    contentContainer.replaceChildren();

    const { delivery } = buildDemoData();
    const page = createPageShell(
        `Delivery ${deliveryid}`,
        "Review shipment details, follow progress, and keep the handoff moving.",
        createElement("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                gap: "24px"
            }
        }, [])
    );

    contentContainer.appendChild(page);

    if (!isLoggedIn) {
        return;
    }

    try {
        const payload = await apiFetch(`/deliveries/${encodeURIComponent(deliveryid)}`, "GET");
        const selectedDelivery = buildDeliveryShape(payload, delivery);

        const detailContent = createElement("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                gap: "24px"
            }
        }, [
            createElement("button", {
                class: "btn",
                textContent: "← Back to deliveries",
                events: {
                    click() {
                        navigate("/deliveries");
                    }
                }
            }),
            DeliveryDetailsPage({
                delivery: selectedDelivery,
                onBack: () => navigate("/deliveries"),
                onAccept: () => {
                    selectedDelivery.status = "Accepted";
                }
            }),
            DeliveryProgressPage({
                delivery: { ...selectedDelivery, status: selectedDelivery.status || "Waiting" }
            }),
            TrackDeliveryPage({
                delivery: { ...selectedDelivery, updatedAt: selectedDelivery.updatedAt || "Just now" }
            }),
            MerchantDashboard({
                merchant: {
                    name: "ABC Electronics",
                    email: "orders@example.com"
                },
                stats: {
                    active: 8,
                    delivered: 143,
                    cancelled: 2,
                    revenue: 25480
                },
                activeDeliveries: []
            })
        ]);

        contentContainer.replaceChildren(createPageShell(
            `Delivery ${selectedDelivery.deliveryid}`,
            "Review shipment details, follow progress, and keep the handoff moving.",
            detailContent
        ));
    } catch (err) {
        console.error("Failed to load delivery details:", err);
    }
}

export { DemoPage };