const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

const fields = [
  ["school_id", "المدرسة", "select", "school"],
  ["title", "عنوان التجربة", "text"],
  ["field", "مجال التجربة", "select", ["البيئة الصفية", "التخطيط للتدريس", "تنفيذ الدروس", "التقويم", "تأمل المعلمين", "تحسين نواتج التعلم", "ممارسات التعلم العميق", "أخرى"]],
  ["description", "وصف مختصر للتجربة", "textarea"],
  ["problem", "مشكلة أو احتياج التجربة", "textarea"],
  ["goals", "أهداف التجربة", "textarea"],
  ["target_group", "الفئة المستهدفة", "text"],
  ["implementation_steps", "خطوات التنفيذ", "textarea"],
  ["tools_strategies", "الأدوات والاستراتيجيات المستخدمة", "textarea"],
  ["leadership_role", "دور القيادة المدرسية", "textarea"],
  ["teachers_role", "دور المعلمين", "textarea"],
  ["students_role", "دور الطلاب", "textarea"],
  ["evidence_results", "الشواهد والنتائج", "textarea"],
  ["before_indicators", "مؤشرات الأثر قبل التطبيق", "textarea"],
  ["after_indicators", "مؤشرات الأثر بعد التطبيق", "textarea"],
  ["improvement_percentage", "نسبة التحسن إن وجدت", "number"],
  ["challenges", "التحديات التي واجهت المدرسة", "textarea"],
  ["proposed_solutions", "حلول مقترحة", "textarea"],
  ["scalability", "إمكانية تعميم التجربة", "textarea"],
  ["external_links", "روابط خارجية إن وجدت", "textarea"]
];

const stepGroups = [
  ["school_id"],
  ["title", "field", "description", "problem", "target_group"],
  ["goals", "implementation_steps", "tools_strategies", "leadership_role", "teachers_role", "students_role"],
  ["evidence_results", "before_indicators", "after_indicators", "improvement_percentage", "challenges", "proposed_solutions", "scalability", "external_links"],
  [],
  []
];

const state = {
  user: null,
  data: null,
  publicData: null,
  publicSubmission: null,
  view: "home",
  selected: null,
  step: 0,
  draft: {}
};

function showToast(message, danger = false) {
  toast.textContent = message;
  toast.style.background = danger ? "#8d2929" : "#113b30";
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.hidden = true, 3400);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.focus();
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("تعذر النسخ التلقائي.");
  return true;
}

function shareMessage(link) {
  return `السلام عليكم ورحمة الله وبركاته

نأمل منكم تسجيل تجربة تحسين التدريس عبر الرابط التالي:
${link}

يرجى فتح الرابط، ثم تعبئة نموذج تسجيل تجربة مدرسية، وإرسال التجربة ورفع المرفقات إن وجدت.`;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
    body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined)
  });
  const type = res.headers.get("content-type") || "";
  const payload = type.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(payload.error || payload || "حدث خطأ غير متوقع.");
  return payload;
}

function roleName(role) {
  return { admin: "مدير النظام", supervisor: "مشرف إدارة تعليم عسير", school: "مدرسة / منسق مدرسة" }[role] || role;
}

function statusClass(status) {
  return status === "قيد المراجعة" ? "review" : status === "معتمدة" ? "approved" : status === "مدرجة في الإصدار" ? "magazine" : status === "مرفوضة" ? "rejected" : status === "بحاجة إلى تعديل" ? "edit" : "";
}

function schoolOf(exp) {
  return state.data.schools.find((s) => s.id === exp.school_id) || {};
}

function filesOf(exp) {
  return state.data.files.filter((f) => f.experience_id === exp.id);
}

async function load() {
  if (location.pathname === "/school-submit") return renderPublicSubmit();
  try {
    const data = await api("/api/bootstrap");
    state.data = data;
    state.user = data.user;
    render();
  } catch {
    renderLogin();
  }
}

