import { Component, AfterViewInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

const mapSources = [
  'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
];

const attributions = [
  '© OpenStreetMap contributors',
  '© OpenStreetMap contributors, Tiles style by HOT',
  '© OpenStreetMap, © CartoDB',
  '© OpenStreetMap, © CartoDB',
  '© Stamen Design, © OpenStreetMap',
  'Tiles © Esri',
];

@Component({
  selector: 'app-layers',
  imports: [],
  templateUrl: './layers.html',
  styleUrl: '../../styles.css'
})
export class Layers implements AfterViewInit {
  private map!: Map;
  private baseLayer!: TileLayer<XYZ>;
  selection = 2;

  constructor() { }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.baseLayer = new TileLayer({
      source: new XYZ({
        url: mapSources[this.selection],
        attributions: attributions[this.selection],
        maxZoom: 19
      })
    });

    this.map = new Map({
      target: 'ol-map',
      layers: [this.baseLayer],
      view: new View({
        center: fromLonLat([40.0, 9.0]), // [longitude, latitude]
        zoom: 8
      })
    });
  }

  changeMapSource(index: number): void {
    this.selection = index;

    // Remove existing base layer
    this.map.removeLayer(this.baseLayer);

    // Create and add new base layer
    this.baseLayer = new TileLayer({
      source: new XYZ({
        url: mapSources[index],
        attributions: attributions[index],
        maxZoom: 19
      })
    });
    
    this.map.getLayers().insertAt(0, this.baseLayer);
  }
}
