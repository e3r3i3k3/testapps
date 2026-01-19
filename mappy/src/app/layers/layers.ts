import { Component, AfterViewInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import TileWMS from 'ol/source/TileWMS';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Stroke, Fill } from 'ol/style';
import { fromLonLat, transformExtent } from 'ol/proj';
import { GeoServerService } from '../../GeoServer.service';

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

const geoserverUrl = 'http://localhost:8081/geoserver/ibf-system/wms';

@Component({
  selector: 'app-layers',
  imports: [],
  templateUrl: './layers.html',
  styleUrl: '../../styles.css'
})
export class Layers implements AfterViewInit {
  private map!: Map;
  private baseLayer!: TileLayer<XYZ>;
  private roadsLayer?: VectorLayer<VectorSource>;
  private buildingsLayer?: VectorLayer<VectorSource>;
  private rasterLayer?: TileLayer<TileWMS>;
  selection = 2;
  showRoads = false;
  showBuildings = false;
  showRasterLayer = false;
  private minZoomForRoads = 10;
  buildingColor = '#00ff00';

  // Caching
  private loadedBounds?: [number, number, number, number];
  private cachedRoads: any[] = [];
  private loadedBuildingsBounds?: [number, number, number, number];
  private cachedBuildings: any[] = [];

  constructor(private geoServerService: GeoServerService) { }

