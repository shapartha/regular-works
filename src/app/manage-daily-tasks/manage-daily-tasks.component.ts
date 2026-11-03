import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DailyTask, DailyTaskInput, DailyTasksService } from '../daily-tasks.service';

@Component({
  selector: 'app-manage-daily-tasks',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './manage-daily-tasks.component.html',
  styleUrl: './manage-daily-tasks.component.css',
})
export class ManageDailyTasksComponent implements OnInit {
  readonly tasks = signal<DailyTask[]>([]);
  draft: DailyTaskInput = this.emptyDraft();
  editingTaskId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');

  constructor(private readonly dailyTasksService: DailyTasksService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  saveTask(): void {
    const task = { title: this.draft.title.trim(), detail: this.draft.detail.trim() };
    if (!task.title) {
      this.error.set('Enter a task title before saving.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    const editingTaskId = this.editingTaskId();
    const request = editingTaskId
      ? this.dailyTasksService.updateTask(editingTaskId, task)
      : this.dailyTasksService.createTask(task);

    request.subscribe({
      next: (savedTask) => {
        if (editingTaskId) {
          this.tasks.update((tasks) => tasks.map((item) => item.id === savedTask.id ? savedTask : item));
        } else {
          this.tasks.update((tasks) => [...tasks, savedTask]);
        }
        if (this.editingTaskId() === editingTaskId) {
          this.cancelEdit();
        }
        this.saving.set(false);
      },
      error: () => {
        this.error.set('Could not save the task. Please try again.');
        this.saving.set(false);
      },
    });
  }

  editTask(task: DailyTask): void {
    this.editingTaskId.set(task.id);
    this.draft = { title: task.title, detail: task.detail };
    this.error.set('');
  }

  deleteTask(task: DailyTask): void {
    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    this.error.set('');
    this.dailyTasksService.deleteTask(task.id).subscribe({
      next: () => {
        this.tasks.update((tasks) => tasks.filter((item) => item.id !== task.id));
        if (this.editingTaskId() === task.id) {
          this.cancelEdit();
        }
      },
      error: () => {
        this.error.set('Could not delete the task. Please try again.');
      },
    });
  }

  cancelEdit(): void {
    this.editingTaskId.set(null);
    this.draft = this.emptyDraft();
  }

  private loadTasks(): void {
    this.dailyTasksService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load tasks. Make sure the application server is running, then try again.');
        this.loading.set(false);
      },
    });
  }

  private emptyDraft(): DailyTaskInput {
    return { title: '', detail: '' };
  }
}
