import { apiFetch } from "../../../api/api.js";

function requireId(value, label) {
    if (value === null || value === undefined || value === "") {
        throw new Error(`${label} is required.`);
    }
}

export async function fetchVendors() {
    return apiFetch("/vendors", "GET");
}

export async function fetchVendor(vendorId) {
    requireId(vendorId, "Vendor ID");
    return apiFetch(`/vendors/${vendorId}`, "GET");
}

export async function fetchEventVendors(eventId) {
    requireId(eventId, "Event ID");
    return apiFetch(`/vendors/events/${eventId}`, "GET");
}

export async function createVendor(payload) {
    return apiFetch("/vendors", "POST", payload);
}

export async function updateVendor(vendorId, payload) {
    requireId(vendorId, "Vendor ID");
    return apiFetch(`/vendors/${vendorId}`, "PATCH", payload);
}

export async function deleteVendor(vendorId) {
    requireId(vendorId, "Vendor ID");
    return apiFetch(`/vendors/${vendorId}`, "DELETE");
}

export async function hireEventVendor(eventId, vendorId) {
    requireId(eventId, "Event ID");
    requireId(vendorId, "Vendor ID");
    return apiFetch(`/vendors/events/${eventId}/hire`, "POST", {
        vendorid: vendorId
    });
}

export async function removeEventVendor(eventId, vendorId) {
    requireId(eventId, "Event ID");
    requireId(vendorId, "Vendor ID");
    return apiFetch(`/vendors/events/${eventId}/vendor/${vendorId}`, "DELETE");
}