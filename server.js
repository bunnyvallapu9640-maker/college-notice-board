import Database from "better-sqlite3";
import express from "express";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(root, "data");
mkdirSync(dataDirectory, { recursive: true });

const db = new Database(path.join(dataDirectory, "campusconnect.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS notices (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    important INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    attachment TEXT
  )
`);

const seedNotices = [
  {
    id: "n1",
    title: "Mid-Semester Examination Schedule Released",
    department: "CSE",
    category: "Exam",
    date: "2026-10-07",
    important: true,
    description:
      "The mid-semester examination schedule has been published. Students are requested to check the timetable and report any discrepancies to the department office.",
  },
  {
    id: "n2",
    title: "Innovation & Project Expo 2026",
    department: "GENERAL",
    category: "Event",
    date: "2026-10-06",
    important: true,
    description:
      "Registrations are now open for the annual Innovation & Project Expo. Teams can submit their project abstracts through the department coordinator.",
  },
  {
    id: "n3",
    title: "Campus Placement Drive – Software Roles",
    department: "IT",
    category: "Placement",
    date: "2026-10-05",
    important: false,
    description:
      "A campus recruitment drive for software engineering roles will be conducted next week. Eligible final-year students should register before the deadline.",
  },
  {
    id: "n4",
    title: "Department Seminar: AI and Future Technologies",
    department: "ECE",
    category: "Academic",
    date: "2026-10-03",
    important: false,
    description:
      "The ECE department is conducting a technical seminar on artificial intelligence and emerging technologies. All interested students are welcome.",
  },
];

const insertNotice = db.prepare(`
  INSERT INTO notices (id, title, department, category, date, important, description, attachment)
  VALUES (@id, @title, @department, @category, @date, @important, @description, @attachment)
`);

if (db.prepare("SELECT COUNT(*) AS count FROM notices").get().count === 0) {
  const insertSeeds = db.transaction((items) => {
    for (const notice of items) {
      insertNotice.run({ ...notice, important: Number(notice.important), attachment: null });
    }
  });
  insertSeeds(seedNotices);
}

const app = express();
const port = Number(process.env.PORT) || 3000;
const departments = new Set(["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "MBA", "GENERAL"]);
const categories = new Set(["Academic", "Exam", "Event", "Placement", "General"]);

app.use(express.json({ limit: "3mb" }));

function toNotice(row) {
  return {
    ...row,
    important: Boolean(row.important),
    attachment: row.attachment ? JSON.parse(row.attachment) : null,
  };
}

function validateNotice(body) {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(body?.date) &&
    !Number.isNaN(Date.parse(`${body.date}T00:00:00Z`));
  if (
    typeof body?.title !== "string" || !body.title.trim() || body.title.length > 100 ||
    !departments.has(body.department) ||
    !categories.has(body.category) ||
    !validDate ||
    typeof body.important !== "boolean" ||
    typeof body.description !== "string" || !body.description.trim() || body.description.length > 800
  ) {
    return "Invalid notice fields.";
  }
  if (body.attachment !== null && body.attachment !== undefined) {
    const attachment = body.attachment;
    if (
      typeof attachment !== "object" ||
      typeof attachment.name !== "string" ||
      typeof attachment.type !== "string" ||
      typeof attachment.data !== "string" ||
      attachment.data.length > 2_800_000
    ) {
      return "Invalid attachment. Attachments must be under 2 MB.";
    }
  }
  return null;
}

function noticeValues(body) {
  return {
    title: body.title.trim(),
    department: body.department,
    category: body.category,
    date: body.date,
    important: Number(body.important),
    description: body.description.trim(),
    attachment: body.attachment ? JSON.stringify(body.attachment) : null,
  };
}

app.get("/api/notices", (_req, res) => {
  const rows = db.prepare("SELECT * FROM notices ORDER BY date DESC, rowid DESC").all();
  res.json(rows.map(toNotice));
});

app.post("/api/notices", (req, res) => {
  const validationError = validateNotice(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const id = randomUUID();
  insertNotice.run({ id, ...noticeValues(req.body) });
  const row = db.prepare("SELECT * FROM notices WHERE id = ?").get(id);
  res.status(201).json(toNotice(row));
});

app.put("/api/notices/:id", (req, res) => {
  const validationError = validateNotice(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const result = db.prepare(`
    UPDATE notices
    SET title = @title, department = @department, category = @category,
        date = @date, important = @important, description = @description,
        attachment = @attachment
    WHERE id = @id
  `).run({ id: req.params.id, ...noticeValues(req.body) });
  if (!result.changes) return res.status(404).json({ error: "Notice not found." });
  res.json(toNotice(db.prepare("SELECT * FROM notices WHERE id = ?").get(req.params.id)));
});

app.delete("/api/notices/:id", (req, res) => {
  const result = db.prepare("DELETE FROM notices WHERE id = ?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Notice not found." });
  res.status(204).end();
});

app.use(express.static(path.join(root, "dist")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(root, "dist", "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: "The server could not process the request." });
});

app.listen(port, () => {
  console.log(`CampusConnect server listening at http://localhost:${port}`);
});
