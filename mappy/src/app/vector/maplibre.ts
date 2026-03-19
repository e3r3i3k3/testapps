
import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { GeoServerService, geoserverUrl, RasterLayerIbfName, superSecretApiKey } from '../../GeoServer.service';
import maplibregl, { Map, Popup, LngLatBoundsLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function Lerp(a: number[], b: number[], t: number): number[] {
    const output = [];
    for (let i = 0; i < a.length; i++) {
        let aVal = a[i];
        let bVal = (b[i] - a[i]) * t;
        output.push(aVal + bVal);
    }
    return output;
}

@Component({
    selector: 'app-maplibre',
    imports: [],
    templateUrl: './maplibre.html',
    styleUrl: '../../styles.css'
})
export class MaplibreTest implements AfterViewInit, OnDestroy {
    private map!: Map;
    private popup!: Popup;
    
    showRasterLayerEth = false;
    showRasterLayerZmb = false;
    showPopulationPng = false;
    showPng2 = false;
    showStaticPng = false;
    thresholdValue = 0.1;
    
    // Canvas elements for custom raster processing
    private populationCanvas?: HTMLCanvasElement;
    private png2Canvas?: HTMLCanvasElement;

    constructor(private geoServerService: GeoServerService) { }

    ngAfterViewInit(): void {
        this.initMap();
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
        }
    }

    private initMap(): void {
        const key = superSecretApiKey;
        // Options: basic-v2 (smallest), streets-v2, outdoor-v2, dataviz, topo-v4
        const styleUrl = `https://api.maptiler.com/maps/basic-v2/style.json?key=${key}`;

        // Create popup
        this.popup = new Popup({
            closeButton: true,
            closeOnClick: false
        });

        this.map = new Map({
            container: 'map',
            style: styleUrl,
            center: [0, 0],
            zoom: 1,
            minZoom: 2,
            maxZoom: 20,
            attributionControl: {}
        });

        this.map.on('load', () => {
            console.log('Map loaded');
            
            // Log style info for debugging
            const style = this.map.getStyle();
            console.log('Style sources:', Object.keys(style?.sources || {}));
            console.log('Available layers:', style?.layers?.map((l: any) => ({
                id: l.id,
                sourceLayer: l['source-layer'],
                type: l.type,
                source: l.source
            })));
        });

        // Add click handler for features
        this.map.on('click', (e) => {
            const features = this.map.queryRenderedFeatures(e.point);
            
            if (features && features.length > 0) {
                const feature = features[0];
                const properties = feature.properties || {};
                
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
                
                this.popup
                    .setLngLat(e.lngLat)
                    .setHTML(html)
                    .addTo(this.map);
            } else {
                this.popup.remove();
            }
        });

        // Change cursor on hover over features
        this.map.on('mousemove', (e) => {
            const features = this.map.queryRenderedFeatures(e.point);
            this.map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
        });
    }

    toggleRasterLayerEth(): void {
        this.showRasterLayerEth = !this.showRasterLayerEth;
        if (this.showRasterLayerEth) {
            this.addGeoServerRasterLayer('geoserver-eth', RasterLayerIbfName.EthPopulation);
        } else {
            this.removeLayerAndSource('geoserver-eth');
        }
    }

    toggleRasterLayerZmb(): void {
        this.showRasterLayerZmb = !this.showRasterLayerZmb;
        if (this.showRasterLayerZmb) {
            this.addGeoServerRasterLayer('geoserver-zmb', RasterLayerIbfName.ZmbFlood);
        } else {
            this.removeLayerAndSource('geoserver-zmb');
        }
    }

    togglePopulationPng(): void {
        this.showPopulationPng = !this.showPopulationPng;
        if (this.showPopulationPng) {
            this.addStaticImageLayer();
        } else {
            this.removeLayerAndSource('population-png');
            if (this.populationCanvas) {
                this.populationCanvas = undefined;
            }
        }
    }

    togglePng2(): void {
        this.showPng2 = !this.showPng2;
        if (this.showPng2) {
            this.addStaticImageLayer2();
        } else {
            this.removeLayerAndSource('flood-png');
            if (this.png2Canvas) {
                this.png2Canvas = undefined;
            }
        }
    }

    private removeLayerAndSource(id: string): void {
        if (this.map.getLayer(id)) {
            this.map.removeLayer(id);
        }
        if (this.map.getSource(id)) {
            this.map.removeSource(id);
        }
    }

    private addGeoServerRasterLayer(id: string, layerSource: RasterLayerIbfName): void {
        // Build WMS tile URL for MapLibre
        const wmsUrl = `${geoserverUrl}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=${layerSource}&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`;
        
        this.map.addSource(id, {
            type: 'raster',
            tiles: [wmsUrl],
            tileSize: 256
        });

        this.map.addLayer({
            id: id,
            type: 'raster',
            source: id,
            paint: {
                'raster-opacity': 0.7
            }
        });
    }

    private addStaticImageLayer(): void {
        // Image bounds in EPSG:4326 (WGS84) [minLon, minLat, maxLon, maxLat]
        const bounds: LngLatBoundsLike = [
            [32.99874987166672, 3.324583523068185],   // SW
            [47.98208314506672, 14.899583476768186]  // NE
        ];
        
        // Load and process the image with color gradient shader
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = 'image/eth_pd_2020_1km_UNadj0.png';
        
        img.onload = () => {
            // Create canvas and apply shader
            this.populationCanvas = document.createElement('canvas');
            this.populationCanvas.width = img.width;
            this.populationCanvas.height = img.height;
            const ctx = this.populationCanvas.getContext('2d')!;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;
            
            // Apply color gradient shader
            for (let i = 0; i < data.length; i += 4) {
                let value = data[i] / 255;
                const threshold = 0.628; // data starts at A0, so 160
                value = (value - threshold) / (1 - threshold);
                
                if (value < 0) {
                    data[i + 3] = 0; // Transparent for very low values
                    continue;
                }
                
                const color0 = [100, 150, 255];
                const color1 = [255, 55, 0];
                const color2 = [255, 0, 0];
                
                let r, g, b;
                if (value < 0.5) {
                    const t = value * 2;
                    r = color0[0] + (color1[0] - color0[0]) * t;
                    g = color0[1] + (color1[1] - color0[1]) * t;
                    b = color0[2] + (color1[2] - color0[2]) * t;
                } else {
                    const t = (value - 0.5) * 2;
                    r = color1[0] + (color2[0] - color1[0]) * t;
                    g = color1[1] + (color2[1] - color1[1]) * t;
                    b = color1[2] + (color2[2] - color1[2]) * t;
                }
                
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // Add the processed image as a source
            this.map.addSource('population-png', {
                type: 'image',
                url: this.populationCanvas.toDataURL(),
                coordinates: [
                    [32.99874987166672, 14.899583476768186],  // top-left
                    [47.98208314506672, 14.899583476768186],  // top-right
                    [47.98208314506672, 3.324583523068185],   // bottom-right
                    [32.99874987166672, 3.324583523068185]    // bottom-left
                ]
            });

            this.map.addLayer({
                id: 'population-png',
                type: 'raster',
                source: 'population-png',
                paint: {
                    'raster-opacity': 0.7
                }
            });
        };
    }

    private addStaticImageLayer2(): void {
        // Image bounds in EPSG:4326 (WGS84)
        const bounds: LngLatBoundsLike = [
            [21.998751327743022, -18.077933333316892],  // SW
            [33.70958469341794, -8.202933333325873]     // NE
        ];
        
        // Load and process the image with color gradient shader
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = 'image/flood_map_ZMB_RP20_f16.png';
        
        img.onload = () => {
            this.png2Canvas = document.createElement('canvas');
            this.png2Canvas.width = img.width;
            this.png2Canvas.height = img.height;
            const ctx = this.png2Canvas.getContext('2d')!;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0);
            
            this.applyFloodShader();
            
            // Add the processed image as a source
            this.map.addSource('flood-png', {
                type: 'image',
                url: this.png2Canvas.toDataURL(),
                coordinates: [
                    [21.998751327743022, -8.202933333325873],   // top-left
                    [33.70958469341794, -8.202933333325873],    // top-right
                    [33.70958469341794, -18.077933333316892],   // bottom-right
                    [21.998751327743022, -18.077933333316892]   // bottom-left
                ]
            });

            this.map.addLayer({
                id: 'flood-png',
                type: 'raster',
                source: 'flood-png',
                paint: {
                    'raster-opacity': 0.7
                }
            });
        };
    }

    private applyFloodShader(): void {
        if (!this.png2Canvas) return;
        
        const ctx = this.png2Canvas.getContext('2d')!;
        const imageData = ctx.getImageData(0, 0, this.png2Canvas.width, this.png2Canvas.height);
        const data = imageData.data;
        
        const color0 = [255, 255, 50, 150];
        const color1 = [255, 0, 0, 255];
        const color2 = [50, 0, 255, 255];
        
        for (let i = 0; i < data.length; i += 4) {
            let value = data[i] / 255;
            value = value * 10 * this.thresholdValue;
            value = Math.min(value, 1);
            value = Math.max(value, 0);
            
            if (value < 0.00001) {
                data[i + 3] = 0; // Transparent for very low values
                continue;
            }
            
            let output: number[];
            if (value <= 0.5) {
                const t = value * 2;
                output = Lerp(color0, color1, t);
            } else {
                const t = (value - 0.5) * 2;
                output = Lerp(color1, color2, t);
            }
            
            data[i] = output[0];
            data[i + 1] = output[1];
            data[i + 2] = output[2];
            data[i + 3] = output[3];
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    toggleStaticPng(): void {
        this.showStaticPng = !this.showStaticPng;
        if (this.showStaticPng) {
            this.addStaticImageLayerPlain();
        } else {
            this.removeLayerAndSource('static-png');
        }
    }

    private addStaticImageLayerPlain(): void {
        // Bounds in EPSG:4326 for MapLibre (using the WGS84 coordinates for Zambia)
        // Original EPSG:3857 bounds: [2448889.795892204, -2046712.1534877932, 3752503.10182657, -916281.9228305662]
        // Converted to EPSG:4326: approximately [22.0, -18.08, 33.71, -8.20]
        
        this.map.addSource('static-png', {
            type: 'image',
            url: 'image/flood_map_ZMB_RP20_c0_b3857.png',
            coordinates: [
                [21.998751327743022, -8.202933333325873],   // top-left
                [33.70958469341794, -8.202933333325873],    // top-right
                [33.70958469341794, -18.077933333316892],   // bottom-right
                [21.998751327743022, -18.077933333316892]   // bottom-left
            ]
        });

        this.map.addLayer({
            id: 'static-png',
            type: 'raster',
            source: 'static-png',
            paint: {
                'raster-opacity': 0.7
            }
        });
    }

    onThresholdChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.thresholdValue = parseFloat(target.value);

        const output = document.getElementById('thresholdOut');
        if (output) {
            output.textContent = target.value;
        }
        
        // Re-apply shader if the flood layer is visible
        if (this.showPng2 && this.png2Canvas) {
            // Reload the original image and reapply shader
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = 'image/flood_map_ZMB_RP20_f16.png';
            
            img.onload = () => {
                const ctx = this.png2Canvas!.getContext('2d')!;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0);
                
                this.applyFloodShader();
                
                // Update the source with new processed image
                const source = this.map.getSource('flood-png') as maplibregl.ImageSource;
                if (source) {
                    source.updateImage({
                        url: this.png2Canvas!.toDataURL(),
                        coordinates: [
                            [21.998751327743022, -8.202933333325873],
                            [33.70958469341794, -8.202933333325873],
                            [33.70958469341794, -18.077933333316892],
                            [21.998751327743022, -18.077933333316892]
                        ]
                    });
                }
            };
        }
    }
}
