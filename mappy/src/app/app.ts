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
  private buildingsLayer?: L.GeoJSON;
  private baseLayer?: L.TileLayer;
  private rasterLayer?: L.TileLayer.WMS;
  selection = 2;
  showRoads = false;
  showBuildings = false;
  showRasterLayer = false;
  private minZoomForRoads = 10; // Only load roads at zoom 15+
  buildingColor = '#00ff00'; // Default green color

  // Caching
  private loadedBounds?: L.LatLngBounds;
  private cachedRoads: any[] = [];
  private loadedBuildingsBounds?: L.LatLngBounds;
  private cachedBuildings: any[] = [];

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
    // Also caching needs to be added, and it's not perfect with how its in here now. Needs more testing
    // Vectors are not provided chuncked for roads it looks like now
    this.map.on('moveend', () => {
      if (this.showRoads) {
        this.loadRoadsInView();
      }
      if (this.showBuildings) {
        this.loadBuildingsInView();
      }
    });

    // Handle zoom level changes for roads
    this.map.on('zoomend', () => {
      if (this.showRoads) {
        const zoom = this.map.getZoom();
        if (zoom < this.minZoomForRoads && this.roadsLayer) {
          // Remove layer if zoomed out too far
          this.map.removeLayer(this.roadsLayer);
          this.roadsLayer = undefined;
        } else if (zoom >= this.minZoomForRoads) {
          // Load layer if zoomed in enough
          this.loadRoadsInView();
        }
      }
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
    this.rasterLayer = L.tileLayer.wms(geoserverUrl, {
      layers: 'ibf-system:flood_extent_11-hour_ETH', // 'ibf-system:flood_extent_24-hour_ETH', // Your layer name
      format: 'image/png',
      transparent: true,
      version: '1.1.0',
      attribution: 'GeoServer',
      crs: L.CRS.EPSG4326,
      className: 'green-raster-layer', // Apply green tint via CSS
    });

    this.rasterLayer.addTo(this.map);
  }

  toggleRasterLayer(): void { 
    this.showRasterLayer = !this.showRasterLayer;
    if (this.showRasterLayer) {
      this.addGeoServerRasterLayer();
    } else {
      // Remove raster layer
      if (this.rasterLayer) {
        this.map.removeLayer(this.rasterLayer);
        this.rasterLayer = undefined;
      }
    }
  }
  toggleRoads(): void {
    this.showRoads = !this.showRoads;
    if (this.showRoads) {
      const zoom = this.map.getZoom();
      if (zoom < this.minZoomForRoads) {
        alert(`Zoom now: ${zoom}. Please zoom in to level ${this.minZoomForRoads} or higher to view roads`);
        this.showRoads = false;
        return;
      }
      this.loadRoadsInView();
    } else {
      // Remove roads layer
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
      // Remove buildings layer
      if (this.buildingsLayer) {
        this.map.removeLayer(this.buildingsLayer);
        this.buildingsLayer = undefined;
      }
    }
  }


  private loadRoadsInView(): void {
    // Check zoom level
    const zoom = this.map.getZoom();
    if (zoom < this.minZoomForRoads) {
      //console.log(`Zoom level ${zoom} too low for roads (min: ${this.minZoomForRoads})`);
      return;
    }

    // Get current map bounds
    const bounds = this.map.getBounds();

    // Check if we already have data for this area (with some buffer)
    if (this.roadsLayer && this.loadedBounds && this.loadedBounds.contains(bounds)) {
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
                return { color: '#5900d5', weight: 2.5 };
              case 'tertiary':
                return { color: '#1500ff', weight: 2 };
              case 'unclassified':
                return { color: '#0ae675ff', weight: 2 };
              case 'track':
                return { color: 'rgb(255, 204, 0)', weight: 2 };
              default:
                return { color: '#ff00ea', weight: 1.5 };
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

  private loadBuildingsInView(): void {
    // Get current map bounds
    const bounds = this.map.getBounds();

    // Check if we already have data for this area (with some buffer)
    if (this.buildingsLayer && this.loadedBuildingsBounds && this.loadedBuildingsBounds.contains(bounds)) {
      console.log('Using cached buildings');
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
    this.loadedBuildingsBounds = expandedBounds;

    const expandedSW = expandedBounds.getSouthWest();
    const expandedNE = expandedBounds.getNorthEast();

    // Fetch buildings within expanded bounding box
    this.geoServerService.getBuildingsInBoundingBox(
      expandedSW.lng,  // minLon
      expandedSW.lat,  // minLat
      expandedNE.lng,  // maxLon
      expandedNE.lat   // maxLat
    ).subscribe({
      next: (geojson) => {
        console.log(`Loaded ${geojson.features.length} building features (cached area)`);

        // Remove existing buildings layer
        if (this.buildingsLayer) {
          this.map.removeLayer(this.buildingsLayer);
        }

        // Add new features to cache
        this.cachedBuildings = geojson.features;

        this.buildingsLayer = L.geoJSON(geojson, {
          style: () => {
            // All buildings rendered in the current color
            return { 
              color: this.buildingColor,
              fillColor: this.buildingColor,
              fillOpacity: 0.5,
              weight: 2 
            };
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const props = feature.properties;
              layer.bindPopup(`
                <strong>Building</strong><br>
                <strong>ID:</strong> ${props.referenceId || 'N/A'}<br>
                ${props.exposed ? '<strong>Status:</strong> Exposed' : ''}
              `);
            }
          }
        }).addTo(this.map);
      },
      error: (error) => {
        console.error('Error loading buildings:', error);
      }
    });
  }

  randomizeColor(): void {
    // Generate a random hex color
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    this.buildingColor = randomColor;
    
    // Reload buildings with new color if they're currently visible

      // Remove buildings layer
      if (this.buildingsLayer) {
        this.map.removeLayer(this.buildingsLayer);
        this.buildingsLayer = undefined;
      }

    if (this.showBuildings && this.buildingsLayer) {
      this.loadBuildingsInView();
    }
  }
}
