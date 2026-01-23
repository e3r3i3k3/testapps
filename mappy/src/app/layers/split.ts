
import { AfterViewInit, Component } from '@angular/core';
import { View } from 'ol';
import Mapp from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import VectorTileLayer from 'ol/layer/VectorTile';
import { TileWMS, XYZ } from 'ol/source';
import RasterSource from 'ol/source/Raster.js';
import StadiaMaps from 'ol/source/StadiaMaps.js';
import { attributions, GeoServerService, mapSources, VectorLayerIbfName } from '../../GeoServer.service';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import MVT from 'ol/format/MVT';
import { Stroke, Style } from 'ol/style';
import { hcl2rgb, lab2xyz, rgb2hcl, rgb2xyz, t0, t1, t2, t3, twoPi, Xn, xyz2lab, xyz2rgb, Yn, Zn } from './shader';

@Component({
    selector: 'app-layers',
    imports: [],
    templateUrl: './split.html',
    styleUrl: '../../styles.css'
})
export class SplitTest implements AfterViewInit {
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
    private rasterLayerUga2?: TileLayer<TileWMS>;
    selection = 5;
    showRoads = false;
    showBorders = false;
    showRasterLayerEth = false;
    showRasterLayerUga1 = false;
    showRasterLayerUga2 = false;
    hue = 0;
    chroma = 100;

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
            operation: function (pixels, data) {
                const hcl = rgb2hcl(pixels[0]);


                let h = hcl[0] + (Math.PI * data.hue) / 180;
                if (h < 0) {
                    h += twoPi;
                } else if (h > twoPi) {
                    h -= twoPi;
                }
                hcl[0] = h;

                hcl[1] *= data.chroma / 100;
                hcl[2] *= 1;

                return hcl2rgb(hcl);
            },
            lib: {
                rgb2hcl: rgb2hcl,
                hcl2rgb: hcl2rgb,
                rgb2xyz: rgb2xyz,
                lab2xyz: lab2xyz,
                xyz2lab: xyz2lab,
                xyz2rgb: xyz2rgb,
                Xn: Xn,
                Yn: Yn,
                Zn: Zn,
                t0: t0,
                t1: t1,
                t2: t2,
                t3: t3,
                twoPi: twoPi,
            },
        });

        this.baseLayer = new TileLayer({
            source: new XYZ({
                url: mapSources[this.selection],
                attributions: attributions[this.selection],
                maxZoom: 19
            })
        });

        // Set up beforeoperations listener to pass hue and chroma values to the shader
        this.rasterSource.on('beforeoperations', (event) => {
            event.data.hue = this.hue;
            event.data.chroma = this.chroma;
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
                center: fromLonLat([40.0, 9.0]), // [longitude, latitude]
                zoom: 8
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

}
