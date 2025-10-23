/* ======================================================
   gas.js
   واجهة JSONP للتواصل مع Google Apps Script (قراءة/كتابة)
   - بدون CORS (script injection + callback)
   - نقطة نهاية افتراضية من PF_CONFIG.GAS.ENDPOINT (إن وُجدت)
====================================================== */

(function () {
  const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwJfD9LelAtbExhrhL2rCzORldywIa6092xZU9Q-OFpBWxGKiTcuHEArlPDRdVieYBE/exec'; 
  // مثال بعد النشر: https://script.google.com/macros/s/AKfycbx.../exec

  const CFG = window.PF_CONFIG || {};
  const GAS = (CFG.GAS && CFG.GAS.ENDPOINT) ? CFG.GAS.ENDPOINT : DEFAULT_ENDPOINT;

  let seq = 0;

  /** حقن سكربت JSONP */
  function jsonp(url, params = {}, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const cbName = `pf_cb_${Date.now()}_${++seq}`;
      const qs = new URLSearchParams({ ...params, callback: cbName });
      const full = `${url}${url.includes('?') ? '&' : '?'}${qs.toString()}`;

      const s = document.createElement('script');
      let timer = null;

      window[cbName] = (payload) => {
        cleanup();
        resolve(payload);
      };

      function cleanup() {
        if (s && s.parentNode) s.parentNode.removeChild(s);
        if (timer) clearTimeout(timer);
        try { delete window[cbName]; } catch (_) { window[cbName] = undefined; }
      }

      s.src = full;
      s.async = true;
      s.onerror = () => { cleanup(); reject(new Error('فشل طلب JSONP إلى GAS')); };
      document.head.appendChild(s);

      timer = setTimeout(() => {
        cleanup();
        reject(new Error('انتهت مهلة انتظار استجابة GAS'));
      }, timeoutMs);
    });
  }

  /** نقطة النهاية */
  function endpoint() {
    if (!GAS || GAS.includes('PUT-APPS-SCRIPT')) {
      console.warn('[PF_GAS] يرجى ضبط PF_CONFIG.GAS.ENDPOINT بعنوان الويب آب الخاص بـ Apps Script.');
    }
    return GAS;
  }

  /** إنشاء/تجهيز الملف + الورقة + الرؤوس (يرجع id/url/headers) */
  async function setup() {
    const ep = endpoint();
    const res = await jsonp(ep, { action: 'setup' });
    if (!res || res.ok !== true) throw new Error(res?.error || 'فشل setup');
    return res;
  }

  /** قراءة كل السجلات لجميع النماذج */
  async function readAll() {
    const ep = endpoint();
    const res = await jsonp(ep, { action: 'read' });
    if (!res || res.ok !== true) throw new Error(res?.error || 'فشل القراءة');
    return res.rows || [];
  }

  /** قراءة حسب سكيما معيّن */
  async function readBySchema(schemaId) {
    const ep = endpoint();
    const res = await jsonp(ep, { action: 'read', schema: schemaId || '' });
    if (!res || res.ok !== true) throw new Error(res?.error || 'فشل القراءة');
    return res.rows || [];
  }

  /** كتابة سجل */
  async function write(schemaId, recordObj) {
    const ep = endpoint();
    const res = await jsonp(ep, {
      action: 'write',
      schema: schemaId,
      record: JSON.stringify(recordObj || {})
    });
    if (!res || res.ok !== true) throw new Error(res?.error || 'فشل الكتابة');
    return res;
  }

  /** مزامنة إلى التخزين المحلي (يَدمج دون حذف القديم) */
  async function syncIntoLocal(schemaId = '') {
    const rows = schemaId ? await readBySchema(schemaId) : await readAll();
    const merged = window.PF_STORE.mergeData(rows);
    window.PF_UI.showToast(`تمت المزامنة من السحابة: ${rows.length} سجل`);
    return merged;
  }

  // نشر API عالمي
  window.PF_GAS = {
    setup,
    readAll,
    readBySchema,
    write,
    syncIntoLocal,
  };
})();
