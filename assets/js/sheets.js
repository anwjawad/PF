/* ======================================================
   sheets.js
   جلب بيانات Google Sheets عبر JSONP (gviz) بدون CORS
   + تحويل النتائج إلى Array<Object> قابلة للعرض والتخزين
====================================================== */

(function () {
  const CFG = window.PF_CONFIG;

  // تخزين الطلبات المعلّقة: كل طلب له id ونحتفظ بـ resolve/reject
  const pending = new Map();
  let reqSeq = 0;

  /**
   * Google gviz يعيد استجابة على شكل استدعاء:
   * google.visualization.Query.setResponse(<payload>);
   * هنا نعترض هذا الاستدعاء بشكل آمن ونمرّره لأحدث طلب معلّق matching.
   */
  if (!window.google) window.google = {};
  if (!google.visualization) google.visualization = {};
  google.visualization.Query = google.visualization.Query || {};

  // إن كان هناك setResponse أصلاً (موجود من سكربت آخر)، نلفّه (wrap)
  const originalSetResponse = google.visualization.Query.setResponse;

  google.visualization.Query.setResponse = function (payload) {
    // نبحث عن آخر طلب pending (أو المعرّف الممرّر إن وُجد)
    // gviz لا يعطينا requestId صريح، لذا نأخذ أحدث واحد.
    const lastKey = Array.from(pending.keys()).pop();
    if (lastKey) {
      const { resolve } = pending.get(lastKey);
      pending.delete(lastKey);
      resolve(payload);
    }
    // نحافظ على أي سلوك سابق إن وُجد
    if (typeof originalSetResponse === "function") {
      try { originalSetResponse(payload); } catch (_) {}
    }
  };

  /** حقن سكربت JSONP ديناميكيًا */
  function injectScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onerror = () => reject(new Error("فشل تحميل JSONP من Google Sheets"));
      // تحسّب: في حالة حُذِف قبل onload
      s.onload = () => resolve();
      document.head.appendChild(s);
      // تنظيف لاحقًا لعدم تكدّس السكربتات
      setTimeout(() => s.remove(), 10_000);
    });
  }

  /** استعلام gviz عبر JSONP وإرجاع الـ payload الخام */
  async function gvizFetch(url) {
    const id = ++reqSeq;
    const p = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      // حارس وقتي إذا Google لم تستدعِ setResponse لأي سبب
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error("انتهت المهلة بانتظار استجابة gviz"));
        }
      }, 15000);
    });
    await injectScript(url);
    return p;
  }

  /** تحويل بنية gviz إلى صفيف كائنات بسيط [{col: val, ...}] */
  function gvizToObjects(payload) {
    if (!payload || !payload.table) return [];
    const table = payload.table;
    const cols = (table.cols || []).map((c, i) => {
      // نختار label إن كان موجودًا وإلا id وإلا col<i>
      return (c && (c.label || c.id)) ? (c.label || c.id) : `col${i}`;
    });

    const rows = table.rows || [];
    const out = rows.map(r => {
      const o = {};
      cols.forEach((name, i) => {
        const cell = r.c && r.c[i] ? r.c[i] : null;
        // cell?.v القيمة الخام، cell?.f الصيغة المنسّقة
        let v = cell ? (cell.f ?? cell.v) : null;
        // معالجة تواريخ gviz (نوع date/datetime يرجع ككائن)
        if (v && typeof v === "object" && v.year !== undefined) {
          // gviz dates: {v:null,f:"..."} أو Date-like
          // إن وُجد cell.f نستخدمه، وإلا نبني yyyy-mm-dd
          if (!cell.f) {
            const yyyy = v.year;
            const mm = String(v.month + 1).padStart(2, "0");
            const dd = String(v.day).padStart(2, "0");
            v = `${yyyy}-${mm}-${dd}`;
          }
        }
        o[name] = v ?? "";
      });
      return o;
    });
    return { columns: cols, rows: out };
  }

  /** واجهة عامة: تحميل الإعداد الافتراضي من config.js */
  async function loadDefault() {
    const url = CFG.SHEETS.buildGvizUrl();
    const payload = await gvizFetch(url);
    return gvizToObjects(payload);
    // يُعاد: { columns: [...], rows: [...] }
  }

  /**
   * تحميل مخصّص (تمهيد لإضافة أكثر من فورم/شيت لاحقًا)
   * @param {Object} opts { id, sheet, query }
   */
  async function load(opts = {}) {
    const id = opts.id || CFG.SHEETS.ID;
    const sheet = opts.sheet || CFG.SHEETS.SHEET_NAME;
    const query = opts.query || CFG.SHEETS.QUERY;
    const base = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq`;
    const url = `${base}?tq=${encodeURIComponent(query)}&sheet=${encodeURIComponent(sheet)}&tqx=out:json`;
    const payload = await gvizFetch(url);
    return gvizToObjects(payload);
  }

  /** أداة مساعدة: تحويل صفيف الكائنات إلى CSV للنُّسخ/التصدير */
  function toCSV({ columns, rows }) {
    const head = columns.join(",");
    const body = rows.map(r => columns.map(c => {
      const val = r[c] ?? "";
      // نهرب الفواصل والأسطر
      const needsQuote = /[",\n]/.test(String(val));
      const safe = String(val).replace(/"/g, '""');
      return needsQuote ? `"${safe}"` : safe;
    }).join(","));
    return [head, ...body].join("\n");
  }

  // نشر API عالميًا
  window.PF_SHEETS = {
    loadDefault,
    load,
    toCSV,
  };
})();
