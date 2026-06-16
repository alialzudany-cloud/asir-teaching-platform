const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const UPLOADS = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(ROOT, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");
const PORT = Number(process.env.PORT || 8020);
const HOST = process.env.HOST || "0.0.0.0";
const MB = 1024 * 1024;
const MAX_IMAGE_SIZE = Number(process.env.MAX_IMAGE_MB || 20) * MB;
const MAX_DOCUMENT_SIZE = Number(process.env.MAX_DOCUMENT_MB || 50) * MB;
const MAX_VIDEO_SIZE = Number(process.env.MAX_VIDEO_MB || 500) * MB;
const MAX_ARCHIVE_SIZE = Number(process.env.MAX_ARCHIVE_MB || 100) * MB;
const MAX_REQUEST_SIZE = Number(process.env.MAX_REQUEST_MB || 650) * MB;
const SALT = "asir-teaching-improvement-1447";

const statuses = ["مسودة", "قيد المراجعة", "بحاجة إلى تعديل", "معتمدة", "مرفوضة", "مدرجة في الإصدار"];
const allowedExt = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".xlsx", ".csv", ".docx", ".pptx", ".zip"]);
const sessions = new Map();

const publicStageOptions = ["المرحلة الابتدائية", "المرحلة المتوسطة", "المرحلة الثانوية"];
const publicPrincipalOptions = [
  "محمد عبدالله قمشع",
  "فائع أحمد الالمعي",
  "عزيزة معيض القحطاني",
  "نورة مرعي القحطاني",
  "جميلة مغرم عسيري",
  "عبدالله محمد الأحمري",
  "ماجد محمد الشهراني",
  "ناصر عوض القحطاني",
  "مشبب سعيد آل حامد",
  "فاطمة فائع الحياني"
];
const publicSchoolCatalog = [
  ["school_1", "ثانوية الأبناء الثالثة بخميس مشيط", "المرحلة الثانوية", "مكتب تعليم خميس مشيط", "محمد عبدالله قمشع"],
  ["school_2", "ثانوية الصديق بخميس مشيط", "المرحلة الثانوية", "مكتب تعليم خميس مشيط", "فائع أحمد الالمعي"],
  ["school_3", "الثانوية الأولى بخميس مشيط", "المرحلة الثانوية", "مكتب تعليم خميس مشيط", "عزيزة معيض القحطاني"],
  ["school_4", "المتوسطة السادسة بخميس مشيط", "المرحلة المتوسطة", "مكتب تعليم خميس مشيط", "نورة مرعي القحطاني"],
  ["school_5", "المتوسطة الرابعة عشرة بأبها", "المرحلة المتوسطة", "مكتب تعليم أبها", "جميلة مغرم عسيري"],
  ["school_6", "متوسطة اليقين بأبها", "المرحلة المتوسطة", "مكتب تعليم أبها", "عبدالله محمد الأحمري"],
  ["school_7", "متوسطة عبدالرحمن الغافقي بخميس مشيط", "المرحلة المتوسطة", "مكتب تعليم خميس مشيط", "ماجد محمد الشهراني"],
  ["school_8", "ابتدائية سعيد بن زيد بخميس مشيط", "المرحلة الابتدائية", "مكتب تعليم خميس مشيط", "ناصر عوض القحطاني"],
  ["school_9", "إبتدائية الإمام النووي بأحد رفيدة", "المرحلة الابتدائية", "مكتب تعليم خميس مشيط", "مشبب سعيد آل حامد"],
  ["school_10", "الوادي الطالع للطفولة المبكرة بأبها", "المرحلة الابتدائية", "مكتب تعليم أبها", "فاطمة فائع الحياني"]
].map(([id, name, stage, education_office, principal_name]) => ({
  id,
  name,
  stage,
  education_office,
  principal_name,
  coordinator_name: "",
  phone: "",
  email: ""
}));

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".zip": "application/zip",
  ".csv": "text/csv; charset=utf-8",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
};

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS, { recursive: true });
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(`${password}:${SALT}`).digest("hex");
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function referenceNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `ASIR-${y}${m}${d}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function now() {
  return new Date().toISOString();
}

function localNetworkHost() {
  const interfaces = os.networkInterfaces();
  for (const items of Object.values(interfaces)) {
    for (const item of items || []) {
      if (item.family === "IPv4" && !item.internal) return item.address;
    }
  }
  return "127.0.0.1";
}

function shareUrl() {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.trim().replace(/\/$/, "").replace(/\/school-submit$/, "") + "/school-submit";
  }
  return `http://${localNetworkHost()}:${PORT}/school-submit`;
}

