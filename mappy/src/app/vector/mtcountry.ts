
import { AfterViewInit, Component } from '@angular/core';
import { View } from 'ol';
import Mapp from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import { TileWMS, XYZ } from 'ol/source';
import RasterSource from 'ol/source/Raster.js';
import { attributions, countryVectors, countryVectors2, GeoServerService, geoserverUrl, mapSources, RasterLayerIbfName, superSecretApiKey, VectorLayerIbfName } from '../../GeoServer.service';

import VectorSource from 'ol/source/Vector';
import VectorTile from 'ol/source/VectorTile';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import { fromLonLat } from 'ol/proj';
import Map from 'ol/Map.js';
import Attribution from 'ol/control/Attribution.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import 'ol/ol.css';
import { apply } from 'ol-mapbox-style';
import Overlay from 'ol/Overlay.js';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import Source from 'ol/source/ImageTile.js';

import GeoJSON from 'ol/format/GeoJSON.js';

import WebGLVectorLayer from 'ol/layer/WebGLVector.js';
import MVT from 'ol/format/MVT';



@Component({
    selector: 'app-maptilerct',
    imports: [],
    templateUrl: './mtcountry.html',
    styleUrl: '../../styles.css'
})
export class MtCountryTest implements AfterViewInit {
    private map!: Map;
    private popup!: Overlay;
    showRasterLayerEth = false;
    selection = 5;

    constructor(private geoServerService: GeoServerService) { }

    ngAfterViewInit(): void {
        this.initMap();
    }

    private initMap(): void {
        const key = superSecretApiKey;


        const attribution = new Attribution({
            collapsible: false,
        });

        const baseMap = new WebGLTileLayer({
            opacity: 1,
            source: new Source({
                url: mapSources[this.selection],
                attributions: attributions[this.selection],
            }),
        });

        const vl2 = new VectorTileLayer({
            source: new VectorTile({
                url: countryVectors2,
                format: new MVT(),
                maxZoom: 1,
            }),

            style: {
                'fill-color': [255, 0, 0, 0.3],
                'stroke-color': [255, 255, 0, 1],
                'stroke-width': 2,
            },
        });
        
        const vl2admin = new VectorTileLayer({
            source: new VectorTile({
                url: countryVectors2,
                format: new MVT(),
                maxZoom: 4,
            }),

            style: {
                'fill-color': [0, 255, 0, 0.3],
                'stroke-color': [0, 255, 255, 1],
                'stroke-width': 2,
            },
        });

        /*
        const source = new VectorSource({
            url: countryVectors,
            format: new GeoJSON(),
        });

        const vectorLayer = new WebGLVectorLayer({
            source: source,
            style: {
                'fill-color': [255, 0, 0, 0.3],
                'stroke-color': [255, 255, 0, 1],
                'stroke-width': 2,
            },
        });*/


        this.map = new Map({
            target: 'map',
            controls: defaultControls({ attribution: false }).extend([attribution]),

            layers: [
                baseMap,
                vl2,
                vl2admin,
            ],
            view: new View({
                constrainResolution: true,
                center: fromLonLat([0, 0]),
                zoom: 1
            })
        });


        // Change cursor on hover
        this.map.on('pointermove', (evt) => {
            const pixel = this.map.getEventPixel(evt.originalEvent);
            const hit = this.map.hasFeatureAtPixel(pixel);
            this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        });

        // Click handler to print country information
        this.map.on('click', (evt) => {
            this.map.forEachFeatureAtPixel(evt.pixel, (feature) => {
                const properties = feature.getProperties();
                console.log('Clicked on country:', properties);
                console.log('Country name:', properties['name'] || properties['NAME'] || 'Unknown');
                return true;
            });
        });
    }



}

/**#
             opacity: 1,
            source: new Source({
                url: mapSources[this.selection],
                attributions: attributions[this.selection],
            }),
 */