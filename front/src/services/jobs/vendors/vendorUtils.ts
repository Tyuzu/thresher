export function normalizeVendorList(response: any): any[] {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.vendors)) {
        return response.vendors;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.items)) {
        return response.items;
    }

    if (Array.isArray(response?.results)) {
        return response.results;
    }

    return [];
}

export function getVendorId(vendor: any): string | null {
    return vendor?.vendorid ?? vendor?.vendor_id ?? vendor?.vendorId ?? vendor?.id ?? null;
}

export function getVendorName(vendor: any): string {
    return (
        vendor?.name ??
        vendor?.full_name ??
        vendor?.fullname ??
        vendor?.business_name ??
        vendor?.title ??
        "Unnamed Vendor"
    );
}

export function normalizeErrorMessage(error: unknown): string {
    if (!error) {
        return "";
    }

    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error) {
        return error.message || "";
    }

    const errObj = error as any;
    return errObj.message || errObj.error || errObj.details || errObj.msg || "";
}

export function isValidEmail(email?: string): boolean {
    if (!email) {
        return true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function formatRequestStatus(status?: string): string {
    if (!status) return "Pending";
    switch (String(status).toLowerCase()) {
        case "pending": return "Request Pending";
        case "accepted":
        case "hired": return "Already Hired ✓";
        case "completed": return "Completed";
        case "cancelled": return "Cancelled";
        default: return status;
    }
}