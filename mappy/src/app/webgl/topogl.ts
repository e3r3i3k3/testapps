
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
    private webglLayer!: Layer;
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

        this.webglLayer = new Layer({
            opacity: 1,
            source: new Source({
                url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                attributions:
                    '&#169; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors.',
            }),
            style: {
                variables: {
                    threshold: this.threshold,
                },
                color: [
                    'array',
                    ['+', ['*', ['band', 1], ['/', ['var', 'threshold'], 100]], ['*', ['band', 2], ['-', 1, ['/', ['var', 'threshold'], 100]]]],  // Mix of red and green based on threshold
                    ['band', 2],              // Green channel unchanged
                    ['band', 3],
                    1                         // Alpha channel
                ],
            },
        });

        this.map = new Mapp({
            target: 'ol-map',
            layers: [
                this.webglLayer
                
            ],
            view: new View({
                center: [0, 0],
                zoom: 0,
            }),
        });


    }



    onThresholdChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.threshold = parseInt(input.value);
        const output = document.getElementById('thresholdOut');
        if (output) {
            output.textContent = input.value;
        }
        // Update the WebGL layer's threshold variable
        this.webglLayer.updateStyleVariables({ threshold: this.threshold });
    }



}
