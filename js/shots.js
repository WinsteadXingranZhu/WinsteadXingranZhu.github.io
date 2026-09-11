const lightbox = document.querySelector("#shot-lightbox");

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
    });
  });

  closeButton.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener("close", () => {
    document.body.classList.remove("lightbox-open");
    expandedImage.removeAttribute("src");
  });
}