async function renderPublicSubmit() {
  if (!state.publicData) state.publicData = await api("/api/public/bootstrap");
  app.innerHTML = `
    <main class="login" style="grid-template-columns:.85fr 1.15fr">
      <section class="login-hero">
        <div class="seal">تعليم<br>عسير</div>
        <h1>رابط تسجيل تجارب تحسين التدريس للمدارس</h1>
        <p>هذا الرابط مخصص للمدارس ومنسقي التجارب لإرسال التجارب مباشرة إلى الإدارة للمراجعة والاعتماد.</p>
        <div class="demo-users">
          <span>بعد حفظ التجربة يمكنك رفع ملفات PDF والصور والفيديو وExcel وWord.</span>
        </div>
      </section>
      <section class="login-panel">
        <form class="login-card" id="publicSubmitForm" style="width:min(760px,100%)">
          <h2>تسجيل تجربة مدرسية</h2>
          <p>الحقول الأساسية مطلوبة حتى تصل التجربة بشكل واضح للمراجعة.</p>
          <div class="form-grid">
            <label>المدرسة<select name="school_id" required>${state.publicData.schools.map((s) => `<option value="${s.id}">${s.name} - ${s.stage}</option>`).join("")}</select></label>
            <label>اسم المدرسة<input name="school_name" placeholder="اكتب اسم المدرسة كما ترغب في ظهوره"></label>
            <label>المرحلة الدراسية<input name="stage" placeholder="ابتدائي / متوسط / ثانوي / مسارات"></label>
            <label>مكتب التعليم<input name="education_office" placeholder="مثال: مكتب تعليم أبها"></label>
            <label>اسم قائد/قائدة المدرسة<input name="principal_name" placeholder="اسم قائد أو قائدة المدرسة"></label>
            <label>اسم المعلم/المعلمة<input name="teacher_name" placeholder="اسم المنفذ أو الفريق"></label>
            <label>رقم الجوال أو البريد الإلكتروني<input name="contact" placeholder="للتواصل عند الحاجة"></label>
            <label>مجال التجربة<select name="field" required>${state.publicData.fields.map((f) => `<option>${f}</option>`).join("")}</select></label>
            <label class="wide">عنوان التجربة<input name="title" required placeholder="مثال: بطاقات التقويم البنائي لتحسين المشاركة الصفية"></label>
            <label class="wide">وصف مختصر للتجربة<textarea name="description" required placeholder="اكتب فكرة التجربة باختصار"></textarea></label>
            <label class="wide">المشكلة أو الاحتياج<textarea name="problem" placeholder="ما الحاجة التي عالجتها التجربة؟"></textarea></label>
            <label class="wide">الأهداف<textarea name="goals" placeholder="ما أهداف التجربة؟"></textarea></label>
            <label>الفئة المستهدفة<input name="target_group" placeholder="المعلمون / الطلاب / قسم محدد"></label>
            <label>نسبة التحسن إن وجدت<input name="improvement_percentage" type="number" min="0" max="100" value="0"></label>
            <label class="wide">خطوات التنفيذ<textarea name="implementation_steps" placeholder="اكتب خطوات التنفيذ باختصار"></textarea></label>
            <label class="wide">الشواهد والنتائج<textarea name="evidence_results" placeholder="اكتب أبرز الشواهد والمؤشرات"></textarea></label>
            <label class="wide">رابط فيديو اختياري<textarea name="video_link" placeholder="رابط YouTube أو Drive إن وجد"></textarea></label>
            <label class="wide">روابط خارجية إن وجدت<textarea name="external_links" placeholder="روابط Google Drive أو YouTube أو OneDrive"></textarea></label>
            <label class="wide">ملاحظات إضافية<textarea name="additional_notes" placeholder="أي معلومات إضافية ترغب المدرسة في توضيحها"></textarea></label>
          </div>
          <div class="actions" style="margin-top:14px">
            <button class="btn primary" type="submit">إرسال التجربة للمراجعة</button>
            <a class="btn" href="/">دخول لوحة المنصة</a>
          </div>
          <div id="publicUploadArea"></div>
        </form>
      </section>
    </main>`;

  document.querySelector("#publicSubmitForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    try {
      const result = await api("/api/public/experiences", { method: "POST", body });
      state.publicSubmission = result;
      showToast(result.message);
      form.querySelector('button[type="submit"]').disabled = true;
      document.querySelector("#publicUploadArea").innerHTML = `<div class="empty" style="margin-top:14px"><b>تم استلام التجربة.</b><br>الرقم المرجعي: <strong>${result.reference_number}</strong><br>يمكن تصوير هذه الرسالة أو طباعتها.</div>` + publicUploadHtml();
      document.querySelector("#publicUploadBtn").addEventListener("click", publicUploadFiles);
      document.querySelector('input[name="public_files"]').addEventListener("change", renderSelectedPublicFiles);
    } catch (error) {
      showToast(error.message, true);
    }
  });
}

function publicUploadHtml() {
  return `
    <div class="card" style="margin-top:16px;box-shadow:none">
      <h3>رفع مرفقات التجربة</h3>
      <p style="color:var(--muted);line-height:1.8">يمكنك الآن رفع تقرير التجربة أو الصور أو الفيديو أو ملفات النتائج.</p>
      <div class="form-grid">
        <label>تصنيف الملف<select name="public_category"><option>تقرير التجربة</option><option>صور التنفيذ</option><option>فيديو توثيقي</option><option>إحصاءات ونتائج</option><option>شواهد طلابية</option><option>عروض تقديمية</option></select></label>
        <label>الملفات<input name="public_files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.xlsx,.csv,.docx,.pptx,.zip"></label>
      </div>
      <div id="publicSelectedFiles" class="file-list" style="margin-top:10px"></div>
      <div class="bar-track" style="margin-top:10px"><div id="publicUploadProgress" class="bar-fill" style="width:0%"></div></div>
      <button class="btn gold" type="button" id="publicUploadBtn" style="margin-top:10px">رفع المرفقات</button>
      <div id="publicUploadResult" class="file-list" style="margin-top:10px"></div>
    </div>`;
}