function seedDb() {
  ensureDirs();
  if (fs.existsSync(DB_FILE)) return;

  const schools = publicSchoolCatalog.map((school) => ({ ...school }));

  const users = [
    { id: "user_admin", name: "مدير النظام", email: "admin@asir.local", password_hash: hashPassword("Admin12345"), role: "admin", school_id: null, created_at: now() },
    { id: "user_supervisor", name: "مشرف تعليم عسير", email: "supervisor@asir.local", password_hash: hashPassword("Supervisor12345"), role: "supervisor", school_id: null, created_at: now() },
    { id: "user_school", name: "منسق المدرسة", email: "school@asir.local", password_hash: hashPassword("School12345"), role: "school", school_id: "school_1", created_at: now() }
  ];

  const experiences = [
    {
      id: "exp_1",
      school_id: "school_1",
      title: "مجتمعات تعلم مصغرة لتحسين التخطيط اليومي",
      field: "التخطيط للتدريس",
      description: "طبقت المدرسة لقاءات أسبوعية قصيرة لتحليل أهداف الدروس وبناء أدوات تقويم سريعة قبل التنفيذ.",
      problem: "تفاوت جودة التخطيط اليومي وصعوبة قياس أثره داخل الحصة.",
      goals: "رفع جودة التخطيط، وتوحيد ممارسات التقويم البنائي، وتحسين مشاركة الطلاب.",
      target_group: "معلمو العلوم والرياضيات في المرحلة الثانوية",
      implementation_steps: "تحديد فريق قيادة، بناء نموذج تخطيط، تطبيقه في حصص مختارة، ثم مراجعة الشواهد أسبوعيًا.",
      tools_strategies: "بطاقات خروج، ملاحظة صفية، تعلم تعاوني، تحليل نتائج قصيرة.",
      leadership_role: "توفير زمن مهني أسبوعي ومتابعة مؤشرات التحسن.",
      teachers_role: "تصميم الدروس وتبادل التغذية الراجعة.",
      students_role: "المشاركة في التقويم الذاتي وتقديم تغذية راجعة مختصرة.",
      evidence_results: "ارتفاع متوسط إنجاز المهام الصفية وتحسن جودة أسئلة التقويم.",
      before_indicators: "62% متوسط إتقان المهارات المستهدفة.",
      after_indicators: "81% متوسط إتقان بعد التطبيق.",
      improvement_percentage: 19,
      challenges: "ضيق وقت الاجتماعات المهنية.",
      proposed_solutions: "اعتماد لقاءات قصيرة مرتبطة بجدول الحصص.",
      scalability: "قابلة للتعميم على المواد ذات الأهداف المهارية الواضحة.",
      external_links: "https://example.com/evidence",
      status: "معتمدة",
      admin_notes: "تجربة مناسبة للإصدار.",
      generated_summary: "",
      generated_card: "",
      included_in_magazine: true,
      created_at: now(),
      updated_at: now()
    },
    {
      id: "exp_2",
      school_id: "school_2",
      title: "بطاقات التأمل السريع بعد الحصة",
      field: "تأمل المعلمين",
      description: "اعتمدت المدرسة نموذج تأمل رقمي بعد الحصة يركز على ما نجح وما يحتاج تحسينًا في التعلم.",
      problem: "غياب توثيق منتظم لتأملات المعلمين بعد تنفيذ الدروس.",
      goals: "بناء عادة تأمل مهني وتحويل الملاحظات إلى خطط تحسين أسبوعية.",
      target_group: "معلمو المرحلة المتوسطة",
      implementation_steps: "تجريب النموذج، تدريب المعلمين، تحليل الردود، ومناقشة نتائجها في فرق التعلم.",
      tools_strategies: "نماذج رقمية، اجتماعات تعلم مهنية، مؤشرات أداء قصيرة.",
      leadership_role: "تيسير الاجتماعات وتكريم الممارسات المؤثرة.",
      teachers_role: "تعبئة البطاقات وتطبيق التحسينات.",
      students_role: "الاستجابة لأنشطة التقويم وتقديم ملاحظات.",
      evidence_results: "تحسن انتظام التأمل المهني وتنوع استراتيجيات التدريس.",
      before_indicators: "14 بطاقة تأمل شهريًا.",
      after_indicators: "54 بطاقة تأمل شهريًا.",
      improvement_percentage: 40,
      challenges: "تفاوت التزام بعض الأقسام.",
      proposed_solutions: "ربط البطاقة بخطة القسم الأسبوعية.",
      scalability: "قابلة للتطبيق في جميع المدارس.",
      external_links: "",
      status: "قيد المراجعة",
      admin_notes: "",
      generated_summary: "",
      generated_card: "",
      included_in_magazine: false,
      created_at: now(),
      updated_at: now()
    }
  ];

  const magazine = [{ id: "mag_1", title: "إصدارات تجارب تحسين التدريس", issue_number: "الأول", introduction: "يوثق هذا الإصدار نماذج مدرسية ملهمة في تحسين التدريس، ويعرض أثرها وشواهدها بلغة مهنية موجزة.", conclusion: "تؤكد التجارب أن تحسين التدريس يبدأ من الممارسة الصفية وينمو بتأمل مهني منظم.", created_at: now() }];
  const magazineItems = [{ id: "mi_1", magazine_id: "mag_1", experience_id: "exp_1", order_number: 1 }];

  writeDb({ users, schools, experiences, files: [], magazine, magazineItems, audit: [] });
}

