
// ============================================
// 6. STYLE INJECTION
// ============================================

/**
 * Inject vendor system styles if not already present
 */
export function injectVendorStyles() {
    if (document.getElementById("vendor-system-styles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "vendor-system-styles";
    style.textContent = `
        /* Modal Styles */
        .modal {
            display: flex;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.4);
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background-color: #fefefe;
            margin: auto;
            padding: 0;
            border-radius: 8px;
            width: 90%;
            max-width: 900px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            background: #f9f9f9;
        }

        .modal-header h2 {
            margin: 0;
            font-size: 20px;
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            color: #999;
        }

        .close-btn:hover {
            color: #333;
        }

        .modal-body {
            padding: 20px;
        }

        /* Event Vendor Summary */
        .vendors-summary {
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: #f9f9f9;
        }

        .hired-vendors-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
            margin: 16px 0;
        }

        .vendor-summary-item {
            padding: 12px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
        }

        .vendor-summary-item h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
        }

        .vendor-category {
            display: inline-block;
            background: #e8f0fe;
            color: #0066cc;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
        }

        /* Buttons */
        .btn-primary, .btn-secondary {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        .btn-primary {
            background: #0066cc;
            color: white;
        }

        .btn-primary:hover {
            background: #0052a3;
        }

        .btn-secondary {
            background: #e0e0e0;
            color: #333;
        }

        .btn-secondary:hover {
            background: #d0d0d0;
        }

        /* Vendor Profile */
        .vendor-profile {
            padding: 20px;
            background: white;
            border-radius: 8px;
        }

        .profile-field {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .profile-field label {
            font-weight: 600;
            color: #333;
        }

        .profile-field span {
            color: #666;
        }
    `;

    document.head.appendChild(style);
}


export function addVendorStyles() {
    if (document.getElementById("vendor-styles")) return;

    const style = document.createElement("style");
    style.id = "vendor-styles";
    style.textContent = `
        .vendors-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .vendors-header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 20px;
        }

        .vendors-title {
            font-size: 28px;
            font-weight: 600;
            margin: 0;
            color: #333;
        }

        .vendors-subtitle {
            font-size: 14px;
            color: #666;
            margin: 8px 0 0 0;
        }

        .vendor-registration-section {
            margin-top: 40px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
        }

        .registration-title {
            margin-top: 0;
            color: #333;
            font-size: 18px;
        }

        #vendor-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        #vendor-form input,
        #vendor-form textarea {
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
        }

        #vendor-form input:focus,
        #vendor-form textarea:focus {
            outline: none;
            border-color: #0066cc;
            box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        #vendor-form h4 {
            margin: 10px 0 15px 0;
            color: #333;
        }

        #vendors-list {
            margin-bottom: 30px;
        }

        #vendors-list h4 {
            margin-top: 0;
            color: #333;
        }

        .vendor-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }

        .vendor-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
            background: white;
            transition: all 0.3s ease;
        }

        .vendor-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-color: #0066cc;
        }

        .vendor-card h5 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 16px;
        }

        .vendor-category {
            display: inline-block;
            background: #e8f0fe;
            color: #0066cc;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-bottom: 12px;
        }

        .vendor-info {
            font-size: 13px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 12px;
        }

        .vendor-rating {
            color: #ff9800;
            font-size: 13px;
            margin-bottom: 12px;
        }

        .vendor-actions {
            display: flex;
            gap: 8px;
        }

        .vendor-card button {
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        .vendor-card button.hire-btn {
            background: #0066cc;
            color: white;
        }

        .vendor-card button.hire-btn:hover {
            background: #0052a3;
        }

        .vendor-card button.hire-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .no-vendors-message {
            text-align: center;
            padding: 40px 20px;
            color: #999;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