function renderSelectedPublicFiles() {
  const fileInput = document.querySelector('input[name="public_files"]');
  const box = document.querySelector("#publicSelectedFiles");
  box.innerHTML = Array.from(fileInput.files).map((file) => `<div class="file-item"><b>${file.name}</b><span>${Math.round(file.size / 1024)} ك.ب</span></div>`).join("");
}

async function publicUploadFiles() {
  const fileInput = document.querySelector('input[name="public_files"]');
  if (!fileInput.files.length) return showToast("يرجى اختيار ملف واحد على الأقل.", true);
  const button = document.querySelector("#publicUploadBtn");
  const progress = document.querySelector("#publicUploadProgress");
  button.disabled = true;
  progress.style.width = "0%";
  const data = new FormData();
  data.append("category", document.querySelector('select[name="public_category"]').value);
  Array.from(fileInput.files).forEach((file) => data.append("files", file, file.name));
  const url = `/api/public/experiences/${state.publicSubmission.experience_id}/files?token=${state.publicSubmission.upload_token}`;
  const xhr = new XMLHttpRequest();
  xhr.open("POST", url);
  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) progress.style.width = `${Math.round((event.loaded / event.total) * 100)}%`;
  };
  xhr.onload = () => {
    button.disabled = false;
    try {
      const result = JSON.parse(xhr.responseText || "{}");
      if (xhr.status < 200 || xhr.status >= 300) throw new Error(result.error || "فشل رفع الملفات.");
      progress.style.width = "100%";
      showToast(result.message);
      document.querySelector("#publicUploadResult").innerHTML = result.files.map((file) => `<div class="file-item"><b>${file.file_name}</b><span>${file.file_category} | ${Math.round(file.file_size / 1024)} ك.ب</span></div>`).join("");
    } catch (error) {
      showToast(error.message, true);
    }
  };
  xhr.onerror = () => {
    button.disabled = false;
    showToast("تعذر رفع الملفات. تحقق من الاتصال ثم حاول مرة أخرى.", true);
  };
  xhr.send(data);
}

function renderLogin() {
  app.innerHTML = `
    <main class="login">
      <section class="login-hero">
        <div class="seal">تعليم<br>عسير</div>
        <h1>منصة تجارب تحسين التدريس - تعليم عسير</h1>
        <p>منصة عربية رسمية لتوثيق ممارسات المدارس، مراجعتها، تحليل أثرها، وإصدار ملفات احترافية قابلة للطباعة.</p>
      </section>
      <section class="login-panel">
        <form class="login-card" id="loginForm">
          <h2>تسجيل الدخول</h2>
          <p>اختر حسابًا تجريبيًا أو أدخل البيانات المعتمدة.</p>
          <div class="grid">
            <label>البريد الإلكتروني<input name="email" type="email" value="admin@asir.local" required></label>
            <label>كلمة المرور<input name="password" type="password" value="Admin12345" required></label>
            <button class="btn primary" type="submit">دخول المنصة</button>
          </div>
          <div class="demo-users">
            <b>بيانات تجريبية:</b>
            <span>مدير النظام: admin@asir.local / Admin12345</span>
            <span>مشرف الإدارة: supervisor@asir.local / Supervisor12345</span>
            <span>منسق مدرسة: school@asir.local / School12345</span>
          </div>
        </form>
      </section>
    </main>`;
  document.querySelector("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/api/login", { method: "POST", body });
      await load();
      showToast("تم تسجيل الدخول بنجاح.");
    } catch (error) {
      showToast(error.message, true);
    }
  });
}