function readDb() {
  seedDb();
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  let changed = false;
  for (const school of publicSchoolCatalog) {
    const existing = db.schools.find((item) => item.id === school.id);
    if (existing) {
      for (const [key, value] of Object.entries(school)) {
        if (existing[key] !== value) {
          existing[key] = value;
          changed = true;
        }
      }
    } else {
      db.schools.push({ ...school });
      changed = true;
    }
  }
  if (db.magazine?.[0]?.title?.includes(`المجلة ${"الإلكترونية"}`)) {
    db.magazine[0].title = "إصدارات تجارب تحسين التدريس";
    db.magazine[0].introduction = "يوثق هذا الإصدار نماذج مدرسية ملهمة في تحسين التدريس، ويعرض أثرها وشواهدها بلغة مهنية موجزة.";
    changed = true;
  }
  for (const exp of db.experiences || []) {
    if (exp.status === `مدرجة في ${"المجلة"}`) {
      exp.status = "مدرجة في الإصدار";
      changed = true;
    }
    if (exp.admin_notes?.includes(`لل${"مجلة"}`)) {
      exp.admin_notes = exp.admin_notes.replaceAll(`لل${"مجلة"}`, "للإصدار");
      changed = true;
    }
  }
  if (changed) writeDb(db);
  return db;
}

function writeDb(db) {
  ensureDirs();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function send(res, code, body, headers = {}) {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { "Content-Type": headers["Content-Type"] || "application/json; charset=utf-8", ...headers });
  res.end(payload);
}

function getCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }));
}

function currentUser(req, db) {
  const token = getCookies(req).session;
  const userId = sessions.get(token);
  return db.users.find((u) => u.id === userId) || null;
}

function requireUser(req, res, db) {
  const user = currentUser(req, db);
  if (!user) send(res, 401, { error: "يرجى تسجيل الدخول." });
  return user;
}

function canSeeExperience(user, experience) {
  return user.role !== "school" || experience.school_id === user.school_id;
}

function canManage(user) {
  return user.role === "admin" || user.role === "supervisor";
}

function filterDbForUser(db, user) {
  const experiences = db.experiences.filter((exp) => canSeeExperience(user, exp));
  const ids = new Set(experiences.map((exp) => exp.id));
  return {
    user: publicUser(user),
    users: user.role === "admin" ? db.users.map(publicUser) : [],
    schools: user.role === "school" ? db.schools.filter((s) => s.id === user.school_id) : db.schools,
    experiences,
    files: db.files.filter((file) => ids.has(file.experience_id)),
    magazine: db.magazine[0],
    magazineItems: db.magazineItems
  };
}

function publicBootstrap(db) {
  return {
    schools: publicSchoolCatalog,
    stages: publicStageOptions,
    principal_names: publicPrincipalOptions,
    fields: ["البيئة الصفية", "التخطيط للتدريس", "تنفيذ الدروس", "التقويم", "تأمل المعلمين", "تحسين نواتج التعلم", "ممارسات التعلم العميق", "أخرى"],
    share_url: shareUrl()
  };
}

function publicUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_SIZE) {
        reject(new Error("حجم الطلب أكبر من المسموح."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function jsonBody(req) {
  const raw = await readBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString("utf8"));
}

function safeName(name) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim().replace(/\s+/g, "-").slice(0, 80) || "file";
  return `${base}-${Date.now()}${ext}`;
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const marker = Buffer.from(`--${boundary}`);
  let start = buffer.indexOf(marker);
  while (start !== -1) {
    start += marker.length + 2;
    const end = buffer.indexOf(marker, start);
    if (end === -1) break;
    const part = buffer.slice(start, end - 2);
    const split = part.indexOf(Buffer.from("\r\n\r\n"));
    if (split > 0) {
      const headerText = part.slice(0, split).toString("utf8");
      const content = part.slice(split + 4);
      const name = /name="([^"]+)"/.exec(headerText)?.[1] || "";
      const filename = /filename="([^"]*)"/.exec(headerText)?.[1] || "";
      const type = /Content-Type:\s*([^\r\n]+)/i.exec(headerText)?.[1] || "application/octet-stream";
      parts.push({ name, filename, type, content });
    }
    start = end;
  }
  return parts;
}

function uploadLimitForExt(ext) {
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return MAX_IMAGE_SIZE;
  if ([".mp4", ".mov"].includes(ext)) return MAX_VIDEO_SIZE;
  if (ext === ".zip") return MAX_ARCHIVE_SIZE;
  return MAX_DOCUMENT_SIZE;
}

function hasMagicBytes(ext, buffer) {
  if (ext === ".csv") return true;
  if (ext === ".pdf") return buffer.slice(0, 4).toString("ascii") === "%PDF";
  if ([".jpg", ".jpeg"].includes(ext)) return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (ext === ".png") return buffer.length > 8 && buffer[0] === 0x89 && buffer.slice(1, 4).toString("ascii") === "PNG";
  if (ext === ".webp") return buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP";
  if ([".mp4", ".mov"].includes(ext)) return buffer.slice(4, 8).toString("ascii") === "ftyp";
  if ([".docx", ".xlsx", ".pptx", ".zip"].includes(ext)) return buffer.slice(0, 2).toString("ascii") === "PK";
  return false;
}

