from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from uuid import uuid4


class Project(BaseModel):
    id: str
    name: str
    description: Optional[str] = None


class Column(BaseModel):
    id: str
    project_id: str
    name: str
    order: int


class Task(BaseModel):
    id: str
    project_id: str
    column_id: str
    title: str
    description: Optional[str] = None
    order: int


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ColumnCreate(BaseModel):
    name: str


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    column_id: str


class TaskMove(BaseModel):
    column_id: str
    order: int


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class KanbanColumn(BaseModel):
    id: str
    name: str
    order: int
    tasks: List[Task]


class KanbanBoard(BaseModel):
    project: Project
    columns: List[KanbanColumn]


app = FastAPI(title="ProMan API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173","https://project-tracker-backend-jz5x.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


projects: Dict[str, Project] = {}
columns: Dict[str, Column] = {}
tasks: Dict[str, Task] = {}


def _seed_demo_data() -> None:
    if projects:
        return

    project_id = str(uuid4())
    project = Project(id=project_id, name="Demo Project", description="Sample Kanban project")
    projects[project_id] = project

    todo_col = Column(id=str(uuid4()), project_id=project_id, name="To Do", order=0)
    doing_col = Column(id=str(uuid4()), project_id=project_id, name="In Progress", order=1)
    done_col = Column(id=str(uuid4()), project_id=project_id, name="Done", order=2)

    columns[todo_col.id] = todo_col
    columns[doing_col.id] = doing_col
    columns[done_col.id] = done_col

    task1 = Task(
        id=str(uuid4()),
        project_id=project_id,
        column_id=todo_col.id,
        title="Set up project structure",
        description="Backend + frontend skeleton",
        order=0,
    )
    task2 = Task(
        id=str(uuid4()),
        project_id=project_id,
        column_id=doing_col.id,
        title="Design Kanban board UI",
        description="Columns, cards, interactions",
        order=0,
    )
    task3 = Task(
        id=str(uuid4()),
        project_id=project_id,
        column_id=done_col.id,
        title="Install dependencies",
        description="Poetry + Node tooling",
        order=0,
    )

    tasks[task1.id] = task1
    tasks[task2.id] = task2
    tasks[task3.id] = task3


@app.on_event("startup")
async def on_startup() -> None:
    _seed_demo_data()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/projects", response_model=List[Project])
async def list_projects() -> List[Project]:
    return list(projects.values())


@app.post("/projects", response_model=Project, status_code=201)
async def create_project(payload: ProjectCreate) -> Project:
    project_id = str(uuid4())
    project = Project(id=project_id, **payload.model_dump())
    projects[project_id] = project

    todo_col = Column(id=str(uuid4()), project_id=project_id, name="To Do", order=0)
    doing_col = Column(id=str(uuid4()), project_id=project_id, name="In Progress", order=1)
    done_col = Column(id=str(uuid4()), project_id=project_id, name="Done", order=2)

    columns[todo_col.id] = todo_col
    columns[doing_col.id] = doing_col
    columns[done_col.id] = done_col

    return project


@app.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    project = projects.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.patch("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, payload: ProjectUpdate) -> Project:
    project = projects.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        project.name = data["name"]
    if "description" in data:
        project.description = data["description"]

    projects[project_id] = project
    return project


@app.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str) -> None:
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    del projects[project_id]

    column_ids = [c_id for c_id, c in columns.items() if c.project_id == project_id]
    for c_id in column_ids:
        del columns[c_id]

    task_ids = [t_id for t_id, t in tasks.items() if t.project_id == project_id]
    for t_id in task_ids:
        del tasks[t_id]


@app.get("/projects/{project_id}/kanban", response_model=KanbanBoard)
async def get_kanban_board(project_id: str) -> KanbanBoard:
    project = projects.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_columns = sorted(
        [c for c in columns.values() if c.project_id == project_id],
        key=lambda c: c.order,
    )

    kanban_columns: List[KanbanColumn] = []
    for col in project_columns:
        col_tasks = sorted(
            [t for t in tasks.values() if t.column_id == col.id],
            key=lambda t: t.order,
        )
        kanban_columns.append(
            KanbanColumn(
                id=col.id,
                name=col.name,
                order=col.order,
                tasks=col_tasks,
            )
        )

    return KanbanBoard(project=project, columns=kanban_columns)


@app.post("/projects/{project_id}/columns", response_model=Column, status_code=201)
async def create_column(project_id: str, payload: ColumnCreate) -> Column:
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")

    max_order = max(
        (c.order for c in columns.values() if c.project_id == project_id),
        default=-1,
    )
    column_id = str(uuid4())
    column = Column(
        id=column_id,
        project_id=project_id,
        name=payload.name,
        order=max_order + 1,
    )
    columns[column_id] = column
    return column


@app.post("/projects/{project_id}/tasks", response_model=Task, status_code=201)
async def create_task(project_id: str, payload: TaskCreate) -> Task:
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.column_id not in columns:
        raise HTTPException(status_code=404, detail="Column not found")

    max_order = max(
        (t.order for t in tasks.values() if t.column_id == payload.column_id),
        default=-1,
    )

    task_id = str(uuid4())
    task = Task(
        id=task_id,
        project_id=project_id,
        column_id=payload.column_id,
        title=payload.title,
        description=payload.description,
        order=max_order + 1,
    )
    tasks[task_id] = task
    return task


@app.patch("/tasks/{task_id}/move", response_model=Task)
async def move_task(task_id: str, payload: TaskMove) -> Task:
    task = tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.column_id not in columns:
        raise HTTPException(status_code=404, detail="Target column not found")

    siblings = [t for t in tasks.values() if t.column_id == payload.column_id and t.id != task_id]
    siblings.sort(key=lambda t: t.order)

    insert_index = max(0, min(payload.order, len(siblings)))
    siblings.insert(insert_index, task)

    for idx, t in enumerate(siblings):
        t.order = idx
        tasks[t.id] = t

    task.column_id = payload.column_id
    tasks[task.id] = task
    return task


@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str) -> None:
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    del tasks[task_id]


@app.patch("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, payload: TaskUpdate) -> Task:
    task = tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    data = payload.model_dump(exclude_unset=True)
    if "title" in data and data["title"] is not None:
        task.title = data["title"]
    if "description" in data:
        task.description = data["description"]

    tasks[task.id] = task
    return task

