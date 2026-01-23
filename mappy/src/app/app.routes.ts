import { Routes } from '@angular/router';
import { Leafy } from './leafy/leafy';
import { Layers } from './layers/layers';
import { App } from './app';
import { ShaderTest } from './layers/shader';

export const routes: Routes = [
  { path: '', component: App},
  { path: 's', component: ShaderTest},
  { path: 'leafy', component: Leafy },
  { path: 'layers', component: Layers }
];
