
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
    private webglLayer2!: Layer;
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
                url: mapSources[this.selection],
                attributions: attributions[this.selection],
            }),
            style: {
                variables: {
                    threshold: this.threshold,
                    // Rainbow color palette (normalized 0-1)
                    c0r: 253/255, c0g: 143/255, c0b: 40/255,
                    c1r: 253/255, c1g: 195/255, c1b: 70/255,
                    c2r: 212/255, c2g: 255/255, c2b: 95/255,
                    c3r: 1/255, c3g: 246/255, c3b: 30/255,
                    c4r: 41/255, c4g: 69/255, c4b: 255/255,
                    c5r: 246/255, c5g: 1/255, c5b: 246/255,
                    seaR: 58/255, seaG: 27/255, seaB: 80/255,
                },
                color: [
                    'case',
                    // Calculate height from RGB: height = -100000 + R*256*256 + G*256 + B
                    // Bands are normalized 0-1, so multiply by 255 first
                    ['<=',
                        ['+',
                            ['+',
                                ['*', ['*', ['band', 1], 255], 65536],
                                ['*', ['*', ['band', 2], 255], 256]
                            ],
                            ['*', ['band', 3], 255]
                        ],
                        100000
                    ],
                    // If height <= sealevel, use sea color
                    ['array', ['var', 'seaR'], ['var', 'seaG'], ['var', 'seaB'], 1],
                    
                    // Otherwise calculate level (0-5) and select color
                    [
                        'match',
                        ['%',
                            ['floor',
                                ['/',
                                    ['-',
                                        ['+',
                                            ['+',
                                                ['*', ['*', ['band', 1], 255], 65536],
                                                ['*', ['*', ['band', 2], 255], 256]
                                            ],
                                            ['*', ['band', 3], 255]
                                        ],
                                        100000
                                    ],
                                    ['*', 500, ['var', 'threshold']]
                                ]
                            ],
                            6
                        ],
                        0, ['array', ['var', 'c0r'], ['var', 'c0g'], ['var', 'c0b'], 1],
                        1, ['array', ['var', 'c1r'], ['var', 'c1g'], ['var', 'c1b'], 1],
                        2, ['array', ['var', 'c2r'], ['var', 'c2g'], ['var', 'c2b'], 1],
                        3, ['array', ['var', 'c3r'], ['var', 'c3g'], ['var', 'c3b'], 1],
                        4, ['array', ['var', 'c4r'], ['var', 'c4g'], ['var', 'c4b'], 1],
                        5, ['array', ['var', 'c5r'], ['var', 'c5g'], ['var', 'c5b'], 1],
                        ['array', ['var', 'c0r'], ['var', 'c0g'], ['var', 'c0b'], 1]
                    ]
                ],
            },
        });

        this.webglLayer2 = new Layer({
            opacity: 1,
            source: new Source({
                url: mapSources[this.selection],
                attributions: attributions[this.selection],
            }),
        });


        this.map = new Mapp({
            target: 'ol-map',
            layers: [
                this.webglLayer2,
                this.webglLayer,
                
            ],
            view: new View({
                center: fromLonLat([34.0, 3.0]),
                zoom: 6,
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
