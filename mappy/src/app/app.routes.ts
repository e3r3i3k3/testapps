import { Routes } from '@angular/router';
import { Leafy } from './leafy/leafy';
import { Layers } from './layers/layers';
import { App } from './app';
import { ShaderTest } from './layers/shader';
import { SplitTest } from './layers/split';
import { ColorMapTest } from './layers/colormap';
import { VerticalTest } from './layers/vertical';
import { NesTest } from './layers/nes';
import { TopoTest } from './layers/topo';
import { Nes2Test } from './layers/nes2';
import { MaptilerTest } from './vector/maptiler';
import { MaptilerTest2 } from './vector/mt2';
import { Links } from './links';
import { TopoGLTest } from './webgl/topogl';
import { MtCountryTest } from './vector/mtcountry';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'links'},
  { path: 'home', component: App},
  { path: 's', component: ShaderTest},
  { path: 'w', component: SplitTest},
  { path: 't', component: ColorMapTest},
  { path: 'leafy', component: Leafy },
  { path: 'layers', component: Layers },
  { path: 'vertical', component: VerticalTest },
  { path: 'nes', component: NesTest },
  { path: 'topo', component: TopoTest },
  { path: 'nes2', component: Nes2Test },
  { path: 'maptiler', component: MaptilerTest },
  { path: 'mt2', component: MaptilerTest2},
  { path: 'links', component: Links },
  { path: 'topogl', component: TopoGLTest },
  { path: 'mtcountry', component: MtCountryTest },
];
