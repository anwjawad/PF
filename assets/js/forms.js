/* ======================================================
   forms.js
   تعريف سِكيمات النماذج + أدوات مساعدة لتوليد الحقول
   قابل للتوسعة: أضف أي نموذج جديد داخل PF_FORMS.schemas
====================================================== */

(function () {
  /**
   * نوع الحقل المدعوم في الواجهة (ui.js):
   * text, number, date, time, select, radio, textarea, tel, email, checkbox, tags
   * (tags = إدخال كلمات مفصولة بفواصل مع كبسلة تلقائية)
   */

  const SCHEMAS = [
    {
      id: "patient_intake",
      title: "استقبال المريض",
      icon: "👤",
      description: "بيانات تعريف سريعة لتقليل وقت الإدخال في الاستقبال.",
      primaryKey: "patient_id",
      columnsOrder: ["patient_id", "full_name", "age", "gender", "phone", "diagnosis", "allergies", "care_goal", "notes"],
      fields: [
        { key: "patient_id", label: "رقم المريض", type: "text", required: true, pattern: window.PF_CONFIG.PATTERNS.ID.source, placeholder: "مثال: 12345" },
        { key: "full_name", label: "الاسم الكامل", type: "text", required: true, placeholder: "الاسم الثلاثي" },
        { key: "age", label: "العمر", type: "number", min: 0, max: 120, required: true },
        { key: "gender", label: "الجنس", type: "select", options: ["ذكر","أنثى","أخرى"], required: true, placeholder: "اختر…" },
        { key: "phone", label: "رقم الجوال", type: "tel", pattern: window.PF_CONFIG.PATTERNS.PHONE.source, placeholder: "+970 5X…" },
        { key: "diagnosis", label: "التشخيص", type: "text", required: true, placeholder: "مثال: سرطان…/فشل قلبي…" },
        { key: "allergies", label: "حساسية دوائية", type: "tags", placeholder: "بنسلين, أسبرين…" },
        { key: "care_goal", label: "هدف الرعاية", type: "radio", options: ["راحة الأعراض","خطة منزلية","متابعة عن بُعد"], required: true },
        { key: "notes", label: "ملاحظات", type: "textarea", rows: 3, placeholder: "أي تفاصيل مختصرة مهمة" },
      ],
    },

    {
      id: "pain_assessment",
      title: "تقييم الألم",
      icon: "🌡️",
      description: "أداة سريعة لتقييم شدة الألم ونمطه وعلاجه.",
      primaryKey: "entry_id",
      columnsOrder: ["entry_id","patient_id","date","time","pain_score","pain_site","pattern","triggers","relief","plan"],
      fields: [
        { key: "entry_id", label: "رقم الإدخال", type: "text", required: true, placeholder: "PA-001" },
        { key: "patient_id", label: "رقم المريض", type: "text", required: true, pattern: window.PF_CONFIG.PATTERNS.ID.source },
        { key: "date", label: "التاريخ", type: "date", required: true, default: "today" },
        { key: "time", label: "الوقت", type: "time", required: true, default: "now" },
        { key: "pain_score", label: "شدة الألم (0-10)", type: "number", min: 0, max: 10, required: true },
        { key: "pain_site", label: "موضع الألم", type: "text", placeholder: "صدر/ظهر/بطن…" },
        { key: "pattern", label: "النمط", type: "select", options: ["مستمر","نوبات","ليلي","مع الحركة"] },
        { key: "triggers", label: "محفزات", type: "tags", placeholder: "برد, حركة, أكل…" },
        { key: "relief", label: "ما يخفف الألم", type: "tags", placeholder: "راحة, مسكن, وضعية…" },
        { key: "plan", label: "خطة التدبير", type: "textarea", rows: 3, placeholder: "تعديل جرعة/إضافة دواء/تحويل…" },
      ],
    },

    {
      id: "medication_log",
      title: "سجل الأدوية",
      icon: "💊",
      description: "توثيق إعطاء الأدوية وتعديلاتها.",
      primaryKey: "med_id",
      columnsOrder: ["med_id","patient_id","date","time","drug_name","dose","route","frequency","side_effects","given_by"],
      fields: [
        { key: "med_id", label: "رقم السجل", type: "text", required: true, placeholder: "MED-001" },
        { key: "patient_id", label: "رقم المريض", type: "text", required: true, pattern: window.PF_CONFIG.PATTERNS.ID.source },
        { key: "date", label: "التاريخ", type: "date", required: true, default: "today" },
        { key: "time", label: "الوقت", type: "time", required: true, default: "now" },
        { key: "drug_name", label: "اسم الدواء", type: "text", required: true, placeholder: "مورفين… إلخ" },
        { key: "dose", label: "الجرعة", type: "text", required: true, placeholder: "5mg كل 4 ساعات" },
        { key: "route", label: "طريقة الإعطاء", type: "select", options: ["PO","IV","IM","SC","PR","Patch"], required: true },
        { key: "frequency", label: "التكرار", type: "text", placeholder: "كل 8 ساعات/عند اللزوم…" },
        { key: "side_effects", label: "آثار جانبية", type: "tags", placeholder: "غثيان, نعاس…" },
        { key: "given_by", label: "أُعطي بواسطة", type: "text", placeholder: "ممرضة/طبيب/مرافق…" },
      ],
    },

    {
      id: "advanced_care_plan",
      title: "خطة الرعاية المتقدمة",
      icon: "📝",
      description: "ملخص تفضيلات المريض وقراراته.",
      primaryKey: "plan_id",
      columnsOrder: ["plan_id","patient_id","date","dnr","preferred_place","contacts","cultural_notes","next_review"],
      fields: [
        { key: "plan_id", label: "رقم الخطة", type: "text", required: true, placeholder: "ACP-001" },
        { key: "patient_id", label: "رقم المريض", type: "text", required: true, pattern: window.PF_CONFIG.PATTERNS.ID.source },
        { key: "date", label: "التاريخ", type: "date", required: true, default: "today" },
        { key: "dnr", label: "عدم الإنعاش (DNR)", type: "radio", options: ["نعم","لا","غير محدد"], required: true },
        { key: "preferred_place", label: "مكان الرعاية المفضل", type: "select", options: ["المنزل","المستشفى","مركز رعاية"], placeholder: "اختر…" },
        { key: "contacts", label: "جهات تواصل أساسية", type: "tags", placeholder: "اسم – هاتف, اسم – هاتف…" },
        { key: "cultural_notes", label: "مراعاة ثقافية/دينية", type: "textarea", rows: 3, placeholder: "تفاصيل مهمة" },
        { key: "next_review", label: "مراجعة قادمة", type: "date" },
      ],
    },

    /* ==============================
       NEW FORM: إعارة معدات طبية 2025
    ============================== */
    {
      id: "equipment_loan_2025",
      title: "إعارة معدات طبية 2025",
      icon: "🧰",
      description: "تسجيل عمليات إعارة المعدات الطبية وتتبع التسليم والإرجاع.",
      primaryKey: "device_number",
      columnsOrder: [
        "patient_name",
        "recipient_name",
        "kinship",
        "patient_file_id",
        "recipient_id",
        "contact_phone",
        "region",
        "diagnosis",
        "device",
        "device_number",
        "delivery_date",
        "palliative_signature",
        "return_date",
        "receipt_status",
        "notes"
      ],
      fields: [
        { key: "patient_name", label: "اسم المريض", type: "text", required: true, placeholder: "الاسم الكامل" },
        { key: "recipient_name", label: "اسم مستلم الجهاز", type: "text", required: true, placeholder: "اسم المستلم" },
        { key: "kinship", label: "صلة القرابة", type: "text", placeholder: "ابن/ابنة/أخ/أخت…" },

        { key: "patient_file_id", label: "رقم هوية / ملف المريض", type: "text",
          required: true, pattern: window.PF_CONFIG.PATTERNS.ID.source, placeholder: "مثال: 991234567" },

        { key: "recipient_id", label: "رقم هوية المستلم", type: "text",
          pattern: window.PF_CONFIG.PATTERNS.ID.source, placeholder: "مثال: 901234567" },

        { key: "contact_phone", label: "رقم للتواصل", type: "tel",
          pattern: window.PF_CONFIG.PATTERNS.PHONE.source, placeholder: "+970 5X…" },

        { key: "region", label: "المنطقة", type: "select",
          options: ["Bethlehem","Hebron","Jenin","Jerusalem","Nablus","Ramallah","Salfit","Tulkarm"],
          placeholder: "اختر…" },

        { key: "diagnosis", label: "التشخيص الطبي", type: "text", placeholder: "مثال: Breast / Lung / Head & Neck…" },

        { key: "device", label: "الجهاز المطلوب", type: "select",
          options: ["Air Mattress","Commode","Lymphatic Drainage Device","Nebulizer","O2 Generator","Suction Machine"],
          required: true, placeholder: "اختر الجهاز…" },

        { key: "device_number", label: "رقم الجهاز", type: "text", required: true, placeholder: "مثال: 4415" },

        { key: "delivery_date", label: "تاريخ التسليم", type: "date", required: true, default: "today" },

        { key: "palliative_signature", label: "توقيع قسم الرعاية التلطيفية", type: "select",
          options: ["أصالة نوباني","أمين دحودلان","تامر الجعفري","جواد ابو صبحة"],
          placeholder: "اختر…" },

        { key: "return_date", label: "تاريخ الارجاع", type: "date" },

        { key: "receipt_status", label: "حالة الاستلام", type: "radio",
          options: ["مستلم","غير مستلم"], required: true },

        { key: "notes", label: "ملاحظات", type: "textarea", rows: 3, placeholder: "تفاصيل إضافية عند الحاجة" }
      ]
    }
  ];

  /** أدوات مساعدة */
  function schemaById(id) {
    return SCHEMAS.find(s => s.id === id) || null;
  }

  function createEmptyRecord(schema) {
    const rec = {};
    schema.fields.forEach(f => {
      if (f.default === "today") {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        rec[f.key] = `${yyyy}-${mm}-${dd}`;
      } else if (f.default === "now") {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        rec[f.key] = `${hh}:${mi}`;
      } else {
        rec[f.key] = "";
      }
    });
    return rec;
  }

  function addSchema(schema) {
    if (!schema || !schema.id) return;
    if (SCHEMAS.some(s => s.id === schema.id)) return;
    SCHEMAS.push(schema);
    document.dispatchEvent(new CustomEvent("pf:schemas:updated"));
  }

  window.PF_FORMS = {
    schemas: SCHEMAS,
    get: schemaById,
    addSchema,
    createEmptyRecord,
  };
})();
