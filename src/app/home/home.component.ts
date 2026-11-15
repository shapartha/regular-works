import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GroceryInventoryService, GroceryItem, GroceryStatus } from '../grocery-inventory.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  readonly groceryItems = signal<GroceryItem[]>([]);
  readonly inventoryLoading = signal(true);
  readonly inventoryError = signal('');
  readonly savingItemId = signal<string | null>(null);
  readonly statusLabels: Record<GroceryStatus, string> = {
    available: 'Available',
    'low-or-unavailable': 'Low or Unavailable',
    'need-supply': 'Need Supply',
  };

  constructor(private readonly groceryInventoryService: GroceryInventoryService) {}

  ngOnInit(): void {
    this.groceryInventoryService.getItems().subscribe({
      next: (items) => {
        this.groceryItems.set(items);
        this.inventoryLoading.set(false);
      },
      error: () => {
        this.inventoryError.set('Could not load grocery inventory. Please try again.');
        this.inventoryLoading.set(false);
      },
    });
  }

  setItemStatus(item: GroceryItem, status: 'available' | 'need-supply'): void {
    if (this.savingItemId() || item.status === status) {
      return;
    }

    this.savingItemId.set(item.id);
    this.inventoryError.set('');
    this.groceryInventoryService.updateItem(item.id, {
      name: item.name,
      quantity: item.quantity,
      status,
    }).subscribe({
      next: (updatedItem) => {
        this.groceryItems.update((items) => items.map((current) => current.id === updatedItem.id ? updatedItem : current));
        this.savingItemId.set(null);
      },
      error: () => {
        this.inventoryError.set(`Could not update ${item.name}. Please try again.`);
        this.savingItemId.set(null);
      },
    });
  }
}
