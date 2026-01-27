
import { AfterViewInit, Component } from '@angular/core';
import { View } from 'ol';
import Mapp from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import { TileWMS, XYZ } from 'ol/source';
import RasterSource from 'ol/source/Raster.js';
import { attributions, GeoServerService, geoserverUrl, mapSources, RasterLayerIbfName, VectorLayerIbfName } from '../../GeoServer.service';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';



function SplitLayers(pixels: number[][] | ImageData[], data: any) {

        let p = pixels[0];
        //const c1 = `rgb(67, 8, 122)`;
        //const c2 = `rgb(0, 125, 84)`;
        //const c3 = `rgb(27, 72, 253)`;

        const th = data.threshold; // threshold
        const c1 = [67, 8, 122];
        const c2 = [0, 125, 84];
        const c3 = [27, 72, 253];
        let output = [0,50,100,255];
    if (Array.isArray(p)) {
        if (data.showRed && (p[0] > th)) {
            output[0] += +c1[0];
            output[1] += +c1[1];
            output[2] += +c1[2];
        }
        if (data.showGreen && (p[1] > th))
        {
            output[0] += +c2[0];
            output[1] += +c2[1];
            output[2] += +c2[2];
        }
        if (data.showBlue && (p[2] > th))
        {    
            output[0] += +c3[0];
            output[1] += +c3[1];
            output[2] += +c3[2];
        }

        output[0] = Math.min(255, output[0]);
        output[1] = Math.min(255, output[1]);
        output[2] = Math.min(255, output[2]);
    }
    return output;
}


@Component({
    selector: 'app-layers',
    imports: [],
    templateUrl: './colormap.html',
    styleUrl: '../../styles.css'
})
export class ColorMapTest implements AfterViewInit {
    ngAfterViewInit(): void {
        this.initMap();
        //this.setupMapEventListeners();
    }
    private map!: Mapp;
    private baseLayer!: TileLayer<XYZ>;
    private roadsLayer?: VectorLayer<VectorSource>;
    private bordersLayer?: VectorLayer<VectorSource>;
    private rasterLayerEth?: TileLayer<TileWMS>;
    private rasterLayerUga1?: TileLayer<TileWMS>;
    private rasterLayerUga2?: ImageLayer<RasterSource> ;
    selection = 5;
    showRoads = false;
    showBorders = false;
    showRasterLayerEth = false;
    showRasterLayerUga1 = false;
    showRasterLayerUga2 = false;
    hue = 0;
    chroma = 100;
    threshold = 200;
    showRed = true;
    showGreen = true;
    showBlue = true;
    showRed2 = true;
    showGreen2 = true;
    showBlue2 = true;

    private rasterSource?: RasterSource;

    // Caching
    private loadedBounds?: [number, number, number, number];
    private cachedRoads: any[] = [];
    private loadedBordersBounds?: [number, number, number, number];
    private cachedBorders: any[] = [];

    constructor(private geoServerService: GeoServerService) { }

    private initMap(): void {

        this.rasterSource = new RasterSource({
            sources: [
                new XYZ({
                    url: mapSources[this.selection],
                    attributions: attributions[this.selection],
                    maxZoom: 19,
                    crossOrigin: 'anonymous'
                }),
            ],
            // operation: SetSingleColor,
            operation: SplitLayers,
        });

        this.baseLayer = new TileLayer({
            source: new XYZ({
                url: mapSources[this.selection],
                attributions: attributions[this.selection],
                maxZoom: 19
            })
        });

        // Set up beforeoperations listener to pass values to the shader
        this.rasterSource.on('beforeoperations', (event) => {
            event.data.hue = this.hue;
            event.data.chroma = this.chroma;
            event.data.threshold = this.threshold;
            event.data.showRed = this.showRed;
            event.data.showGreen = this.showGreen;
            event.data.showBlue = this.showBlue;
        });

        this.map = new Mapp({
            layers: [
                new ImageLayer({
                    source: this.rasterSource,
                }),
            ],
            target: 'ol-map',
            //layers: [this.baseLayer],
            view: new View({
                center: fromLonLat([34.0, 3.0]), // [longitude, latitude]
                zoom: 6
            })
        });


    }

    onHueChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.hue = parseInt(input.value);
        const output = document.getElementById('hueOut');
        if (output) {
            output.textContent = input.value;
        }
        this.rasterSource?.changed();
    }

    onChromaChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.chroma = parseInt(input.value);
        const output = document.getElementById('chromaOut');
        if (output) {
            output.textContent = input.value;
        }
        this.rasterSource?.changed();
    }

    onThresholdChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.threshold = parseInt(input.value);
        const output = document.getElementById('thresholdOut');
        if (output) {
            output.textContent = input.value;
        }
        this.rasterSource?.changed();
    }

    toggleRed(): void {
        this.showRed = !this.showRed;
        this.rasterSource?.changed();
    }

    toggleGreen(): void {
        this.showGreen = !this.showGreen;
        this.rasterSource?.changed();
    }

    toggleBlue(): void {
        this.showBlue = !this.showBlue;
        this.rasterSource?.changed();
    }


}
