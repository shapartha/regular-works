import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface DailyTask {
  id: string;
  title: string;
  detail: string;
}

export interface DailyTaskProfile {
  id: string;
  name: string;
}

export type DailyTaskProgress = Record<string, boolean>;

export type DailyTaskInput = Pick<DailyTask, 'title' | 'detail'>;

@Injectable({ providedIn: 'root' })
export class DailyTasksService {
  private readonly apiUrl = '/api/daily-tasks';
  private readonly profilesUrl = '/api/daily-task-profiles';

  constructor(private readonly http: HttpClient) {}

  getTasks(): Observable<DailyTask[]> {
    return this.http.get<DailyTask[]>(this.apiUrl);
  }

  createTask(task: DailyTaskInput): Observable<DailyTask> {
    return this.http.post<DailyTask>(this.apiUrl, task);
  }

  updateTask(id: string, task: DailyTaskInput): Observable<DailyTask> {
    return this.http.put<DailyTask>(`${this.apiUrl}/${encodeURIComponent(id)}`, task);
  }

  deleteTask(id: string): Observable<DailyTask> {
    return this.http.delete<DailyTask>(`${this.apiUrl}/${encodeURIComponent(id)}`);
  }

  getProfiles(): Observable<DailyTaskProfile[]> {
    return this.http.get<DailyTaskProfile[]>(this.profilesUrl);
  }

  createProfile(name: string): Observable<DailyTaskProfile> {
    return this.http.post<DailyTaskProfile>(this.profilesUrl, { name });
  }

  getProgress(profileId: string): Observable<DailyTaskProgress> {
    return this.http.get<DailyTaskProgress>(`${this.profilesUrl}/${encodeURIComponent(profileId)}/progress`);
  }

  saveProgress(profileId: string, progress: DailyTaskProgress): Observable<DailyTaskProgress> {
    return this.http.put<DailyTaskProgress>(
      `${this.profilesUrl}/${encodeURIComponent(profileId)}/progress`,
      progress,
    );
  }
}
