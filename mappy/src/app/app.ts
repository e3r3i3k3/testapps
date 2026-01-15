import { Component, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import * as L from 'leaflet';
import { GeoServerService } from '../GeoServer.service';


const geoserverUrl = 'http://localhost:8081/geoserver/ibf-system/wms';


// Option 0: OpenStreetMap default
// Option 1: OpenStreetMap HOT (Humanitarian) - different colors
// Option 2: CartoDB Light (minimal, light roads)
// Option 3: CartoDB Dark (dark theme)
// Option 4: Stamen Toner (black & white, high contrast)
// Option 5: Esri WorldStreetMap
// IBF now uses: https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png
// This is the old endpoint for carto
// Also there are options for no label maps, and only labels https://cartodb.readthedocs.io/en/latest/configuration.html
const mapSources = [
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
];

const attribution = [
  '© OpenStreetMap contributors',
  '© OpenStreetMap contributors, Tiles style by HOT',
  '© OpenStreetMap, © CartoDB',
  '© OpenStreetMap, © CartoDB2',
  '© Stamen Design, © OpenStreetMap',
  'Tiles © Esri',];


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: '../styles.css'
})
export class App implements AfterViewInit {
  private map!: L.Map;
  private roadsLayer?: L.GeoJSON;
  private baseLayer?: L.TileLayer;
  private rasterLayer?: L.TileLayer.WMS;
  selection = 2;
  showRoads = true;
  showRasterLayer = false;

  // Caching
  private loadedBounds?: L.LatLngBounds;
  private cachedRoads: any[] = [];

  constructor(private geoServerService: GeoServerService) { }

  changeMapSource(index: number): void {
    this.selection = index;

    // Remove existing base layer
    if (this.baseLayer) {
      this.map.removeLayer(this.baseLayer);
    }

    // Add new base layer
    this.baseLayer = L.tileLayer(mapSources[index], {
      attribution: attribution[index],
      maxZoom: 19,
    });
    this.baseLayer.addTo(this.map);
  }



  private setupMapEventListeners(): void {
    // Reload roads when map stops moving (after pan/zoom)
    // Erik note:
    // This is best practices for vector data, but is not needed for raster WMS layers, since
    // GeoServer handles that automatically
    this.map.on('moveend', () => {
      this.loadRoadsInView();
    });
  }




  ngAfterViewInit(): void {
    this.initMap();
    this.loadRoadsInView();
    this.setupMapEventListeners();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [9.0, 40.0],
      zoom: 8,
    });

    // Base map
    this.baseLayer = L.tileLayer(mapSources[this.selection], {
      attribution: attribution[this.selection],
      maxZoom: 19,
    });
    this.baseLayer.addTo(this.map);
  }

  private addGeoServerRasterLayer(): void {
    // WMS Layer from GeoServer
    const wmsLayer = L.tileLayer.wms(geoserverUrl, {
      layers: 'ibf-system:flood_extent_24-hour_ETH', // Your layer name
      format: 'image/png',
      transparent: true,
      version: '1.1.0',
      attribution: 'GeoServer',
      crs: L.CRS.EPSG4326,
    });

    wmsLayer.addTo(this.map);
  }

  toggleRasterLayer(): void { }


  private loadRoadsInView(): void {
    // Get current map bounds
    const bounds = this.map.getBounds();

    // Check if we already have data for this area (with some buffer)
    if (this.loadedBounds && this.loadedBounds.contains(bounds)) {
      console.log('Using cached roads');
      return; // Already loaded this area
    }

    // Expand bounds by 50% in each direction for better caching
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const latBuffer = (ne.lat - sw.lat) * 0.5;
    const lngBuffer = (ne.lng - sw.lng) * 0.5;

    const expandedBounds = L.latLngBounds(
      [sw.lat - latBuffer, sw.lng - lngBuffer],
      [ne.lat + latBuffer, ne.lng + lngBuffer]
    );

    // Store the loaded bounds for future checks
    this.loadedBounds = expandedBounds;

    const expandedSW = expandedBounds.getSouthWest();
    const expandedNE = expandedBounds.getNorthEast();

    // Fetch roads within expanded bounding box
    this.geoServerService.getRoadsInBoundingBox(
      expandedSW.lng,  // minLon
      expandedSW.lat,  // minLat
      expandedNE.lng,  // maxLon
      expandedNE.lat   // maxLat
    ).subscribe({
      next: (geojson) => {
        console.log(`Loaded ${geojson.features.length} road features (cached area)`);

        // Remove existing roads layer
        if (this.roadsLayer) {
          this.map.removeLayer(this.roadsLayer);
        }

        // Add new features to cache sdsdsd
        this.cachedRoads = geojson.features;

        this.roadsLayer = L.geoJSON(geojson, {
          style: (feature) => {
            const highway = feature?.properties?.highway;
            // comment
            switch (highway) {
              case 'motorway':
                return { color: '#e74c3c', weight: 4 };
              case 'primary':
                return { color: '#e67e22', weight: 3 };
              case 'secondary':
                return { color: '#f39c12', weight: 2.5 };
              case 'tertiary':
                return { color: '#f1c40f', weight: 2 };
              case 'unclassified':
                return { color: '#0ae675ff', weight: 2 };
              case 'track':
                return { color: '#f700ffff', weight: 2 };
              default:
                return { color: '#3498db', weight: 1.5 };
            }
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const props = feature.properties;
              layer.bindPopup(`
                <strong>Road Type:</strong> ${props.highway || 'Unknown'}<br>
                <strong>ID:</strong> ${props.referenceId || 'N/A'}<br>
                ${props.exposed ? '<strong>Status:</strong> Exposed' : ''}
              `);
            }
          }
        }).addTo(this.map);
      },
      error: (error) => {
        console.error('Error loading roads:', error);
      }
    });
  }
}
