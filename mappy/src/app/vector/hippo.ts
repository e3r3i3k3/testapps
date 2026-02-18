
import { AfterViewInit, Component } from '@angular/core';
import { View } from 'ol';
import Mapp from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import VectorTileLayer from 'ol/layer/VectorTile';
import { TileWMS, XYZ } from 'ol/source';
import RasterSource from 'ol/source/Raster.js';
import StadiaMaps from 'ol/source/StadiaMaps.js';
import { attributions, GeoServerService, geoserverUrl, mapSources, RasterLayerIbfName, VectorLayerIbfName } from '../../GeoServer.service';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat, transformExtent } from 'ol/proj';


@Component({
    selector: 'app-layers',
    imports: [],
    templateUrl: './hippo.html',
    styleUrl: '../../styles.css'
})
export class HippoTest implements AfterViewInit {
    ngAfterViewInit(): void {
        this.initMap();
        //this.setupMapEventListeners();
    }
    private map!: Mapp;
    private baseLayer!: TileLayer<XYZ>;
    selection = 2;
    showPoints = false;



    private initMap(): void {
        this.baseLayer = new TileLayer({
            source: new XYZ({
                url: mapSources[this.selection],
                attributions: attributions[this.selection],
                maxZoom: 19
            })
        });

        this.map = new Mapp({
            target: 'ol-map',
            layers: [this.baseLayer],
            view: new View({
                center: fromLonLat([34.0, 2.0]), // [longitude, latitude]
                zoom: 4
            })
        });


    }



    togglePoints(): void {


    }



}
