import React, { useEffect, useState } from "react";
import { KanbanBoard, Project } from "./types";
import { Kanban } from "./components/Kanban";
import { ProjectManager } from "./components/ProjectManager";
import { API_BASE } from "./config";

export const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "projects">("board");

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setError(null);
        const res = await fetch(`${API_BASE}/projects`);
        if (!res.ok) throw new Error("Failed to load projects");
        const data: Project[] = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    };
    void loadProjects();
  }, [selectedProjectId]);

  useEffect(() => {
    const loadBoard = async () => {
      if (!selectedProjectId) {
        setBoard(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/projects/${selectedProjectId}/kanban`);
        if (!res.ok) throw new Error("Failed to load kanban board");
        const data: KanbanBoard = await res.json();
        setBoard(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void loadBoard();
  }, [selectedProjectId]);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId || null);
  };

  const refreshBoard = async () => {
    if (!selectedProjectId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projects/${selectedProjectId}/kanban`);
      if (!res.ok) throw new Error("Failed to refresh kanban board");
      const data: KanbanBoard = await res.json();
      setBoard(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectUpdated = (updated: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
    setBoard((prev) =>
      prev ? { ...prev, project: { ...prev.project, ...updated } } : prev
    );
  };

  const handleProjectsChanged = (next: Project[]) => {
    setProjects(next);
    if (!selectedProjectId) return;
    const updatedSelected = next.find((p) => p.id === selectedProjectId);
    if (updatedSelected) {
      setBoard((prev) =>
        prev
          ? { ...prev, project: { ...prev.project, ...updatedSelected } }
          : prev
      );
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>ProMan – Project Management & Kanban</h1>
        <div className="project-selector">
          <label htmlFor="project-select">Project:</label>
          <select
            id="project-select"
            value={selectedProjectId ?? ""}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="app-header-tabs">
          <button
            type="button"
            className={view === "board" ? "active" : ""}
            onClick={() => setView("board")}
          >
            Board
          </button>
          <button
            type="button"
            className={view === "projects" ? "active" : ""}
            onClick={() => setView("projects")}
          >
            Projects
          </button>
        </div>
      </header>

      <main className="app-main">
        {error && <div className="error-banner">{error}</div>}
        {loading && <div className="loading">Loading...</div>}
        {view === "board" && (
          <>
            {board && (
              <Kanban
                board={board}
                onBoardChanged={refreshBoard}
                onProjectUpdated={handleProjectUpdated}
              />
            )}
            {!loading && !board && <p>No project selected.</p>}
          </>
        )}
        {view === "projects" && (
          <ProjectManager
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelect={handleProjectChange}
            onProjectsChanged={handleProjectsChanged}
          />
        )}
      </main>
    </div>
  );
};

