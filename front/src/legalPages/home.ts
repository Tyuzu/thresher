import { createElement } from "../components/createElement.js";

type RouteContainer = HTMLElement;

function section(title: string, text: string): HTMLElement {
  return createElement("section", {}, [
    createElement("h2", {}, title),
    createElement("p", {}, text),
  ]);
}

export async function About(concon: RouteContainer): Promise<void> {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "About Us"),
      section(
        "Who We Are",
        "We build reliable and scalable web solutions focused on performance, usability, and simplicity."
      ),
      section(
        "Our Mission",
        "To deliver efficient digital experiences without unnecessary complexity."
      ),
    ])
  );
}

export async function Contact(concon: RouteContainer): Promise<void> {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Contact"),
      section("Email", "support@example.com"),
      section("Phone", "+1 (000) 000-0000"),
      section("Address", "123 Example Street, City, Country"),
    ])
  );
}

export async function Faq(concon: RouteContainer): Promise<void> {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "FAQ"),
      section("How do I use this service?", "Create an account and follow the onboarding steps."),
      section("Can I cancel anytime?", "Yes, you can cancel at any time from your account settings."),
      section("Do you offer support?", "Support is available via email."),
    ])
  );
}

export async function Terms(concon: RouteContainer): Promise<void> {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Terms of Service"),
      section(
        "Usage",
        "By using this service, you agree to comply with applicable laws and our policies."
      ),
      section(
        "Limitations",
        "We are not liable for damages resulting from misuse of the service."
      ),
    ])
  );
}

export async function Privacy(concon: RouteContainer): Promise<void> {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Privacy Policy"),
      section(
        "Data Collection",
        "We collect only necessary data to provide and improve our services."
      ),
      section(
        "Data Usage",
        "Your data is never sold and is used strictly for operational purposes."
      ),
    ])
  );
}

export async function Refund(concon: RouteContainer): Promise<void> {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Refund Policy"),
      section(
        "Eligibility",
        "Refunds are available within 14 days of purchase under valid conditions."
      ),
      section(
        "Process",
        "Contact support with your order details to request a refund."
      ),
    ])
  );
}

export async function Shipping(concon: RouteContainer): Promise<void> {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Shipping Policy"),
      section(
        "Delivery Time",
        "Orders are processed within 2–5 business days."
      ),
      section(
        "Tracking",
        "Tracking details will be provided once shipped."
      ),
    ])
  );
}

export async function Returns(concon: RouteContainer): Promise<void> {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Returns"),
      section(
        "Return Window",
        "Items can be returned within 30 days of delivery."
      ),
      section(
        "Condition",
        "Returned items must be unused and in original packaging."
      ),
    ])
  );
}

export async function Disclaimer(concon: RouteContainer): Promise<void> {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Disclaimer"),
      section(
        "General",
        "All information is provided without warranties of any kind."
      ),
      section(
        "Liability",
        "We are not responsible for any losses arising from use of this site."
      ),
    ])
  );
}

export async function Blog(concon: RouteContainer): Promise<void> {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Blog"),
      section(
        "Latest Updates",
        "Insights, updates, and technical articles will appear here."
      ),
    ])
  );
}