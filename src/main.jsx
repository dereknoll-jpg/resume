import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { defaultResume } from "./resumeData";
import "./styles.css";

const STORAGE_KEY = "derek-noll-resume-workspace-v1";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function Editor({ resume, setResume, onExportJson, onImportJson, onReset }) {
  const fileInputRef = useRef(null);

  return (
    <aside className="editor no-print">
      <div className="editor-header">
        <div>
          <p className="eyebrow">Resume Workspace</p>
          <h1>Edit Derek's Resume</h1>
        </div>
        <button type="button" onClick={() => window.print()}>Export PDF</button>
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "derek-noll-resume-data.json";
    link.click();
    URL.revokeObjectURL(url);
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
      <Editor resume={resume} setResume={setResume} onExportJson={exportJson} onImportJson={importJson} onReset={resetResume} />
      <div className="preview-wrap">
        <ResumePreview resume={resume} />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
