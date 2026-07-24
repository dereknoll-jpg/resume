import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { defaultResume } from "./resumeData";
import "./styles.css";

const STORAGE_KEY = "derek-noll-resume-workspace-v1";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function resumeWordHtml(resume) {
  const contact = [resume.contact.location, resume.contact.phone, resume.contact.email, resume.contact.linkedin].filter(Boolean);
  const experience = resume.experience
    .map((job) => `
      <div class="job">
        <table class="job-heading">
          <tr>
            <td>
              <h3>${escapeHtml(job.role)}</h3>
              <p>${escapeHtml([job.company, job.location].filter(Boolean).join(" | "))}</p>
            </td>
            <td class="dates">${escapeHtml(job.dates)}</td>
          </tr>
        </table>
        <ul>${job.bullets.filter(Boolean).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
      </div>
    `)
    .join("");
  const skills = resume.skills
    .map((skill) => `
      <div class="skill">
        <h3>${escapeHtml(skill.label)}</h3>
        <p>${escapeHtml(skill.items)}</p>
      </div>
    `)
    .join("");
  const additional = resume.additional.filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(resume.name)} Resume</title>
    <style>
      @page WordSection1 { size: 8.5in 11in; margin: 0.45in; }
      body { font-family: Arial, Helvetica, sans-serif; color: #172029; font-size: 8.8pt; line-height: 1.28; }
      div.WordSection1 { page: WordSection1; }
      h1 { font-size: 30pt; line-height: 0.95; margin: 0; text-transform: uppercase; }
      h2 { color: #134f59; font-size: 9pt; letter-spacing: 1px; margin: 12pt 0 6pt; text-transform: uppercase; }
      h3 { font-size: 9.5pt; margin: 0; }
      p { margin: 0; }
      ul { margin: 4pt 0 0 14pt; padding: 0; }
      li { margin-bottom: 2.5pt; }
      .top { border-bottom: 3pt solid #1d6f7a; margin-bottom: 14pt; padding-bottom: 12pt; width: 100%; }
      .headline { color: #134f59; font-size: 10.5pt; font-weight: bold; margin-top: 7pt; }
      .contact { color: #5f6873; font-size: 8pt; line-height: 1.35; text-align: right; vertical-align: bottom; }
      .profile { background: #f7f0e4; border-left: 7pt solid #1d6f7a; margin-bottom: 14pt; padding: 8pt 10pt; }
      .layout { width: 100%; }
      .main { vertical-align: top; width: 68%; padding-right: 16pt; }
      .side { border-left: 1pt solid #d7dde3; vertical-align: top; width: 32%; padding-left: 14pt; }
      .job { margin-bottom: 10pt; }
      .job-heading { width: 100%; }
      .job-heading p, .skill p, .additional { color: #5f6873; }
      .dates { color: #134f59; font-size: 8pt; font-weight: bold; text-align: right; vertical-align: top; width: 72pt; }
      .skill { margin-bottom: 8pt; }
      .skill h3 { font-size: 8.3pt; }
      .skill p { font-size: 7.8pt; line-height: 1.22; }
      .motto { border-top: 2pt solid #1d6f7a; color: #134f59; font-weight: bold; margin-top: 10pt; padding-top: 7pt; }
    </style>
  </head>
  <body>
    <div class="WordSection1">
      <table class="top">
        <tr>
          <td>
            <h1>${escapeHtml(resume.name)}</h1>
            <p class="headline">${escapeHtml(resume.headline)}</p>
          </td>
          <td class="contact">${contact.map(escapeHtml).join("<br>")}</td>
        </tr>
      </table>
      <div class="profile">
        <h2>Profile</h2>
        <p>${escapeHtml(resume.profile)}</p>
      </div>
      <table class="layout">
        <tr>
          <td class="main">
            <h2>Professional Experience</h2>
            ${experience}
          </td>
          <td class="side">
            <h2>Skills</h2>
            ${skills}
            <h2>Additional</h2>
            <ul class="additional">${additional}</ul>
            ${resume.motto ? `<p class="motto">"${escapeHtml(resume.motto)}"</p>` : ""}
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}

function setPath(source, path, value) {
  const next = clone(source);
  let cursor = next;
  path.slice(0, -1).forEach((part) => {
    cursor = cursor[part];
  });
  cursor[path[path.length - 1]] = value;
  return next;
}

function Field({ label, value, onChange, multiline = false }) {
  const Component = multiline ? "textarea" : "input";
  return (
    <label className="field">
      <span>{label}</span>
      <Component value={value} onChange={(event) => onChange(event.target.value)} rows={multiline ? 5 : undefined} />
    </label>
  );
}

function ArrayEditor({ title, items, onChange, renderItem, newItem }) {
  return (
    <section className="editor-section">
      <div className="section-title">
        <h2>{title}</h2>
        <button type="button" onClick={() => onChange([...items, clone(newItem)])}>Add</button>
      </div>
      <div className="stack">
        {items.map((item, index) => (
          <div className="edit-card" key={index}>
            {renderItem(item, index)}
            <button className="quiet danger" type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Editor({ resume, setResume, onExportJson, onExportWord, onImportJson, onReset }) {
  const fileInputRef = useRef(null);

  return (
    <aside className="editor no-print">
      <div className="editor-header">
        <div>
          <p className="eyebrow">Resume Workspace</p>
          <h1>Edit Derek's Resume</h1>
        </div>
        <div className="export-actions">
          <button type="button" onClick={() => window.print()}>Export PDF</button>
          <button type="button" onClick={onExportWord}>Export Word</button>
        </div>
      </div>

      <section className="editor-section">
        <h2>Identity</h2>
        <Field label="Name" value={resume.name} onChange={(value) => setResume(setPath(resume, ["name"], value))} />
        <Field label="Headline" value={resume.headline} onChange={(value) => setResume(setPath(resume, ["headline"], value))} />
        <Field label="Profile" value={resume.profile} multiline onChange={(value) => setResume(setPath(resume, ["profile"], value))} />
      </section>

      <section className="editor-section">
        <h2>Contact</h2>
        {Object.entries(resume.contact).map(([key, value]) => (
          <Field
            key={key}
            label={key}
            value={value}
            onChange={(nextValue) => setResume(setPath(resume, ["contact", key], nextValue))}
          />
        ))}
      </section>

      <ArrayEditor
        title="Skills"
        items={resume.skills}
        onChange={(items) => setResume(setPath(resume, ["skills"], items))}
        newItem={{ label: "New Skill", items: "" }}
        renderItem={(skill, index) => (
          <>
            <Field label="Label" value={skill.label} onChange={(value) => setResume(setPath(resume, ["skills", index, "label"], value))} />
            <Field label="Items" value={skill.items} multiline onChange={(value) => setResume(setPath(resume, ["skills", index, "items"], value))} />
          </>
        )}
      />

      <ArrayEditor
        title="Experience"
        items={resume.experience}
        onChange={(items) => setResume(setPath(resume, ["experience"], items))}
        newItem={{ role: "New Role", company: "", location: "", dates: "", bullets: [""] }}
        renderItem={(job, index) => (
          <>
            <div className="field-grid">
              <Field label="Role" value={job.role} onChange={(value) => setResume(setPath(resume, ["experience", index, "role"], value))} />
              <Field label="Company" value={job.company} onChange={(value) => setResume(setPath(resume, ["experience", index, "company"], value))} />
              <Field label="Location" value={job.location} onChange={(value) => setResume(setPath(resume, ["experience", index, "location"], value))} />
              <Field label="Dates" value={job.dates} onChange={(value) => setResume(setPath(resume, ["experience", index, "dates"], value))} />
            </div>
            <ArrayEditor
              title="Bullets"
              items={job.bullets}
              onChange={(bullets) => setResume(setPath(resume, ["experience", index, "bullets"], bullets))}
              newItem=""
              renderItem={(bullet, bulletIndex) => (
                <Field
                  label={`Bullet ${bulletIndex + 1}`}
                  value={bullet}
                  multiline
                  onChange={(value) => setResume(setPath(resume, ["experience", index, "bullets", bulletIndex], value))}
                />
              )}
            />
          </>
        )}
      />

      <ArrayEditor
        title="Additional"
        items={resume.additional}
        onChange={(items) => setResume(setPath(resume, ["additional"], items))}
        newItem=""
        renderItem={(item, index) => (
          <Field label={`Item ${index + 1}`} value={item} multiline onChange={(value) => setResume(setPath(resume, ["additional", index], value))} />
        )}
      />

      <section className="editor-section actions">
        <button type="button" onClick={onExportJson}>Download Data</button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>Import Data</button>
        <button className="quiet danger" type="button" onClick={onReset}>Reset</button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={onImportJson} />
      </section>
    </aside>
  );
}

function ResumePreview({ resume }) {
  const contact = useMemo(
    () => [resume.contact.location, resume.contact.phone, resume.contact.email, resume.contact.linkedin].filter(Boolean),
    [resume.contact]
  );

  return (
    <main className="sheet" aria-label="Resume preview">
      <header className="resume-header">
        <div>
          <h1>{resume.name}</h1>
          <p>{resume.headline}</p>
        </div>
        <div className="contact-list">
          {contact.map((item) => <span key={item}>{item}</span>)}
        </div>
      </header>

      <section className="profile-block">
        <h2>Profile</h2>
        <p>{resume.profile}</p>
      </section>

      <div className="resume-grid">
        <section className="main-column">
          <h2>Professional Experience</h2>
          {resume.experience.map((job, index) => (
            <article className="job" key={`${job.role}-${index}`}>
              <div className="job-heading">
                <div>
                  <h3>{job.role}</h3>
                  <p>{[job.company, job.location].filter(Boolean).join(" | ")}</p>
                </div>
                <span>{job.dates}</span>
              </div>
              <ul>
                {job.bullets.filter(Boolean).map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}
              </ul>
            </article>
          ))}
        </section>

        <aside className="side-column">
          <section>
            <h2>Skills</h2>
            <div className="skills">
              {resume.skills.map((skill, index) => (
                <div className="skill" key={`${skill.label}-${index}`}>
                  <h3>{skill.label}</h3>
                  <p>{skill.items}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Additional</h2>
            <ul className="compact-list">
              {resume.additional.filter(Boolean).map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </section>

          {resume.motto && <p className="motto">"{resume.motto}"</p>}
        </aside>
      </div>
    </main>
  );
}

function App() {
  const [resume, setResume] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultResume;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
  }, [resume]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" });
    downloadBlob(blob, "derek-noll-resume-data.json");
  }

  function exportWord() {
    const html = resumeWordHtml(resume);
    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
    downloadBlob(blob, "Derek_Noll_Resume.doc");
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setResume(JSON.parse(text));
    event.target.value = "";
  }

  function resetResume() {
    if (confirm("Reset the resume workspace to the built-in version?")) {
      setResume(defaultResume);
    }
  }

  return (
    <div className="app">
      <Editor
        resume={resume}
        setResume={setResume}
        onExportJson={exportJson}
        onExportWord={exportWord}
        onImportJson={importJson}
        onReset={resetResume}
      />
      <div className="preview-wrap">
        <ResumePreview resume={resume} />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
