
import { AfterViewInit, Component } from '@angular/core';
import { View } from 'ol';
import Mapp from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import { TileWMS, XYZ } from 'ol/source';
import RasterSource from 'ol/source/Raster.js';
import { attributions, GeoServerService, geoserverUrl, mapSources, RasterLayerIbfName, superSecretApiKey, VectorLayerIbfName } from '../../GeoServer.service';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import Map from 'ol/Map.js';
import Attribution from 'ol/control/Attribution.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import 'ol/ol.css';
import { apply } from 'ol-mapbox-style';


@Component({
    selector: 'app-maptiler',
    imports: [],
    templateUrl: './maptiler.html',
    styleUrl: '../../styles.css'
})
export class MaptilerTest implements AfterViewInit {
    ngAfterViewInit(): void {
        this.initMap();
    }

    private initMap(): void {
        const key = superSecretApiKey;
        const styleJson = `https://api.maptiler.com/maps/topo-v4/style.json?key=${key}`;

        const attribution = new Attribution({
            collapsible: false,
        });

        const map = new Map({
            target: 'map',
            controls: defaultControls({ attribution: false }).extend([attribution]),
            view: new View({
                constrainResolution: true,
                center: fromLonLat([0, 0]),
                zoom: 1
            })
        });
        apply(map, styleJson);


    }


}
