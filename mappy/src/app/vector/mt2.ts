
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
import { fromLonLat } from 'ol/proj';
import Map from 'ol/Map.js';
import Attribution from 'ol/control/Attribution.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import 'ol/ol.css';
import { apply } from 'ol-mapbox-style';
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
        // Options: basic-v2 (smallest), streets-v2, outdoor-v2, dataviz, topo-v4
        const styleJson = `https://api.maptiler.com/maps/basic-v2/style.json?key=${key}`;
        const rcLocJson = `https://api.maptiler.com/data/019c1eeb-1338-7d60-aa4f-ecb1f4e2204e/features.json?key=${key}`;

        
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

        this.map = new Map({
            target: 'map',
            controls: defaultControls({ attribution: false }).extend([attribution]),
            overlays: [this.popup],
            view: new View({
                constrainResolution: true,
                center: fromLonLat([0, 0]),
                zoom: 1
            })
        });

        // Non-edited sytle
        //  apply(this.map, styleJson);
        
        // Fetch and customize the style
        fetch(styleJson)
            .then(response => response.json())
            .then(style => {
                console.log('Style sources:', Object.keys(style.sources || {}));
                console.log('Available layers:', style.layers.map((l: any) => ({
                    id: l.id,
                    sourceLayer: l['source-layer'],
                    type: l.type,
                    source: l.source
                })));
                
                
                // Apply the modified style
                apply(this.map, style);
                
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
            })
            .catch(error => {
                console.error('Error loading style:', error);
            });

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