function shell(content, title, subtitle) {
  const nav = [
    ["home", "الرئيسية", "⌂"],
    ["new", "تسجيل تجربة", "+"],
    ["browse", "استعراض التجارب", "▦"],
    ["dashboard", "لوحة الإحصاءات", "↗"],
    ["magazine", "الإصدارات", "▤"],
    ["users", "المستخدمون والصلاحيات", "◉"]
  ].filter((item) => item[0] !== "users" || state.user.role === "admin");

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><div class="seal">MOE<br>ASIR</div><div><h1>منصة تجارب تحسين التدريس</h1><p>الإدارة العامة للتعليم بمنطقة عسير</p></div></div>
        <nav class="nav">${nav.map(([id, label, icon]) => `<button class="${state.view === id ? "active" : ""}" data-view="${id}"><span class="ico">${icon}</span><span>${label}</span></button>`).join("")}</nav>
        <div class="side-note">من ممارسة التدريس إلى إتقان التعلم. كل تجربة موثقة تصبح معرفة قابلة للتحسين والتعميم.</div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="page-title"><h2>${title}</h2><p>${subtitle}</p></div>
          <div class="userbar"><span class="role-pill">${state.user.name} - ${roleName(state.user.role)}</span><button class="btn ghost" id="logoutBtn">خروج</button></div>
        </header>
        ${content}
      </main>
    </div>`;
}

function bindShell() {
  document.querySelectorAll("[data-view]").forEach((btn) => btn.addEventListener("click", () => {
    state.view = btn.dataset.view;
    state.selected = null;
    render();
  }));
  document.querySelector("#logoutBtn").addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" });
    state.user = null;
    state.data = null;
    renderLogin();
  });
}

function render() {
  if (!state.user) return renderLogin();
  const views = {
    home: renderHome,
    new: renderForm,
    browse: renderBrowse,
    dashboard: renderDashboard,
    magazine: renderMagazine,
    users: renderUsers
  };
  views[state.view]();
}

function renderHome() {
  const s = state.data.stats;
  const share = state.data.share_url || `${location.origin}/school-submit`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareMessage(share))}`;
  app.innerHTML = shell(`
    <section class="hero">
      <div>
        <p>من ممارسة التدريس إلى إتقان التعلم</p>
        <h1>منصة رسمية لتوثيق تجارب المدارس وتحويلها إلى معرفة تعليمية قابلة للتعميم</h1>
        <div class="hero-actions">
          <button class="btn gold" data-view="new">تسجيل تجربة</button>
          <button class="btn" data-view="browse">استعراض التجارب</button>
          <button class="btn" data-view="dashboard">لوحة الإحصاءات</button>
          <button class="btn" data-view="magazine">الإصدارات</button>
        </div>
      </div>
      <div class="hero-panel">
        <span>تجارب مرفوعة</span>
        <div class="big">${s.experiences}</div>
        <p>من ${s.schools} مدارس مشاركة، بمتوسط تحسن ${s.averageImprovement}% في المؤشرات المدخلة.</p>
      </div>
    </section>
    <section class="grid cols-4">
      ${metric("المدارس المشاركة", s.schools)}
      ${metric("التجارب المرفوعة", s.experiences)}
      ${metric("متوسط التحسن", `${s.averageImprovement}%`)}
      ${metric("تجارب الإصدار", state.data.experiences.filter(e => e.included_in_magazine).length)}
    </section>
    ${state.user.role === "admin" ? `<section class="card" style="margin-top:16px">
      <div class="toolbar" style="margin:0">
        <div><h3>رابط مشاركة المدارس</h3><p>أرسل الرابط كاملًا كما هو للمدارس، ويجب أن يبدأ بـ http:// حتى يظهر قابلًا للضغط في واتساب والبريد.</p></div>
        <div class="grid" style="min-width:min(520px,100%)">
          <a id="shareAnchor" class="btn primary" target="_blank" href="${share}">اضغط هنا لفتح رابط تسجيل المدارس</a>
          <input id="shareLink" readonly value="${share}">
          <div class="actions"><button class="btn" id="copyShareLink">نسخ الرابط فقط</button><button class="btn gold" id="copyShareMessage">نسخ رسالة جاهزة</button><a class="btn primary" target="_blank" href="${whatsapp}">فتح واتساب لإرسال الرابط</a></div>
          <p style="margin:0;color:var(--danger);line-height:1.8;font-weight:700">تنبيه: لا تضع الرابط في خانة البحث داخل واتساب. افتح محادثة المدرسة، ثم الصق الرابط في مربع كتابة الرسالة واضغط إرسال.</p>
          <p style="margin:0;color:var(--muted);line-height:1.8">إذا لم يتحول الرابط إلى أزرق داخل واتساب، استخدم زر "فتح واتساب لإرسال الرابط" أو انسخ الرسالة الجاهزة وأرسلها داخل المحادثة.</p>
        </div>
      </div>
    </section>` : ""}
    <section class="grid cols-2" style="margin-top:16px">
      <div class="card"><h3>آخر التجارب</h3>${state.data.experiences.slice(0,4).map(expMini).join("") || empty("لا توجد تجارب حتى الآن.")}</div>
      <div class="card"><h3>الحالات الحالية</h3>${bars(s.byStatus)}</div>
    </section>`, "الرئيسية", "نظرة عامة على المنصة ومداخل العمل الأساسية.");
  bindShell();
  const copy = document.querySelector("#copyShareLink");
  if (copy) copy.addEventListener("click", async () => {
    const link = document.querySelector("#shareLink").value;
    try {
      await copyText(link);
      showToast("تم نسخ رابط المشاركة.");
    } catch {
      showToast(link);
    }
  });
  const copyMessage = document.querySelector("#copyShareMessage");
  if (copyMessage) copyMessage.addEventListener("click", async () => {
    const link = document.querySelector("#shareLink").value;
    const message = shareMessage(link);
    try {
      await copyText(message);
      showToast("تم نسخ رسالة المشاركة الجاهزة.");
    } catch {
      showToast(link);
    }
  });
}

function metric(label, value) {
  return `<div class="card metric"><b>${value}</b><span>${label}</span></div>`;
}

