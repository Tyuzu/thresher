// src/ui/cart/printInvoice.js
import Notify from "../../components/ui/Notify.mjs";

/* ────────────────────── Core Functional Helpers ────────────────────── */

function toRupees(amount) {
  return Number(amount || 0) / 100;
}

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Defensive XSS Sanitizer to safeguard HTML string templates
 */
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ────────────────────── Main Print Processing ────────────────────── */

export function printInvoice(order, items = []) {
  if (!order || typeof order !== "object") {
    Notify("Invalid order data payload", { type: "error", duration: 3000 });
    return;
  }

  const invoiceWindow = window.open("", "_blank");

  if (!invoiceWindow) {
    Notify("Pop-up blocked! Please allow windows to view invoice.", {
      type: "warning",
      duration: 5000
    });
    return;
  }

  // FIXED: Escaped all dynamic array property maps securely against code injection vulnerabilities
  const itemRows = (Array.isArray(items) ? items : [])
    .map(item => {
      const price = toRupees(item.price || 0);
      const total = price * (Number(item.quantity) || 0);

      return `
        <tr>
          <td>${escapeHTML(item.itemName || item.name || "Item")}</td>
          <td>${Number(item.quantity) || 0}</td>
          <td>${escapeHTML(formatINR(price))}</td>
          <td>${escapeHTML(formatINR(total))}</td>
        </tr>
      `;
    })
    .join("");

  const rawDate = order.createdAt || order.created_at || Date.now();
  const invoiceDate = new Date(rawDate).toLocaleString();

  // FIXED: Double-wrapped all parameters in validation escape filters
  invoiceWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - ${escapeHTML(order.orderid || "Draft")}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            padding: 32px;
            color: #222;
            background: #fff;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 16px;
          }
          .title { margin: 0; font-size: 28px; color: #111; }
          .meta p { margin: 4px 0; }
          .section { margin-top: 24px; }
          .section h3 { margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          th { background: #f8f9fa; font-weight: 600; }
          th, td { border: 1px solid #dee2e6; padding: 12px; text-align: left; }
          td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: right; }
          .totals { margin-top: 24px; margin-left: auto; width: 320px; }
          .totals-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .grand-total {
            font-size: 20px;
            font-weight: bold;
            border-top: 2px solid #222;
            padding-top: 10px;
            margin-top: 10px;
          }
          .footer {
            margin-top: 60px;
            text-align: center;
            color: #6c757d;
            font-size: 13px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Invoice</h1>
            <p style="margin-top: 8px;">Order ID: <strong>${escapeHTML(order.orderid || "-")}</strong></p>
          </div>
          <div class="meta">
            <p><strong>Date:</strong> ${escapeHTML(invoiceDate)}</p>
            <p><strong>Status:</strong> ${escapeHTML(order.status || "-")}</p>
            <p><strong>Payment:</strong> ${escapeHTML(order.paymentStatus || order.payment_status || "-")}</p>
          </div>
        </div>

        <div class="section">
          <h3>Customer Details</h3>
          <p><strong>Name:</strong> ${escapeHTML(order.customerName || order.customer_name || "-")}</p>
          <p><strong>Phone:</strong> ${escapeHTML(order.phone || "-")}</p>
          <p><strong>Address:</strong> ${escapeHTML(order.address || "-")}</p>
        </div>

        <div class="section">
          <h3>Items Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${escapeHTML(formatINR(toRupees(order.subtotal || 0)))}</span>
          </div>
          <div class="totals-row">
            <span>Discount</span>
            <span>${escapeHTML(formatINR(toRupees(order.discount || 0)))}</span>
          </div>
          <div class="totals-row">
            <span>Tax</span>
            <span>${escapeHTML(formatINR(toRupees(order.tax || 0)))}</span>
          </div>
          <div class="totals-row">
            <span>Delivery</span>
            <span>${escapeHTML(formatINR(toRupees(order.delivery || 0)))}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Total Amount</span>
            <span>${escapeHTML(formatINR(toRupees(order.total || 0)))}</span>
          </div>
        </div>

        <div class="footer">
          Thank you for choosing us for your purchase.
        </div>

        <script>
          // FIXED: Use DOMContentLoaded listener loops instead of single window.onload assignments
          document.addEventListener("DOMContentLoaded", () => {
            setTimeout(() => {
              window.print();
              // Gracefully shut down context stream cleanly after system thread tasks conclude
              window.onafterprint = () => { window.close(); };
            }, 500);
          });
        </script>
      </body>
    </html>
  `);

  invoiceWindow.document.close();
}