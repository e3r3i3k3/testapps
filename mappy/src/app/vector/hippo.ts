
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
import GeoJSON from 'ol/format/GeoJSON';
import { Fill, Stroke, Style } from 'ol/style';
import CircleStyle from 'ol/style/Circle';


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


    glofasUri = 'http://localhost:9000/collections/public.glofas_stations/items?limit=10000';
    glofasUriFilter = 'http://localhost:9000/collections/public.glofas_stations/items?filter=country%3D%27ETH%27';

    private pointsLayer: VectorLayer | null = null;

    togglePoints(): void {
        this.showPoints = !this.showPoints;
        if (this.showPoints) {
            // Remove previous layer if exists
            if (this.pointsLayer) {
                this.map.removeLayer(this.pointsLayer);
            }
            this.pointsLayer = new VectorLayer({
                source: new VectorSource({
                    url: this.glofasUri,
                    format: new GeoJSON(),
                }),
                style: new Style({
                    image: new CircleStyle({
                        radius: 6,
                        fill: new Fill({
                            color: '#FF1493', // Pink color
                        }),
                        stroke: new Stroke({
                            color: '#C71585', // Darker pink border
                            width: 2,
                        }),
                    }),
                }),
            });

            this.map.addLayer(this.pointsLayer);
        } else {
            // Remove points layer
            if (this.pointsLayer) {
                this.map.removeLayer(this.pointsLayer);
                this.pointsLayer = null;
            }
        }
    }




}
