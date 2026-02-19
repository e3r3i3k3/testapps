
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

    // example of results:
    // max size: 300kb
    // .0005 = 279kb
    // .001 = 188kb
    // .05 = 53kb
    // .01 = 30kb
    factor = 0.01;

    admnin0Factor = 0.010;
    admin1Factor = 0.010;
    admin2Factor = 0.005;
    admin3Factor = 0.004;

    glofasUriAll = 'http://localhost:9000/collections/public.glofas_stations/items?limit=10000';
    glofasUriFilter = 'http://localhost:9000/collections/public.glofas_stations/items?filter=country%3D%27ETH%27';

    borderUri = `http://localhost:9000/collections/public.admin_boundaries/items?filter=country=%27UGA%27%20AND%20admin_level=%27adm3%27&limit=10000&transform=simplify,${this.factor}`;
    //also works: items?transform=ST_Simplify,0.1';

    private pointsLayer: VectorLayer | null = null;
    private bordersLayer: VectorLayer | null = null;
    showBorders = false;

    togglePoints(): void {
        this.showPoints = !this.showPoints;
        if (this.showPoints) {
            // Remove previous layer if exists
            if (this.pointsLayer) {
                this.map.removeLayer(this.pointsLayer);
            }
            this.pointsLayer = new VectorLayer({
                source: new VectorSource({
                    url: this.glofasUriAll,
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

    toggleBorders(): void {
        this.showBorders = !this.showBorders;
        if (this.showBorders) {
            // Remove previous layer if exists
            if (this.bordersLayer) {
                this.map.removeLayer(this.bordersLayer);
            }
            this.bordersLayer = new VectorLayer({
                source: new VectorSource({
                    url: this.borderUri,
                    format: new GeoJSON(),
                }),
                style: new Style({
                    fill: new Fill({
                        color: 'rgba(87, 152, 227, 0.84)'
                    }),
                    stroke: new Stroke({
                        color: '#fc1de6',
                        width: 1
                    }),
                }),
            });

            this.map.addLayer(this.bordersLayer);
        } else {
            // Remove borders layer
            if (this.bordersLayer) {
                this.map.removeLayer(this.bordersLayer);
                this.bordersLayer = null;
            }
        }
    }




}
