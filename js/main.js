/* WeNeedFSD.eu — picker machine, letter, accordion, nav, video. */

(function () {
  "use strict";

  const STATUS_LABEL = {
    approved: "Approved",
    in_review: "Under review",
    opposed: "Opposed",
    no_national_approval: "No decision",
    non_eu: "Outside the EU",
  };

  const STATUS_CLASS = {
    approved: "is-approved",
    in_review: "is-review",
    opposed: "is-opposed",
    no_national_approval: "is-none",
    non_eu: "is-noneu",
  };

  const GROUP_META = [
    { id: "approved", status: "approved", title: "Approved", openOnSmall: true },
    { id: "review", status: "in_review", title: "Under review", openOnSmall: false },
    { id: "opposed", status: "opposed", title: "Opposed", openOnSmall: true },
    { id: "none", status: "no_national_approval", title: "No decision", openOnSmall: false },
    { id: "noneu", status: "non_eu", title: "Outside the EU", openOnSmall: false },
  ];

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  let data = null;
  let selectedIso = null;
  let navOpen = false;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function countryByIso(iso) {
    return data && data.countries.find((c) => c.iso === iso);
  }

  function letterMode(status) {
    if (status === "approved") return "support";
    if (status === "in_review" || status === "no_national_approval") return "recognise";
    if (status === "opposed") return "opposed";
    return "none";
  }

  function formatDate(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return d + " " + MONTHS[m - 1] + " " + y;
  }

  function formatAsOf(iso) {
    const pretty = formatDate(iso);
    return pretty || iso;
  }

  function formatAsOfShort(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const short = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (!y || !m || !d) return iso;
    return d + " " + short[m - 1] + " " + y;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mark(s) {
    return '<mark class="token">' + escapeHtml(s) + "</mark>";
  }

  function extArrow() {
    return '<svg class="ext-arrow" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 7h8.59L5.7 16.89l1.41 1.41L17 8.41V17h2V5H7v2z"/></svg>';
  }

  /* ---------- data ---------- */

  async function loadData() {
    try {
      const res = await fetch("data/status.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (err) {
      const embed = document.getElementById("status-data");
      if (embed) return JSON.parse(embed.textContent);
      throw err;
    }
  }

  /* ---------- render ---------- */

  function renderCounters() {
    const approved = data.euApproved;
    const total = data.euTotal;
    const notYet = total - approved;
    const share = Math.round(data.euPopulationShareApproved * 1000) / 10;
    $("#counter-approved .stat-value").textContent = approved + " / " + total;
    $("#counter-pending .stat-value").textContent = notYet + " not yet";
    $("#counter-share .stat-value").textContent = "~" + share + "%";
    const asOf = formatAsOf(data.asOf);
    const chip = $(".status-chip");
    if (chip) {
      chip.textContent = approved + " / " + total + " approved · as of " + formatAsOfShort(data.asOf);
    }
    const q = $(".status-qualifier");
    if (q) {
      q.textContent =
        "A qualified majority needs " +
        data.tcmvStatesNeeded +
        " states and " +
        Math.round(data.tcmvPopulationShareNeeded * 100) +
        "% of people · EU vote " +
        data.tcmvNext.label +
        ", not on a published agenda · as of " +
        asOf +
        ".";
    }
    const src = $(".status-source");
    if (src && data.trackerUrl) {
      src.innerHTML =
        'A live third-party view of the same map is at <a class="text-link" href="' +
        escapeHtml(data.trackerUrl) +
        '" target="_blank" rel="noopener">fsd-eu-tracker.de<span class="visually-hidden">, opens in a new window</span>' +
        extArrow() +
        "</a>. We are not scraping that site. Figures are our reading of official notices, dated " +
        asOf +
        ".";
    }
  }

  function renderCountryList() {
    const host = document.getElementById("country-list");
    if (!host) return;
    const wide = window.matchMedia("(min-width: 960px)").matches;
    const frag = document.createDocumentFragment();

    GROUP_META.forEach((g) => {
      const members = data.countries.filter((c) => c.status === g.status);
      const details = document.createElement("details");
      details.className = "country-group";
      details.id = "country-group-" + g.id;
      details.open = wide || g.openOnSmall;
      const hid = "country-group-" + g.id + "-h";
      details.innerHTML =
        "<summary><h3 id=\"" +
        hid +
        "\">" +
        escapeHtml(g.title) +
        " <span class=\"count\">(" +
        members.length +
        ")</span></h3>" +
        '<svg class="group-chevron" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>' +
        "</summary>";
      const chips = document.createElement("div");
      chips.className = "chips";
      chips.setAttribute("role", "group");
      chips.setAttribute("aria-labelledby", hid);
      members.forEach((c) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip";
        btn.id = "status-" + c.iso;
        btn.dataset.iso = c.iso;
        btn.dataset.status = c.status;
        btn.setAttribute("aria-pressed", "false");
        const opposedWord = c.status === "opposed" ? " <span class=\"chip-tag\">Opposed</span>" : "";
        btn.innerHTML =
          '<span class="chip-swatch" aria-hidden="true"></span>' +
          escapeHtml(c.name) +
          " " +
          c.iso +
          opposedWord;
        btn.addEventListener("click", () => selectCountry(c.iso));
        chips.appendChild(btn);
      });
      details.appendChild(chips);
      details.addEventListener("toggle", () => {
        if (window.matchMedia("(min-width: 960px)").matches && !details.open) {
          details.open = true;
        }
      });
      frag.appendChild(details);
    });

    host.replaceChildren(frag);
    syncCountryGroups();
  }

  function syncCountryGroups() {
    const wide = window.matchMedia("(min-width: 960px)").matches;
    const selected = selectedIso ? countryByIso(selectedIso) : null;
    $$("#country-list .country-group").forEach((d) => {
      const meta = GROUP_META.find((g) => d.id === "country-group-" + g.id);
      const sum = d.querySelector("summary");
      if (wide) {
        d.open = true;
        if (sum) sum.tabIndex = -1;
        return;
      }
      if (sum) sum.removeAttribute("tabindex");
      if (selected && meta && selected.status === meta.status) d.open = true;
      else if (meta) d.open = meta.openOnSmall;
    });
  }

  function openGroupForStatus(status) {
    const g = GROUP_META.find((x) => x.status === status);
    if (!g) return;
    const el = document.getElementById("country-group-" + g.id);
    if (el) el.open = true;
  }

  function paintMap() {
    const svg = $(".status-map svg");
    if (!svg) return;
    data.countries.forEach((c) => {
      const nodes = $$(
        '[data-iso="' + c.iso + '"]',
        svg
      );
      nodes.forEach((node) => {
        node.classList.remove(
          "is-approved",
          "is-review",
          "is-opposed",
          "is-none",
          "is-noneu",
          "is-selected"
        );
        node.classList.add(STATUS_CLASS[c.status] || "is-noneu");
        if (c.iso === selectedIso) node.classList.add("is-selected");
        if (c.status) node.setAttribute("data-status", c.status);
      });
    });
  }

  function enhanceMapHits() {
    const svg = $(".status-map svg");
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    $$(".map-hit", svg).forEach((n) => n.remove());
    const rUser = 12 * vb.height / rect.height;
    data.countries.forEach((c) => {
      const path = svg.getElementById("map-" + c.iso) || $('[data-iso="' + c.iso + '"]', svg);
      if (!path || path.classList.contains("map-neighbour")) return;
      let box;
      try {
        box = path.getBoundingClientRect();
      } catch (e) {
        return;
      }
      if (box.width >= 24 && box.height >= 24) return;
      let cx;
      let cy;
      try {
        if (path.tagName === "path" && path.getBBox) {
          const b = path.getBBox();
          cx = b.x + b.width / 2;
          cy = b.y + b.height / 2;
        } else if (path.tagName === "g") {
          const b = path.getBBox();
          cx = b.x + Math.min(b.width, 20) / 2;
          cy = b.y + Math.min(b.height, 20) / 2;
        }
      } catch (e) {
        return;
      }
      if (cx == null) return;
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hit.setAttribute("class", "map-hit");
      hit.setAttribute("data-iso", c.iso);
      hit.setAttribute("cx", String(cx));
      hit.setAttribute("cy", String(cy));
      hit.setAttribute("r", String(Math.max(rUser, 8)));
      svg.appendChild(hit);
    });
  }

  function bindMap() {
    const wrap = $(".status-map");
    if (!wrap) return;
    wrap.addEventListener("click", (e) => {
      const node = e.target.closest("[data-iso]");
      if (!node) return;
      const iso = node.getAttribute("data-iso");
      const c = countryByIso(iso);
      if (!c) return;
      selectCountry(iso);
    });
  }

  function renderPanel() {
    const panel = document.getElementById("status-panel");
    const live = document.getElementById("status-live");
    if (!panel) return;
    panel.classList.toggle("is-approved", false);
    const c = selectedIso ? countryByIso(selectedIso) : null;
    if (!c) {
      panel.innerHTML = '<p class="panel-empty">Choose a country to write to its ministry.</p>';
      if (live) live.textContent = "";
      return;
    }
    panel.classList.toggle("is-approved", c.status === "approved");
    const mode = letterMode(c.status);
    const date = formatDate(c.date);
    const meta = [date, c.authority].filter(Boolean).join(" · ");
    const pillLabel =
      c.status === "opposed" ? "Opposed" : STATUS_LABEL[c.status] || c.status;
    let cta = "";
    if (mode === "none") {
      cta =
        '<a class="text-link" href="#faq-noneu">Why the United Kingdom, Switzerland and Norway cannot use Article 39</a>';
    } else {
      cta =
        '<a class="btn btn-primary" href="#letter">Write to ' +
        escapeHtml(c.authority) +
        "</a>";
    }
    let openSite = "";
    if (c.authorityUrl) {
      openSite =
        '<a class="btn btn-secondary" href="' +
        escapeHtml(c.authorityUrl) +
        '" target="_blank" rel="noopener">Open ' +
        escapeHtml(c.authority) +
        ' website<span class="visually-hidden">, opens in a new window</span>' +
        extArrow() +
        "</a>";
    } else {
      openSite =
        '<p class="letter-note">No official homepage on file — search for ' +
        escapeHtml(c.authority) +
        ".</p>";
    }
    let extra = "";
    if (c.sourceUrl) {
      extra +=
        '<a class="text-link" href="' +
        escapeHtml(c.sourceUrl) +
        '" target="_blank" rel="noopener">Official announcement<span class="visually-hidden">, opens in a new window</span>' +
        extArrow() +
        "</a>";
    }
    if (c.status === "opposed") {
      extra +=
        '<a class="text-link" href="#faq-opposed">Why France and Sweden said no</a>';
    }
    if (c.status === "approved") {
      extra +=
        '<a class="text-link" href="#faq-lapse">What happens if the Commission says no</a>';
    }
    panel.innerHTML =
      '<div class="panel-head"><h3>' +
      escapeHtml(c.name) +
      '</h3><span class="pill" data-status="' +
      c.status +
      '">' +
      escapeHtml(pillLabel) +
      "</span></div>" +
      (meta ? '<p class="panel-meta">' + escapeHtml(meta) + "</p>" : "") +
      '<p class="panel-blurb">' +
      escapeHtml(c.blurb) +
      "</p>" +
      '<div class="panel-actions">' +
      cta +
      openSite +
      "</div>" +
      (extra ? '<div class="panel-links">' + extra + "</div>" : "");
    if (live) live.textContent = c.name + ", " + pillLabel;
  }

  function sharedOpening(c) {
    return (
      "<p>Dear Minister / Director,</p>" +
      "<p>I am a resident of " +
      mark(c.name) +
      " writing about Tesla Full Self-Driving (Supervised). It is a SAE Level 2 driver-assistance system. The driver remains legally responsible.</p>" +
      "<p>On 10 April 2026 the Dutch RDW granted a <strong>provisional</strong> EU type-approval under Article 39 of Regulation (EU) 2018/858. Lithuania, Estonia, Denmark and Belgium have since accepted that approval on their own territory under Article 39(5). The Dutch certificate is <strong>not</strong> an EU-wide approval. Other Member States may accept it. They are not obliged to.</p>"
    );
  }

  function sharedClosing(c) {
    return (
      "<p>These approvals are provisional. If the Commission refuses authorisation, they can be unwound six months later. Delay alone does not revoke them. That is why a clear yes at TCMV matters now, not after a later rewrite of UN Regulation No. 171.</p>" +
      "<p>RDW tested the system itself for more than 3,000 hours before issuing the file. Tesla has since published company figures of 5.2× fewer collisions over 65 million kilometres in the five approved countries (10 April–26 July 2026). Those are Tesla’s numbers, not an independent audit. I am not asking you to take marketing slides on trust. I am asking you to finish the review and say in public what " +
      mark(c.name) +
      " will do.</p>" +
      "<p>Yours sincerely,<br>" +
      mark("[Name]") +
      ", " +
      mark("[city]") +
      "<br>" +
      mark("[I own a Hardware 4 Tesla / I own a Hardware 3 Tesla, which I understand is outside the current approval / I do not own a Tesla]") +
      "</p>"
    );
  }

  function letterAsk(c, mode) {
    if (mode === "support") {
      return (
        "<p>I ask you to instruct your representatives in the Technical Committee on Motor Vehicles to support Commission authorisation of the implementing act. A qualified majority needs 15 Member States and 65% of the EU population. A vote is widely expected in October 2026. " +
        mark(c.name) +
        " has already accepted this file. I am not asking you to recognise it again. I am asking you to vote yes, so a Commission refusal does not start the six-month unwind of the approvals we already have.</p>" +
        "<p>Please tell me how " +
        mark(c.name) +
        " will vote at TCMV.</p>"
      );
    }
    if (mode === "recognise" && (c.iso === "DE" || c.iso === "ES")) {
      const clause =
        c.iso === "DE"
          ? "Germany has said the KBA is assessing the file"
          : "Spain has said it prefers coordination with the Commission rather than a unilateral copy of the Dutch approval";
      return (
        "<p>I ask you to instruct your representatives in the Technical Committee on Motor Vehicles to support Commission authorisation of the implementing act. A qualified majority needs 15 Member States and 65% of the EU population. A vote is widely expected in October 2026. I understand " +
        mark(clause) +
        ". I am not asking you to pretend a national Article 39(5) recognition is already your stated path. I am asking for a public yes at TCMV.</p>" +
        "<p>Please tell me how " +
        mark(c.name) +
        " will vote at TCMV.</p>"
      );
    }
    if (mode === "recognise") {
      return (
        "<p>I ask you to do two things. First, accept the Dutch provisional approval for use in " +
        mark(c.name) +
        ", so that compatible Hardware 4 vehicles can use the approved EU build here. Second, instruct your representatives in the Technical Committee on Motor Vehicles to support Commission authorisation of the implementing act. A qualified majority needs 15 Member States and 65% of the EU population. A vote is widely expected in October 2026.</p>" +
        "<p>Please tell me whether " +
        mark(c.name) +
        " will recognise the Dutch file nationally, and how you will vote at TCMV.</p>"
      );
    }
    if (mode === "opposed") {
      let extra = "";
      if (c.iso === "FR") {
        extra =
          "<p>" +
          mark("Minister Tabarot declined national recognition of the current product on 22 July 2026.") +
          " I ask you to revisit that position, or at least to support a Commission act that would let a supervised, Level 2 system operate under clear EU conditions.</p>";
      } else if (c.iso === "SE") {
        extra =
          "<p>" +
          mark("I understand Trafikverket’s April letter recommended a TCMV “no” unless the speed-offset is removed.") +
          " If that is still Sweden’s view, please say so in public and say what change would turn it into a yes. A silent no at TCMV is the outcome I want you to avoid.</p>";
      }
      return (
        "<p>I am not asking you to recognise the current product as it stands. I ask you to take a <strong>public position</strong> on the TCMV vote expected in October 2026 — a qualified majority needs 15 Member States and 65% of the EU population — and to say what would turn a no into a yes.</p>" +
        extra +
        "<p>Please tell me how " +
        mark(c.name) +
        " will vote at TCMV.</p>"
      );
    }
    return "";
  }

  function renderLetter() {
    const root = document.getElementById("letter");
    if (!root) return;
    const c = selectedIso ? countryByIso(selectedIso) : null;
    const mode = c ? letterMode(c.status) : null;

    if (!c || mode === "none") {
      const noneNote =
        mode === "none"
          ? "<p class=\"letter-note\">" +
            escapeHtml(c.name) +
            " cannot use Article 39. See <a class=\"text-link\" href=\"#faq-noneu\">United Kingdom, Switzerland and Norway</a>.</p>"
          : "";
      root.innerHTML =
        "<header><p class=\"overline\">Letter</p><h3 id=\"letter-heading\">Choose a country first</h3></header>" +
        noneNote +
        '<p><button type="button" class="btn btn-secondary" id="letter-choose">Choose a country</button></p>';
      const choose = document.getElementById("letter-choose");
      if (choose) choose.addEventListener("click", goToPicker);
      return;
    }

    root.innerHTML =
      "<header class=\"letter-header\">" +
      "<div><p class=\"overline\">Letter template</p><h3 id=\"letter-heading\">Send this to " +
      escapeHtml(c.authority) +
      "</h3></div>" +
      '<div class="letter-actions">' +
      '<button type="button" class="btn btn-secondary" id="copy-letter">Copy letter</button>' +
      (c.authorityUrl
        ? '<a class="btn btn-primary" id="open-authority" href="' +
          escapeHtml(c.authorityUrl) +
          '" target="_blank" rel="noopener">Open ' +
          escapeHtml(c.authority) +
          ' website<span class="visually-hidden">, opens in a new window</span>' +
          extArrow() +
          "</a>"
        : "") +
      "</div></header>" +
      (c.authorityUrl
        ? ""
        : '<p class="letter-note">No official homepage on file — search for ' +
          escapeHtml(c.authority) +
          ".</p>") +
      '<p class="letter-meta">Subject: Tesla FSD Supervised — please take a public position on the TCMV vote</p>' +
      '<div class="letter-body" id="letter-body">' +
      sharedOpening(c) +
      letterAsk(c, mode) +
      sharedClosing(c) +
      "</div>" +
      '<p class="letter-note">Citizens can paste this, fill the brackets, and send it in their own language if they prefer.</p>' +
      '<p class="visually-hidden" id="copy-live" aria-live="polite"></p>';

    const copyBtn = document.getElementById("copy-letter");
    if (copyBtn) copyBtn.addEventListener("click", copyLetter);
  }

  function copyLetter() {
    const btn = document.getElementById("copy-letter");
    const live = document.getElementById("copy-live");
    const body = document.getElementById("letter-body");
    if (!body || !btn) return;
    const text = body.innerText;
    const restore = () => {
      btn.textContent = "Copy letter";
    };
    btn.disabled = true;
    const unlock = window.setTimeout(() => {
      btn.disabled = false;
    }, 300);
    const ok = () => {
      window.clearTimeout(unlock);
      btn.disabled = false;
      btn.textContent = "Copied";
      if (live) live.textContent = "Copied";
      window.setTimeout(() => {
        restore();
        if (live) live.textContent = "";
      }, 2000);
    };
    const fail = () => {
      window.clearTimeout(unlock);
      btn.disabled = false;
      restore();
      if (live) live.textContent = "Copy failed. Select the letter and copy it yourself.";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fail);
    } else {
      fail();
    }
  }

  function updateWriteLinks() {
    const href = selectedIso && letterMode(countryByIso(selectedIso).status) !== "none"
      ? "#letter"
      : "#status";
    $$("[data-write]").forEach((a) => {
      a.setAttribute("href", href);
    });
  }

  function updateChips() {
    $$("#country-list .chip").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.iso === selectedIso ? "true" : "false");
    });
  }

  function updateHelpCards() {
    const c = selectedIso ? countryByIso(selectedIso) : null;
    const mode = c ? letterMode(c.status) : null;
    $$(".action-card").forEach((card) => {
      const cardMode = card.dataset.mode;
      const match = mode && mode === cardMode;
      card.classList.toggle("is-active", !!match);
      const btn = card.querySelector(".btn");
      if (!btn) return;
      if (match) {
        btn.setAttribute("href", "#letter");
        btn.classList.remove("btn-secondary");
        btn.classList.add("btn-primary");
        btn.textContent = "Write the letter";
      } else {
        btn.setAttribute("href", "#country-list");
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-secondary");
        btn.textContent = "Choose a country";
      }
    });
    const note = $(".help-noneu-note");
    if (note) note.hidden = mode !== "none";
  }

  function selectCountry(iso, opts) {
    const c = countryByIso(iso);
    if (!c) return;
    selectedIso = iso;
    updateChips();
    renderPanel();
    renderLetter();
    updateHelpCards();
    updateWriteLinks();
    paintMap();
    openGroupForStatus(c.status);
    if (!opts || !opts.silentHash) {
      history.replaceState(null, "", "#status-" + iso);
    }
    const narrow = window.matchMedia("(max-width: 959px)").matches;
    if (narrow && (!opts || !opts.skipScroll)) {
      const panel = document.getElementById("status-panel");
      if (panel) panel.scrollIntoView({ block: "nearest" });
    }
  }

  function goToPicker(e) {
    if (e) e.preventDefault();
    const status = document.getElementById("status");
    const list = document.getElementById("country-list");
    if (status) status.scrollIntoView();
    if (list) list.focus();
  }

  function onWriteActivate(e) {
    if (navOpen) setNav(false);
    if (selectedIso) {
      const c = countryByIso(selectedIso);
      if (c && letterMode(c.status) !== "none") return;
    }
    e.preventDefault();
    goToPicker();
  }

  function onHelpCardActivate(e) {
    const card = e.currentTarget.closest(".action-card");
    if (!card) return;
    const c = selectedIso ? countryByIso(selectedIso) : null;
    if (c && letterMode(c.status) === card.dataset.mode) return;
    e.preventDefault();
    const groupSel = card.dataset.focusGroup;
    const group = groupSel ? document.querySelector(groupSel) : null;
    if (group && group.tagName === "DETAILS") group.open = true;
    const list = document.getElementById("country-list");
    if (list) list.scrollIntoView();
    const first = group ? group.querySelector(".chip") : null;
    if (first) first.focus();
    else if (list) list.focus();
  }

  /* ---------- accordion ---------- */

  function setAccOpen(item, open) {
    const btn = item.querySelector(".acc-trigger");
    const panel = item.querySelector(".acc-panel");
    item.classList.toggle("is-open", open);
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (panel) {
      if (open) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    }
  }

  function setupAccordion() {
    const items = $$(".acc-item");
    const triggers = $$(".acc-trigger");
    items.forEach((item) => {
      const btn = item.querySelector(".acc-trigger");
      if (!btn) return;
      btn.addEventListener("click", () => {
        setAccOpen(item, btn.getAttribute("aria-expanded") !== "true");
      });
    });
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      if (!t || !t.classList || !t.classList.contains("acc-trigger")) return;
      const i = triggers.indexOf(t);
      if (i < 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        triggers[Math.min(i + 1, triggers.length - 1)].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        triggers[Math.max(i - 1, 0)].focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        triggers[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        triggers[triggers.length - 1].focus();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        t.click();
      }
    });
  }

  function openFaqFromHash(hash) {
    if (!hash || hash.indexOf("#faq-") !== 0) return false;
    const id = hash.slice(1);
    const panel = document.getElementById(id);
    if (!panel) return false;
    const item = panel.closest(".acc-item");
    if (!item) return false;
    setAccOpen(item, true);
    const btn = item.querySelector(".acc-trigger");
    if (btn) btn.focus();
    return true;
  }

  /* ---------- nav ---------- */

  function trapMembers() {
    const brand = $(".brand");
    const toggle = $(".nav-toggle");
    const write = $("[data-write]");
    const links = $$("#nav-list a");
    return [brand, toggle].concat(links).concat([write]).filter(Boolean);
  }

  function setNav(open) {
    navOpen = open;
    const toggle = $(".nav-toggle");
    const nav = document.getElementById("primary-nav");
    const main = document.getElementById("main");
    const footer = $("footer");
    document.documentElement.classList.toggle("nav-open", open);
    if (nav) nav.classList.toggle("is-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Menu");
      const menu = toggle.querySelector(".icon-menu");
      const close = toggle.querySelector(".icon-close");
      if (menu) menu.hidden = open;
      if (close) close.hidden = !open;
    }
    if (main) {
      if (open) main.setAttribute("inert", "");
      else main.removeAttribute("inert");
    }
    if (footer) {
      if (open) footer.setAttribute("inert", "");
      else footer.removeAttribute("inert");
    }
    if (open) {
      const first = $("#nav-list a");
      if (first) first.focus();
    }
  }

  function setupNav() {
    const toggle = $(".nav-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => setNav(!navOpen));
    }
    $$("#nav-list a").forEach((a) => {
      a.addEventListener("click", () => {
        if (navOpen) setNav(false);
      });
    });
    document.addEventListener("keydown", (e) => {
      if (!navOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setNav(false);
        if (toggle) toggle.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const members = trapMembers();
      if (!members.length) return;
      const first = members[0];
      const last = members[members.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    const mq = window.matchMedia("(min-width: 960px)");
    const onWide = () => {
      if (!mq.matches) return;
      if (!navOpen) return;
      const inside = document.activeElement && document.getElementById("primary-nav") &&
        document.getElementById("primary-nav").contains(document.activeElement);
      setNav(false);
      if (inside) {
        const write = $("[data-write]");
        if (write) write.focus();
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onWide);
    else mq.addListener(onWide);

    const sections = ["status", "why", "help", "faq"].map((id) => document.getElementById(id)).filter(Boolean);
    if ("IntersectionObserver" in window && sections.length) {
      const io = new IntersectionObserver(
        (entries) => {
          const vis = entries.filter((en) => en.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!vis) return;
          $$('#nav-list a[aria-current="location"]').forEach((a) => a.removeAttribute("aria-current"));
          const link = $('#nav-list a[href="#' + vis.target.id + '"]');
          if (link) link.setAttribute("aria-current", "location");
        },
        { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.25, 0.5] }
      );
      sections.forEach((s) => io.observe(s));
    }
  }

  /* ---------- video ---------- */

  function setupVideo() {
    const video = document.getElementById("hero-video");
    const poster = document.getElementById("hero-poster");
    const btn = document.getElementById("hero-pause");
    const fsBtn = document.getElementById("hero-fs");
    if (!video || !btn) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    function setPausedUI(paused) {
      btn.setAttribute("aria-label", paused ? "Play film" : "Pause video");
      const play = btn.querySelector(".icon-play");
      const pause = btn.querySelector(".icon-pause");
      if (play) play.hidden = !paused;
      if (pause) pause.hidden = paused;
    }

    const hero = document.getElementById("hero");

    function applyReduced(reduce) {
      document.documentElement.classList.toggle("reduce-motion", reduce);
      if (reduce) {
        video.pause();
        video.removeAttribute("autoplay");
        video.preload = "none";
        if (hero) hero.classList.remove("is-playing-film");
        setPausedUI(true);
      } else {
        if (hero) hero.classList.add("is-playing-film");
        const p = video.play();
        if (p && p.catch) p.catch(function () { setPausedUI(true); });
        setPausedUI(false);
      }
    }

    applyReduced(mq.matches);
    const onChange = () => applyReduced(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    btn.addEventListener("click", () => {
      if (video.paused) {
        if (hero) hero.classList.add("is-playing-film");
        const p = video.play();
        if (p && p.catch) p.catch(function () {});
        setPausedUI(false);
      } else {
        video.pause();
        if (mq.matches && hero) hero.classList.remove("is-playing-film");
        setPausedUI(true);
      }
    });

    if (fsBtn && video.requestFullscreen) {
      fsBtn.hidden = false;
      fsBtn.addEventListener("click", () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else video.requestFullscreen().catch(function () {});
      });
      document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement) fsBtn.focus();
      });
    }
  }

  /* ---------- hash ---------- */

  function honourHash() {
    const hash = location.hash || "";
    const statusMatch = hash.match(/^#status-([A-Z]{2})$/);
    if (statusMatch && countryByIso(statusMatch[1])) {
      selectCountry(statusMatch[1], { silentHash: true, skipScroll: false });
      return;
    }
    if (openFaqFromHash(hash)) return;
  }

  /* ---------- boot ---------- */

  async function init() {
    setupNav();
    setupAccordion();
    setupVideo();

    $$("[data-write]").forEach((a) => a.addEventListener("click", onWriteActivate));
    $$(".action-card .btn").forEach((a) => a.addEventListener("click", onHelpCardActivate));

    window.addEventListener("hashchange", () => {
      const hash = location.hash || "";
      if (/^#status-[A-Z]{2}$/.test(hash)) honourHash();
      else openFaqFromHash(hash);
    });

    try {
      data = await loadData();
    } catch (err) {
      const list = document.getElementById("country-list");
      if (list) {
        const p = document.createElement("p");
        p.className = "letter-note";
        p.textContent = "Could not load country data. Serve this folder over http to enable the picker.";
        list.appendChild(p);
      }
      return;
    }

    renderCounters();
    renderCountryList();
    renderPanel();
    renderLetter();
    updateHelpCards();
    updateWriteLinks();
    paintMap();
    bindMap();
    window.requestAnimationFrame(() => {
      enhanceMapHits();
      honourHash();
    });
    window.addEventListener("resize", () => {
      syncCountryGroups();
      enhanceMapHits();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
