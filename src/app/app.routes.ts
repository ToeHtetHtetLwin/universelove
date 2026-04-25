import { Routes } from '@angular/router';
import { UniverseComponent } from './universe/universe.component';

export const routes: Routes = [
  // Default အနေနဲ့ တစ်ခုခုပြချင်ရင် (ဥပမာ - toe-htet)
  { path: '', redirectTo: 'gift/001', pathMatch: 'full' },
  
  // Dynamic Route: id နေရာမှာ customer နာမည်တွေ ပြောင်းလဲသွားမှာပါ
  { path: 'gift/:id', component: UniverseComponent },
  
  // မရှိတဲ့ link တွေဝင်ရင် default ဆီ ပြန်ပို့ဖို့
  { path: '**', redirectTo: 'gift/001' }
];