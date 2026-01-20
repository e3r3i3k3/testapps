import { Component, AfterViewInit } from '@angular/core';
import Mapp from 'ol/Map';
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
import RasterSource from 'ol/source/Raster.js';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile.js';

import MVT from 'ol/format/MVT.js';
import {get as getProjection} from 'ol/proj.js';
import Icon from 'ol/style/Icon.js';
import Text from 'ol/style/Text.js';
import TileGrid from 'ol/tilegrid/TileGrid.js';

// does not work
const url1 = 'http://localhost:8081/geoserver/ibf-system/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=application/vnd.mapbox-vector-tile&TRANSPARENT=true&LAYERS=ne_110m_admin_0_boundary_lines_land&SRS=EPSG:900913&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}';
const url1roads = 'http://localhost:8081/geoserver/ibf-system/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=application/vnd.mapbox-vector-tile&TRANSPARENT=true&LAYERS=roads&SRS=EPSG:900913&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}';
//works
// be sure to match the tilematrix set (EPSG:900913, 	EPSG:404000, etc.)
const url2 = 'http://localhost:8081/geoserver/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=ibf-system:ne_110m_admin_0_boundary_lines_land&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}';
const url2roadsnew = 'http://localhost:8081/geoserver/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=ibf-system:gis_osm_roads_free_1&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}';

// gis_osm_roads_free_1
// does not work
const url2roads = 'http://localhost:8081/geoserver/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=ibf-system:roads&STYLE=&TILEMATRIX=EPSG:404000:{z}&TILEMATRIXSET=EPSG:404000&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}';
// does not work
const url3 = 'http://localhost:8081/geoserver/ibf-system/wms?service=WMS&request=GetMap&layers=ne_110m_admin_0_boundary_lines_land&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:900913&format=application/vnd.mapbox-vector-tile';
const url3roads = 'http://localhost:8081/geoserver/ibf-system/wms?service=WMS&request=GetMap&layers=roads&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:900913&format=application/vnd.mapbox-vector-tile';

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
  private map!: Mapp;
  private baseLayer!: TileLayer<XYZ>;
  private roadsLayer?: VectorLayer<VectorSource>;
  private bordersLayer?: VectorLayer<VectorSource>;
  private rasterLayer?: TileLayer<TileWMS>;
  selection = 2;
  showRoads = false;
  showBorders = false;
  showRasterLayer = false;
  private minZoomForRoads = 10;
  borderColor = '#00ff00';

  // Caching
  private loadedBounds?: [number, number, number, number];
  private cachedRoads: any[] = [];
  private loadedBordersBounds?: [number, number, number, number];
  private cachedBorders: any[] = [];

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

    this.map = new Mapp({
      target: 'ol-map',
      layers: [this.baseLayer],
      view: new View({
        center: fromLonLat([40.0, 9.0]), // [longitude, latitude]
        zoom: 8
      })
    });

    // Add borders layer
    const borderMVT = new VectorTileLayer({
      declutter: true,
      source: new VectorTileSource({
        attributions:
          'WWWWWWWWWWWW',
        format: new MVT(),
                url: url2,
      }),
      style: new Style({
            stroke: new Stroke({ color: this.borderColor, width: 4 }),
            fill: new Fill({ color: this.borderColor + '80' })
          })
      //style: createMapboxStreetsV6Style(Style, Fill, Stroke, Icon, Text),
    });
  
    // Add borders layer
    const roadsMVT = new VectorTileLayer({
      declutter: true,
      source: new VectorTileSource({
        attributions:
          'FFFFFFFFFFF',
        format: new MVT(),
                url: url2roadsnew,
      }),
      style: new Style({
            stroke: new Stroke({ color: '#FF00FFFF', width: 2 })
          })
      //style: createMapboxStreetsV6Style(Style, Fill, Stroke, Icon, Text),
    });

    this.map.addLayer(borderMVT);

    this.map.addLayer(roadsMVT);

    
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
      if (this.showBorders) {
        this.loadBordersInView();
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
      // background: '#ff00ff', // No alpha support, fills map with color
      opacity: 1
    });

// beforeoperations prerender postrender
this.rasterLayer.on('prerender', (evt) => {
  // return
  if (evt.context) {
    const context = evt.context as CanvasRenderingContext2D;
    context.filter = 'grayscale(80%) invert(100%) ';
    context.globalCompositeOperation = 'source-over';
  }
});

this.rasterLayer.on('postrender', (evt) => {
  if (evt.context) {
    const context = evt.context as CanvasRenderingContext2D;
    context.filter = 'none';
  }
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

  toggleBorders(): void {
    this.showBorders = !this.showBorders;
    if (this.showBorders) {
      this.loadBordersInView();
    } else {
      if (this.bordersLayer) {
        this.map.removeLayer(this.bordersLayer);
        this.bordersLayer = undefined;
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

  private loadBordersInView(): void {
    const extent = this.map.getView().calculateExtent(this.map.getSize());
    const wgs84Extent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

    if (this.bordersLayer && this.loadedBordersBounds && this.boundsContains(this.loadedBordersBounds, wgs84Extent)) {
      console.log('Using cached borders');
      return;
    }

    const buffer = 0.5;
    const expandedBounds: [number, number, number, number] = [
      wgs84Extent[0] - (wgs84Extent[2] - wgs84Extent[0]) * buffer,
      wgs84Extent[1] - (wgs84Extent[3] - wgs84Extent[1]) * buffer,
      wgs84Extent[2] + (wgs84Extent[2] - wgs84Extent[0]) * buffer,
      wgs84Extent[3] + (wgs84Extent[3] - wgs84Extent[1]) * buffer
    ];

    this.loadedBordersBounds = expandedBounds;

    this.geoServerService.getBordersInBoundingBox(
      expandedBounds[0], expandedBounds[1], expandedBounds[2], expandedBounds[3]
    ).subscribe({
      next: (geojson) => {
        console.log(`Loaded ${geojson.features.length} border features`);
        
        if (this.bordersLayer) {
          this.map.removeLayer(this.bordersLayer);
        }

        this.cachedBorders = geojson.features;

        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(geojson, {
            featureProjection: 'EPSG:3857'
          })
        });

        this.bordersLayer = new VectorLayer({
          source: vectorSource,
          style: new Style({
            stroke: new Stroke({ color: this.borderColor, width: 2 }),
            fill: new Fill({ color: this.borderColor + '80' })
          })
        });
        
        this.map.addLayer(this.bordersLayer);
      },
      error: (error) => {
        console.error('Error loading borders:', error);
      }
    });
  }

  randomizeColor(): void {
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    this.borderColor = randomColor;
    
    if (this.bordersLayer) {
      this.map.removeLayer(this.bordersLayer);
      this.bordersLayer = undefined;
    }

    if (this.showBorders) {
      this.loadBordersInView();
    }
  }
  

  private boundsContains(outer: [number, number, number, number], inner: number[]): boolean {
    return outer[0] <= inner[0] && outer[1] <= inner[1] && 
           outer[2] >= inner[2] && outer[3] >= inner[3];
  }

  // =========================
  //=======================
  //const controlIds = ['hue', 'chroma', 'lightness'];
  //const controls : Map<string, string> = new Map();
}
