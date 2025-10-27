<!-- ضعه كملف منفصل pf_theme.js -->
<script>
(() => {
  // 1) ضمان وسم الموبايل
  if (!document.querySelector('meta[name="viewport"]')) {
    const m = document.createElement('meta');
    m.name = 'viewport';
    m.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    document.head.appendChild(m);
  }

  // 2) إعدادات الثيم
  const root = document.documentElement;
  const STORAGE_KEY = 'pf_theme'; // 'light' | 'dark' | 'auto'
  const saved = localStorage.getItem(STORAGE_KEY) || 'auto';

  function applyTheme(mode) {
    // data-theme لتفعيل prefers-color-scheme حين "auto"
    root.setAttribute('data-theme', mode);
    root.classList.toggle('dark', mode === 'dark' || (mode === 'auto' && matchDark()));
    updateToggleLabel(mode);
  }

  function matchDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // 3) زر التبديل (يُنشأ تلقائيًا إذا لم يوجد)
  function ensureToggle() {
    let btn = document.getElementById('themeToggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'themeToggle';
      btn.type = 'button';
      btn.className = 'button secondary';
      btn.title = 'تبديل الوضع';
      btn.textContent = 'الوضع: تلقائي';
      // حاول وضعه في .appbar، وإن لم توجد فإلى body بداية الصفحة
      const bar = document.querySelector('.appbar');
      (bar || document.body).appendChild(btn);
    }
    return btn;
  }

  function cycleMode(m) {
    // الترتيب: auto -> dark -> light -> auto
    if (m === 'auto') return 'dark';
    if (m === 'dark') return 'light';
    return 'auto';
  }

  function updateToggleLabel(mode) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const label = mode === 'auto' ? 'تلقائي' : (mode === 'dark' ? 'داكن' : 'فاتح');
    btn.textContent = `الوضع: ${label}`;
  }

  // 4) تفعيل
  const btn = ensureToggle();
  applyTheme(saved);

  // 5) تبديل بالنقر
  btn.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || 'auto';
    const next = cycleMode(current);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  });

  // 6) لو المستخدم على "auto"، حدّث عند تغيير نظام التشغيل
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', () => {
      const mode = localStorage.getItem(STORAGE_KEY) || 'auto';
      if (mode === 'auto') applyTheme('auto');
    });
  }
})();
</script>