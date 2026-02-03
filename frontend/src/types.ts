export interface Project {
  id: string;
  name: string;
  description?: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  description?: string | null;
  order: number;
}

export interface Column {
  id: string;
  project_id: string;
  name: string;
  order: number;
}

export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
}

export interface KanbanBoard {
  project: Project;
  columns: KanbanColumn[];
}

