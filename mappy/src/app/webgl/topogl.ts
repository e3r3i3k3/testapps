
import { AfterViewInit, Component } from '@angular/core';
import { ImageTile, View } from 'ol';
import Mapp from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import { TileWMS, XYZ } from 'ol/source';
import RasterSource from 'ol/source/Raster.js';
import { attributions, GeoServerService, geoserverUrl, mapSources, RasterLayerIbfName, VectorLayerIbfName } from '../../GeoServer.service';

import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';

import Layer from 'ol/layer/WebGLTile.js';
import Source from 'ol/source/ImageTile.js';


function TopoShade2(pixels: number[][] | ImageData[], data: any) {


    const c0 = [253, 143, 40];
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
    selection = 7;
    showRoads = false;
    showBorders = false;
    showRasterLayerEth = false;
    showRasterLayerUga1 = false;
    showRasterLayerUga2 = false;
    threshold = 7;

    private rasterSource?: RasterSource;


    constructor(private geoServerService: GeoServerService) { }

    private initMap(): void {

        const plainLayer = new Layer({
            opacity: 0.6,
            source: new Source({
                url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                attributions:
                    '&#169; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors.',
            }),
            style: {
                variables: {
                    level: 0,
                },
                color: [
                    'case',
                    // use the `level` style variable to determine the color
                    ['<=', 1, ['var', 'level']],
                    [139, 212, 255, 1],
                    [139, 212, 255, 0],
                ],
            },
        });

        this.map = new Mapp({
            target: 'ol-map',
            layers: [
                plainLayer
            ],
            view: new View({
                center: [0, 0],
                zoom: 0,
            }),
        });
        /*
        
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
                });*/


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
