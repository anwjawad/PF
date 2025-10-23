/* ======================================================
   main.js
   نقطة الدخول وتدفق العمل: ربط UI + Forms + Sheets + Store
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
      // بدون نموذج نشط: لا نعرض شيئًا (حتى يكون واضح و سريع)
      rows = [];
      columns = [];
    }

    STATE.currentViewRows = rows;
    window.PF_UI.renderResultsTable(columns, rows);
  }

  function validateRecord(schema, rec) {
    // التحقق الأساسي للحقول required + pattern + min/max للأرقام
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
    // تطبيع شرائح tags: إبقائها نصًا مفصولًا بفواصل (جاهزة للتصدير)
    // (تم بالفعل في ui.js)
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
        // اختيار النموذج عبر مودال بسيط
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

      onSave: () => {
        if (!STATE.activeSchema) {
          window.PF_UI.showToast("اختر نموذجًا أولًا", "error");
          return;
        }
        try {
          const rec = recordFromForm(STATE.activeSchema);
          validateRecord(STATE.activeSchema, rec);
          const all = getAllData();
          all.push(rec);
          window.PF_STORE.saveLocal(all);
          window.PF_UI.showToast("تم الحفظ ✅");
          // تحديث الجدول
          refreshResults();
        } catch (err) {
          window.PF_UI.showToast(err.message || "تعذّر الحفظ", "error");
        }
      },

      onReset: () => {
        resetFormToDefaults();
        window.PF_UI.showToast("تمت إعادة ضبط الحقول");
      },

      onImport: async () => {
        const merged = await window.PF_STORE.importFromSheets();
        // إن كان هناك نموذج نشط، فلن يتم تصفية الاستيراد حسبه (الاستيراد عام).
        // يمكنك لاحقًا تعديل mapping لتخزين __schema عند الاستيراد.
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

    // إخفاء اللودر
    window.PF_UI.setLoaderVisible(false);
    window.PF_UI.showToast("جاهز 🎉");
  }

  // ابدأ
  document.addEventListener("DOMContentLoaded", boot);
})();
