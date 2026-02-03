## Backend (FastAPI)

Run the API with:

```bash
poetry install
poetry run uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Key endpoints:
- `GET /projects` – list projects
- `POST /projects` – create a project
- `GET /projects/{project_id}/kanban` – get Kanban board (columns + tasks)
- `POST /projects/{project_id}/columns` – add a column
- `POST /projects/{project_id}/tasks` – add a task
- `PATCH /tasks/{task_id}/move` – move task between columns / reorder
- `DELETE /tasks/{task_id}` – delete task

