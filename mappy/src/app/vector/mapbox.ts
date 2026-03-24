const mapboxApiKey = `aaa`;

import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GeoServerService, geoserverUrl, RasterLayerIbfName } from '../../GeoServer.service';

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
    selector: 'app-mapbox',
    imports: [],
    templateUrl: './mapbox.html',
    styleUrl: '../../styles.css'
})
export class MapboxTest implements AfterViewInit, OnDestroy {
    private map!: mapboxgl.Map;
    private popup!: mapboxgl.Popup;

    showRasterLayerEth = false;
    showRasterLayerZmb = false;
    showPopulationPng = false;
    showPng2 = false;
    showStaticPng = false;
    showBorders = false;
    thresholdValue = 0.1;
    factor = 0.01;

    borderUri = `http://localhost:9000/collections/public.admin_boundaries/items?filter=country=%27UG%27&limit=10000&transform=simplify,${this.factor}`;

    private populationCanvas?: HTMLCanvasElement;
    private png2Canvas?: HTMLCanvasElement;

    constructor(private geoServerService: GeoServerService) {}

    ngAfterViewInit(): void {
        this.initMap();
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
        }
    }

    private initMap(): void {
        (mapboxgl as any).accessToken = mapboxApiKey;

        this.popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false
        });

        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [0, 0],
            zoom: 1,
            minZoom: 2,
            maxZoom: 20,
            preserveDrawingBuffer: true // Required for canvas export
        });

        this.map.on('load', () => {
            console.log('Map loaded');
        });

        // Add click handler for features
        this.map.on('click', (e) => {
            const features = this.map.queryRenderedFeatures(e.point);

            if (features && features.length > 0) {
                const feature = features[0];
                const properties = feature.properties || {};

                const propertyKeys = Object.keys(properties)
                    .filter((key) => key !== 'geometry' && key !== 'layer')
                    .slice(0, 3);

                let html = '<div style="font-size: 14px;">';

                if (propertyKeys.length > 0) {
                    propertyKeys.forEach((key) => {
                        const value = properties[key];
                        if (value !== undefined && value !== null && value !== '') {
                            html += `<div style="margin-bottom: 5px;"><strong>${key}:</strong> ${value}</div>`;
                        }
                    });
                } else {
                    html += '<div>No properties available</div>';
                }

                html += '</div>';

                this.popup.setLngLat(e.lngLat).setHTML(html).addTo(this.map);
            } else {
                this.popup.remove();
            }
        });

        // Change cursor on hover
        this.map.on('mousemove', (e) => {
            const features = this.map.queryRenderedFeatures(e.point);
            this.map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
        });
    }

    exportPdf(): void {
        const mapContainer = document.getElementById('map');
        const greenBox = document.getElementById('green-box-mapbox');

        if (!mapContainer || !mapContainer.parentElement || !greenBox) {
            console.error('Elements not found');
            return;
        }

        const pdfWidth = 297;
        const pdfHeight = 210;
        const pdf = new jsPDF('landscape', 'mm', 'a4');

        const exportContainer = mapContainer.parentElement;

        html2canvas(exportContainer, {
            useCORS: true,
            allowTaint: false,
            ignoreElements: (element) => {
                return element.classList.contains('mapboxgl-control-container');
            },
            onclone: (clonedDoc) => {
                const clonedMapContainer = clonedDoc.getElementById('map');
                if (clonedMapContainer) {
                    const clonedCanvas = clonedMapContainer.querySelector('canvas');
                    if (clonedCanvas) {
                        try {
                            const img = clonedDoc.createElement('img');
                            img.src = this.map.getCanvas().toDataURL('image/png');
                            img.style.width = '100%';
                            img.style.height = '100%';
                            img.style.position = 'absolute';
                            img.style.left = '0';
                            img.style.top = '0';
                            img.style.objectFit = 'contain';
                            clonedCanvas.parentNode?.replaceChild(img, clonedCanvas);
                        } catch (e) {
                            console.error('Error replacing canvas with image:', e);
                        }
                    }
                }
            }
        }).then(mapCanvas => {
            const mapImgData = mapCanvas.toDataURL('image/png');
            const mapProps = pdf.getImageProperties(mapImgData);
            const mapHeight = (mapProps.height * pdfWidth) / mapProps.width;

            pdf.addImage(mapImgData, 'PNG', 0, 0, pdfWidth, mapHeight);

            let currentY = mapHeight + 10;

            html2canvas(greenBox, {
                useCORS: true,
                allowTaint: false
            }).then(greenBoxCanvas => {
                const gbImgData = greenBoxCanvas.toDataURL('image/png');
                const gbProps = pdf.getImageProperties(gbImgData);
                const gbHeight = (gbProps.height * pdfWidth) / gbProps.width;

                if (currentY + gbHeight > pdfHeight) {
                    pdf.addPage();
                    currentY = 10;
                }

                pdf.addImage(gbImgData, 'PNG', 0, currentY, pdfWidth, gbHeight);
                pdf.save('mapbox-export.pdf');
            });
        });
    }

    togglePopulationPng(): void {
        this.showPopulationPng = !this.showPopulationPng;
        if (this.showPopulationPng) {
            this.addStaticImageLayer();
        } else {
            this.removeLayerAndSource('population-png');
            this.populationCanvas = undefined;
        }
    }

    togglePng2(): void {
        this.showPng2 = !this.showPng2;
        if (this.showPng2) {
            this.addStaticImageLayer2();
        } else {
            this.removeLayerAndSource('flood-png');
            this.png2Canvas = undefined;
        }
    }

    toggleStaticPng(): void {
        this.showStaticPng = !this.showStaticPng;
        if (this.showStaticPng) {
            this.addStaticImageLayerPlain();
        } else {
            this.removeLayerAndSource('static-png');
        }
    }

    toggleBorders(): void {
        this.showBorders = !this.showBorders;
        if (this.showBorders) {
            if (!this.map.getSource('borders-source')) {
                this.map.addSource('borders-source', {
                    type: 'geojson',
                    data: this.borderUri
                });
            }

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

    private removeLayerAndSource(id: string): void {
        if (this.map.getLayer(id)) {
            this.map.removeLayer(id);
        }
        if (this.map.getSource(id)) {
            this.map.removeSource(id);
        }
    }

    private addGeoServerRasterLayer(id: string, layerSource: RasterLayerIbfName): void {
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
        // Image bounds in EPSG:4326 [minLon, minLat, maxLon, maxLat]
        const minLon = 32.99874987166672;
        const minLat = 3.324583523068185;
        const maxLon = 47.98208314506672;
        const maxLat = 14.899583476768186;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = 'image/eth_pd_2020_1km_UNadj0.png';

        img.onload = () => {
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

            this.map.addSource('population-png', {
                type: 'image',
                url: this.populationCanvas.toDataURL(),
                coordinates: [
                    [minLon, maxLat], // top-left
                    [maxLon, maxLat], // top-right
                    [maxLon, minLat], // bottom-right
                    [minLon, minLat]  // bottom-left
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
        // Image bounds in EPSG:4326
        const minLon = 21.998751327743022;
        const maxLon = 33.70958469341794;
        const minLat = -18.077933333316892;
        const maxLat = -8.202933333325873;

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

            const imageData = ctx.getImageData(0, 0, img.width, img.height);
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

            this.map.addSource('flood-png', {
                type: 'image',
                url: this.png2Canvas.toDataURL(),
                coordinates: [
                    [minLon, maxLat], // top-left
                    [maxLon, maxLat], // top-right
                    [maxLon, minLat], // bottom-right
                    [minLon, minLat]  // bottom-left
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

    private addStaticImageLayerPlain(): void {
        // Bounds in EPSG:4326
        const minLon = 21.998751327743022;
        const maxLon = 33.70958469341794;
        const minLat = -18.077933333316892;
        const maxLat = -8.202933333325873;

        this.map.addSource('static-png', {
            type: 'image',
            url: 'image/flood_map_ZMB_RP20_c0_b3857.png',
            coordinates: [
                [minLon, maxLat], // top-left
                [maxLon, maxLat], // top-right
                [maxLon, minLat], // bottom-right
                [minLon, minLat]  // bottom-left
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
}
