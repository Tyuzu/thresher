import { apiFetch } from "../../api/api.js";

class DeliveryStore {
  constructor() {
    this.deliveries = [];
    this.listeners = new Set();
    this.activeRole = "driver"; // "driver" | "merchant" | "customer"
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.deliveries));
  }

  normalize(raw = {}) {
    return {
      id: raw.id || raw.deliveryid || raw.orderid || `DEL-${Math.floor(1000 + Math.random() * 9000)}`,
      orderid: raw.orderid || raw.deliveryid || "",
      status: raw.status || "Pending",
      updatedAt: raw.updatedAt || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      packageName: raw.packageName || "General Package",
      weight: raw.weight || "1.0 kg",
      pickup: raw.pickup || "Warehouse A",
      dropoff: raw.dropoff || "Customer Location",
      distance: raw.distance || "3.5 km",
      eta: raw.eta || "15 mins",
      reward: Number(raw.reward) || 100,
      customerName: raw.customerName || "Valued Customer",
      customerPhone: raw.customerPhone || "+91 0000000000",
      notes: raw.notes || "None",
      driver: raw.driver || { name: "Alex", phone: "+91 9999999999", vehicle: "Honda Activa" }
    };
  }

  async loadDeliveries() {
    try {
      const payload = await apiFetch("/deliveries", "GET");
      if (Array.isArray(payload?.deliveries)) {
        this.deliveries = payload.deliveries.map((item) => this.normalize(item));
      } else {
        this.deliveries = this.getFallbackData();
      }
    } catch {
      this.deliveries = this.getFallbackData();
    }
    this.notify();
  }

  updateStatus(id, newStatus) {
    this.deliveries = this.deliveries.map((item) =>
      item.id === id ? { ...item, status: newStatus, updatedAt: "Just now" } : item
    );
    this.notify();
  }

  getFallbackData() {
    return [
      this.normalize({ id: "DEL-1001", status: "Pending", reward: 120, pickup: "Warehouse A", dropoff: "John Smith" }),
      this.normalize({ id: "DEL-1002", status: "In Transit", reward: 180, pickup: "Restaurant ABC", dropoff: "Michael" }),
      this.normalize({ id: "DEL-1003", status: "Delivered", reward: 95, pickup: "Supermarket X", dropoff: "Emily" })
    ];
  }
}

export const deliveryStore = new DeliveryStore();