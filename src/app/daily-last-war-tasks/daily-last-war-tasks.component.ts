import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DailyTask, DailyTaskProfile, DailyTasksService } from '../daily-tasks.service';

@Component({
  selector: 'app-daily-last-war-tasks',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatCheckboxModule, MatIconModule, RouterLink],
  templateUrl: './daily-last-war-tasks.component.html',
  styleUrl: './daily-last-war-tasks.component.css',
})
export class DailyLastWarTasksComponent implements OnInit {
  readonly today = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  readonly tasks = signal<(DailyTask & { completed: boolean })[]>([]);
  readonly profiles = signal<DailyTaskProfile[]>([]);
  readonly selectedProfileId = signal('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly addingProfile = signal(false);
  readonly creatingProfile = signal(false);
  readonly profileName = signal('');
  readonly profileError = signal('');
  readonly savingProgress = signal(false);

  constructor(private readonly dailyTasksService: DailyTasksService) {}

  ngOnInit(): void {
    this.dailyTasksService.getTasks().subscribe({
      next: (tasks) => {
        this.dailyTasksService.getProfiles().subscribe({
          next: (profiles) => {
            this.profiles.set(profiles);
            if (profiles.length > 0) {
              this.selectProfile(profiles[0]);
            } else {
              this.tasks.set(tasks.map((task) => ({ ...task, completed: false })));
              this.loading.set(false);
            }
          },
          error: () => {
            this.error.set('Could not load task profiles. Make sure the application server is running, then try again.');
            this.loading.set(false);
          },
        });
        this.allTasks.set(tasks);
      },
      error: () => {
        this.error.set('Could not load daily tasks. Make sure the application server is running, then try again.');
        this.loading.set(false);
      },
    });
  }

  private readonly allTasks = signal<DailyTask[]>([]);

  selectProfile(profile: DailyTaskProfile): void {
    this.selectedProfileId.set(profile.id);
    this.loading.set(true);
    this.savingProgress.set(false);
    this.error.set('');
    this.dailyTasksService.getProgress(profile.id).subscribe({
      next: (progress) => {
        if (this.selectedProfileId() !== profile.id) {
          return;
        }
        this.tasks.set(this.allTasks().map((task) => ({ ...task, completed: progress[task.id] ?? false })));
        this.loading.set(false);
      },
      error: () => {
        if (this.selectedProfileId() !== profile.id) {
          return;
        }
        this.error.set('Could not load progress for this profile. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openAddProfile(): void {
    this.addingProfile.set(true);
    this.profileName.set('');
    this.profileError.set('');
  }

  cancelAddProfile(): void {
    this.addingProfile.set(false);
    this.profileError.set('');
  }

  addProfile(): void {
    const name = this.profileName().trim();
    if (!name) {
      this.profileError.set('Enter a profile name.');
      return;
    }

    this.creatingProfile.set(true);
    this.profileError.set('');
    this.dailyTasksService.createProfile(name).subscribe({
      next: (profile) => {
        this.profiles.update((profiles) => [...profiles, profile]);
        this.addingProfile.set(false);
        this.creatingProfile.set(false);
        this.selectProfile(profile);
      },
      error: (error: { error?: { error?: string } }) => {
        this.profileError.set(error.error?.error ?? 'Could not add the profile. Please try again.');
        this.creatingProfile.set(false);
      },
    });
  }

  setTaskCompleted(taskId: string, completed: boolean): void {
    this.tasks.update((tasks) => tasks.map((task) => task.id === taskId ? { ...task, completed } : task));

    const profileId = this.selectedProfileId();
    if (!profileId) {
      return;
    }

    const progress = Object.fromEntries(this.tasks().map((task) => [task.id, task.completed]));
    this.savingProgress.set(true);
    this.error.set('');
    this.dailyTasksService.saveProgress(profileId, progress).subscribe({
      next: () => {
        if (this.selectedProfileId() === profileId) {
          this.savingProgress.set(false);
        }
      },
      error: () => {
        if (this.selectedProfileId() === profileId) {
          this.error.set('Could not save task progress. Your changes may not be saved.');
          this.savingProgress.set(false);
        }
      },
    });
  }

  get completedCount(): number {
    return this.tasks().filter((task) => task.completed).length;
  }

  get progressPercent(): number {
    const taskCount = this.tasks().length;
    return taskCount === 0 ? 0 : (this.completedCount / taskCount) * 100;
  }
}
