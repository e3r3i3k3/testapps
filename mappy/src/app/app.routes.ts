import { Routes } from '@angular/router';
import { Leafy } from './leafy/leafy';
import { Layers } from './layers/layers';
import { App } from './app';
import { ShaderTest } from './layers/shader';
import { SplitTest } from './layers/split';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'layers'},
  { path: 'home', component: App},
  { path: 's', component: ShaderTest},
  { path: 'w', component: SplitTest},
  { path: 'leafy', component: Leafy },
  { path: 'layers', component: Layers }
];
