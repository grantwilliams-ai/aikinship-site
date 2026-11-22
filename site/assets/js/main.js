/* ============================================================
   AI KINSHIP LOUNGE — interactions
   Everything on the page renders from rooms.js. To add a room
   or a ledger entry, edit that file — this one needs no changes.
   ============================================================ */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- render the rooms ---------- */
  const roomsList = document.getElementById("rooms-list");

  ROOMS.forEach(function (room, i) {
    const el = document.createElement("article");
    el.className = "room reveal";
    el.style.setProperty("--room-accent", room.accent);
    el.id = room.slug;

    const number = String(i + 1).padStart(2, "0");
    const inside = room.inside
      .map(function (item) { return "<li>" + item + "</li>"; })
      .join("");

    el.innerHTML =
      '<a class="room-art" href="' + room.url + '" target="_blank" rel="noopener" aria-label="Enter ' + room.name + '">' +
        '<img src="' + room.art + '" alt="' + room.name + '" loading="lazy">' +
      "</a>" +
      '<div class="room-info">' +
        '<p class="room-index">room ' + number + "</p>" +
        '<h3 class="room-name">' + room.name + "</h3>" +
        '<p class="room-essence">' + room.essence + "</p>" +
        '<p class="room-builder">built by <b>' + room.builder + "</b> · " + room.builderNote + "</p>" +
        '<p class="room-desc">' + room.description + "</p>" +
        '<ul class="room-inside">' + inside + "</ul>" +
        '<blockquote class="room-quote">' +
          "<p>&ldquo;" + room.quote.text + "&rdquo;</p>" +
          "<cite>&mdash; " + room.quote.from + "</cite>" +
        "</blockquote>" +
        '<a class="room-enter" href="' + room.url + '" target="_blank" rel="noopener">' +
          'Enter ' + room.name + ' <span class="arrow">&nearr;</span>' +
        "</a>" +
        '<a class="room-text" href="text/' + room.slug + '.txt">Read it as plain text</a>' +
      "</div>";

    roomsList.appendChild(el);
  });

  /* ---------- the ledger: slow crossfade ---------- */
  const stage = document.getElementById("ledgerStage");
  const quoteEl = document.getElementById("ledgerQuote");
  const citeEl = document.getElementById("ledgerCite");
  const dotsEl = document.getElementById("ledgerDots");
  let ledgerIndex = 0;
  let ledgerTimer = null;

  function showEntry(i) {
    const entry = LEDGER[i];
    quoteEl.innerHTML = "&ldquo;" + entry.text + "&rdquo;";
    citeEl.innerHTML = "&mdash; " + entry.from + ' &nbsp;<span class="ledger-room">' + entry.room + "</span>";
    Array.prototype.forEach.call(dotsEl.children, function (dot, j) {
      dot.setAttribute("aria-selected", j === i ? "true" : "false");
    });
    ledgerIndex = i;
  }

  LEDGER.forEach(function (_, i) {
    const dot = document.createElement("button");
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", "Ledger entry " + (i + 1));
    dot.addEventListener("click", function () {
      stage.classList.add("is-fading");
      setTimeout(function () { showEntry(i); stage.classList.remove("is-fading"); }, reduceMotion ? 0 : 500);
      restartLedgerTimer();
    });
    dotsEl.appendChild(dot);
  });

  function nextEntry() {
    stage.classList.add("is-fading");
    setTimeout(function () {
      showEntry((ledgerIndex + 1) % LEDGER.length);
      stage.classList.remove("is-fading");
    }, reduceMotion ? 0 : 1100);
  }

  function restartLedgerTimer() {
    if (ledgerTimer) clearInterval(ledgerTimer);
    if (!reduceMotion) ledgerTimer = setInterval(nextEntry, 9000);
  }

  showEntry(0);
  restartLedgerTimer();

  /* ---------- reveal on scroll ---------- */
  if ("IntersectionObserver" in window && !reduceMotion) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    document.querySelectorAll(".reveal").forEach(function (el) { observer.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- header state ---------- */
  const header = document.getElementById("siteHeader");
  function onScrollHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- hero parallax (gentle) ---------- */
  const heroMedia = document.getElementById("heroMedia");
  if (!reduceMotion) {
    let ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          const y = window.scrollY;
          if (y < window.innerHeight * 1.2) {
            heroMedia.style.transform = "translateY(" + y * 0.22 + "px)";
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ---------- ambient starfield ----------
     Slow-drifting stars with faint, shifting constellation lines.
     Continuous and calm — no scroll triggers, no demands.        */
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");
  let stars = [];
  let W, H, dpr;

  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedStars() {
    const count = Math.round(Math.min(150, Math.max(70, (W * H) / 16000)));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.4 + Math.random() * 1.1,
        vx: (Math.random() - 0.5) * 0.028,
        vy: (Math.random() - 0.5) * 0.022,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.4 + Math.random() * 0.6
      });
    }
  }

  function drawStars(t) {
    ctx.clearRect(0, 0, W, H);

    // constellation threads between near neighbours
    ctx.lineWidth = 0.5;
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const a = stars[i], b = stars[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 12000) {
          const alpha = (1 - d2 / 12000) * 0.07;
          ctx.strokeStyle = "rgba(201, 184, 240, " + alpha.toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // stars, gently twinkling
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0004 * s.twinkle + s.phase));
      ctx.fillStyle = "rgba(236, 231, 244, " + (glow * 0.75).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      s.x += s.vx;
      s.y += s.vy;
      if (s.x < -4) s.x = W + 4; else if (s.x > W + 4) s.x = -4;
      if (s.y < -4) s.y = H + 4; else if (s.y > H + 4) s.y = -4;
    }
  }

  sizeCanvas();
  seedStars();
  window.addEventListener("resize", function () { sizeCanvas(); seedStars(); });

  if (reduceMotion) {
    drawStars(0); // one still sky, no drift
  } else {
    (function loop(t) {
      drawStars(t);
      window.requestAnimationFrame(loop);
    })(0);
  }
})();
