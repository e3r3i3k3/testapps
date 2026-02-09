
import { AfterViewInit, Component } from '@angular/core';
import { View } from 'ol';
import Mapp from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import { TileWMS, XYZ } from 'ol/source';
import RasterSource from 'ol/source/Raster.js';
import Static from 'ol/source/ImageStatic';
import { attributions, GeoServerService, geoserverUrl, mapSources, RasterLayerIbfName, superSecretApiKey, VectorLayerIbfName } from '../../GeoServer.service';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import Attribution from 'ol/control/Attribution.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import 'ol/ol.css';
import { apply } from 'ol-mapbox-style';
import Overlay from 'ol/Overlay.js';


@Component({
    selector: 'app-maptiler',
    imports: [],
    templateUrl: './maptiler.html',
    styleUrl: '../../styles.css'
})
export class MaptilerTest implements AfterViewInit {
    private map!: Mapp;
    private popup!: Overlay;
    private rasterLayerEth?: TileLayer<TileWMS>;
    showRasterLayerEth = false;
    private rasterLayerZmb?: TileLayer<TileWMS>;
    showRasterLayerZmb = false;
    private populationPngLayer?: ImageLayer<RasterSource>;
    showPopulationPng = false;
    private staticPngLayer?: ImageLayer<Static>;
    showStaticPng = false;
    thresholdValue = 0.1;
    private rasterSource?: RasterSource;

    constructor(private geoServerService: GeoServerService) { }

    ngAfterViewInit(): void {
        this.initMap();
    }

    private initMap(): void {
        const key = superSecretApiKey;
        // Options: basic-v2 (smallest), streets-v2, outdoor-v2, dataviz, topo-v4
        const dataJson = `https://api.maptiler.com/maps/basic-v2/style.json?key=${key}`;
        const dataJson_new = `https://api.maptiler.com/maps/019c41d2-17c7-7e5e-9a47-d3b3f9515a5b/style.json?key=${key}`;
        
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
        };/*
        
        const map = new ol.Map({
    target: 'map',
    layers: [imageLayer],
    view: new ol.View({
      projection: 'pixel',
      center: ol.extent.getCenter(extent),
      zoom: 2,
      extent: extent
    })
  });
  */

        this.map = new Mapp({
            target: 'map',
            controls: defaultControls({ attribution: false }).extend([attribution]),
            overlays: [this.popup],
            view: new View({
                constrainResolution: true,
                center: fromLonLat([0, 0]),
                zoom: 1
            })
        });
        
        const mapElement = this.map.getTargetElement();

        // Non-edited sytle
        //  apply(this.map, styleJson);
        
        // Fetch and customize the style
        fetch(dataJson)
            .then(response => response.json())
            .then(style => {
                console.log('Style sources:', Object.keys(style.sources || {}));
                console.log('Available layers:', style.layers.map((l: any) => ({
                    id: l.id,
                    sourceLayer: l['source-layer'],
                    type: l.type,
                    source: l.source
                })));
                
                
                // Find the actual source name used by boundary layers
                const boundaryLayer = style.layers.find((l: any) => l['source-layer'] === 'boundary');
                const sourceName = boundaryLayer ? boundaryLayer.source : 'maptiler_planet';
                
                // Add custom layer for Uganda admin level 1 areas - boundary is a line layer
                style.layers.push({
                    'id': 'bbbbbb',
                    'type': 'line',
                    'source': sourceName,
                    'source-layer': 'boundary',
                    'paint': {
                        'line-color': '#7373a2',
                        'line-width': 1,
                        'line-opacity': 0.8
                    }
                });
                
                // Apply the modified style
                apply(this.map, style);
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
            this.rasterLayerEth = this.addGeoServerRasterLayer(RasterLayerIbfName.EthPopulation);
        } else {
            if (this.rasterLayerEth) {
                this.map.removeLayer(this.rasterLayerEth);
                this.rasterLayerEth = undefined;
            }
        }
    }

    toggleRasterLayerZmb(): void {
        this.showRasterLayerZmb = !this.showRasterLayerZmb;
        if (this.showRasterLayerZmb) {
            this.rasterLayerZmb = this.addGeoServerRasterLayer(RasterLayerIbfName.ZmbFlood);
        } else {
            if (this.rasterLayerZmb) {
                this.map.removeLayer(this.rasterLayerZmb);
                this.rasterLayerZmb = undefined;
            }
        }
    }

