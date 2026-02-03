import React, { useState } from "react";
import { Project } from "../types";
import { API_BASE } from "../config";

interface ProjectManagerProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  onProjectsChanged: (projects: Project[]) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  selectedProjectId,
  onSelect,
  onProjectsChanged
}) => {
  const [creatingName, setCreatingName] = useState("");
  const [creatingDescription, setCreatingDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshProjects = async () => {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) return;
    const data: Project[] = await res.json();
    onProjectsChanged(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: creatingName.trim(),
          description: creatingDescription || null
        })
      });
      if (res.ok) {
        const created: Project = await res.json();
        await refreshProjects();
        onSelect(created.id);
        setCreatingName("");
        setCreatingDescription("");
      }
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const saveEdit = async (project: Project) => {
    setBusy(true);
    try {
      const payload: { name?: string; description?: string | null } = {};
      if (editName.trim() && editName.trim() !== project.name) {
        payload.name = editName.trim();
      }
      if (editDescription !== (project.description ?? "")) {
        payload.description = editDescription || null;
      }
      if (Object.keys(payload).length === 0) {
        cancelEdit();
        return;
      }
      const res = await fetch(`${API_BASE}/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshProjects();
      }
    } finally {
      setBusy(false);
      cancelEdit();
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${project.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await refreshProjects();
        if (selectedProjectId === project.id) {
          const remaining = projects.filter((p) => p.id !== project.id);
          if (remaining.length > 0) {
            onSelect(remaining[0].id);
          } else {
            onSelect("");
          }
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="project-manager-root">
      <header className="project-manager-header">
        <div>
          <h2>Project Manager</h2>
          <p>Create, rename, and remove projects.</p>
        </div>
      </header>

      <div className="project-manager-layout">
        <form className="project-create-form" onSubmit={handleCreate}>
          <h3>Create new project</h3>
          <input
            type="text"
            placeholder="Project name"
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
          />
          <textarea
            placeholder="Project description"
            value={creatingDescription}
            onChange={(e) => setCreatingDescription(e.target.value)}
          />
          <button type="submit" disabled={busy || !creatingName.trim()}>
            Create project
          </button>
        </form>

        <div className="project-list">
          <h3>Existing projects</h3>
          {projects.length === 0 && (
            <p className="project-list-empty">No projects yet. Create one on the left.</p>
          )}
          <ul>
            {projects.map((p) => {
              const isEditing = editingId === p.id;
              const isSelected = selectedProjectId === p.id;
              return (
                <li
                  key={p.id}
                  className={`project-list-item${
                    isSelected ? " selected" : ""
                  }${isEditing ? " editing" : ""}`}
                >
                  {!isEditing ? (
                    <>
                      <div
                        className="project-list-main"
                        onClick={() => onSelect(p.id)}
                      >
                        <div className="project-list-name">{p.name}</div>
                        {p.description && (
                          <div className="project-list-description">
                            {p.description}
                          </div>
                        )}
                      </div>
                      <div className="project-list-actions">
                        <button
                          type="button"
                          onClick={() => beginEdit(p)}
                          disabled={busy}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDelete(p)}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="project-edit-inline">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                      <div className="project-edit-inline-actions">
                        <button type="button" onClick={cancelEdit} disabled={busy}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => void saveEdit(p)}
                          disabled={busy}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

