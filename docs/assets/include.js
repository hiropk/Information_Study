async function includePartials() {
  const nodes = Array.from(document.querySelectorAll("[data-include]"));
  if (nodes.length === 0) return;

  await Promise.all(
    nodes.map(async (node) => {
      const path = node.getAttribute("data-include");
      if (!path) return;
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
        const html = await res.text();
        node.outerHTML = html;
      } catch (e) {
        // Fallback: keep empty placeholder
        console.warn(e);
      }
    }),
  );
}

includePartials();