function validateUploadPart(part) {
  const ext = path.extname(part.filename || "").toLowerCase();
  if (!allowedExt.has(ext)) throw new Error(`نوع الملف غير مسموح: ${part.filename}`);
  const limit = uploadLimitForExt(ext);
  if (!part.content.length) throw new Error(`الملف فارغ: ${part.filename}`);
  if (part.content.length > limit) throw new Error(`حجم الملف أكبر من المسموح: ${part.filename}`);
  if (!hasMagicBytes(ext, part.content)) throw new Error(`محتوى الملف لا يطابق نوعه: ${part.filename}`);
  return ext;
}

function buildSummary(exp, school) {
  const impact = exp.improvement_percentage ? `وقد أظهرت المؤشرات تحسنًا قدره ${exp.improvement_percentage}% مقارنة بخط الأساس.` : "وتشير الشواهد إلى أثر إيجابي قابل للمتابعة والتحسين.";
  return [
    `تتمحور تجربة "${exp.title}" في ${school?.name || "إحدى مدارس تعليم عسير"} حول ${exp.field || "تحسين التدريس"}.`,
    `استجابت التجربة لحاجة مهنية واضحة تمثلت في ${exp.problem || "تحسين جودة الممارسة الصفية ورفع أثرها على تعلم الطلاب"}.`,
    `هدفت التجربة إلى ${exp.goals || "تطوير الممارسات التعليمية وبناء شواهد قابلة للقياس"}.`,
    `برزت في التنفيذ ممارسات نوعية مثل ${exp.tools_strategies || "التخطيط المشترك، التقويم البنائي، وتبادل التغذية الراجعة"}.`,
    `${impact} وتتمثل نقاط القوة في وضوح المشكلة، ارتباط الحل بالممارسة الصفية، وقابلية التعميم على مدارس أخرى.`,
    `وتوصي المنصة بتعزيز التوثيق الكمي والنوعي للشواهد، وتوسيع التطبيق تدريجيًا بما يضمن استدامة الأثر.`
  ].join("\n\n");
}

function buildCard(exp, school) {
  return [
    `اسم التجربة: ${exp.title}`,
    `المدرسة: ${school?.name || "غير محددة"}`,
    `المرحلة: ${school?.stage || "غير محددة"}`,
    `المجال: ${exp.field || "غير محدد"}`,
    `المنفذون: ${exp.teachers_role || exp.target_group || "فريق المدرسة"}`,
    `الفكرة المختصرة: ${exp.description || "تجربة مدرسية لتحسين التدريس."}`,
    `الأثر: ${exp.after_indicators || exp.evidence_results || "تحسن في مؤشرات التعلم والممارسة."}`,
    `أبرز الشواهد: ${exp.evidence_results || "شواهد أداء، ملفات توثيق، ومؤشرات مقارنة."}`
  ].join("\n");
}

