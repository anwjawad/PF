/* ======================================================
   storage.js
   إدارة تخزين البيانات محليًا + استيراد/تصدير JSON
   + دمج نتائج Google Sheets مع إزالة التكرارات (Dedup)
====================================================== */

(function () {
  const CFG = window.PF_CONFIG;

  /** تحميل البيانات المحلية (Dataset) */
  function loadLocal() {
    try {
      const raw = localStorage.getItem(CFG.STORAGE_KEYS.DATASET);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  /** حفظ البيانات المحلية */
  function saveLocal(arr) {
    try {
      localStorage.setItem(CFG.STORAGE_KEYS.DATASET, JSON.stringify(arr || []));
    } catch (_) {}
  }

  /** مسح البيانات المحلية */
  function clearLocal() {
    try { localStorage.removeItem(CFG.STORAGE_KEYS.DATASET); } catch (_) {}
  }

  /** بصمة ثابتة لأي كائن (fallback) */
  function fingerprint(obj) {
    // ترتيب المفاتيح لتثبيت JSON
    const stable = (o) => {
      if (Array.isArray(o)) return o.map(stable);
      if (o && typeof o === "object") {
        const out = {};
        Object.keys(o).sort().forEach(k => out[k] = stable(o[k]));
        return out;
      }
      return o;
    };
    return JSON.stringify(stable(obj));
  }

  /** احصل على مفتاح النموذج الأساسي من PF_FORMS إن وُجد */
  function primaryKeyFor(schemaId) {
    try {
      const sch = window.PF_FORMS.get(schemaId);
      return sch && sch.primaryKey ? sch.primaryKey : null;
    } catch (_) { return null; }
  }

  /** يبني مفتاح إزالة التكرار لسجل */
  function dedupKey(row) {
    // 1) __uid لو موجود (فريد يُولّد في main.js عند الحفظ)
    if (row && row.__uid) return `uid:${row.__uid}`;
    // 2) schema + primaryKey
    const sid = row && row.__schema;
    const pk = primaryKeyFor(sid);
    if (sid && pk && row.hasOwnProperty(pk) && String(row[pk]).trim() !== "") {
      return `pk:${sid}:${String(row[pk])}`;
    }
    // 3) بصمة JSON كاملة
    return `fp:${fingerprint(row)}`;
    }

  /** دمج بيانات جديدة مع إزالة التكرار */
  function mergeData(newRows = []) {
    const map = new Map();
    const existing = loadLocal();
    // أضف الموجود
    (existing || []).forEach(r => map.set(dedupKey(r), r));
    // أضف الجديد (يستبدل أي تكرار)
    (newRows || []).forEach(r => map.set(dedupKey(r), r));
    const merged = Array.from(map.values());
    saveLocal(merged);
    return merged;
  }

  /** إزالة التكرارات من البيانات الحالية فقط (تنظيف) */
  function dedupeLocal() {
    const existing = loadLocal();
    const cleaned = mergeData([]); // سيحفظ الحالة الحالية بعد إزالة التكرارات
    return cleaned;
  }

  /** تصدير البيانات كـ JSON (ملف أو نص) */
  function exportJSON(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "palliative_forms_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  /** نسخ الجدول أو النص إلى Clipboard */
  async function copyToClipboard(txt) {
    try {
      await navigator.clipboard.writeText(txt);
      window.PF_UI.showToast("تم النسخ إلى الحافظة ✅");
    } catch (_) {
      window.PF_UI.showToast("تعذّر النسخ", "error");
    }
  }

  /** جلب بيانات Google Sheets ودمجها */
  async function importFromSheets() {
    window.PF_UI.setLoaderVisible(true);
    try {
      const { rows } = await window.PF_SHEETS.loadDefault();
      const merged = mergeData(rows);
      window.PF_UI.showToast(`تم استرجاع ${rows.length} سجل من Google Sheets`);
      return merged;
    } catch (err) {
      console.error(err);
      window.PF_UI.showToast("فشل الاسترجاع من Google Sheets", "error");
      return loadLocal();
    } finally {
      window.PF_UI.setLoaderVisible(false);
    }
  }

  /** تهيئة مبدئية للبيانات */
  function ensureDataset() {
    const existing = loadLocal();
    if (!existing.length) {
      saveLocal([]);
    }
    return existing;
  }

  // نشر API عالمي
  window.PF_STORE = {
    loadLocal,
    saveLocal,
    clearLocal,
    mergeData,
    exportJSON,
    importFromSheets,
    copyToClipboard,
    ensureDataset,
    dedupeLocal,
  };
})();
