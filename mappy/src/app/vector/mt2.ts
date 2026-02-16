
import { AfterViewInit, Component } from '@angular/core';
import { View } from 'ol';
import Mapp from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import { TileWMS, XYZ } from 'ol/source';
import RasterSource from 'ol/source/Raster.js';
import { attributions, GeoServerService, geoserverUrl, mapSources, RasterLayerIbfName, superSecretApiKey, VectorLayerIbfName } from '../../GeoServer.service';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { fromLonLat } from 'ol/proj';
import Map from 'ol/Map.js';
import Attribution from 'ol/control/Attribution.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import 'ol/ol.css';
import Overlay from 'ol/Overlay.js';
import GeoJSON from 'ol/format/GeoJSON';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';


@Component({
    selector: 'app-maptiler2',
    imports: [],
    templateUrl: './mt2.html',
    styleUrl: '../../styles.css'
})
export class MaptilerTest2 implements AfterViewInit {
    private map!: Map;
    private popup!: Overlay;
    private rasterLayerEth?: TileLayer<TileWMS>;
    showRasterLayerEth = false;

    constructor(private geoServerService: GeoServerService) { }

    ngAfterViewInit(): void {
        this.initMap();
    }

    private initMap(): void {
        const key = superSecretApiKey;
        const rcLocJson = `https://api.maptiler.com/data/019c1eeb-1338-7d60-aa4f-ecb1f4e2204e/features.json?key=${key}`;
        const maptilerUrl = `https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key=${key}`;
        const simplerUrl =  `https://api.maptiler.com/tiles/019c41d2-17c7-7e5e-9a47-d3b3f9515a5b/{z}/{x}/{y}.pbf?key=${key}`;

        const attribution = new Attribution({
            collapsible: false,
        });

        // Create popup overlay
        const container = document.getElementById('popup')!;
        const content = document.getElementById('popup-content')!;
        const closer = document.getElementById('popup-closer')!;

        this.popup = new Overlay({
            element: container,
            autoPan: {
                animation: {
                    duration: 250,
                },
            },
        });

        closer.onclick = () => {
            this.popup.setPosition(undefined);
            closer.blur();
            return false;
        };

        // Create MVT base layer directly
        const mvtLayer = new VectorTileLayer({
            background: '#e6e38b',
            source: new VectorTileSource({
                format: new MVT(),
                url: maptilerUrl,
                maxZoom: 2
            }),
            // Basic styling - check geometry type
            style: (feature) => {
                const geometryType = feature.getGeometry()?.getType();
                const classType = feature.get('class');
                
                if (classType === 'ocean') {
                    return new Style({
                        fill: new Fill({
                            color: 'rgba(87, 152, 227, 0.84)'
                        }),
                        stroke: new Stroke({
                            color: '#fc1de6',
                            width: 1
                        })
                    });
                }                 else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
                    return new Style({
                        fill: new Fill({
                            color: 'rgba(87, 255, 221, 0.37)'
                        }),
                        stroke: new Stroke({
                            color: '#515151',
                            width: 1
                        })
                    });
                } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
                    return new Style({
                        stroke: new Stroke({
                            color: '#319FD3',
                            width: 1
                        })
                    });
                } else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
                    
                    return new Style({
                        fill: new Fill({
                            color: 'rgba(31, 255, 1, 0.55)'
                        }),
                        stroke: new Stroke({
                            color: '#1810ff',
                            width: 1
                        })
                    });
                } else {
                    return new Style({
                        fill: new Fill({
                            color: 'rgba(255, 213, 45, 0.65)'
                        }),
                        stroke: new Stroke({
                            color: '#ff5d5d',
                            width: 1
                        })
                    });
                }
            }
        });

        this.map = new Map({
            target: 'map',
            layers: [mvtLayer],
            controls: defaultControls({ attribution: false }).extend([attribution]),
            overlays: [this.popup],
            view: new View({
                constrainResolution: true,
                center: fromLonLat([0, 0]),
                zoom: 1
            })
        });

        // Add Red Cross locations layer
        const rcLayer = new VectorLayer({
            source: new VectorSource({
                url: rcLocJson,
                format: new GeoJSON(),
            }),
            style: new Style({
                image: new CircleStyle({
                    radius: 6,
                    fill: new Fill({
                        color: '#FF1493', // Pink color
                    }),
                    stroke: new Stroke({
                        color: '#C71585', // Darker pink border
                        width: 2,
                    }),
                }),
            }),
        });
        
        this.map.addLayer(rcLayer);

        // Add click handler
        this.map.on('click', (evt) => {
            const features = this.map.getFeaturesAtPixel(evt.pixel);
            
            if (features && features.length > 0) {
                const feature = features[0];
                const properties = feature.getProperties();
                
                // Get up to 3 properties to display
                const propertyKeys = Object.keys(properties).filter(key => 
                    key !== 'geometry' && key !== 'layer'
                ).slice(0, 3);
                
                let html = '<div style="font-size: 14px;">';
                
                if (propertyKeys.length > 0) {
                    propertyKeys.forEach(key => {
                        const value = properties[key];
                        if (value !== undefined && value !== null && value !== '') {
                            html += `<div style="margin-bottom: 5px;"><strong>${key}:</strong> ${value}</div>`;
                        }
                    });
                } else {
                    html += '<div>No properties available</div>';
                }
                
                html += '</div>';
                content.innerHTML = html;
                this.popup.setPosition(evt.coordinate);
            } else {
                this.popup.setPosition(undefined);
            }
        });

        // Change cursor on hover
        this.map.on('pointermove', (evt) => {
            const pixel = this.map.getEventPixel(evt.originalEvent);
            const hit = this.map.hasFeatureAtPixel(pixel);
            this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
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

    private addGeoServerRasterLayer(layerSource: RasterLayerIbfName): TileLayer<TileWMS> {
        const layer = new TileLayer({
            source: new TileWMS({
                url: geoserverUrl,
                params: {
                    'LAYERS': layerSource,
                    'TILED': true
                },
                serverType: 'geoserver',
                transition: 0
            }),
            opacity: 0.7
        });

        this.map.addLayer(layer);
        return layer;
    }

}