function statsFor(db, experiences = db.experiences) {
  const by = (key) => experiences.reduce((acc, exp) => {
    const value = exp[key] || "غير محدد";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  const schoolCounts = experiences.reduce((acc, exp) => {
    const school = db.schools.find((s) => s.id === exp.school_id)?.name || "غير محدد";
    acc[school] = (acc[school] || 0) + 1;
    return acc;
  }, {});
  const avg = experiences.length ? Math.round(experiences.reduce((sum, exp) => sum + Number(exp.improvement_percentage || 0), 0) / experiences.length) : 0;
  return {
    schools: new Set(experiences.map((exp) => exp.school_id)).size,
    experiences: experiences.length,
    byField: by("field"),
    byStatus: by("status"),
    byStage: experiences.reduce((acc, exp) => {
      const stage = db.schools.find((s) => s.id === exp.school_id)?.stage || "غير محدد";
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {}),
    byOffice: experiences.reduce((acc, exp) => {
      const office = db.schools.find((s) => s.id === exp.school_id)?.education_office || "غير محدد";
      acc[office] = (acc[office] || 0) + 1;
      return acc;
    }, {}),
    topSchools: Object.entries(schoolCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    averageImprovement: avg
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvExperiences(db, experiences) {
  const headers = ["العنوان", "المدرسة", "المرحلة", "المكتب", "المجال", "الحالة", "نسبة التحسن", "تاريخ الإنشاء"];
  const rows = experiences.map((exp) => {
    const school = db.schools.find((s) => s.id === exp.school_id) || {};
    return [exp.title, school.name, school.stage, school.education_office, exp.field, exp.status, exp.improvement_percentage, exp.created_at].map(csvEscape).join(",");
  });
  return `\uFEFF${headers.map(csvEscape).join(",")}\n${rows.join("\n")}`;
}

function layout(title, content) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${title}</title><link rel="stylesheet" href="/styles.css"></head><body class="print-body">${content}<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),300));</script></body></html>`;
}

function printExperience(db, exp) {
  const school = db.schools.find((s) => s.id === exp.school_id) || {};
  return layout(`تقرير ${exp.title}`, `<main class="print-page"><header class="print-cover"><div class="mark">وزارة التعليم<br>تعليم عسير</div><div><p>تقرير تجربة مدرسية</p><h1>${exp.title}</h1><span>${school.name || ""} - ${exp.field || ""}</span></div></header><section class="print-grid">${["description:وصف التجربة","problem:المشكلة أو الاحتياج","goals:الأهداف","implementation_steps:خطوات التنفيذ","tools_strategies:الأدوات والاستراتيجيات","evidence_results:الشواهد والنتائج","before_indicators:مؤشرات قبل التطبيق","after_indicators:مؤشرات بعد التطبيق","challenges:التحديات","proposed_solutions:الحلول المقترحة","scalability:قابلية التعميم"].map((item) => { const [key,label] = item.split(":"); return `<article><h2>${label}</h2><p>${exp[key] || "غير مدخل"}</p></article>`; }).join("")}</section></main>`);
}

function printStats(db, experiences) {
  const stats = statsFor(db, experiences);
  const blocks = Object.entries(stats.byField).map(([k, v]) => `<div class="print-stat"><b>${v}</b><span>${k}</span></div>`).join("");
  return layout("إحصاءات المنصة", `<main class="print-page"><header class="print-cover"><div class="mark">تعليم عسير</div><div><p>لوحة الإحصاءات</p><h1>إحصاءات تجارب تحسين التدريس</h1><span>عدد التجارب: ${stats.experiences} | المدارس المشاركة: ${stats.schools}</span></div></header><section class="print-stats">${blocks}</section><h2>متوسط نسبة التحسن: ${stats.averageImprovement}%</h2></main>`);
}

function printMagazine(db) {
  const mag = db.magazine[0];
  const items = db.magazineItems.sort((a, b) => a.order_number - b.order_number).map((item) => db.experiences.find((exp) => exp.id === item.experience_id)).filter(Boolean);
  const pages = items.map((exp, index) => {
    const school = db.schools.find((s) => s.id === exp.school_id) || {};
    return `<section class="mag-page"><p class="mag-no">${String(index + 1).padStart(2, "0")}</p><h2>${exp.title}</h2><h3>${school.name || ""} | ${exp.field || ""}</h3><p>${exp.generated_summary || buildSummary(exp, school)}</p><div class="mag-evidence"><b>أبرز الشواهد</b><span>${exp.evidence_results || "شواهد مرفقة في المنصة"}</span></div><div class="qr-print">QR<br><small>/print/experience/${exp.id}</small></div></section>`;
  }).join("");
  return layout(mag.title, `<main class="magazine-print"><section class="mag-cover"><div class="mark">وزارة التعليم<br>تعليم عسير</div><p>${mag.issue_number}</p><h1>${mag.title}</h1><span>من ممارسة التدريس إلى إتقان التعلم</span></section><section class="mag-page"><h2>كلمة افتتاحية</h2><p>${mag.introduction}</p></section>${pages}<section class="mag-page"><h2>خاتمة وشكر</h2><p>${mag.conclusion}</p><p>تتقدم الإدارة العامة للتعليم بمنطقة عسير بالشكر لجميع المدارس والفرق التعليمية المشاركة.</p></section></main>`);
}

async function handleApi(req, res, pathname, db) {
  if (req.method === "GET" && pathname === "/api/health") {
    let database = "connected";
    let storage = "connected";
    try {
      fs.accessSync(DB_FILE, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      database = "error";
    }
    try {
      fs.mkdirSync(UPLOADS, { recursive: true });
      fs.accessSync(UPLOADS, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      storage = "error";
    }
    return send(res, database === "connected" && storage === "connected" ? 200 : 500, {
      status: database === "connected" && storage === "connected" ? "ok" : "error",
      database,
      storage
    });
  }

  if (req.method === "GET" && pathname === "/api/public/bootstrap") {
    return send(res, 200, publicBootstrap(db));
  }

  if (req.method === "POST" && pathname === "/api/public/experiences") {
    const body = await jsonBody(req);
    if (!body.school_id || !body.title || !body.field || !body.description) {
      return send(res, 400, { error: "يرجى إكمال الحقول المطلوبة." });
    }
    const school = db.schools.find((item) => item.id === body.school_id);
    if (!school) return send(res, 400, { error: "المدرسة غير موجودة." });
    const uploadToken = crypto.randomBytes(18).toString("hex");
    const experience = {
      id: id("exp"),
      reference_number: referenceNumber(),
      school_id: body.school_id,
      school_name_entry: body.school_name || school.name || "",
      stage_entry: body.stage || school.stage || "",
      education_office_entry: body.education_office || school.education_office || "",
      principal_name_entry: body.principal_name || school.principal_name || "",
      teacher_name: body.teacher_name || "",
      contact: body.contact || "",
      title: body.title,
      field: body.field,
      description: body.description || "",
      problem: body.problem || "",
      goals: body.goals || "",
      target_group: body.target_group || "",
      implementation_steps: body.implementation_steps || "",
      tools_strategies: body.tools_strategies || "",
      leadership_role: body.leadership_role || "",
      teachers_role: body.teachers_role || "",
      students_role: body.students_role || "",
      evidence_results: body.evidence_results || "",
      before_indicators: body.before_indicators || "",
      after_indicators: body.after_indicators || "",
      improvement_percentage: Number(body.improvement_percentage || 0),
      challenges: body.challenges || "",
      proposed_solutions: body.proposed_solutions || "",
      scalability: body.scalability || "",
      external_links: body.external_links || "",
      video_link: body.video_link || "",
      additional_notes: body.additional_notes || "",
      status: "مسودة",
      admin_notes: "بانتظار رفع الصور أو الشواهد لإكمال الإرسال.",
      generated_summary: "",
      generated_card: "",
      included_in_magazine: false,
      public_upload_token: uploadToken,
      created_at: now(),
      updated_at: now()
    };
    db.experiences.push(experience);
    writeDb(db);
    return send(res, 200, { message: "تم حفظ بيانات التجربة، ويكتمل الإرسال بعد رفع الشواهد.", experience_id: experience.id, upload_token: uploadToken, reference_number: experience.reference_number });
  }

  const publicUploadMatch = pathname.match(/^\/api\/public\/experiences\/([^/]+)\/files$/);
  if (req.method === "POST" && publicUploadMatch) {
    const exp = db.experiences.find((item) => item.id === publicUploadMatch[1]);
    if (!exp) return send(res, 404, { error: "التجربة غير موجودة." });
    const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get("token");
    if (!token || token !== exp.public_upload_token) return send(res, 403, { error: "رابط رفع الملفات غير صالح." });
    const boundary = /boundary=(.+)$/.exec(req.headers["content-type"] || "")?.[1];
    if (!boundary) return send(res, 400, { error: "صيغة رفع الملفات غير صحيحة." });
    const buffer = await readBody(req);
    const parts = parseMultipart(buffer, boundary);
    const category = parts.find((p) => p.name === "category")?.content.toString("utf8") || "شواهد طلابية";
    const fileParts = parts.filter((p) => p.filename);
    if (!fileParts.length) return send(res, 400, { error: "إرفاق الصور أو الشواهد إلزامي لإرسال التجربة." });
    const school = db.schools.find((s) => s.id === exp.school_id);
    const dir = path.join(UPLOADS, safeName(school?.name || "school").replace(path.extname(school?.name || ""), ""), safeName(exp.title).replace(path.extname(exp.title), ""));
    fs.mkdirSync(dir, { recursive: true });
    const saved = [];
    for (const part of fileParts) {
      let ext;
      try {
        ext = validateUploadPart(part);
      } catch (error) {
        return send(res, 400, { error: error.message });
      }
      const fileName = safeName(Buffer.from(part.filename, "latin1").toString("utf8").replace(/\uFFFD/g, "") || part.filename);
      const full = path.join(dir, fileName);
      fs.writeFileSync(full, part.content);
      const rel = path.relative(ROOT, full).replace(/\\/g, "/");
      const file = { id: id("file"), experience_id: exp.id, file_name: part.filename, file_type: ext.slice(1).toUpperCase(), file_category: category, file_path: rel, file_size: part.content.length, uploaded_at: now() };
      db.files.push(file);
      saved.push(file);
    }
    exp.status = "قيد المراجعة";
    exp.admin_notes = "";
    exp.updated_at = now();
    writeDb(db);
    return send(res, 200, { message: "تم رفع الشواهد وإرسال التجربة للمراجعة بنجاح.", files: saved });
  }

  if (req.method === "POST" && pathname === "/api/login") {
    const body = await jsonBody(req);
    const user = db.users.find((u) => u.email === body.email && u.password_hash === hashPassword(body.password || ""));
    if (!user) return send(res, 403, { error: "بيانات الدخول غير صحيحة." });
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, user.id);
    return send(res, 200, { user: publicUser(user) }, { "Set-Cookie": `session=${token}; HttpOnly; SameSite=Lax; Path=/` });
  }

  if (req.method === "POST" && pathname === "/api/logout") {
    sessions.delete(getCookies(req).session);
    return send(res, 200, { ok: true }, { "Set-Cookie": "session=; Max-Age=0; Path=/" });
  }

  const user = requireUser(req, res, db);
  if (!user) return;

  if (req.method === "GET" && pathname === "/api/bootstrap") {
    const scoped = filterDbForUser(db, user);
    return send(res, 200, { ...scoped, stats: statsFor(db, scoped.experiences), statuses, share_url: shareUrl() });
  }

  if (req.method === "POST" && pathname === "/api/experiences") {
    const body = await jsonBody(req);
    const existing = body.id ? db.experiences.find((exp) => exp.id === body.id) : null;
    if (existing && !canSeeExperience(user, existing)) return send(res, 403, { error: "ليست لديك صلاحية تعديل هذه التجربة." });
    const schoolId = user.role === "school" ? user.school_id : body.school_id;
    if (!schoolId || !body.title || !body.field) return send(res, 400, { error: "يرجى إكمال الحقول المطلوبة." });
    const data = {
      school_id: schoolId,
      title: body.title,
      field: body.field,
      description: body.description || "",
      problem: body.problem || "",
      goals: body.goals || "",
      target_group: body.target_group || "",
      implementation_steps: body.implementation_steps || "",
      tools_strategies: body.tools_strategies || "",
      leadership_role: body.leadership_role || "",
      teachers_role: body.teachers_role || "",
      students_role: body.students_role || "",
      evidence_results: body.evidence_results || "",
      before_indicators: body.before_indicators || "",
      after_indicators: body.after_indicators || "",
      improvement_percentage: Number(body.improvement_percentage || 0),
      challenges: body.challenges || "",
      proposed_solutions: body.proposed_solutions || "",
      scalability: body.scalability || "",
      external_links: body.external_links || "",
      admin_notes: existing?.admin_notes || "",
      generated_summary: existing?.generated_summary || "",
      generated_card: existing?.generated_card || "",
      included_in_magazine: existing?.included_in_magazine || false,
      status: body.submit ? "قيد المراجعة" : (existing?.status || "مسودة"),
      updated_at: now()
    };
    if (existing) Object.assign(existing, data);
    else db.experiences.push({ id: id("exp"), reference_number: referenceNumber(), ...data, created_at: now() });
    writeDb(db);
    return send(res, 200, { message: body.submit ? "تم إرسال التجربة للمراجعة." : "تم حفظ التجربة بنجاح.", experience: existing || db.experiences.at(-1) });
  }

  const deleteExpMatch = pathname.match(/^\/api\/experiences\/([^/]+)$/);
  if (req.method === "DELETE" && deleteExpMatch) {
    if (user.role !== "admin") return send(res, 403, { error: "الحذف النهائي متاح لمدير النظام فقط." });
    const exp = db.experiences.find((item) => item.id === deleteExpMatch[1]);
    if (!exp) return send(res, 404, { error: "التجربة غير موجودة." });
    const relatedFiles = db.files.filter((file) => file.experience_id === exp.id);
    for (const file of relatedFiles) {
      const full = path.normalize(path.join(ROOT, file.file_path));
      if (full.startsWith(ROOT) && fs.existsSync(full)) fs.unlinkSync(full);
    }
    db.files = db.files.filter((file) => file.experience_id !== exp.id);
    db.magazineItems = db.magazineItems.filter((item) => item.experience_id !== exp.id);
    db.audit = db.audit.filter((item) => item.experience_id !== exp.id);
    db.experiences = db.experiences.filter((item) => item.id !== exp.id);
    writeDb(db);
    return send(res, 200, { message: "تم حذف التجربة نهائيًا." });
  }

  const statusMatch = pathname.match(/^\/api\/experiences\/([^/]+)\/status$/);
  if (req.method === "PATCH" && statusMatch) {
    if (!canManage(user)) return send(res, 403, { error: "هذه العملية خاصة بالمشرف أو مدير النظام." });
    const exp = db.experiences.find((item) => item.id === statusMatch[1]);
    if (!exp) return send(res, 404, { error: "التجربة غير موجودة." });
    const body = await jsonBody(req);
    if (!statuses.includes(body.status)) return send(res, 400, { error: "حالة التجربة غير صحيحة." });
    exp.status = body.status;
    exp.admin_notes = body.note || exp.admin_notes || "";
    exp.updated_at = now();
    db.audit.push({ id: id("audit"), experience_id: exp.id, user_id: user.id, action: `تغيير الحالة إلى ${body.status}`, note: body.note || "", created_at: now() });
    writeDb(db);
    return send(res, 200, { message: "تم تحديث حالة التجربة.", experience: exp });
  }

  const summaryMatch = pathname.match(/^\/api\/experiences\/([^/]+)\/generate-(summary|card)$/);
  if (req.method === "POST" && summaryMatch) {
    const exp = db.experiences.find((item) => item.id === summaryMatch[1]);
    if (!exp || !canSeeExperience(user, exp)) return send(res, 404, { error: "التجربة غير موجودة." });
    const school = db.schools.find((s) => s.id === exp.school_id);
    if (summaryMatch[2] === "summary") {
      exp.generated_summary = buildSummary(exp, school);
      writeDb(db);
      return send(res, 200, { message: "تم إنشاء الملخص بنجاح.", text: exp.generated_summary });
    }
    exp.generated_card = buildCard(exp, school);
    writeDb(db);
    return send(res, 200, { message: "تم إنشاء البطاقة التعريفية بنجاح.", text: exp.generated_card });
  }

  const magazineMatch = pathname.match(/^\/api\/experiences\/([^/]+)\/magazine$/);
  if (req.method === "POST" && magazineMatch) {
    if (!canManage(user)) return send(res, 403, { error: "إدراج التجارب في الإصدار للمشرف أو مدير النظام فقط." });
    const exp = db.experiences.find((item) => item.id === magazineMatch[1]);
    if (!exp) return send(res, 404, { error: "التجربة غير موجودة." });
    if (!["معتمدة", "مدرجة في الإصدار"].includes(exp.status)) return send(res, 400, { error: "لا يمكن إدراج تجربة قبل اعتمادها." });
    const exists = db.magazineItems.some((item) => item.experience_id === exp.id);
    if (!exists) db.magazineItems.push({ id: id("mi"), magazine_id: db.magazine[0].id, experience_id: exp.id, order_number: db.magazineItems.length + 1 });
    exp.included_in_magazine = true;
    exp.status = "مدرجة في الإصدار";
    writeDb(db);
    return send(res, 200, { message: "تم إدراج التجربة في الإصدار بنجاح." });
  }

  const uploadMatch = pathname.match(/^\/api\/experiences\/([^/]+)\/files$/);
  if (req.method === "POST" && uploadMatch) {
    const exp = db.experiences.find((item) => item.id === uploadMatch[1]);
    if (!exp || !canSeeExperience(user, exp)) return send(res, 404, { error: "التجربة غير موجودة." });
    const boundary = /boundary=(.+)$/.exec(req.headers["content-type"] || "")?.[1];
    if (!boundary) return send(res, 400, { error: "صيغة رفع الملفات غير صحيحة." });
    const buffer = await readBody(req);
    const parts = parseMultipart(buffer, boundary);
    const category = parts.find((p) => p.name === "category")?.content.toString("utf8") || "شواهد طلابية";
    const school = db.schools.find((s) => s.id === exp.school_id);
    const dir = path.join(UPLOADS, safeName(school?.name || "school").replace(path.extname(school?.name || ""), ""), safeName(exp.title).replace(path.extname(exp.title), ""));
    fs.mkdirSync(dir, { recursive: true });
    const saved = [];
    for (const part of parts.filter((p) => p.filename)) {
      let ext;
      try {
        ext = validateUploadPart(part);
      } catch (error) {
        return send(res, 400, { error: error.message });
      }
      const fileName = safeName(Buffer.from(part.filename, "latin1").toString("utf8").replace(/\uFFFD/g, "") || part.filename);
      const full = path.join(dir, fileName);
      fs.writeFileSync(full, part.content);
      const rel = path.relative(ROOT, full).replace(/\\/g, "/");
      const file = { id: id("file"), experience_id: exp.id, file_name: part.filename, file_type: ext.slice(1).toUpperCase(), file_category: category, file_path: rel, file_size: part.content.length, uploaded_at: now() };
      db.files.push(file);
      saved.push(file);
    }
    writeDb(db);
    return send(res, 200, { message: "تم رفع الملف بنجاح.", files: saved });
  }

  const deleteFileMatch = pathname.match(/^\/api\/files\/([^/]+)$/);
  if (req.method === "DELETE" && deleteFileMatch) {
    const file = db.files.find((item) => item.id === deleteFileMatch[1]);
    if (!file) return send(res, 404, { error: "الملف غير موجود." });
    const exp = db.experiences.find((item) => item.id === file.experience_id);
    if (!exp || (!canManage(user) && user.role !== "school")) return send(res, 403, { error: "لا تملك صلاحية حذف الملف." });
    const full = path.join(ROOT, file.file_path);
    if (full.startsWith(ROOT) && fs.existsSync(full)) fs.unlinkSync(full);
    db.files = db.files.filter((item) => item.id !== file.id);
    writeDb(db);
    return send(res, 200, { message: "تم حذف الملف." });
  }

  if (req.method === "GET" && pathname === "/api/export/experiences.csv") {
    const experiences = db.experiences.filter((exp) => canSeeExperience(user, exp));
    return send(res, 200, csvExperiences(db, experiences), {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"asir-experiences.csv\""
    });
  }

  return send(res, 404, { error: "المسار غير موجود." });
}

function serveStatic(req, res, pathname) {
  const root = pathname.startsWith("/uploads/") ? ROOT : PUBLIC;
  const appRoutes = new Set(["/", "/school-submit"]);
  const target = path.normalize(path.join(root, pathname.startsWith("/uploads/") ? pathname : (appRoutes.has(pathname) ? "/index.html" : pathname)));
  if (!target.startsWith(root)) return send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
  fs.readFile(target, (err, data) => {
    if (err) return send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    send(res, 200, data, { "Content-Type": types[path.extname(target).toLowerCase()] || "application/octet-stream" });
  });
}

seedDb();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    const db = readDb();

    if (pathname.startsWith("/api/")) return handleApi(req, res, pathname, db);
    if (pathname.startsWith("/print/")) {
      const user = requireUser(req, res, db);
      if (!user) return;
      if (pathname === "/print/stats") return send(res, 200, printStats(db, db.experiences.filter((exp) => canSeeExperience(user, exp))), { "Content-Type": "text/html; charset=utf-8" });
      if (pathname === "/print/magazine") return send(res, 200, printMagazine(db), { "Content-Type": "text/html; charset=utf-8" });
      const expId = pathname.match(/^\/print\/experience\/([^/]+)$/)?.[1];
      const exp = db.experiences.find((item) => item.id === expId);
      if (!exp || !canSeeExperience(user, exp)) return send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return send(res, 200, printExperience(db, exp), { "Content-Type": "text/html; charset=utf-8" });
    }
    return serveStatic(req, res, pathname);
  } catch (error) {
    send(res, 500, { error: error.message || "حدث خطأ غير متوقع." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`منصة تجارب تحسين التدريس تعمل محليًا على http://127.0.0.1:${PORT}`);
  console.log(`رابط مشاركة المدارس على الشبكة: ${shareUrl()}`);
});
