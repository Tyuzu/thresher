// bookingApi.ts

import { apiFetch } from "../../api/api.js";
import { BookingItem, PricingTier, BookingSlot } from "./bookingManager.js";

// ---------- Interfaces ----------

export interface CreateBookingPayload {
    seats?: number | string;
    userid?: string;
    date?: string;
    start?: string;
    end?: string;
    slotId?: string;
    tierId?: string;
    pricePaid?: number;
    [key: string]: any;
}

export interface BookingApiInstance {
    apiListSlots: () => Promise<BookingSlot[]>;
    apiCreateSlot: (slot: BookingSlot) => Promise<BookingSlot>;
    apiDeleteSlot: (slotId: string) => Promise<boolean>;
    apiListTiers: () => Promise<PricingTier[]>;
    apiCreateTier: (tier: PricingTier) => Promise<PricingTier>;
    apiDeleteTier: (tierId: string) => Promise<boolean>;
    apiGenerateSlotsFromTier: (tierId: string, startDate: string, endDate: string) => Promise<BookingSlot[]>;
    apiListBookings: () => Promise<BookingItem[]>;
    apiCreateBooking: (payload: CreateBookingPayload) => Promise<{ ok: boolean; reason?: string; booking?: BookingItem }>;
    apiCancelBooking: (bookingId: string) => Promise<boolean>;
}

export interface BookingStorageInstance {
    localSaveSlot: (slot: BookingSlot) => void;
    localGetSlots: () => BookingSlot[];
    localDeleteSlot: (slotId: string) => boolean;
    localSaveTier: (tier: PricingTier) => void;
    localGetTiers: () => PricingTier[];
    localDeleteTier: (tierId: string) => boolean;
    localGenerateSlotsFromTier: (tier: PricingTier, range: { startDate: string; endDate: string }) => BookingSlot[];
    localSaveBooking: (b: BookingItem) => void;
    localGetBookings: () => BookingItem[];
    localCancelBooking: (bookingId: string, userIdArg: string) => boolean;
    localGetDateCap: (date: string) => number | null;
    localSetDateCap: (date: string, cap: number) => void;
    BOOKING_KEY: string;
}

// ---------- Small helpers ----------

export function genId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- API wrappers ----------

/**
 * Determines if a caught error is a network connectivity failure.
 * If the server responded with an HTTP status code (e.g., 400, 409, 500), 
 * we must respect that response instead of falling back to local storage.
 */
function isNetworkError(err: any): boolean {
    // If the error object contains a response or status, it was processed by the server.
    if (err && (err.status || err.statusCode || err.response)) {
        return false;
    }
    return true; 
}

