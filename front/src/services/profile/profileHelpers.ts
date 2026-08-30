import Datex from "../../components/base/Datex";

// Utility function to format dates
function formatDate(dateString: string | null | undefined): string | null {
  // return dateString ? new Date(dateString).toLocaleString() : null;
  return dateString ? Datex(dateString) : null;
}

function showLoadingMessage(message: string): void {
  const container = document.getElementById("content");
  if (!container) return;

  const loadingMsg = document.createElement("p");
  loadingMsg.id = "loading-msg";
  loadingMsg.textContent = message;
  container.appendChild(loadingMsg);
}

function removeLoadingMessage(): void {
  const loadingMsg = document.getElementById("loading-msg");
  if (loadingMsg) {
    loadingMsg.remove();
  }
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Preview profile picture
function previewAvatar(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];
  const preview = document.getElementById("profile-picture-preview") as HTMLImageElement | null;

  if (file && preview) {
    const reader = new FileReader();
    reader.onload = (): void => {
      if (typeof reader.result === "string") {
        preview.src = reader.result;
        preview.style.display = "block";
      }
    };
    reader.readAsDataURL(file);
  }
}

export { formatDate, showLoadingMessage, removeLoadingMessage, capitalize, previewAvatar };