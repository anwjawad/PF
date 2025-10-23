/* ======================================================
   storage.js
   إدارة تخزين البيانات محليًا + استيراد/تصدير JSON
   + دمج نتائج Google Sheets
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

  /** دمج بيانات جديدة (مثلاً من Google Sheets) */
  function mergeData(newRows = []) {
    const existing = loadLocal();
    const merged = [...existing, ...newRows];
    saveLocal(merged);
    return merged;
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
  };
})();