    togglePopulationPng(): void {
        this.showPopulationPng = !this.showPopulationPng;
        if (this.showPopulationPng) {
            this.populationPngLayer = this.addStaticImageLayer();
        } else {
            if (this.populationPngLayer) {
                this.map.removeLayer(this.populationPngLayer);
                this.populationPngLayer = undefined;
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


    private addStaticImageLayer(): ImageLayer<RasterSource> {
        // Image bounds in EPSG:4326 (WGS84)
        const bounds = [32.99874987166672, 3.324583523068185, 47.98208314506672, 14.899583476768186];
        
        // Create the base static image source
        const staticSource = new Static({
            // 
            // url: 'image/eth_pd_2020_1km_UNadj_c0a.png',
            // url: 'image/eth_pd_2020_1km_UNadj_c0acol.png',
            url: 'image/eth_pd_2020_1km_UNadj0.png',
            imageExtent: bounds,
            projection: 'EPSG:4326',
            interpolate: false // Disable interpolation for crisp pixels
        });

        // Create a raster source with a color gradient shader
        this.rasterSource = new RasterSource({
            sources: [staticSource],
            operation: (pixels, data) => {
                // pixels is an array of pixel arrays from each source
                const pixel = pixels[0];
                
                // Check if pixel is an array, return magenta if not
                if (!Array.isArray(pixel)) {
                    return [255, 0, 255, 255]; // Magenta
                }
                
                // Get the grayscale value (normalized 0-1)
                // Assuming the image is grayscale or we use the R channel
                let value = pixel[0] / 255;

                const threshold = 0.628;// data starts at A0, so 160. 
                // const threshold = data.threshold || 0.1;

                value = (value - threshold) / (1 - threshold); // Normalize to 0-1 for values between 0.6 and 1.0

                if (value < 0) {
                    return [0,0,0,0]; // Transparent for very low values
                }

                
                const color0 = [100, 150, 255];
                const color1 = [255, 55, 0];
                const color2 = [255, 0, 0];
                
                // Interpolate between 3 colors: color0 -> color1 (middle) -> color2
                let r, g, b;
                if (value < 0.5) {
                    // Interpolate between color0 and color1
                    const t = value * 2; // Normalize to 0-1 for first half
                    r = color0[0] + (color1[0] - color0[0]) * t;
                    g = color0[1] + (color1[1] - color0[1]) * t;
                    b = color0[2] + (color1[2] - color0[2]) * t;
                } else {
                    // Interpolate between color1 and color2
                    const t = (value - 0.5) * 2; // Normalize to 0-1 for second half
                    r = color1[0] + (color2[0] - color1[0]) * t;
                    g = color1[1] + (color2[1] - color1[1]) * t;
                    b = color1[2] + (color2[2] - color1[2]) * t;
                }
                
                // Return RGBA
                return [r, g, b, pixel[3]];
            },
            lib: {
                threshold: this.thresholdValue
            }
        });
        
        // Disable interpolation on the raster source's internal context
        this.rasterSource.on('beforeoperations', (event: any) => {

            event.data.threshold = this.thresholdValue;

        });

        const imageLayer = new ImageLayer({
            source: this.rasterSource,
            opacity: 0.7
        });
        

        this.map.addLayer(imageLayer);
        return imageLayer;
    }




    toggleStaticPng(): void {
        this.showStaticPng = !this.showStaticPng;
        if (this.showStaticPng) {
            this.staticPngLayer = this.addStaticImageLayerPlain();
        } else {
            if (this.staticPngLayer) {
                this.map.removeLayer(this.staticPngLayer);
                this.staticPngLayer = undefined;
            }
        }
    }

    private addStaticImageLayerPlain(): ImageLayer<Static> {
        // Image bounds in EPSG:4326 (WGS84)
        const bounds = [21.998751327743022, -18.077933333316892, 33.70958469341794, -8.202933333325873];
        
        const imageLayer = new ImageLayer({
            source: new Static({

            // url: 'image/eth_pd_2020_1km_UNadj_c0a.png',
            //url: 'image/eth_pd_2020_1km_UNadj_c0acol.png',
            //url: 'image/eth_pd_2020_1km_UNadj0.png',
            url: 'image/flood_map_ZMB_RP20_c0.png',
                imageExtent: bounds,
                projection: 'EPSG:4326',
                interpolate: false // Disable interpolation for crisp pixels
            }),
            opacity: 0.7,
        });

        this.map.addLayer(imageLayer);
        return imageLayer;
    }


    onThresholdChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.thresholdValue = parseFloat(target.value);


        const output = document.getElementById('thresholdOut');
        if (output) {
            output.textContent = target.value;
        }
        this.rasterSource?.changed();
    }

}
