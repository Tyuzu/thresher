// Interface for Social Links payload
export interface SocialLink {
  platform: string;
  url: string;
}

// Interface for Custom Fields dictionary
export interface CustomFieldsDict {
  [key: string]: string | number | boolean;
}

// GalleryComponent: displays an image gallery
function GalleryComponent(images: string[] = [], title: string = "📸 Gallery"): string {
  if (!images.length) {
    return "";
  }

  return `
    <div class="gallery-component">
      <h3>${title}</h3>
      <div class="gallery-grid">
        ${images.map(url => `<img src="/media/${url}" loading="lazy" class="gallery-img" />`).join("")}
      </div>
    </div>
  `;
}

// TagList: displays a list of tags as styled spans
function TagList(tags: string[] = []): string {
  if (!tags.length) {
    return "None";
  }
  return tags.map(tag => `<span class="tag">${tag}</span>`).join(" ");
}

// SocialLinks: generates social media links with icons
function SocialLinks(links: SocialLink[] = []): string {
  if (!links.length) {
    return "";
  }
  return `
    <div class="social-links">
      <h3>🔗 Follow Us</h3>
      ${links.map(link => `
        <a href="${link.url}" target="_blank" rel="noopener noreferrer">
          ${link.platform}
        </a>`).join("")}
    </div>
  `;
}

// CustomFields: renders custom field key-value pairs
function CustomFields(fields: CustomFieldsDict = {}): string {
  const entries = Object.entries(fields);
  if (!entries.length) {
    return "<p>No custom fields provided.</p>";
  }
  return `
    <div class="custom-fields">
      <h3>📄 Additional Info</h3>
      ${entries.map(([key, val]) => `<p><strong>${key}:</strong> ${val}</p>`).join("")}
    </div>
  `;
}

export { GalleryComponent, TagList, SocialLinks, CustomFields };