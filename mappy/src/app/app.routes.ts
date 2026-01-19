import { Routes } from '@angular/router';
import { Leafy } from './leafy/leafy';
import { Layers } from './layers/layers';
import { App } from './app';

export const routes: Routes = [
  { path: '', component: App},
  { path: 'leafy', component: Leafy },
  { path: 'layers', component: Layers }
];
