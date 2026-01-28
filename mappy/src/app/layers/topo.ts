
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
import { lerpC } from './vertical';


function TopoShade(inputs: number[][] | ImageData[], data: any): ImageData {

    
    const imageData = inputs[0];

    if (imageData instanceof ImageData === false) {
        return new ImageData(1, 1);
    }
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data; // Uint8ClampedArray
    
    const c1 = [133, 3, 255];
    
    // Process each pixel
    for (let i = 0; i < pixels.length; i += 4) {
        const pixelIndex = i / 4;
        const y = Math.floor(pixelIndex / width);
        const t = y / height; // normalized height position (0 to 1)
        
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Apply vertical gradient
        pixels[i] = lerpC(c1[0], r, t);
        pixels[i + 1] = lerpC(c1[1], g, t);
        pixels[i + 2] = lerpC(c1[2], b, t);
        pixels[i + 3] = 255; // alpha
    }
    
    return imageData;
}
@Component({
    selector: 'app-topo',
    imports: [],
    templateUrl: './topo.html',
    styleUrl: '../../styles.css'
})
export class TopoTest implements AfterViewInit {
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
    selection = 5;
    showRoads = false;
    showBorders = false;
    showRasterLayerEth = false;
    showRasterLayerUga1 = false;
    showRasterLayerUga2 = false;
    threshold = 200;

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
            operationType: 'image', // Return ImageData instead of pixel arrays
            // operation: SetSingleColor,

            //operation: SplitLayers,
            operation: TopoShade,
            lib: {
                lerpC: lerpC
            },
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
