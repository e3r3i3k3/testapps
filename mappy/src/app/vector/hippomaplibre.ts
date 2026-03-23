import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { mapSources, superSecretApiKey } from '../../GeoServer.service';
import maplibregl, { Map, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
    MaplibreExportControl,
    Size,
    PageOrientation,
    Format,
    DPI
} from '@watergis/maplibre-gl-export';
import '@watergis/maplibre-gl-export/dist/maplibre-gl-export.css';

@Component({
    selector: 'app-hippomaplibre',
    imports: [],
    templateUrl: './hippomaplibre.html',
    styleUrl: '../../styles.css'
})
export class HippoMaplibreTest implements AfterViewInit, OnDestroy {
    private map!: Map;
    private popup!: Popup;
    private exportControl!: MaplibreExportControl;
    selection = 2;
    showPoints = false;
    showBorders = false;

    // example of results:
    // max size: 300kb
    // .0005 = 279kb
    // .001 = 188kb
    // .05 = 53kb
    // .01 = 30kb
    factor = 0.01;

    admnin0Factor = 0.010;
    admin1Factor = 0.010;
    admin2Factor = 0.005;
    admin3Factor = 0.004;

    glofasUriAll = 'http://localhost:9000/collections/public.glofas_stations/items?limit=10000';
    glofasUriFilter = 'http://localhost:9000/collections/public.glofas_stations/items?filter=country%3D%27ETH%27';

    borderUri = `http://localhost:9000/collections/public.admin_boundaries/items?filter=country=%27UG%27&limit=10000&transform=simplify,${this.factor}`;

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
        const styleUrl = `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`;

        this.popup = new Popup({
            closeButton: true,
            closeOnClick: false
        });

        this.map = new Map({
            container: 'map',
            style: styleUrl,
            center: [34.0, 2.0], // [longitude, latitude]
            zoom: 4,
            attributionControl: {},
            preserveDrawingBuffer: true // Required for canvas export to PDF/PNG
        } as maplibregl.MapOptions);

        this.map.on('load', () => {
            console.log('Map loaded');
            
            // Add export control from maplibre-gl-export
            this.exportControl = new MaplibreExportControl({
                PageSize: Size.A4,
                PageOrientation: PageOrientation.Landscape,
                Format: Format.PDF,
                DPI: DPI[96],
                Crosshair: true,
                PrintableArea: true,
                Local: 'en'
            });
            this.map.addControl(this.exportControl, 'top-right');

            // Add background image for the label
            const width = 120; // Enough for "sample map"
            const height = 40;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            
            // Draw yellow box with black border
            ctx.fillStyle = 'yellow';
            ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2; // Thicker border
            ctx.strokeRect(0, 0, width, height);

            this.map.addImage('yellow-box', canvas.getContext('2d')!.getImageData(0, 0, width, height));

            // Add source for the label
            this.updateLabelPosition();

            this.map.addLayer({
                id: 'sample-label',
                type: 'symbol',
                source: 'sample-label',
                layout: {
                    'text-field': 'sample map',
                    'text-size': 14,
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'icon-image': 'yellow-box',
                    'icon-allow-overlap': true,
                    'text-allow-overlap': true,
                    // Center text on icon
                    'icon-text-fit': 'none', 
                    // Or use icon-text-fit: both if using a small scalable image
                    'text-anchor': 'center'
                },
                paint: {
                    'text-color': 'black'
                }
            });

            // Update position on move
            this.map.on('move', () => this.updateLabelPosition());
            this.map.on('resize', () => this.updateLabelPosition());
        });

        // Add click handler for features
        this.map.on('click', (e) => {
            const features = this.map.queryRenderedFeatures(e.point, {
                layers: ['points-layer', 'borders-layer', 'borders-outline']
            });

            if (features && features.length > 0) {
                const feature = features[0];
                const properties = feature.properties || {};

                let html = '<div>';
                Object.keys(properties).slice(0, 5).forEach(key => {
                    const value = properties[key];
                    if (value !== undefined && value !== null && value !== '') {
                        html += `<div><strong>${key}:</strong> ${value}</div>`;
                    }
                });
                html += '</div>';

                this.popup
                    .setLngLat(e.lngLat)
                    .setHTML(html)
                    .addTo(this.map);
            }
        });

        // Change cursor on hover
        this.map.on('mousemove', (e) => {
            const features = this.map.queryRenderedFeatures(e.point, {
                layers: ['points-layer', 'borders-layer', 'borders-outline']
            });
            this.map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
        });
    }

    private updateLabelPosition(): void {
        if (!this.map) return;
        
        // Calculate bottom-left coordinate (20px from bottom, 20px from left)
        const canvas = this.map.getCanvas();
        const padding = 20;
        // MapLibre coordinates: [x, y], where (0,0) is top-left
        const point = this.map.unproject([padding + 60, canvas.height - padding - 20]); 
        // +60 and -20 because anchor is center, and box is 120x40 (so 60x20 is half)
        
        const sourceData = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [point.lng, point.lat]
                    },
                    properties: {}
                }
            ]
        };

        const source = this.map.getSource('sample-label') as maplibregl.GeoJSONSource;
        if (source) {
            source.setData(sourceData as any);
        } else {
            this.map.addSource('sample-label', {
                type: 'geojson',
                data: sourceData as any
            });
        }
    }

    togglePoints(): void {
        this.showPoints = !this.showPoints;
        if (this.showPoints) {
            // Add GeoJSON source for points
            if (!this.map.getSource('points-source')) {
                this.map.addSource('points-source', {
                    type: 'geojson',
                    data: this.glofasUriAll
                });
            }

            // Add points layer
            if (!this.map.getLayer('points-layer')) {
                this.map.addLayer({
                    id: 'points-layer',
                    type: 'circle',
                    source: 'points-source',
                    paint: {
                        'circle-radius': 6,
                        'circle-color': '#FF1493', // Pink color
                        'circle-stroke-color': '#C71585', // Darker pink border
                        'circle-stroke-width': 2
                    }
                });
            }
        } else {
            // Remove points layer
            if (this.map.getLayer('points-layer')) {
                this.map.removeLayer('points-layer');
            }
            if (this.map.getSource('points-source')) {
                this.map.removeSource('points-source');
            }
        }
    }

    toggleBorders(): void {
        this.showBorders = !this.showBorders;
        if (this.showBorders) {
            // Add GeoJSON source for borders
            if (!this.map.getSource('borders-source')) {
                this.map.addSource('borders-source', {
                    type: 'geojson',
                    data: this.borderUri
                });
            }

            // Add borders fill layer
            if (!this.map.getLayer('borders-layer')) {
                this.map.addLayer({
                    id: 'borders-layer',
                    type: 'fill',
                    source: 'borders-source',
                    paint: {
                        'fill-color': 'rgba(87, 152, 227, 0.84)',
                        'fill-outline-color': '#fc1de6'
                    }
                });
            }

            // Add borders outline layer for better visibility
            if (!this.map.getLayer('borders-outline')) {
                this.map.addLayer({
                    id: 'borders-outline',
                    type: 'line',
                    source: 'borders-source',
                    paint: {
                        'line-color': '#fc1de6',
                        'line-width': 1
                    }
                });
            }
        } else {
            // Remove borders layers
            if (this.map.getLayer('borders-outline')) {
                this.map.removeLayer('borders-outline');
            }
            if (this.map.getLayer('borders-layer')) {
                this.map.removeLayer('borders-layer');
            }
            if (this.map.getSource('borders-source')) {
                this.map.removeSource('borders-source');
            }
        }
    }
}
