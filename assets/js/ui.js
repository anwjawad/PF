/* ======================================================
   ui.js
   طبقة واجهة المستخدم:
   - توليد النماذج ديناميكياً من PF_FORMS
   - مبدّل الثيم + توست + لودر
   - حقول tags سريعة الإدخال
   - جدول النتائج + تمييز البحث
====================================================== */

(function () {
  const CFG = window.PF_CONFIG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------------------
     الثيمات
  --------------------------- */
  function applyTheme(name) {
    const theme = ["ocean", "neon", "rose", "dawn"].includes(name) ? name : CFG.DEFAULT_THEME;
    document.body.setAttribute("data-theme", theme);
    try { localStorage.setItem(CFG.STORAGE_KEYS.THEME, theme); } catch (_) {}
  }

  function initTheme(selectEl) {
    // استرجاع آخر ثيم محفوظ أو الافتراضي
    const saved = (() => {
      try { return localStorage.getItem(CFG.STORAGE_KEYS.THEME); } catch (_) { return null; }
    })();
    applyTheme(saved || CFG.DEFAULT_THEME);
    if (selectEl) {
      selectEl.value = document.body.getAttribute("data-theme");
      selectEl.addEventListener("change", e => applyTheme(e.target.value));
    }
  }

  /* ---------------------------
     Loader / Toast / Modal
  --------------------------- */
  function setLoaderVisible(v) {
    const el = $("#app-loader");
    if (!el) return;
    el.style.display = v ? "flex" : "none";
  }

  let toastTimer = null;
  function showToast(msg, kind = "info") {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "toast show";
    if (kind === "error") t.style.background = "#ef4444";
    else t.style.background = "var(--color-accent)";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove("show");
    }, CFG.UI.TOAST_DURATION);
  }

  function showModal(title, bodyHtml) {
    const modal = $("#modal");
    $("#modalTitle").textContent = title || "تفاصيل";
    $("#modalBody").innerHTML = bodyHtml || "";
    modal.showModal();
    return new Promise(resolve => {
      modal.addEventListener("close", () => resolve(modal.returnValue), { once: true });
    });
  }

  /* ---------------------------
     أدوات UI مساعدة
  --------------------------- */
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === "class") node.className = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function markRequired(labelEl) {
    const star = el("span", { class: "req-star", text: " *" });
    labelEl.appendChild(star);
  }

  function applyPattern(input, patternSource) {
    if (!patternSource) return;
    try { input.pattern = patternSource; } catch (_) {}
  }

  function setActiveFormTitle(text) {
    const h = $("#activeFormTitle");
    if (h) h.textContent = text || "—";
  }

  /* ---------------------------
     مُكوّن tags بسيط وخفيف
  --------------------------- */
  function makeTagsInput(input) {
    // input: <input> أو <textarea> نستخدمه كمدخل خام، ونبني wrapper
    const wrap = el("div", { class: "tags-wrap" });
    const list = el("div", { class: "tags-list" });
    const ghost = el("input", { class: "tags-ghost", type: "text", placeholder: input.placeholder || "…" });

    function parseVal() {
      const raw = (input.value || "").trim();
      return raw ? raw.split(",").map(s => s.trim()).filter(Boolean) : [];
    }
    function syncFromInput() {
      list.innerHTML = "";
      parseVal().forEach(addChip);
    }
    function addChip(txt) {
      const chip = el("span", { class: "tag-chip" }, [
        el("span", { class: "tag-text", text: txt }),
        el("button", { class: "tag-x", type: "button", title: "حذف", onClick: () => removeChip(txt) }, "×"),
      ]);
      list.appendChild(chip);
    }
    function removeChip(txt) {
      const arr = parseVal().filter(v => v !== txt);
      input.value = arr.join(", ");
      syncFromInput();
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    function commitGhost() {
      const v = ghost.value.trim();
      if (!v) return;
      const arr = parseVal();
      if (!arr.includes(v)) arr.push(v);
      input.value = arr.join(", ");
      ghost.value = "";
      syncFromInput();
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    ghost.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        commitGhost();
      } else if (e.key === "Backspace" && !ghost.value) {
        // حذف آخر شريحة
        const arr = parseVal();
        arr.pop();
        input.value = arr.join(", ");
        syncFromInput();
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    input.style.display = "none";
    wrap.appendChild(list);
    wrap.appendChild(ghost);
    input.parentNode.insertBefore(wrap, input.nextSibling);
    syncFromInput();
  }

  /* ---------------------------
     توليد نموذج ديناميكي من السكيما
  --------------------------- */
  function buildField(f) {
    const fieldWrap = el("div", { class: "form-field fade-in" });
    const label = el("label", { class: "field-label", text: f.label || f.key });
    if (f.required) markRequired(label);

    let control = null;

    switch (f.type) {
      case "textarea":
        control = el("textarea", { class: "control", rows: f.rows || 3, placeholder: f.placeholder || "", name: f.key });
        break;
      case "select":
        control = el("select", { class: "control", name: f.key });
        if (f.placeholder) control.appendChild(el("option", { value: "", text: f.placeholder }));
        (f.options || []).forEach(opt => {
          control.appendChild(el("option", { value: opt, text: opt }));
        });
        break;
      case "radio":
        control = el("div", { class: "radio-group" });
        (f.options || []).forEach(opt => {
          const id = `${f.key}-${String(opt).replace(/\s+/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
          const inp = el("input", { type: "radio", name: f.key, value: opt, id });
          const lab = el("label", { for: id, class: "radio-pill" }, opt);
          control.appendChild(inp);
          control.appendChild(lab);
        });
        break;
      case "number":
      case "date":
      case "time":
      case "email":
      case "tel":
      case "text":
      default:
        control = el("input", { class: "control", type: f.type || "text", placeholder: f.placeholder || "", name: f.key });
        if (f.min != null) control.min = f.min;
        if (f.max != null) control.max = f.max;
        break;
    }

    if (f.required && control instanceof HTMLElement) control.required = true;
    if (f.pattern && control && control.tagName === "INPUT") applyPattern(control, f.pattern);

    fieldWrap.appendChild(label);
    fieldWrap.appendChild(control);

    // تحويل tags
    if (f.type === "tags") {
      // نستخدم input text عادي كحامل
      control.type = "text";
      makeTagsInput(control);
    }

    return fieldWrap;
  }

  function renderForm(schema) {
    const form = $("#dynamicForm");
    form.innerHTML = ""; // تنظيف
    form.classList.add("fade-in");

    if (!schema) {
      form.innerHTML = `<div class="empty-state">اختر نموذجًا من اليسار أو اضغط “+ نموذج جديد”.</div>`;
      return;
    }

    // وصف النموذج
    form.appendChild(el("div", { class: "form-desc muted" }, schema.description || ""));

    // بناء الحقول بالترتيب المحدد إن وُجد
    const order = schema.columnsOrder && schema.columnsOrder.length ? schema.columnsOrder : schema.fields.map(f => f.key);
    order.forEach(key => {
      const f = schema.fields.find(x => x.key === key);
      if (f) form.appendChild(buildField(f));
    });

    // تلميحات بسيطة
    form.appendChild(el("div", { class: "muted", html: "↳ الحقول الإلزامية مميزة بعلامة <b>*</b>." }));

    // مؤثر بسيط عند التوليد
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fillForm(record) {
    const form = $("#dynamicForm");
    if (!form) return;
    Object.entries(record || {}).forEach(([k, v]) => {
      // radio
      const radios = $$(`input[type="radio"][name="${CSS.escape(k)}"]`, form);
      if (radios.length) {
        radios.forEach(r => (r.checked = (r.value == v)));
        return;
      }
      const elInput = form.querySelector(`[name="${CSS.escape(k)}"]`);
      if (!elInput) return;
      elInput.value = v ?? "";
      // لو كان tags
      if (elInput.style.display === "none" && elInput.nextElementSibling?.classList.contains("tags-wrap")) {
        // إعادة مزامنة الشرائح
        const ghost = elInput.nextElementSibling.querySelector(".tags-ghost");
        ghost && ghost.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      }
    });
  }

  function readFormValues(schema) {
    const form = $("#dynamicForm");
    const out = {};
    for (const f of schema.fields) {
      // radio
      if (f.type === "radio") {
        const picked = $(`input[type="radio"][name="${CSS.escape(f.key)}"]:checked`, form);
        out[f.key] = picked ? picked.value : "";
        continue;
      }
      const ctrl = form.querySelector(`[name="${CSS.escape(f.key)}"]`);
      out[f.key] = ctrl ? ctrl.value : "";
    }
    return out;
  }

  /* ---------------------------
     قائمة النماذج (اليسار)
  --------------------------- */
  function renderFormsMenu(onSelect) {
    const ul = $("#formsMenu");
    ul.innerHTML = "";
    window.PF_FORMS.schemas.forEach(s => {
      const li = el("li", { class: "form-item slide-in-right" });
      const btn = el("button", { class: "btn soft", type: "button" }, `${s.icon || "🗂️"} ${s.title}`);
      btn.addEventListener("click", () => onSelect && onSelect(s));
      li.appendChild(btn);
      ul.appendChild(li);
    });

    // لو أردت إضافة نموذج جديد لاحقًا سيصل إشعار pf:schemas:updated
    document.addEventListener("pf:schemas:updated", () => renderFormsMenu(onSelect), { once: true });
  }

  /* ---------------------------
     جدول النتائج + تمييز البحث
  --------------------------- */
  function renderResultsTable(columns, rows) {
    const head = $("#resultsHead");
    const body = $("#resultsBody");
    const empty = $("#resultsEmpty");
    head.innerHTML = "";
    body.innerHTML = "";

    if (!columns?.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = rows?.length ? "none" : "block";

    const tr = el("tr");
    columns.forEach(c => tr.appendChild(el("th", { text: c })));
    head.appendChild(tr);

    (rows || []).slice(0, CFG.UI.MAX_ROWS_RENDER).forEach(r => {
      const trb = el("tr");
      columns.forEach(c => trb.appendChild(el("td", { text: r[c] ?? "" })));
      body.appendChild(trb);
    });
  }

  function highlightTableSearch(q) {
    const term = (q || "").trim();
    const rows = $$("#resultsBody tr");
    if (!term) {
      rows.forEach(tr => tr.style.display = "");
      return;
    }
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    rows.forEach(tr => {
      const match = Array.from(tr.cells).some(td => rx.test(td.textContent));
      tr.style.display = match ? "" : "none";
    });
  }

  /* ---------------------------
     التحكم بعناصر الواجهة السريعة
  --------------------------- */
  function attachInteractiveControls({
    onNewForm,
    onSave,
    onReset,
    onImport,
    onExport,
    onClearLocal,
    onRefresh,
    onCopyTable,
    onPresentationToggle
  } = {}) {
    $("#newFormBtn")?.addEventListener("click", () => onNewForm && onNewForm());
    $("#saveEntryBtn")?.addEventListener("click", () => onSave && onSave());
    $("#resetFormBtn")?.addEventListener("click", () => onReset && onReset());
    $("#importSheetBtn")?.addEventListener("click", () => onImport && onImport());
    $("#exportJsonBtn")?.addEventListener("click", () => onExport && onExport());
    $("#clearLocalBtn")?.addEventListener("click", () => onClearLocal && onClearLocal());
    $("#refreshBtn")?.addEventListener("click", () => onRefresh && onRefresh());
    $("#copyTableBtn")?.addEventListener("click", () => onCopyTable && onCopyTable());
    $("#presentationBtn")?.addEventListener("click", () => onPresentationToggle && onPresentationToggle());

    // بحث سريع على الجدول
    $("#quickSearch")?.addEventListener("input", (e) => highlightTableSearch(e.target.value));
  }

  /* ---------------------------
     تحسينات بصرية طفيفة إضافية
  --------------------------- */
  // تأثير بسيط عند مرور الفأرة على عناصر القائمة
  document.addEventListener("mouseover", (e) => {
    const t = e.target;
    if (t?.closest?.(".forms-list .btn")) {
      t.classList.add("glow");
    }
  });
  document.addEventListener("mouseout", (e) => {
    const t = e.target;
    if (t?.closest?.(".forms-list .btn")) {
      t.classList.remove("glow");
    }
  });

  // نشر API
  window.PF_UI = {
    initTheme,
    applyTheme,
    showToast,
    setLoaderVisible,
    showModal,
    renderFormsMenu,
    renderForm,
    fillForm,
    readFormValues,
    renderResultsTable,
    setActiveFormTitle,
    attachInteractiveControls,
  };
})();