  ngAfterViewInit(): void {
    this.initMap();
    this.setupMapEventListeners();
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

  private setupMapEventListeners(): void {
    this.map.on('moveend', () => {
      if (this.showRoads) {
        this.loadRoadsInView();
      }
      if (this.showBuildings) {
        this.loadBuildingsInView();
      }
    });
  }

  toggleRasterLayer(): void {
    this.showRasterLayer = !this.showRasterLayer;
    if (this.showRasterLayer) {
      this.addGeoServerRasterLayer();
    } else {
      if (this.rasterLayer) {
        this.map.removeLayer(this.rasterLayer);
        this.rasterLayer = undefined;
      }
    }
  }

  private addGeoServerRasterLayer(): void {
    this.rasterLayer = new TileLayer({
      source: new TileWMS({
        url: geoserverUrl,
        params: {
          'LAYERS': 'ibf-system:flood_extent_11-hour_ETH',
          'TILED': true
        },
        serverType: 'geoserver',
        transition: 0
      }),
      opacity: 0.7
    });
    this.map.addLayer(this.rasterLayer);
  }

  toggleRoads(): void {
    this.showRoads = !this.showRoads;
    if (this.showRoads) {
      const zoom = this.map.getView().getZoom() || 0;
      if (zoom < this.minZoomForRoads) {
        alert(`Zoom now: ${zoom.toFixed(1)}. Please zoom in to level ${this.minZoomForRoads} or higher to view roads`);
        this.showRoads = false;
        return;
      }
      this.loadRoadsInView();
    } else {
      if (this.roadsLayer) {
        this.map.removeLayer(this.roadsLayer);
        this.roadsLayer = undefined;
      }
    }
  }

  toggleBuildings(): void {
    this.showBuildings = !this.showBuildings;
    if (this.showBuildings) {
      this.loadBuildingsInView();
    } else {
      if (this.buildingsLayer) {
        this.map.removeLayer(this.buildingsLayer);
        this.buildingsLayer = undefined;
      }
    }
  }

  private loadRoadsInView(): void {
    const zoom = this.map.getView().getZoom() || 0;
    if (zoom < this.minZoomForRoads) {
      return;
    }

    const extent = this.map.getView().calculateExtent(this.map.getSize());
    const wgs84Extent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

    if (this.roadsLayer && this.loadedBounds && this.boundsContains(this.loadedBounds, wgs84Extent)) {
      console.log('Using cached roads');
      return;
    }

    const buffer = 0.5;
    const expandedBounds: [number, number, number, number] = [
      wgs84Extent[0] - (wgs84Extent[2] - wgs84Extent[0]) * buffer,
      wgs84Extent[1] - (wgs84Extent[3] - wgs84Extent[1]) * buffer,
      wgs84Extent[2] + (wgs84Extent[2] - wgs84Extent[0]) * buffer,
      wgs84Extent[3] + (wgs84Extent[3] - wgs84Extent[1]) * buffer
    ];

    this.loadedBounds = expandedBounds;

    this.geoServerService.getRoadsInBoundingBox(
      expandedBounds[0], expandedBounds[1], expandedBounds[2], expandedBounds[3]
    ).subscribe({
      next: (geojson) => {
        console.log(`Loaded ${geojson.features.length} road features`);
        
        if (this.roadsLayer) {
          this.map.removeLayer(this.roadsLayer);
        }

        this.cachedRoads = geojson.features;

        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(geojson, {
            featureProjection: 'EPSG:3857'
          })
        });

        this.roadsLayer = new VectorLayer({
          source: vectorSource,
          style: (feature) => {
            const highway = feature.get('highway');
            let color = '#ff00ea';
            let width = 1.5;
            
            switch (highway) {
              case 'motorway': color = '#e74c3c'; width = 4; break;
              case 'primary': color = '#e67e22'; width = 3; break;
              case 'secondary': color = '#5900d5'; width = 2.5; break;
              case 'tertiary': color = '#1500ff'; width = 2; break;
              case 'unclassified': color = '#0ae675ff'; width = 2; break;
              case 'track': color = 'rgb(255, 204, 0)'; width = 2; break;
            }
            
            return new Style({
              stroke: new Stroke({ color, width })
            });
          }
        });
        
        this.map.addLayer(this.roadsLayer);
      },
      error: (error) => {
        console.error('Error loading roads:', error);
      }
    });
  }

  private loadBuildingsInView(): void {
    const extent = this.map.getView().calculateExtent(this.map.getSize());
    const wgs84Extent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

    if (this.buildingsLayer && this.loadedBuildingsBounds && this.boundsContains(this.loadedBuildingsBounds, wgs84Extent)) {
      console.log('Using cached buildings');
      return;
    }

    const buffer = 0.5;
    const expandedBounds: [number, number, number, number] = [
      wgs84Extent[0] - (wgs84Extent[2] - wgs84Extent[0]) * buffer,
      wgs84Extent[1] - (wgs84Extent[3] - wgs84Extent[1]) * buffer,
      wgs84Extent[2] + (wgs84Extent[2] - wgs84Extent[0]) * buffer,
      wgs84Extent[3] + (wgs84Extent[3] - wgs84Extent[1]) * buffer
    ];

    this.loadedBuildingsBounds = expandedBounds;

    this.geoServerService.getBuildingsInBoundingBox(
      expandedBounds[0], expandedBounds[1], expandedBounds[2], expandedBounds[3]
    ).subscribe({
      next: (geojson) => {
        console.log(`Loaded ${geojson.features.length} building features`);
        
        if (this.buildingsLayer) {
          this.map.removeLayer(this.buildingsLayer);
        }

        this.cachedBuildings = geojson.features;

        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(geojson, {
            featureProjection: 'EPSG:3857'
          })
        });

        this.buildingsLayer = new VectorLayer({
          source: vectorSource,
          style: new Style({
            stroke: new Stroke({ color: this.buildingColor, width: 2 }),
            fill: new Fill({ color: this.buildingColor + '80' })
          })
        });
        
        this.map.addLayer(this.buildingsLayer);
      },
      error: (error) => {
        console.error('Error loading buildings:', error);
      }
    });
  }

  randomizeColor(): void {
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    this.buildingColor = randomColor;
    
    if (this.buildingsLayer) {
      this.map.removeLayer(this.buildingsLayer);
      this.buildingsLayer = undefined;
    }

    if (this.showBuildings) {
      this.loadBuildingsInView();
    }
  }

  private boundsContains(outer: [number, number, number, number], inner: number[]): boolean {
    return outer[0] <= inner[0] && outer[1] <= inner[1] && 
           outer[2] >= inner[2] && outer[3] >= inner[3];
  }
}