function expMini(exp) {
  const school = schoolOf(exp);
  return `<div class="section"><h4>${exp.title}</h4><p>${school.name || ""} - ${exp.field || ""}</p><span class="status ${statusClass(exp.status)}">${exp.status}</span></div>`;
}

function bars(obj) {
  const values = Object.values(obj);
  const max = Math.max(1, ...values);
  return `<div class="bar">${Object.entries(obj).map(([k, v]) => `<div class="bar-row"><span>${k}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / max * 100)}%"></div></div><b>${v}</b></div>`).join("")}</div>`;
}

function renderForm() {
  const exp = state.draft.id ? state.data.experiences.find((e) => e.id === state.draft.id) : null;
  state.draft = { ...(exp || state.draft) };
  const group = stepGroups[state.step];
  const title = ["بيانات المدرسة", "بيانات التجربة", "الأهداف والتنفيذ", "النتائج والشواهد", "رفع الملفات", "المراجعة والإرسال"][state.step];
  const formFields = group.map(renderInput).join("");
  const upload = state.step === 4 ? renderUploadStep() : "";
  const review = state.step === 5 ? renderReviewStep() : "";

  app.innerHTML = shell(`
    <div class="card">
      ${state.draft.id && state.user.role === "admin" ? `<div class="empty" style="margin-bottom:14px">أنت تعدّل هذه التجربة بصلاحية مدير النظام، ويمكنك تغيير بيانات المدرسة والتجربة ورفع المرفقات كما تفعل المدرسة.</div>` : ""}
      <div class="steps">${stepGroups.map((_, i) => `<div class="step ${i === state.step ? "active" : i < state.step ? "done" : ""}"></div>`).join("")}</div>
      <div class="step-title"><h3>${title}</h3><span class="chip">الخطوة ${state.step + 1} من 6</span></div>
      <form id="expForm" class="grid">
        <div class="form-grid">${formFields}</div>
        ${upload}
        ${review}
        <div class="actions">
          <button class="btn" type="button" id="prevStep" ${state.step === 0 ? "disabled" : ""}>السابق</button>
          <button class="btn primary" type="button" id="saveDraft">حفظ كمسودة</button>
          <button class="btn gold" type="button" id="nextStep">${state.step === 5 ? "إرسال للمراجعة" : "التالي"}</button>
        </div>
      </form>
    </div>`, "تسجيل تجربة", "نموذج مبسط على خطوات واضحة للمدرسة أو منسق التجربة.");
  bindShell();
  bindForm();
}

