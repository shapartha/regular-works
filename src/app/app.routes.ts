import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { DailyLastWarTasksComponent } from './daily-last-war-tasks/daily-last-war-tasks.component';
import { ManageDailyTasksComponent } from './manage-daily-tasks/manage-daily-tasks.component';
import { GroceryInventoryComponent } from './grocery-inventory/grocery-inventory.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home | Regular Works' },
  {
    path: 'daily-tasks',
    component: DailyLastWarTasksComponent,
    title: 'Daily Tasks | Regular Works',
  },
  {
    path: 'manage-daily-tasks',
    component: ManageDailyTasksComponent,
    title: 'Manage Daily Tasks | Regular Works',
  },
  {
    path: 'grocery-inventory',
    component: GroceryInventoryComponent,
    title: 'Grocery Inventory | Regular Works',
  },
  { path: '**', redirectTo: '' },
];
