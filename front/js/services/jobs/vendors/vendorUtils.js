export function normalizeVendorList(response) {
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

export function getVendorId(vendor) {
    return vendor?.vendorid ?? vendor?.vendor_id ?? vendor?.vendorId ?? vendor?.id ?? null;
}

export function getVendorName(vendor) {
    return (
        vendor?.name ??
        vendor?.full_name ??
        vendor?.fullname ??
        vendor?.business_name ??
        vendor?.title ??
        "Unnamed Vendor"
    );
}

export function normalizeErrorMessage(error) {
    if (!error) {
        return "";
    }

    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error) {
        return error.message || "";
    }

    return error.message || error.error || error.details || error.msg || "";
}

export function isValidEmail(email) {
    if (!email) {
        return true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}