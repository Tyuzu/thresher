export function makeDraggableScroll(container: HTMLElement): () => void {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let dragged = false;
  let rafId: number | null = null;

  const onMouseDown = (e: MouseEvent): void => {
    // Ignore right-clicks or secondary buttons
    if (e.button !== 0) return;

    isDown = true;
    dragged = false;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;

    container.style.userSelect = "none";
    container.style.cursor = "grabbing";

    // Attach document-level listeners so dragging continues outside the container
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent): void => {
    if (!isDown) return;

    const x = e.pageX - container.offsetLeft;
    const walk = x - startX;

    // Throttle scroll updates to match the display refresh rate
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      // Threshold check to avoid treating tiny micro-movements as drags
      if (Math.abs(walk) > 5) {
        dragged = true;
      }
      container.scrollLeft = scrollLeft - walk;
    });
  };

  const onMouseUp = (): void => {
    if (!isDown) return;
    isDown = false;

    if (rafId !== null) cancelAnimationFrame(rafId);

    container.style.userSelect = "";
    container.style.cursor = "";

    // Cleanup global window listeners
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  // Prevent accidental clicks on ANY child element if a drag occurred
  const onClickCapture = (e: MouseEvent): void => {
    if (dragged) {
      e.stopPropagation();
      e.preventDefault();
      dragged = false; // Reset state
    }
  };

  container.addEventListener("mousedown", onMouseDown);
  container.addEventListener("click", onClickCapture, true);

  // Return a cleanup function to prevent memory leaks in single-page apps (React/Vue/Svelte)
  return (): void => {
    container.removeEventListener("mousedown", onMouseDown);
    container.removeEventListener("click", onClickCapture, true);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}