function renderInput(name) {
  const cfg = fields.find((f) => f[0] === name);
  if (!cfg) return "";
  const [key, label, type, options] = cfg;
  const value = state.draft[key] ?? "";
  if (type === "textarea") return `<label class="wide">${label}<textarea name="${key}" placeholder="اكتب ${label} هنا">${value}</textarea></label>`;
  if (type === "select") {
    const choices = options === "school" ? state.data.schools.map((s) => [s.id, `${s.name} - ${s.stage}`]) : options.map((x) => [x, x]);
    return `<label>${label}<select name="${key}" ${state.user.role === "school" && key === "school_id" ? "disabled" : ""}>${choices.map(([id, text]) => `<option value="${id}" ${String(value || state.user.school_id) === String(id) ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
  }
  return `<label>${label}<input name="${key}" type="${type}" value="${value}" placeholder="اكتب ${label}"></label>`;
}

function collectDraft() {
  document.querySelectorAll("#expForm [name]").forEach((el) => {
    if (!el.disabled) state.draft[el.name] = el.value;
  });
  if (state.user.role === "school") state.draft.school_id = state.user.school_id;
}

function bindForm() {
  document.querySelector("#prevStep").addEventListener("click", () => { collectDraft(); state.step = Math.max(0, state.step - 1); renderForm(); });
  document.querySelector("#nextStep").addEventListener("click", async () => {
    collectDraft();
    if (state.step < 5) { state.step += 1; return renderForm(); }
    await saveExperience(true);
  });
  document.querySelector("#saveDraft").addEventListener("click", async () => { collectDraft(); await saveExperience(false); });
  const uploadButton = document.querySelector("#uploadFilesBtn");
  if (uploadButton) uploadButton.addEventListener("click", uploadFiles);
}

async function saveExperience(submit) {
  try {
    const result = await api("/api/experiences", { method: "POST", body: { ...state.draft, submit } });
    state.draft = result.experience;
    await load();
    state.draft = result.experience;
    state.view = submit ? "browse" : "new";
    submit ? renderBrowse() : renderForm();
    showToast(result.message);
  } catch (error) {
    showToast(error.message, true);
  }
}

function renderUploadStep() {
  if (!state.draft.id) return `<div class="empty wide">احفظ التجربة كمسودة أولًا لتفعيل رفع الملفات.</div>`;
  const files = filesOf(state.draft);
  return `
    <div class="wide grid">
      <div id="uploadForm" class="card">
        <div class="form-grid">
          <label>تصنيف الملف<select name="category"><option>تقرير التجربة</option><option>صور التنفيذ</option><option>فيديو توثيقي</option><option>إحصاءات ونتائج</option><option>شواهد طلابية</option><option>عروض تقديمية</option></select></label>
          <label>الملفات<input name="files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.xlsx,.csv,.docx,.pptx"></label>
        </div>
        <button class="btn primary" type="button" id="uploadFilesBtn">رفع الملفات</button>
      </div>
      <div class="file-list">${files.map(fileItem).join("") || empty("لم يتم رفع ملفات لهذه التجربة بعد.")}</div>
    </div>`;
}

async function uploadFiles(event) {
  event.preventDefault();
  if (!state.draft.id) return showToast("احفظ التجربة قبل رفع الملفات.", true);
  const uploadBox = document.querySelector("#uploadForm");
  const fileInput = uploadBox.querySelector('input[name="files"]');
  if (!fileInput.files.length) return showToast("يرجى اختيار ملف واحد على الأقل.", true);
  const data = new FormData();
  data.append("category", uploadBox.querySelector('select[name="category"]').value);
  Array.from(fileInput.files).forEach((file) => data.append("files", file, file.name));
  try {
    const result = await api(`/api/experiences/${state.draft.id}/files`, { method: "POST", body: data });
    showToast(result.message);
    await load();
    state.view = "new";
    renderForm();
  } catch (error) {
    showToast(error.message, true);
  }
}

function renderReviewStep() {
  collectDraft();
  return `<div class="wide preview-box">${fields.filter(([k]) => k !== "school_id").map(([k, label]) => `${label}: ${state.draft[k] || "غير مدخل"}`).join("\n\n")}</div>`;
}

function renderBrowse() {
  app.innerHTML = shell(`
    <div class="toolbar">
      <div class="filters">
        <input id="search" placeholder="بحث باسم المدرسة أو المعلم أو عنوان التجربة" style="width:310px">
        <select id="statusFilter"><option value="">كل الحالات</option>${state.data.statuses.map(s => `<option>${s}</option>`).join("")}</select>
        <select id="fieldFilter"><option value="">كل المجالات</option>${[...new Set(state.data.experiences.map(e => e.field))].map(f => `<option>${f}</option>`).join("")}</select>
      </div>
      <a class="btn gold" href="/api/export/experiences.csv">تصدير Excel</a>
    </div>
    <section id="cards" class="grid cols-3"></section>
    <div id="modal" class="modal" hidden></div>`, "استعراض التجارب", "بطاقات بحث ومراجعة واعتماد وإدراج في الإصدار.");
  bindShell();
  const draw = () => {
    const q = document.querySelector("#search").value.trim();
    const status = document.querySelector("#statusFilter").value;
    const field = document.querySelector("#fieldFilter").value;
    const list = state.data.experiences.filter((exp) => {
      const school = schoolOf(exp);
      const hay = `${exp.title} ${school.name || ""} ${exp.field} ${exp.teachers_role || ""}`;
      return (!q || hay.includes(q)) && (!status || exp.status === status) && (!field || exp.field === field);
    });
    document.querySelector("#cards").innerHTML = list.map(expCard).join("") || empty("لا توجد نتائج مطابقة.");
    document.querySelectorAll("[data-open]").forEach((btn) => btn.addEventListener("click", () => openDetail(btn.dataset.open)));
  };
  document.querySelectorAll("#search,#statusFilter,#fieldFilter").forEach((el) => el.addEventListener("input", draw));
  draw();
}

function expCard(exp) {
  const school = schoolOf(exp);
  const fileCount = filesOf(exp).length;
  return `<article class="card exp-card">
    <div class="exp-head"><h3>${exp.title}</h3><span class="status ${statusClass(exp.status)}">${exp.status}</span></div>
    <p>${school.name || ""} | ${school.stage || ""} | ${exp.field || ""}</p>
    <p>${(exp.description || "").slice(0, 150)}${(exp.description || "").length > 150 ? "..." : ""}</p>
    <div class="actions"><span class="chip">${fileCount} مرفق</span><span class="chip">تحسن ${exp.improvement_percentage || 0}%</span></div>
    <button class="btn primary" data-open="${exp.id}">عرض التفاصيل</button>
  </article>`;
}

function openDetail(id) {
  const exp = state.data.experiences.find((e) => e.id === id);
  const school = schoolOf(exp);
  const files = filesOf(exp);
  document.querySelector("#modal").hidden = false;
  document.querySelector("#modal").innerHTML = `
    <div class="modal-box">
      <div class="toolbar"><div><h3>${exp.title}</h3><p>${school.name || ""} - ${exp.field || ""}</p></div><button class="btn" id="closeModal">إغلاق</button></div>
      <div class="detail-grid">
        <section>
          ${["description:وصف التجربة","problem:المشكلة أو الاحتياج","goals:الأهداف","implementation_steps:خطوات التنفيذ","tools_strategies:الأدوات والاستراتيجيات","evidence_results:الشواهد والنتائج","before_indicators:قبل التطبيق","after_indicators:بعد التطبيق","challenges:التحديات","proposed_solutions:الحلول","scalability:قابلية التعميم","generated_summary:الملخص المهني","generated_card:البطاقة التعريفية"].map((item) => { const [key,label] = item.split(":"); return `<div class="section"><h4>${label}</h4><p>${exp[key] || "غير مدخل"}</p></div>`; }).join("")}
        </section>
        <aside class="grid">
          <div class="card"><h4>الإجراءات</h4><div class="actions">
            <button class="btn primary" data-action="summary">توليد ملخص احترافي</button>
            <button class="btn" data-action="card">توليد بطاقة تعريفية</button>
            ${state.user.role === "admin" ? `<button class="btn primary" data-action="editExperience">تعديل بيانات التجربة</button><button class="btn" data-action="uploadFiles">رفع مرفقات للتجربة</button>` : ""}
            <a class="btn" target="_blank" href="/print/experience/${exp.id}">تصدير PDF</a>
            ${state.user.role !== "school" ? `<button class="btn gold" data-action="approve">اعتماد</button><button class="btn" data-action="edit">إرجاع للتعديل</button><button class="btn danger" data-action="reject">رفض</button><button class="btn primary" data-action="magazine">إدراج في الإصدار</button>` : ""}
            ${state.user.role === "admin" ? `<button class="btn danger" data-action="delete">حذف التجربة نهائيًا</button>` : ""}
          </div></div>
          <div class="card"><h4>الملفات المرفقة</h4><div class="file-list">${files.map(fileItem).join("") || empty("لا توجد مرفقات.")}</div></div>
        </aside>
      </div>
    </div>`;
  document.querySelector("#closeModal").addEventListener("click", () => document.querySelector("#modal").hidden = true);
  document.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", () => detailAction(exp.id, btn.dataset.action)));
}

async function detailAction(id, action) {
  try {
    let result;
    if (action === "summary") result = await api(`/api/experiences/${id}/generate-summary`, { method: "POST" });
    if (action === "card") result = await api(`/api/experiences/${id}/generate-card`, { method: "POST" });
    if (action === "editExperience" || action === "uploadFiles") {
      const exp = state.data.experiences.find((item) => item.id === id);
      state.draft = { ...exp };
      state.step = action === "uploadFiles" ? 4 : 0;
      state.view = "new";
      document.querySelector("#modal").hidden = true;
      return renderForm();
    }
    if (action === "approve") result = await api(`/api/experiences/${id}/status`, { method: "PATCH", body: { status: "معتمدة", note: "تم اعتماد التجربة." } });
    if (action === "edit") result = await api(`/api/experiences/${id}/status`, { method: "PATCH", body: { status: "بحاجة إلى تعديل", note: "تحتاج التجربة إلى استكمال بعض البيانات." } });
    if (action === "reject") result = await api(`/api/experiences/${id}/status`, { method: "PATCH", body: { status: "مرفوضة", note: "تم رفض التجربة." } });
    if (action === "magazine") result = await api(`/api/experiences/${id}/magazine`, { method: "POST" });
    if (action === "delete") {
      const ok = confirm("سيتم حذف التجربة ومرفقاتها نهائيًا. هل تريد المتابعة؟");
      if (!ok) return;
      result = await api(`/api/experiences/${id}`, { method: "DELETE" });
      document.querySelector("#modal").hidden = true;
    }
    showToast(result.message || "تم تنفيذ العملية.");
    await load();
    state.view = "browse";
    renderBrowse();
    if (action !== "delete") openDetail(id);
  } catch (error) {
    showToast(error.message, true);
  }
}

function fileItem(file) {
  const size = `${Math.round(file.file_size / 1024)} ك.ب`;
  const isMedia = ["JPG", "JPEG", "PNG", "WEBP"].includes(file.file_type);
  return `<div class="file-item">
    <b>${file.file_name}</b>
    <span>${file.file_category} | ${file.file_type} | ${size}</span>
    ${isMedia ? `<img src="/${file.file_path}" alt="${file.file_name}" style="max-width:100%;border-radius:8px;border:1px solid var(--line)">` : ""}
    <div class="actions"><a class="btn" href="/${file.file_path}" target="_blank">تحميل / معاينة</a><button class="btn danger" data-delete-file="${file.id}">حذف</button></div>
  </div>`;
}

function renderDashboard() {
  const s = state.data.stats;
  app.innerHTML = shell(`
    <div class="toolbar"><span></span><div class="actions"><a class="btn" target="_blank" href="/print/stats">تصدير الإحصاءات PDF</a><a class="btn gold" href="/api/export/experiences.csv">تصدير كل التجارب Excel</a></div></div>
    <section class="grid cols-4">${metric("إجمالي المدارس المشاركة", s.schools)}${metric("إجمالي التجارب", s.experiences)}${metric("متوسط التحسن", `${s.averageImprovement}%`)}${metric("المقبولة", (s.byStatus["معتمدة"] || 0) + (s.byStatus["مدرجة في الإصدار"] || 0))}</section>
    <section class="grid cols-2" style="margin-top:16px">
      <div class="card"><h3>التجارب حسب المجال</h3>${bars(s.byField)}</div>
      <div class="card"><h3>التجارب حسب الحالة</h3>${bars(s.byStatus)}</div>
      <div class="card"><h3>التجارب حسب المرحلة</h3>${bars(s.byStage)}</div>
      <div class="card"><h3>التجارب حسب مكتب التعليم</h3>${bars(s.byOffice)}</div>
      <div class="card"><h3>أعلى المدارس مشاركة</h3><div class="timeline">${s.topSchools.map(([name,count]) => `<div><b>${name}</b><br><span>${count} تجارب</span></div>`).join("")}</div></div>
      <div class="card"><h3>خط زمني للتجارب</h3><div class="timeline">${state.data.experiences.slice().sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(e => `<div>${new Date(e.created_at).toLocaleDateString("ar-SA")} - ${e.title}</div>`).join("")}</div></div>
    </section>`, "لوحة الإحصاءات", "مؤشرات حقيقية محسوبة من البيانات المدخلة.");
  bindShell();
}

function renderMagazine() {
  const items = state.data.magazineItems
    .sort((a, b) => a.order_number - b.order_number)
    .map((item) => state.data.experiences.find((e) => e.id === item.experience_id))
    .filter(Boolean);
  const approved = state.data.experiences.filter((e) => ["معتمدة", "مدرجة في الإصدار"].includes(e.status));
  app.innerHTML = shell(`
    <div class="toolbar"><span></span><a class="btn gold" target="_blank" href="/print/magazine">تصدير الإصدار PDF</a></div>
    <section class="grid cols-2">
      <div class="card"><h3>التجارب المعتمدة</h3>${approved.map((exp) => `<div class="section"><h4>${exp.title}</h4><p>${schoolOf(exp).name || ""} - ${exp.field}</p>${exp.included_in_magazine ? `<span class="status magazine">مدرجة في الإصدار</span>` : `<button class="btn primary" data-mag="${exp.id}">إدراج في الإصدار</button>`}</div>`).join("") || empty("لا توجد تجارب معتمدة بعد.")}</div>
      <div class="magazine-preview">
        <div class="magazine-cover"><div><div class="seal">MOE<br>ASIR</div><h2>${state.data.magazine.title}</h2><p>الإصدار ${state.data.magazine.issue_number}</p><span>من ممارسة التدريس إلى إتقان التعلم</span></div></div>
        <h3>الفهرس</h3>
        ${items.map((exp, i) => `<div class="section"><h4>${i + 1}. ${exp.title}</h4><p>${schoolOf(exp).name || ""} | ${exp.field}</p><div class="qr">QR</div></div>`).join("") || empty("لم يتم إدراج تجارب في الإصدار بعد.")}
      </div>
    </section>`, "الإصدارات", "إصدار HTML احترافي قابل للطباعة PDF.");
  bindShell();
  document.querySelectorAll("[data-mag]").forEach((btn) => btn.addEventListener("click", async () => {
    try {
      const result = await api(`/api/experiences/${btn.dataset.mag}/magazine`, { method: "POST" });
      showToast(result.message);
      await load();
      state.view = "magazine";
      renderMagazine();
    } catch (error) {
      showToast(error.message, true);
    }
  }));
}

function renderUsers() {
  app.innerHTML = shell(`
    <section class="grid cols-3">
      ${state.data.users.map((user) => `<div class="card"><h3>${user.name}</h3><p>${user.email}</p><span class="role-pill">${roleName(user.role)}</span></div>`).join("")}
    </section>
    <section class="card" style="margin-top:16px">
      <h3>الصلاحيات</h3>
      <div class="grid cols-3">
        <div><h4>مدير النظام</h4><p>إدارة التجارب، الاعتماد، الحذف، التقارير، الإصدارات، المستخدمين والمدارس.</p></div>
        <div><h4>مشرف الإدارة</h4><p>مشاهدة التجارب، إضافة الملاحظات، التصنيف، الملخصات، واعتماد التجارب للإصدار.</p></div>
        <div><h4>المدرسة</h4><p>إنشاء التجربة، تعديلها قبل الاعتماد، رفع الملفات، ومتابعة حالة المراجعة.</p></div>
      </div>
    </section>`, "المستخدمون والصلاحيات", "حسابات تجريبية بأدوار مختلفة للمعاينة.");
  bindShell();
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

document.addEventListener("click", async (event) => {
  const fileBtn = event.target.closest("[data-delete-file]");
  if (!fileBtn) return;
  try {
    const result = await api(`/api/files/${fileBtn.dataset.deleteFile}`, { method: "DELETE" });
    showToast(result.message);
    await load();
    render();
  } catch (error) {
    showToast(error.message, true);
  }
});

load();
