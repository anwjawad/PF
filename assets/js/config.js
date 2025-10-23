/* ============================================
   config.js
   إعدادات عامة + روابط Google Sheets الافتراضية
   (لا حاجة لإدخال الروابط يدويًا داخل التطبيق)
============================================ */

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
      QUERY: "select *",
      buildGvizUrl() {
        const base = `https://docs.google.com/spreadsheets/d/${this.ID}/gviz/tq`;
        const params = new URLSearchParams({
          tq: this.QUERY,
          sheet: this.SHEET_NAME,
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

    // إعدادات Google Apps Script (GAS) — نقطة النهاية لنشر السكربت
    // ضع هنا رابط الـ Web App بعد نشر Google Apps Script (doGet URL)
    GAS: {
      // مثال: "https://script.google.com/macros/s/AKfycbx.../exec"
      // اتركه فارغًا أو اترك القيمة الافتراضية الواضحة إن لم تكن جاهزًا بعد.
      ENDPOINT: "",
      // لو true سيحاول التطبيق جلب السجلات من GAS عند التحميل (مزامنة أولية)
      AUTO_SYNC: false,
      // لو true سيحاول الكتابة إلى GAS بعد كل حفظ محلي بنمط write(schema, record)
      WRITE_ON_SAVE: true,
      // مهلة JSONP الافتراضية بالمللي ثانية
      TIMEOUT_MS: 15000,
    },
  };

  // نشر الإعدادات عالميًا
  window.PF_CONFIG = CONFIG;
})();
