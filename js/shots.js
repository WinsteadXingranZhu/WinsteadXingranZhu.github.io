let cleanupShots = () => {};

const initializeShots = () => {
  cleanupShots();
  cleanupShots = () => {};

  const lifecycle = new AbortController();
  const lightbox = document.querySelector("#shot-lightbox");
  const collage = document.querySelector(".shots-collage");
  let resizeFrame;

if (collage) {
  const shots = [...collage.querySelectorAll(".shot")];

  const sizeShots = () => {
    const styles = getComputedStyle(collage);
    const rowHeight = Number.parseFloat(styles.gridAutoRows);
    const rowGap = Number.parseFloat(styles.rowGap);

    shots.forEach((shot) => {
      shot.style.gridRowEnd = "auto";
      const height = shot.querySelector(".shot-open").getBoundingClientRect().height;
      const rowSpan = Math.ceil((height + rowGap) / (rowHeight + rowGap));
      shot.style.gridRowEnd = `span ${rowSpan}`;
    });
  };

  const scheduleSizing = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(sizeShots);
  };

  shots.forEach((shot) => {
    const image = shot.querySelector("img");
    if (!image.complete) image.addEventListener("load", scheduleSizing, { once: true, signal: lifecycle.signal });
  });

  window.addEventListener("resize", scheduleSizing, { signal: lifecycle.signal });
  scheduleSizing();
}

if (lightbox) {
  const expandedImage = lightbox.querySelector("img");
  const expandedTitle = lightbox.querySelector("figcaption span");
  const expandedYear = lightbox.querySelector("figcaption time");
  const closeButton = lightbox.querySelector(".lightbox-close");

  document.querySelectorAll(".shot-open").forEach((button) => {
    button.addEventListener("click", () => {
      const thumbnail = button.querySelector("img");

      expandedImage.src = thumbnail.src;
      expandedImage.alt = thumbnail.alt;
      expandedTitle.textContent = button.dataset.title;
      expandedYear.textContent = button.dataset.year;
      document.body.classList.add("lightbox-open");
      lightbox.showModal();
    }, { signal: lifecycle.signal });
  });

  closeButton.addEventListener("click", () => lightbox.close(), { signal: lifecycle.signal });
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  }, { signal: lifecycle.signal });
  lightbox.addEventListener("close", () => {
    document.body.classList.remove("lightbox-open");
    expandedImage.removeAttribute("src");
  }, { signal: lifecycle.signal });
}
  cleanupShots = () => {
    if (lightbox?.open) lightbox.close();
    lifecycle.abort();
    cancelAnimationFrame(resizeFrame);
  };
};

document.addEventListener("site:before-navigate", () => cleanupShots());
document.addEventListener("site:navigated", initializeShots);
initializeShots();
