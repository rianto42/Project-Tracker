import React, { useState } from "react";
import { KanbanBoard, KanbanColumn, Task } from "../types";
import { API_BASE } from "../config";

interface KanbanProps {
  board: KanbanBoard;
  onBoardChanged: () => void;
}

export const Kanban: React.FC<KanbanProps> = ({ board, onBoardChanged }) => {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [targetColumnId, setTargetColumnId] = useState<string | null>(
    board.columns[0]?.id ?? null
  );
  const [submitting, setSubmitting] = useState(false);
  const [dragTask, setDragTask] = useState<Task | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !targetColumnId) return;
    try {
      setSubmitting(true);
      await fetch(`${API_BASE}/projects/${board.project.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: "",
          column_id: targetColumnId
        })
      });
      setNewTaskTitle("");
      await onBoardChanged();
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveTask = async (task: Task, direction: "left" | "right") => {
    const currentIndex = board.columns.findIndex((c) => c.id === task.column_id);
    if (currentIndex === -1) return;

    const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= board.columns.length) return;

    const targetColumn = board.columns[nextIndex];

    await fetch(`${API_BASE}/tasks/${task.id}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        column_id: targetColumn.id,
        order: targetColumn.tasks.length
      })
    });
    await onBoardChanged();
  };

  const handleDeleteTask = async (task: Task) => {
    await fetch(`${API_BASE}/tasks/${task.id}`, { method: "DELETE" });
    await onBoardChanged();
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const saveEditTask = async (task: Task) => {
    await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim() || task.title,
        description: editDescription
      })
    });
    cancelEdit();
    await onBoardChanged();
  };

  const handleDropOnColumn = async (column: KanbanColumn) => {
    if (!dragTask) return;

    await fetch(`${API_BASE}/tasks/${dragTask.id}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        column_id: column.id,
        order: column.tasks.length
      })
    });
    setDragTask(null);
    setDragOverColumnId(null);
    await onBoardChanged();
  };

  const renderColumn = (column: KanbanColumn) => {
    const isDragOver = dragOverColumnId === column.id && !!dragTask;

    return (
      <div key={column.id} className="kanban-column">
        <h3>{column.name}</h3>
        <div
          className={`kanban-column-body${isDragOver ? " drag-over" : ""}`}
          onDragOver={(e) => {
            if (dragTask) {
              e.preventDefault();
              setDragOverColumnId(column.id);
            }
          }}
          onDragLeave={() => {
            if (dragOverColumnId === column.id) {
              setDragOverColumnId(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            void handleDropOnColumn(column);
          }}
        >
          {column.tasks.map((task) => {
            const isEditing = editingTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`kanban-card${isEditing ? " editing" : ""}`}
                draggable={!isEditing}
                onDragStart={() => !isEditing && setDragTask(task)}
                onDragEnd={() => {
                  setDragTask(null);
                  setDragOverColumnId(null);
                }}
                onDoubleClick={() => startEditTask(task)}
              >
                {!isEditing ? (
                  <>
                    <div className="kanban-card-title">{task.title}</div>
                    {task.description && (
                      <div className="kanban-card-description">
                        {task.description}
                      </div>
                    )}
                    <div className="kanban-card-actions">
                      <button
                        type="button"
                        onClick={() => handleMoveTask(task, "left")}
                        disabled={
                          board.columns.findIndex((c) => c.id === task.column_id) ===
                          0
                        }
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveTask(task, "right")}
                        disabled={
                          board.columns.findIndex((c) => c.id === task.column_id) ===
                          board.columns.length - 1
                        }
                      >
                        ▶
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditTask(task)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDeleteTask(task)}
                      >
                        ✕
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="kanban-edit-form">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                    <div className="kanban-edit-form-actions">
                      <button type="button" onClick={cancelEdit}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => void saveEditTask(task)}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="kanban-root">
      <header className="kanban-header">
        <div>
          <h2>{board.project.name}</h2>
          {board.project.description && <p>{board.project.description}</p>}
        </div>
        <form className="new-task-form" onSubmit={handleAddTask}>
          <input
            type="text"
            placeholder="New task title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <select
            value={targetColumnId ?? ""}
            onChange={(e) => setTargetColumnId(e.target.value)}
          >
            {board.columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={submitting || !newTaskTitle.trim()}>
            Add Task
          </button>
        </form>
      </header>

      <div className="kanban-columns">
        {board.columns.map((column) => renderColumn(column))}
      </div>
    </section>
  );
};

