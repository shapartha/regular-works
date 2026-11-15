import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../env/environment.local';

export type GroceryStatus = 'available' | 'low-or-unavailable' | 'need-supply';

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  status: GroceryStatus;
}

export type GroceryItemInput = Pick<GroceryItem, 'name' | 'quantity' | 'status'>;

@Injectable({ providedIn: 'root' })
export class GroceryInventoryService {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  private readonly apiUrl = `${this.apiBaseUrl}/api/grocery-inventory`;

  constructor(private readonly http: HttpClient) {}

  getItems(): Observable<GroceryItem[]> {
    return this.http.get<GroceryItem[]>(this.apiUrl);
  }

  createItem(item: GroceryItemInput): Observable<GroceryItem> {
    return this.http.post<GroceryItem>(this.apiUrl, item);
  }

  updateItem(id: string, item: GroceryItemInput): Observable<GroceryItem> {
    return this.http.put<GroceryItem>(`${this.apiUrl}/${encodeURIComponent(id)}`, item);
  }

  deleteItem(id: string): Observable<GroceryItem> {
    return this.http.delete<GroceryItem>(`${this.apiUrl}/${encodeURIComponent(id)}`);
  }
}
