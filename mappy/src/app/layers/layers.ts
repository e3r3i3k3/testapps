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
import { GeoServerService, RasterLayerIbfName, VectorLayerIbfName } from '../../GeoServer.service';
import Overlay from 'ol/Overlay';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile.js';

import MVT from 'ol/format/MVT.js';
import { get as getProjection } from 'ol/proj.js';
import Icon from 'ol/style/Icon.js';
import Text from 'ol/style/Text.js';
import TileGrid from 'ol/tilegrid/TileGrid.js';



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
  private rasterLayerEth?: TileLayer<TileWMS>;
  private rasterLayerUga1?: TileLayer<TileWMS>;
  private rasterLayerUga2?: TileLayer<TileWMS>;
  private popup?: Overlay;
  selection = 2;
  showRoads = false;
  showBorders = false;
  showRasterLayerEth = false;
  showRasterLayerUga1 = false;
  showRasterLayerUga2 = false;

  private minZoomForRoads = 10;
  borderColor = '#00ff00';
  hue = 0;
  invert = 100;

  // Caching
  private loadedBounds?: [number, number, number, number];
  private cachedRoads: any[] = [];
  private loadedBordersBounds?: [number, number, number, number];
  private cachedBorders: any[] = [];

  constructor(private geoServerService: GeoServerService) { }

  ngAfterViewInit(): void {
    this.initMap();
    this.setupMapEventListeners();
    this.setupPopup();
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
        center: fromLonLat([34.0, 2.0]), // [longitude, latitude]
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
        url: this.geoServerService.getMvtUrl(VectorLayerIbfName.CountryBorders),
      }),
      style: new Style({
        stroke: new Stroke({ color: this.borderColor, width: 4 }),
        fill: new Fill({ color: this.borderColor + '80' })
      })
      //style: createMapboxStreetsV6Style(Style, Fill, Stroke, Icon, Text),
    });

    const builMVT = new VectorTileLayer({
      declutter: true,
        minZoom: 12, // Only show at zoom 10 and higher
        maxZoom: 20, // Hide at zoom levels above 20
      source: new VectorTileSource({

        attributions:
          'WbbbbWW',

        format: new MVT(),
        url: this.geoServerService.getMvtUrl(VectorLayerIbfName.UgandaBuildings),
      }),
      style: new Style({
        stroke: new Stroke({ color: this.borderColor, width: 1 }),
        fill: new Fill({ color: '#0088FF80' })
      })
      //style: createMapboxStreetsV6Style(Style, Fill, Stroke, Icon, Text),
    });

    // Add uganda roads layer (WFS with CQL filter for motorway and primary only)
    const roadsWFS = new VectorLayer({
      minZoom: 10, // Only show at zoom 10 and higher
      maxZoom: 20, // Hide at zoom levels above 20
      source: new VectorSource({
        format: new GeoJSON(),
        url: this.geoServerService.getWfsUrlWithFilter(
          VectorLayerIbfName.UgandaRoads,
          "fclass IN ('motorway','primary', 'secondary')"
        ),
      }),
      style: (feature) => {
        const highway = feature.get('fclass');
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

    this.map.addLayer(borderMVT);

    this.map.addLayer(roadsWFS);
    this.map.addLayer(builMVT);

    // Add WFS cropland layer
    //this.addCroplandWFSLayer();


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

    // Add click event listener for feature info
    this.map.on('click', (evt) => {
      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);

      if (feature && this.popup) {
        const properties = feature.getProperties();
        const content = this.formatFeatureInfo(properties);

        const popupElement = document.getElementById('popup-content');
        if (popupElement) {
          popupElement.innerHTML = content;
        }

        this.popup.setPosition(evt.coordinate);
      } else if (this.popup) {
        this.popup.setPosition(undefined);
      }
    });

    // Change cursor on hover
    this.map.on('pointermove', (evt) => {
      if (evt.dragging) {
        return;
      }
      const pixel = this.map.getEventPixel(evt.originalEvent);
      const hit = this.map.forEachFeatureAtPixel(pixel, () => true);
      const target = this.map.getTargetElement();
      if (target) {
        target.style.cursor = hit ? 'pointer' : '';
      }
    });
  }

  toggleRasterLayerEth(): void {
    this.showRasterLayerEth = !this.showRasterLayerEth;
    if (this.showRasterLayerEth) {
      this.rasterLayerEth = this.addGeoServerRasterLayer(RasterLayerIbfName.Eth11Flood);
    } else {
      if (this.rasterLayerEth) {
        this.map.removeLayer(this.rasterLayerEth);
        this.rasterLayerEth = undefined;
      }
    }
  }

  toggleRasterLayerUga1(): void {
    this.showRasterLayerUga1 = !this.showRasterLayerUga1;
    if (this.showRasterLayerUga1) {
      this.rasterLayerUga1 = this.addGeoServerRasterLayer(RasterLayerIbfName.UgaGrass);
    } else {
      if (this.rasterLayerUga1) {
        this.map.removeLayer(this.rasterLayerUga1);
        this.rasterLayerUga1 = undefined;
      }
    }
  }
  toggleRasterLayerUga2(): void {
    this.showRasterLayerUga2 = !this.showRasterLayerUga2;
    if (this.showRasterLayerUga2) {
      this.rasterLayerUga2 = this.addGeoServerRasterLayer(RasterLayerIbfName.UgaCrop);
    } else {
      if (this.rasterLayerUga2) {
        this.map.removeLayer(this.rasterLayerUga2);
        this.rasterLayerUga2 = undefined;
      }
    }
  }

  // must be applied before adding the layer to the map
  private ApplyRasterColoring(layer : TileLayer): void {

        // beforeoperations prerender postrender
    layer.on('prerender', (evt) => {
      // return
      if (evt.context) {
        const context = evt.context as CanvasRenderingContext2D;
        // context.filter = 'grayscale(80%) invert(100%) ';
        context.filter = `hue-rotate(${this.hue}deg) invert(${this.invert}%)`;
        context.globalCompositeOperation = 'source-over';
      }
    });


    layer.on('postrender', (evt) => {
      if (evt.context) {
        const context = evt.context as CanvasRenderingContext2D;
        context.filter = 'none';
      }
    });
  }



  private addGeoServerRasterLayer(layerSource: RasterLayerIbfName): TileLayer<TileWMS> {
    const layer = new TileLayer({
      source: new TileWMS({
        url: geoserverUrl,
        params: {
          'LAYERS': layerSource,
          'TILED': true
        },
        serverType: 'geoserver',
        transition: 0 // what is this?
        
      }),
      // background: '#ff00ff', // No alpha support, fills map with color
      opacity: 1
    });

    ///this.ApplyRasterColoring(layer);

    this.map.addLayer(layer);
    return layer;
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
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    this.borderColor = randomColor;

    if (this.bordersLayer) {
      this.map.removeLayer(this.bordersLayer);
      this.bordersLayer = undefined;
    }

    if (this.showBorders) {
      this.loadBordersInView();
    }
  }

  onHueChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.hue = parseInt(input.value);
    const output = document.getElementById('hueOut');
    if (output) {
      output.textContent = input.value;
    }
    this.map.render();
  }

  onInvertChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.invert = parseInt(input.value);
    const output = document.getElementById('invertOut');
    if (output) {
      output.textContent = input.value;
    }
    this.map.render();
  }


  private boundsContains(outer: [number, number, number, number], inner: number[]): boolean {
    return outer[0] <= inner[0] && outer[1] <= inner[1] &&
      outer[2] >= inner[2] && outer[3] >= inner[3];
  }

  private setupPopup(): void {
    const popupElement = document.getElementById('popup');
    if (popupElement) {
      this.popup = new Overlay({
        element: popupElement,
        autoPan: {
          animation: {
            duration: 250,
          },
        },
      });
      this.map.addOverlay(this.popup);

      // Close popup when clicking the close button
      const closer = document.getElementById('popup-closer');
      if (closer) {
        closer.onclick = () => {
          if (this.popup) {
            this.popup.setPosition(undefined);
          }
          closer.blur();
          return false;
        };
      }
    }
  }

  private formatFeatureInfo(properties: any): string {
    const excludeKeys = ['geometry', 'boundedBy'];
    let html = '<table style="width: 100%;">';

    let c = 3
    for (const key in properties) {
      if (excludeKeys.includes(key) || typeof properties[key] === 'object') {
        continue;
      }

      const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      html += `<tr><td style="padding: 4px 8px; font-weight: bold;">${displayKey}:</td><td style="padding: 4px 8px;">${properties[key]}</td></tr>`;

      c--;
      if (c <= 0) {
        break;
      }
    }

    html += '</table>';
    return html;
  }

  // DEBUG to compare WFS
  private addCroplandWFSLayer(): void {
    const minZoomForWFS = 10;
    
    // Check current zoom level
    const currentZoom = this.map.getView().getZoom() || 0;
    
    // Only load if already at appropriate zoom
    if (currentZoom >= minZoomForWFS) {
      this.loadRoadsWFSInView();
    }
    
    // Listen for map movement to load roads in view
    this.map.on('moveend', () => {
      const zoom = this.map.getView().getZoom() || 0;
      if (zoom >= minZoomForWFS) {
        this.loadRoadsWFSInView();
      }
    });
  }

  // DEBUG to compare WFS
  private roadsWFSLoaded = false;
  private roadsWFSLayer?: VectorLayer<VectorSource>;
  private loadedWFSBounds?: [number, number, number, number];

  // DEBUG to compare WFS
  private loadRoadsWFSInView(): void {
    const zoom = this.map.getView().getZoom() || 0;
    if (zoom < 10) {
      return;
    }

    const extent = this.map.getView().calculateExtent(this.map.getSize());
    const wgs84Extent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

    // Check if we already have this area loaded
    if (this.roadsWFSLayer && this.loadedWFSBounds && this.boundsContains(this.loadedWFSBounds, wgs84Extent)) {
      console.log('Using cached WFS roads');
      return;
    }

    const buffer = 0.5;
    const expandedBounds: [number, number, number, number] = [
      wgs84Extent[0] - (wgs84Extent[2] - wgs84Extent[0]) * buffer,
      wgs84Extent[1] - (wgs84Extent[3] - wgs84Extent[1]) * buffer,
      wgs84Extent[2] + (wgs84Extent[2] - wgs84Extent[0]) * buffer,
      wgs84Extent[3] + (wgs84Extent[3] - wgs84Extent[1]) * buffer
    ];

    this.loadedWFSBounds = expandedBounds;

    // WFS URL for roads layer
    const wfsUrl = 'http://localhost:8081/geoserver/ibf-system/wfs';
    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.0.0',
      request: 'GetFeature',
      typeName: 'ibf-system:gis_osm_roads_free_1',
      outputFormat: 'application/json',
      srsName: 'EPSG:4326',
      bbox: `${expandedBounds[0]},${expandedBounds[1]},${expandedBounds[2]},${expandedBounds[3]},EPSG:4326`
    });

    fetch(`${wfsUrl}?${params.toString()}`)
      .then(response => response.json())
      .then(geojson => {
        console.log(`Loaded ${geojson.features.length} WFS road features`);

        if (this.roadsWFSLayer) {
          this.map.removeLayer(this.roadsWFSLayer);
        }

        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(geojson, {
            featureProjection: 'EPSG:3857'
          })
        });

        this.roadsWFSLayer = new VectorLayer({
          source: vectorSource,
          minZoom: 10,
          style: new Style({
            stroke: new Stroke({
              color: 'magenta',
              width: 6
            })
          })
        });

        this.map.addLayer(this.roadsWFSLayer);
      })
      .catch(error => {
        console.error('Error loading WFS roads layer:', error);
      });
  }

  // =========================
  //=======================
  //const controlIds = ['hue', 'chroma', 'lightness'];
  //const controls : Map<string, string> = new Map();
}
