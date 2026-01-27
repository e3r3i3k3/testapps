
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

@Component({
    selector: 'app-layers',
    imports: [],
    templateUrl: './s.html',
    styleUrl: '../../styles.css'
})
export class ShaderTest implements AfterViewInit {
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

    changeMapSource(index: number): void {
        this.selection = index;
        
        // Recreate the raster source with the new map source
        this.rasterSource = new RasterSource({
            sources: [
                new XYZ({
                    url: mapSources[index],
                    attributions: attributions[index],
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

        // Set up beforeoperations listener
        this.rasterSource.on('beforeoperations', (event) => {
            event.data.hue = this.hue;
            event.data.chroma = this.chroma;
        });

        // Update the map layer
        const layers = this.map.getLayers().getArray();
        if (layers.length > 0) {
            this.map.removeLayer(layers[0]);
        }
        
        this.map.addLayer(new ImageLayer({
            source: this.rasterSource,
        }));
    }

}

/**
 * Color manipulation functions below are adapted from
 * https://github.com/d3/d3-color.
 */
export const Xn = 0.95047;
export const Yn = 1;
export const Zn = 1.08883;
export const t0 = 4 / 29;
export const t1 = 6 / 29;
export const t2 = 3 * t1 * t1;
export const t3 = t1 * t1 * t1;
export const twoPi = 2 * Math.PI;

/**
 * Convert an RGB pixel into an HCL pixel.
 * @param {Array<number>} pixel A pixel in RGB space.
 * @return {Array<number>} A pixel in HCL space.
 */
export function rgb2hcl(pixel: any) {
    const red = rgb2xyz(pixel[0]);
    const green = rgb2xyz(pixel[1]);
    const blue = rgb2xyz(pixel[2]);

    const x = xyz2lab(
        (0.4124564 * red + 0.3575761 * green + 0.1804375 * blue) / Xn,
    );
    const y = xyz2lab(
        (0.2126729 * red + 0.7151522 * green + 0.072175 * blue) / Yn,
    );
    const z = xyz2lab(
        (0.0193339 * red + 0.119192 * green + 0.9503041 * blue) / Zn,
    );

    const l = 116 * y - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);

    const c = Math.sqrt(a * a + b * b);
    let h = Math.atan2(b, a);
    if (h < 0) {
        h += twoPi;
    }

    pixel[0] = h;
    pixel[1] = c;
    pixel[2] = l;

    return pixel;
}

/**
 * Convert an HCL pixel into an RGB pixel.
 * @param {Array<number>} pixel A pixel in HCL space.
 * @return {Array<number>} A pixel in RGB space.
 */
export function hcl2rgb(pixel: any) {
    const h = pixel[0];
    const c = pixel[1];
    const l = pixel[2];

    const a = Math.cos(h) * c;
    const b = Math.sin(h) * c;

    let y = (l + 16) / 116;
    let x = isNaN(a) ? y : y + a / 500;
    let z = isNaN(b) ? y : y - b / 200;

    y = Yn * lab2xyz(y);
    x = Xn * lab2xyz(x);
    z = Zn * lab2xyz(z);

    pixel[0] = xyz2rgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z);
    pixel[1] = xyz2rgb(-0.969266 * x + 1.8760108 * y + 0.041556 * z);
    pixel[2] = xyz2rgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z);

    return pixel;
}

export function xyz2lab(t: number) {
    return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
}

export function lab2xyz(t: number) {
    return t > t1 ? t * t * t : t2 * (t - t0);
}

export function rgb2xyz(x: number) {
    return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function xyz2rgb(x: number) {
    return (
        255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)
    );
}
