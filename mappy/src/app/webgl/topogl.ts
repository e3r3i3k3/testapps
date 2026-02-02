
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


function TopoShade2(pixels: number[][] | ImageData[], data: any) {

    //const c0 = `rgb(253, 143, 40)`;
    //const c1 = `rgb(253, 195, 70)`;
    //const c2 = `rgb(212, 255, 95)`;
    //const c3 = `rgb(1, 246, 30)`;
    //const c4 = `rgb(41, 69, 255)`;
    //const c5 = `rgb(246, 1, 246)`;
    //const seaColor = `rgb(58, 27, 80)`;

    const c0 = [253, 143, 40];
    const c1 = [253, 195, 70];
    const c2 = [212, 255, 95];
    let pixel = pixels[0];

    let output = [22, 22, 40, 255];
    if (Array.isArray(pixel)) {

                    output[0] = c0[0];
            output[1] = pixel[1];
            output[2] = pixel[0];
    }
    return output;
}


@Component({
    selector: 'app-topo2',
    imports: [],
    templateUrl: './topogl.html',
    styleUrl: '../../styles.css'
})
export class TopoGLTest implements AfterViewInit {
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
    private rasterLayerUga2?: ImageLayer<RasterSource>;
    selection = 7;
    showRoads = false;
    showBorders = false;
    showRasterLayerEth = false;
    showRasterLayerUga1 = false;
    showRasterLayerUga2 = false;
    threshold = 7;

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
            //operationType: 'image', // Return ImageData instead of pixel arrays
            // operation: SetSingleColor,

            //operation: SplitLayers,
            operation: TopoShade2
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
            event.data.threshold = this.threshold;
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



    onThresholdChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.threshold = parseInt(input.value);
        const output = document.getElementById('thresholdOut');
        if (output) {
            output.textContent = input.value;
        }
        this.rasterSource?.changed();
    }



}
