import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GroceryInventoryService, GroceryItem, GroceryItemInput, GroceryStatus } from '../grocery-inventory.service';

@Component({
  selector: 'app-grocery-inventory',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './grocery-inventory.component.html',
  styleUrl: './grocery-inventory.component.css',
})
export class GroceryInventoryComponent implements OnInit {
  readonly items = signal<GroceryItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly editingItemId = signal<string | null>(null);
  readonly statuses: { value: GroceryStatus; label: string }[] = [
    { value: 'available', label: 'Available' },
    { value: 'low-or-unavailable', label: 'Low or Unavailable' },
    { value: 'need-supply', label: 'Need Supply' },
  ];
  readonly statusLabels: Record<GroceryStatus, string> = {
    available: 'Available',
    'low-or-unavailable': 'Low or Unavailable',
    'need-supply': 'Need Supply',
  };
  draft: GroceryItemInput = this.emptyDraft();

  constructor(private readonly groceryInventoryService: GroceryInventoryService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  saveItem(): void {
    const item = {
      name: this.draft.name.trim(),
      quantity: this.draft.quantity,
      status: this.draft.status,
    };
    if (!item.name || !Number.isInteger(item.quantity) || item.quantity < 0) {
      this.error.set('Enter an item name and a whole-number quantity of zero or more.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    const editingItemId = this.editingItemId();
    const request = editingItemId
      ? this.groceryInventoryService.updateItem(editingItemId, item)
      : this.groceryInventoryService.createItem(item);

    request.subscribe({
      next: (savedItem) => {
        if (editingItemId) {
          this.items.update((items) => items.map((current) => current.id === savedItem.id ? savedItem : current));
        } else {
          this.items.update((items) => [...items, savedItem]);
        }
        if (this.editingItemId() === editingItemId) {
          this.cancelEdit();
        }
        this.saving.set(false);
      },
      error: () => {
        this.error.set('Could not save the grocery item. Please try again.');
        this.saving.set(false);
      },
    });
  }

  editItem(item: GroceryItem): void {
    this.editingItemId.set(item.id);
    this.draft = { name: item.name, quantity: item.quantity, status: item.status };
    this.error.set('');
  }

  deleteItem(item: GroceryItem): void {
    if (!window.confirm(`Delete "${item.name}"?`)) {
      return;
    }

    this.error.set('');
    this.groceryInventoryService.deleteItem(item.id).subscribe({
      next: () => {
        this.items.update((items) => items.filter((current) => current.id !== item.id));
        if (this.editingItemId() === item.id) {
          this.cancelEdit();
        }
      },
      error: () => {
        this.error.set('Could not delete the grocery item. Please try again.');
      },
    });
  }

  cancelEdit(): void {
    this.editingItemId.set(null);
    this.draft = this.emptyDraft();
  }

  private loadItems(): void {
    this.groceryInventoryService.getItems().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load grocery inventory. Make sure the application server is running, then try again.');
        this.loading.set(false);
      },
    });
  }

  private emptyDraft(): GroceryItemInput {
    return { name: '', quantity: 1, status: 'available' };
  }
}
