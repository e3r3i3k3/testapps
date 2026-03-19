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

    borderUri = `http://localhost:9000/collections/public.admin_boundaries/items?filter=country=%27UGA%27%20AND%20admin_level=%27adm3%27&limit=10000&transform=simplify,${this.factor}`;

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

    exportToPdf(): void {
        // The export control button should be in the top-right corner of the map
        // This function clicks it programmatically
        const exportBtn = document.querySelector('.maplibregl-ctrl-top-right button') as HTMLButtonElement;
        if (exportBtn) {
            exportBtn.click();
        }
    }
}
