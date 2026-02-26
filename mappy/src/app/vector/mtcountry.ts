
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
import { Fill, Stroke, Style } from 'ol/style';

import WebGLVectorLayer from 'ol/layer/WebGLVector.js';
import MVT from 'ol/format/MVT';
import { CountryData } from './countries';



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
    selection = 9;
    selectedCountry = 'None';

    vlayer!: VectorTileLayer;

    vAdmin0 = new VectorTileLayer({
        source: new VectorTile({
            url: countryVectors2,
            format: new MVT(),
            maxZoom: 1,
        }),

        style: (feature) => {
            const iso_a2 = feature.get('iso_a2');
            const isSelected = iso_a2 === this.selectedCountry;
            const countryInfo = CountryData.get(iso_a2);
            const isIbfSupported = countryInfo?.ibfSupported ?? false;
            
            let fillColor: string;
            let strokeColor: string;
            
            if (isIbfSupported) {
                fillColor = isSelected ? "#d63384" : "#f8bbd9";  
            } else {
                fillColor = isSelected ? "#b3b3b3" : "#e0e0e0";
            }
                strokeColor = "#a4a4a4";
            
            return new Style({
                fill: new Fill({
                    color: fillColor,
                }),
                stroke: new Stroke({
                    color: strokeColor,
                    width: 1,
                }),
            });
        },
    });

    vAdmin1 = new VectorTileLayer({
        source: new VectorTile({
            url: countryVectors2,
            format: new MVT(),
            maxZoom: 2,
        }),
        visible: false,
        style: (feature) => {
            const iso_a2 = feature.get('iso_a2');
            const isSelected = iso_a2 === this.selectedCountry;
            return new Style({
                fill: new Fill({
                    color: isSelected ? "rgb(251, 186, 89)" : "rgb(243, 255, 17)",
                }),
                stroke: new Stroke({
                    color: isSelected ? "rgb(0, 255, 38)" : "rgb(131, 225, 156)",
                    width: 2,
                }),
            });
        },
    });

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
            //source: new Source({
             //   url: mapSources[this.selection],
            //    attributions: attributions[this.selection],
            //}),
        });


        this.map = new Map({
            target: 'map',
            controls: defaultControls({ attribution: false }).extend([attribution]),

            layers: [
                baseMap,
                this.vAdmin0,
                this.vAdmin1,
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

        // Click handler to toggle between admin0 and admin1 layers
        this.map.on('click', (evt) => {
            this.map.forEachFeatureAtPixel(evt.pixel, (feature) => {
                const properties = feature.getProperties();
                console.log('Clicked on location:', properties);
                console.log('Name:', properties['name'] || properties['NAME'] || 'Unknown');
                this.selectedCountry = properties['iso_a2'] || 'Unknown';
                console.log('Selected iso_a2:', this.selectedCountry);
                
                // Print country metadata from CountryData
                const countryInfo = CountryData.get(this.selectedCountry);
                if (countryInfo) {
                    console.log('Country Metadata:', {
                        code: this.selectedCountry,
                        iso_a3: countryInfo.iso_a3,
                        name: countryInfo.name,
                        ibfSupported: countryInfo.ibfSupported,
                        initialZoom: countryInfo.initialZoom,
                        latlong: countryInfo.latlong
                    });
                    
                    // Focus the map on the country center
                    const [lat, lon] = countryInfo.latlong;
                    this.map.getView().animate({
                        center: fromLonLat([lon, lat]),
                        zoom: countryInfo.initialZoom,
                        duration: 500
                    });
                } else {
                    console.log('No metadata found for country:', this.selectedCountry);
                }
                
                // Refresh both layers to update styles
                this.vAdmin0.changed();
                this.vAdmin1.changed();
                
                // Toggle between admin0 and admin1 layers
                const admin0Visible = this.vAdmin0.getVisible();
                this.vAdmin0.setVisible(!admin0Visible);
                this.vAdmin1.setVisible(admin0Visible);
                
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