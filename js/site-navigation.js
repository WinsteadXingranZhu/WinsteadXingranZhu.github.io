(() => {
  const sitePages = new Set([
    "/",
    "/index.html",
    "/about.html",
    "/engineering.html",
    "/photography.html",
    "/mat-notes.html"
  ]);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeRequest;

  const isSitePage = (url) => url.origin === window.location.origin && sitePages.has(url.pathname);

  const updateMetadata = (nextDocument) => {
    document.title = nextDocument.title;
    [
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]'
    ].forEach((selector) => {
      const current = document.head.querySelector(selector);
      const next = nextDocument.head.querySelector(selector);
      if (current && next) current.content = next.content;
    });
  };

  const replacePage = (nextDocument, targetUrl) => {
    const selectors = [".skip-link", ".site-header", "main", ".site-footer"];
    document.dispatchEvent(new CustomEvent("site:before-navigate"));

    selectors.forEach((selector) => {
      const current = document.querySelector(selector);
      const next = nextDocument.querySelector(selector);
      if (current && next) current.replaceWith(document.importNode(next, true));
    });

    document.body.className = nextDocument.body.className;
    updateMetadata(nextDocument);
    document.dispatchEvent(new CustomEvent("site:navigated", { detail: { url: targetUrl.href } }));
  };

  const navigate = async (targetUrl, { push = true } = {}) => {
    if (!isSitePage(targetUrl)) {
      window.location.assign(targetUrl.href);
      return;
    }

    activeRequest?.abort();
    activeRequest = new AbortController();
    document.documentElement.dataset.navigating = "true";

    try {
      const response = await fetch(targetUrl.href, {
        headers: { "X-Requested-With": "site-navigation" },
        signal: activeRequest.signal
      });
      if (!response.ok) throw new Error(`Navigation failed with ${response.status}`);

      const nextDocument = new DOMParser().parseFromString(await response.text(), "text/html");
      if (!nextDocument.querySelector("main") || !nextDocument.querySelector(".site-header")) {
        throw new Error("The requested page is missing the shared site structure");
      }

      const update = () => replacePage(nextDocument, targetUrl);
      if (document.startViewTransition && !reducedMotion.matches) {
        document.startViewTransition(update);
      } else {
        update();
      }

      if (push) history.pushState({ siteNavigation: true }, "", targetUrl.href);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      const main = document.querySelector("main");
      main?.setAttribute("tabindex", "-1");
      main?.focus({ preventScroll: true });
    } catch (error) {
      if (error.name !== "AbortError") window.location.assign(targetUrl.href);
    } finally {
      delete document.documentElement.dataset.navigating;
    }
  };

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[href]");
    if (!link || link.target || link.download || !link.closest(".site-header")) return;

    const targetUrl = new URL(link.href, window.location.href);
    if (!isSitePage(targetUrl)) return;
    event.preventDefault();

    if (targetUrl.pathname === window.location.pathname) return;
    navigate(targetUrl);
  });

  window.addEventListener("popstate", () => navigate(new URL(window.location.href), { push: false }));
  history.scrollRestoration = "manual";
})();