export function bookingApi(
    entityType: string, 
    entityId: string, 
    storage: BookingStorageInstance, 
    userId: string
): BookingApiInstance {
    // ----- Slots -----
    async function apiListSlots(): Promise<BookingSlot[]> {
        try {
            const res = await apiFetch(
                `/bookings/slots?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
            );
            return res.slots || [];
        } catch (err) {
            if (isNetworkError(err)) {
                console.warn("Slots API network failure, falling back to local storage", err);
                return storage.localGetSlots();
            }
            throw err;
        }
    }

    async function apiCreateSlot(slot: BookingSlot): Promise<BookingSlot> {
        try {
            const res = await apiFetch(`/bookings/slots`, "POST", slot);
            return res.slot;
        } catch (err) {
            if (isNetworkError(err)) {
                storage.localSaveSlot(slot);
                return slot;
            }
            throw err;
        }
    }

    async function apiDeleteSlot(slotId: string): Promise<boolean> {
        try {
            await apiFetch(`/bookings/slots/${slotId}`, "DELETE");
            return true;
        } catch (err) {
            if (isNetworkError(err)) {
                return storage.localDeleteSlot(slotId);
            }
            throw err;
        }
    }

    // ----- Tiers -----
    async function apiListTiers(): Promise<PricingTier[]> {
        try {
            const res = await apiFetch(
                `/bookings/tiers?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
            );
            return res.tiers || [];
        } catch (err) {
            if (isNetworkError(err)) {
                console.warn("Tiers API network failure, falling back to local storage", err);
                return storage.localGetTiers();
            }
            throw err;
        }
    }

    async function apiCreateTier(tier: PricingTier): Promise<PricingTier> {
        try {
            const res = await apiFetch(`/bookings/tiers`, "POST", tier);
            return res.tier;
        } catch (err) {
            if (isNetworkError(err)) {
                storage.localSaveTier(tier);
                return tier;
            }
            throw err;
        }
    }

    async function apiDeleteTier(tierId: string): Promise<boolean> {
        try {
            await apiFetch(`/bookings/tiers/${tierId}`, "DELETE");
            return true;
        } catch (err) {
            if (isNetworkError(err)) {
                return storage.localDeleteTier(tierId);
            }
            throw err;
        }
    }

    // ----- Auto-generate slots from tier -----
    async function apiGenerateSlotsFromTier(tierId: string, startDate: string, endDate: string): Promise<BookingSlot[]> {
        try {
            const res = await apiFetch(
                `/bookings/tiers/${tierId}/generate-slots`,
                "POST",
                { startDate, endDate }
            );
            return res.slots || [];
        } catch (err) {
            if (isNetworkError(err)) {
                const tier = storage.localGetTiers().find(t => t.id === tierId);
                if (!tier) return [];
                return storage.localGenerateSlotsFromTier(tier, { startDate, endDate });
            }
            throw err;
        }
    }

    // ----- Bookings -----
    async function apiListBookings(): Promise<BookingItem[]> {
        try {
            const res = await apiFetch(
                `/bookings/bookings?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
            );
            return res.bookings || [];
        } catch (err) {
            if (isNetworkError(err)) {
                console.warn("Bookings API network failure, falling back to local storage", err);
                return storage.localGetBookings();
            }
            throw err;
        }
    }

    async function apiCreateBooking(payload: CreateBookingPayload): Promise<{ ok: boolean; reason?: string; booking?: BookingItem }> {
        try {
            return await apiFetch(`/bookings/bookings`, "POST", payload);
        } catch (err: any) {
            if (!isNetworkError(err)) {
                // Return server validation payload to the UI safely
                return { ok: false, reason: err.message || "server-error" };
            }

            // Local fallback validation rules
            const all = JSON.parse(localStorage.getItem(storage.BOOKING_KEY) || "{}");
            if (!all[entityType]) all[entityType] = {};
            if (!all[entityType][entityId]) all[entityType][entityId] = [];

            const bookings: BookingItem[] = all[entityType][entityId];
            const rawSeats = payload.seats;
            const seatsToBook = Math.max(1, parseInt(typeof rawSeats === "number" ? String(rawSeats) : (rawSeats || "1"), 10));

            // Enforce one booking per user per date locally
            if (payload.userid && payload.date) {
                const userHasBookingThisDate = bookings.some(
                    b => b.userid === payload.userid && b.date === payload.date && b.status !== "cancelled"
                );
                if (userHasBookingThisDate) {
                    return { ok: false, reason: "one-per-day" };
                }
            }

            // Slot validation rules
            if (payload.slotId) {
                const slots = storage.localGetSlots();
                const slot = slots.find(s => s.id === payload.slotId);
                if (!slot) return { ok: false, reason: "slot-missing" };

                const bookedSeats = bookings
                    .filter(b => b.slotId === slot.id && b.status !== "cancelled")
                    .reduce((sum, b) => sum + (b.seats || 1), 0);

                if (bookedSeats + seatsToBook > (slot.capacity || 0)) {
                    return { ok: false, reason: "slot-full" };
                }

                const userAlready = bookings.some(
                    b => b.userid === payload.userid && b.slotId === slot.id && b.status !== "cancelled"
                );
                if (userAlready) return { ok: false, reason: "already-slot" };
            } else if (payload.tierId) {
                const tier = storage.localGetTiers().find(t => t.id === payload.tierId);
                if (!tier) return { ok: false, reason: "tier-missing" };

                const bookedTierSeats = bookings
                    .filter(b => b.tierId === tier.id && b.date === payload.date && b.status !== "cancelled")
                    .reduce((sum, b) => sum + (b.seats || 1), 0);

                if (bookedTierSeats + seatsToBook > (tier.capacity || 0)) {
                    return { ok: false, reason: "tier-full" };
                }
            }

            const stored: BookingItem = {
                id: genId(),
                slotId: payload.slotId ?? undefined,
                tierId: payload.tierId ?? undefined,
                userid: payload.userid || "",
                entityType,
                entityId,
                date: payload.date || "",
                start: payload.start || "",
                end: payload.end || payload.start || "",
                seats: seatsToBook,
                pricePaid: payload.pricePaid ?? undefined,
                status: "active"
            };

            storage.localSaveBooking(stored);
            return { ok: true, booking: stored };
        }
    }

    async function apiCancelBooking(bookingId: string): Promise<boolean> {
        try {
            await apiFetch(`/bookings/bookings/${bookingId}`, "DELETE");
            return true;
        } catch (err) {
            if (isNetworkError(err)) {
                return storage.localCancelBooking(bookingId, userId);
            }
            throw err;
        }
    }

    return {
        apiListSlots, apiCreateSlot, apiDeleteSlot,
        apiListTiers, apiCreateTier, apiDeleteTier, apiGenerateSlotsFromTier,
        apiListBookings, apiCreateBooking, apiCancelBooking
    };
}

// ---------- LocalStorage helpers ----------

export function bookingStorage(entityType: string, entityId: string): BookingStorageInstance {
    const SLOT_KEY = "entity_slots";
    const TIER_KEY = "entity_tiers";
    const BOOKING_KEY = "entity_bookings";
    const DATE_CAP_KEY = "entity_date_caps";

    const readJson = (key: string): Record<string, any> => {
        try {
            return JSON.parse(localStorage.getItem(key) || "{}");
        } catch {
            return {};
        }
    };
    const writeJson = (key: string, value: any): void => localStorage.setItem(key, JSON.stringify(value));

    // ----- Slots -----
    function localSaveSlot(slot: BookingSlot): void {
        const all = readJson(SLOT_KEY);
        if (!all[entityType]) {
            all[entityType] = {};
        }
        if (!all[entityType][entityId]) {
            all[entityType][entityId] = [];
        }
        all[entityType][entityId].push(slot);
        writeJson(SLOT_KEY, all);
    }

    function localGetSlots(): BookingSlot[] {
        const all = readJson(SLOT_KEY);
        return all[entityType]?.[entityId] || [];
    }

    function localDeleteSlot(slotId: string): boolean {
        const all = readJson(SLOT_KEY);
        if (!all[entityType]?.[entityId]) {
            return false;
        }
        all[entityType][entityId] = all[entityType][entityId].filter((s: BookingSlot) => s.id !== slotId);
        writeJson(SLOT_KEY, all);

        // Cascade delete bookings for slot
        const bookings = readJson(BOOKING_KEY);
        if (bookings[entityType]?.[entityId]) {
            bookings[entityType][entityId] = bookings[entityType][entityId].filter((b: BookingItem) => b.slotId !== slotId);
            writeJson(BOOKING_KEY, bookings);
        }
        return true;
    }

    // ----- Tiers -----
    function localSaveTier(tier: PricingTier): void {
        const all = readJson(TIER_KEY);
        if (!all[entityType]) {
            all[entityType] = {};
        }
        if (!all[entityType][entityId]) {
            all[entityType][entityId] = [];
        }
        all[entityType][entityId].push(tier);
        writeJson(TIER_KEY, all);
    }

    function localGetTiers(): PricingTier[] {
        const all = readJson(TIER_KEY);
        return all[entityType]?.[entityId] || [];
    }

    function localDeleteTier(tierId: string): boolean {
        const all = readJson(TIER_KEY);
        if (!all[entityType]?.[entityId]) {
            return false;
        }
        all[entityType][entityId] = all[entityType][entityId].filter((t: PricingTier) => t.id !== tierId);
        writeJson(TIER_KEY, all);
        return true;
    }

    function localGenerateSlotsFromTier(tier: PricingTier, { startDate, endDate }: { startDate: string; endDate: string }): BookingSlot[] {
        const slots: BookingSlot[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (tier.daysOfWeek && tier.daysOfWeek.length > 0 && !tier.daysOfWeek.includes(d.getDay())) {
                continue;
            }

            const dateStr = d.toISOString().split("T")[0] || "";
            const [startH, startM] = (tier.timeRange?.[0] || "09:00").split(":").map(Number);
            const [endH, endM] = (tier.timeRange?.[1] || "17:00").split(":").map(Number);

            const slot: BookingSlot = {
                id: genId(),
                tierId: tier.id,
                tierName: tier.name,
                date: dateStr,
                start: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
                end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
                capacity: tier.capacity
            };
            localSaveSlot(slot);
            slots.push(slot);
        }
        return slots;
    }

    // ----- Bookings -----
    function localSaveBooking(b: BookingItem): void {
        const all = readJson(BOOKING_KEY);
        if (!all[entityType]) {
            all[entityType] = {};
        }
        if (!all[entityType][entityId]) {
            all[entityType][entityId] = [];
        }
        all[entityType][entityId].push(b);
        writeJson(BOOKING_KEY, all);
    }

    function localGetBookings(): BookingItem[] {
        const all = readJson(BOOKING_KEY);
        return all[entityType]?.[entityId] || [];
    }

    function localCancelBooking(bookingId: string, userIdArg: string): boolean {
        const all = readJson(BOOKING_KEY);
        if (!all[entityType]?.[entityId]) {
            return false;
        }

        const bookings: BookingItem[] = all[entityType][entityId];
        const target = bookings.find(b => b.id === bookingId && b.userid === userIdArg);
        if (!target) {
            return false;
        }

        all[entityType][entityId] = bookings.map(b =>
            b.id === bookingId && b.userid === userIdArg ? { ...b, status: "cancelled" } : b
        );
        writeJson(BOOKING_KEY, all);
        return true;
    }

    // ----- Date caps -----
    function localGetDateCap(date: string): number | null {
        const all = readJson(DATE_CAP_KEY);
        return all[entityType]?.[entityId]?.[date] ?? null;
    }

    function localSetDateCap(date: string, cap: number): void {
        const all = readJson(DATE_CAP_KEY);
        if (!all[entityType]) {
            all[entityType] = {};
        }
        if (!all[entityType][entityId]) {
            all[entityType][entityId] = {};
        }
        all[entityType][entityId][date] = cap;
        writeJson(DATE_CAP_KEY, all);
    }

    return {
        localSaveSlot, localGetSlots, localDeleteSlot,
        localSaveTier, localGetTiers, localDeleteTier, localGenerateSlotsFromTier,
        localSaveBooking, localGetBookings, localCancelBooking,
        localGetDateCap, localSetDateCap,
        BOOKING_KEY
    };
}