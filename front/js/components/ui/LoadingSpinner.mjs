import "../../../css/ui/LoadingSpinner.css";

const LoadingSpinner = () => {
    const spinner = document.createElement("div");
    spinner.className = "loading-spinner";
    spinner.setAttribute("role", "status");
    spinner.setAttribute("aria-label", "Loading");

    spinner.innerHTML = `
        <span class="loading-spinner__orbit">
            <span class="loading-spinner__dot"></span>
            <span class="loading-spinner__dot"></span>
            <span class="loading-spinner__dot"></span>
        </span>

        <span class="loading-spinner__core"></span>
    `;

    return spinner;
};

export default LoadingSpinner;
export { LoadingSpinner };