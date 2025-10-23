/* ======================================================
   main.js
   نقطة الدخول وتدفق العمل: ربط UI + Forms + Sheets + Store
   -> مضاف: دعم Google Apps Script (GAS) للكتابة/المزامنة عبر JSONP
====================================================== */

(function () {
  const CFG = window.PF_CONFIG;

  // حالة عامة بسيطة
  const STATE = {
    activeSchema: null,
    currentViewRows: [], // الصفوف المعروضة في الجدول (حسب النموذج النشط)
  };

  /* ---------------------------
     أدوات مساعدة
  --------------------------- */
  function getAllData() {
    return window.PF_STORE.loadLocal();
  }

  function setActiveSchema(schema) {
    STATE.activeSchema = schema;
    window.PF_UI.setActiveFormTitle(schema ? schema.title : "—");
    window.PF_UI.renderForm(schema);
    // عند تغيير النموذج نحدّث جدول النتائج ليعرض فقط سجلات هذا النموذج
    refreshResults();
  }

  function refreshResults() {
    const all = getAllData();
    let rows = [];
    let columns = [];

    if (STATE.activeSchema) {
      const sid = STATE.activeSchema.id;
      rows = all.filter(r => r.__schema === sid);
      // ترتيب الأعمدة وفق columnsOrder أو ترتيب الحقول
      columns = STATE.activeSchema.columnsOrder?.length
        ? STATE.activeSchema.columnsOrder
        : STATE.activeSchema.fields.map(f => f.key);
    } else {
      rows = [];
      columns = [];
    }

    STATE.currentViewRows = rows;
    window.PF_UI.renderResultsTable(columns, rows);
  }

  function validateRecord(schema, rec) {
    for (const f of schema.fields) {
      const v = rec[f.key];
      if (f.required && !String(v || "").trim()) {
        throw new Error(`الحقل "${f.label || f.key}" إجباري`);
      }
      if (f.pattern && v) {
        const rx = new RegExp(f.pattern);
        if (!rx.test(String(v))) {
          throw new Error(`قيمة غير صحيحة في "${f.label || f.key}"`);
        }
      }
      if (f.type === "number" && v !== "" && v != null) {
        const num = Number(v);
        if (f.min != null && num < f.min) {
          throw new Error(`القيمة في "${f.label || f.key}" أقل من المسموح (${f.min})`);
        }
        if (f.max != null && num > f.max) {
          throw new Error(`القيمة في "${f.label || f.key}" أكبر من المسموح (${f.max})`);
        }
      }
    }
  }

  function recordFromForm(schema) {
    const rec = window.PF_UI.readFormValues(schema);
    rec.__schema = schema.id; // وسم السجل بنوع السكيما للفصل بين النماذج
    return rec;
  }

  function resetFormToDefaults() {
    if (!STATE.activeSchema) return;
    const empty = window.PF_FORMS.createEmptyRecord(STATE.activeSchema);
    window.PF_UI.fillForm(empty);
  }

  function toCsvOfCurrentView() {
    if (!STATE.activeSchema) return "";
    const cols = STATE.activeSchema.columnsOrder?.length
      ? STATE.activeSchema.columnsOrder
      : STATE.activeSchema.fields.map(f => f.key);

    return window.PF_SHEETS.toCSV({
      columns: cols,
      rows: STATE.currentViewRows,
    });
  }

  /* ---------------------------
     وظائف GAS المساعدة (آمنة)
  --------------------------- */
  function gasAvailable() {
    return !!(window.PF_GAS && CFG.GAS && CFG.GAS.ENDPOINT && CFG.GAS.ENDPOINT.trim());
  }

  async function gasWriteIfEnabled(schemaId, recordObj) {
    if (!gasAvailable()) return null;
    if (!CFG.GAS.WRITE_ON_SAVE) return null;
    try {
      const res = await window.PF_GAS.write(schemaId, recordObj);
      window.PF_UI.showToast("تمت مزامنة السجل إلى السحابة ✅");
      return res;
    } catch (err) {
      console.warn("PF_GAS.write failed:", err);
      window.PF_UI.showToast("فشل مزامنة السجل إلى السحابة", "error");
      return null;
    }
  }

  async function gasAutoSyncIfEnabled() {
    if (!gasAvailable()) return;
    if (!CFG.GAS.AUTO_SYNC) return;
    try {
      await window.PF_GAS.syncIntoLocal(); // يدمج البيانات الموجودة في السحابة محليًا
      refreshResults();
    } catch (err) {
      console.warn("PF_GAS.syncIntoLocal failed:", err);
      // لا نعرض خطأ جارف — نكتفي بالتنبيه الرفيع
      window.PF_UI.showToast("فشل المزامنة الأولية من السحابة", "error");
    }
  }

  /* ---------------------------
     ربط القوائم و عناصر الواجهة
  --------------------------- */
  function initMenus() {
    window.PF_UI.renderFormsMenu((schema) => {
      setActiveSchema(schema);
      resetFormToDefaults();
    });
  }

  function initControls() {
    window.PF_UI.attachInteractiveControls({
      onNewForm: async () => {
        const opts = window.PF_FORMS.schemas
          .map(s => `<option value="${s.id}">${s.icon || "🗂️"} ${s.title}</option>`)
          .join("");

        const body = `
          <p>اختر النموذج الذي تريد إنشاء إدخال جديد له:</p>
          <label class="field-label">النموذج</label>
          <select id="modalSchemaPick" class="control">${opts}</select>
        `;

        const res = await window.PF_UI.showModal("نموذج جديد", body);
        if (res === "ok") {
          const id = document.getElementById("modalSchemaPick").value;
          const schema = window.PF_FORMS.get(id);
          if (schema) {
            setActiveSchema(schema);
            resetFormToDefaults();
            window.PF_UI.showToast("تم فتح نموذج جديد");
          }
        }
      },

      onSave: async () => {
        if (!STATE.activeSchema) {
          window.PF_UI.showToast("اختر نموذجًا أولًا", "error");
          return;
        }
        try {
          const rec = recordFromForm(STATE.activeSchema);
          validateRecord(STATE.activeSchema, rec);

          // حفظ محلي
          const all = getAllData();
          all.push(rec);
          window.PF_STORE.saveLocal(all);
          window.PF_UI.showToast("تم الحفظ محليًا ✅");

          // تحديث الجدول
          refreshResults();

          // محاولة الكتابة إلى Google Apps Script إن مفعّل
          await gasWriteIfEnabled(STATE.activeSchema.id, rec);

        } catch (err) {
          window.PF_UI.showToast(err.message || "تعذّر الحفظ", "error");
        }
      },

      onReset: () => {
        resetFormToDefaults();
        window.PF_UI.showToast("تمت إعادة ضبط الحقول");
      },

      onImport: async () => {
        // يترك الاستيراد من Google Sheets التقليدي كما هو
        const merged = await window.PF_STORE.importFromSheets();
        refreshResults();
        if (!merged.length) window.PF_UI.showToast("لا توجد بيانات للاستيراد", "error");
      },

      onExport: () => {
        const data = getAllData();
        if (!data.length) {
          window.PF_UI.showToast("لا توجد بيانات لتصديرها", "error");
          return;
        }
        window.PF_STORE.exportJSON(data);
        window.PF_UI.showToast("تم تصدير JSON");
      },

      onClearLocal: async () => {
        const res = await window.PF_UI.showModal(
          "تأكيد",
          `<p>سيتم حذف كل البيانات المحلية من هذا المتصفح.</p><p>هل أنت متأكد؟</p>`
        );
        if (res === "ok") {
          window.PF_STORE.clearLocal();
          refreshResults();
          window.PF_UI.showToast("تم المسح المحلي");
        }
      },

      onRefresh: () => {
        refreshResults();
        window.PF_UI.showToast("تم التحديث");
      },

      onCopyTable: () => {
        if (!STATE.activeSchema) {
          window.PF_UI.showToast("اختر نموذجًا لنسخ جدوله", "error");
          return;
        }
        const csv = toCsvOfCurrentView();
        if (!csv) {
          window.PF_UI.showToast("لا توجد بيانات لنسخها", "error");
          return;
        }
        window.PF_STORE.copyToClipboard(csv);
      },

      onPresentationToggle: () => {
        document.body.classList.toggle("presentation");
        window.PF_UI.showToast(document.body.classList.contains("presentation")
          ? "تم تفعيل وضع العرض"
          : "تم إيقاف وضع العرض");
      },
    });
  }

  /* ---------------------------
     تهيئة عند التحميل
  --------------------------- */
  async function boot() {
    window.PF_UI.setLoaderVisible(true);

    // الثيم
    window.PF_UI.initTheme(document.getElementById("themeSelect"));

    // القوائم و عناصر التحكم
    initMenus();
    initControls();

    // ضمان وجود dataset محلي
    window.PF_STORE.ensureDataset();

    // اختيار نموذج افتراضي (الأول في القائمة) لتسريع الإدخال
    const first = window.PF_FORMS.schemas[0];
    setActiveSchema(first);
    resetFormToDefaults();

    // إذا تم إعداد GAS و AUTO_SYNC true -> مزامنة أولية من السحابة
    try {
      await gasAutoSyncIfEnabled();
    } catch (e) {
      console.warn("Initial GAS sync failed:", e);
    }

    // إخفاء اللودر
    window.PF_UI.setLoaderVisible(false);
    window.PF_UI.showToast("جاهز 🎉");
  }

  // ابدأ
  document.addEventListener("DOMContentLoaded", boot);
})();
