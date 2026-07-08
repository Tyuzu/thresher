import { createElement } from "../../components/createElement.js";

import { DriverDashboard } from "./DriverDashboard.js";
import { AvailableDeliveriesPage } from "./AvailableDeliveriesPage.js";
import { DeliveryDetailsPage } from "./DeliveryDetailsPage.js";
import { DeliveryProgressPage } from "./DeliveryProgressPage.js";
import { TrackDeliveryPage } from "./TrackDeliveryPage.js";
import { DeliveryHistoryPage } from "./DeliveryHistoryPage.js";
import { MerchantDashboard } from "./MerchantDashboard.js";

function DemoPage() {

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

        section("Driver Dashboard",

            DriverDashboard({

                driver,

                stats: {
                    earnings: 860,
                    completed: 9,
                    available: 12,
                    rating: "4.9 ★"
                }

            })

        ),

        section("Available Deliveries",

            AvailableDeliveriesPage({

                deliveries: available

            })

        ),

        section("Delivery Details",

            DeliveryDetailsPage({

                delivery

            })

        ),

        section("Delivery Progress",

            DeliveryProgressPage({

                delivery

            })

        ),

        section("Customer Tracking",

            TrackDeliveryPage({

                delivery

            })

        ),

        section("Delivery History",

            DeliveryHistoryPage({

                deliveries: history

            })

        ),

        section("Merchant Dashboard",

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

                activeDeliveries: available

            })

        )

    ]);

}

export function displayDeliveries(contentContainer, isLoggedIn) { }
export function displayDelivery(contentContainer, deliveryid, isLoggedIn) { }

export { DemoPage };