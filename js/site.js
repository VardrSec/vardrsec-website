(function () {
  const btn = document.getElementById("menuBtn");
  const panel = document.getElementById("mobilePanel");

  if (btn && panel) {
    btn.addEventListener("click", () => {
      panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", panel.classList.contains("open") ? "true" : "false");
    });
  }

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");

  if (form && status) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submit = form.querySelector('button[type="submit"]');

      submit.disabled = true;
      status.className = "form-status";
      status.textContent = "Sending…";

      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { accept: "application/json" },
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          form.reset();
          status.className = "form-status ok";
          status.textContent = "Message sent. I'll reply within 1–2 business days.";
        } else {
          status.className = "form-status bad";
          status.textContent = data.error || "Something went wrong. Email contact@vardrsec.com instead.";
        }
      } catch {
        status.className = "form-status bad";
        status.textContent = "Network error. Email contact@vardrsec.com instead.";
      } finally {
        submit.disabled = false;
      }
    });
  }
})();
