/* ============================================
   config.js
   إعدادات عامة + روابط Google Sheets الافتراضية
   (لا حاجة لإدخال الروابط يدويًا داخل التطبيق)
============================================ */

/**
 * ملاحظة JSONP:
 * سنستخدم واجهة gviz الخاصة بجوجل شيت لأنها تُرجِع استجابة جافاسكربت
 * (google.visualization.Query.setResponse) وبالتالي لا يحصل CORS Block على GitHub Pages.
 * سنلتقط هذه الاستجابة في sheets.js عبر دالة global hook.
 *
 * مثال على رابط gviz:
 * https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tq=<QUERY>&sheet=<SHEET_NAME>
 *
 * يمكن لاحقًا تغيير هذه القيم دون تعديل المنطق في باقي الملفات.
 */

(function () {
  const CONFIG = {
    APP_NAME: "Palliative Forms",
    APP_VERSION: "0.1.0",
    DEFAULT_THEME: "ocean",

    // مفاتيح التخزين المحلي
    STORAGE_KEYS: {
      THEME: "pf:theme",
      DATASET: "pf:dataset",           // السجلات المجمعة من النماذج
      SCHEMA_CACHE: "pf:schema-cache", // كاش لتعريفات النماذج (اختياري)
    },

    // إعدادات Google Sheets الافتراضية (عامّة التجربة ويمكنك تبديلها لاحقًا)
    SHEETS: {
      // مثال عام ومتاح من Google (يمكن تغييره لاحقًا لشيت الرعاية التلطيفية الفعلي)
      ID: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      SHEET_NAME: "Class Data",
      // استعلام gviz (SQL-like). عدّل الأعمدة لاحقًا وفق شيتك الحقيقي.
      // tq=select * يجلب كل الأعمدة.
      QUERY: "select *",

      /**
       * مولّد رابط gviz النهائي (يُستخدم في sheets.js)
       * نُبقيه دالة لسهولة الاستبدال لاحقًا.
       */
      buildGvizUrl() {
        const base = `https://docs.google.com/spreadsheets/d/${this.ID}/gviz/tq`;
        const params = new URLSearchParams({
          tq: this.QUERY,
          sheet: this.SHEET_NAME,
          // tqx=out:json سيعيد استجابة جافاسكربت (ليست JSON صافي) — مناسبة لأسلوب JSONP
          tqx: "out:json",
        });
        return `${base}?${params.toString()}`;
      },
    },

    // إعدادات تجربة الواجهة
    UI: {
      TOAST_DURATION: 2600,
      MAX_ROWS_RENDER: 1000,
    },

    // تعريفات أساسية للفاليديشن/الأنماط (يُستخدم داخل ui.js عند إنشاء الحقول)
    PATTERNS: {
      PHONE: /^[0-9+\-()\s]{6,}$/,
      ID: /^[0-9]{5,}$/,
      DATE: /^\d{4}-\d{2}-\d{2}$/,
    },
  };

  // نشر الإعدادات عالميًا
  window.PF_CONFIG = CONFIG;
})();
