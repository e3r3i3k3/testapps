import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum RasterLayerIbfName {
    Eth11Flood = 'ibf-system:flood_extent_11-hour_ETH',
    UgaGrass = 'ibf-system:grassland_UGA',
    UgaCrop = 'ibf-system:cropland_UGA'
    //'ibf-system:cropland_UGA'//'ibf-system:rainfall_forecast_11-month_UGA',
    // 'ibf-system:flood_extent_7-day_UGA',
}

export enum VectorLayerIbfName {
    CountryBorders = 'ibf-system:ne_110m_admin_0_boundary_lines_land',
    MalawiRoads = 'ibf-system:roads',
    UgandaBuildings = 'ibf-system:gis_osm_buildings_a_free_1',
    UgandaLanduse = 'ibf-system:gis_osm_landuse_a_free_1',
    UgandaRoads = 'ibf-system:gis_osm_roads_free_1',
}

export const superSecretApiKey = '7b02PI5MailPcMoXxEql';

export const mapSources = [
  'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
  'https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=' + superSecretApiKey,
  'https://api.maptiler.com/maps/topo-v4/style.json?key=' + superSecretApiKey,
];

export const countryVectors = `https://api.maptiler.com/tiles/countries/tiles.json?key=` + superSecretApiKey; 
export const countryVectors2 = `https://api.maptiler.com/tiles/countries/{z}/{x}/{y}.pbf?key=` + superSecretApiKey; 

// Live
export const liveMapSource = `
https://ibf-test.510.global/geoserver/ibf-system/wms?service=WMS&request=GetMap&layers=ibf-system%3Apopulation_MWI&styles=&format=image%2Fpng&transparent=true&version=1.1.0&viewparams=countryCodeISO3%3AMWI&width=256&height=256&srs=EPSG%3A4326&bbox=34.80468750000001,-16.299051014581817,35.15625000000001,-15.961329081596647`

export const attributions = [
  '© OpenStreetMap contributors',
  '© OpenStreetMap contributors, Tiles style by HOT',
  '© OpenStreetMap, © CartoDB',
  '© OpenStreetMap, © CartoDB',
  '© Stamen Design, © OpenStreetMap',
  'Tiles © Esri',
];

export const geoserverUrl = 'http://localhost:8081/geoserver/ibf-system/wms';


/**
 * gis_osm_buildings_a_free_1	ibf-system:gis_osm_buildings_a_free_1	uganda-data		EPSG:4326
      gis_osm_landuse_a_free_1	ibf-system:gis_osm_landuse_a_free_1	uganda-data		EPSG:4326
      gis_osm_roads_free_1	ibf-system:gis_osm_roads_free_1	uganda-data
 */


/**
 * 
 Notes on requests to GeoServer for MVT

 // does not work
//const url1 = 'http://localhost:8081/geoserver/ibf-system/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=application/vnd.mapbox-vector-tile&TRANSPARENT=true&LAYERS=ne_110m_admin_0_boundary_lines_land&SRS=EPSG:900913&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}';
//const url1roads = 'http://localhost:8081/geoserver/ibf-system/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=application/vnd.mapbox-vector-tile&TRANSPARENT=true&LAYERS=roads&SRS=EPSG:900913&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}';
//works

// Works
const url2 = 'http://localhost:8081/geoserver/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=ibf-system:ne_110m_admin_0_boundary_lines_land&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}';
const url2roadsnew = 'http://localhost:8081/geoserver/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=ibf-system:gis_osm_roads_free_1&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}';

// does not work
//const url2roads = 'http://localhost:8081/geoserver/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=ibf-system:roads&STYLE=&TILEMATRIX=EPSG:404000:{z}&TILEMATRIXSET=EPSG:404000&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}';
// does not work
//const url3 = 'http://localhost:8081/geoserver/ibf-system/wms?service=WMS&request=GetMap&layers=ne_110m_admin_0_boundary_lines_land&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:900913&format=application/vnd.mapbox-vector-tile';
//const url3roads = 'http://localhost:8081/geoserver/ibf-system/wms?service=WMS&request=GetMap&layers=roads&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:900913&format=application/vnd.mapbox-vector-tile';

 */


@Injectable({
    providedIn: 'root'  // This makes it available everywhere
})
export class GeoServerService {
    private wfsUrl = 'http://localhost:8081/geoserver/ibf-system/wfs';

    constructor(private http: HttpClient) { }

    // How to make a url req for mvt tiles.

    // be sure to match the tilematrix set (EPSG:900913, 	EPSG:404000, etc.)
    // AI assisted, so check this in another source. I could not find it in the docs :/
    getMvtUrl(layerSource: VectorLayerIbfName): string {
        // also try EPSG:4326
        const format = 'EPSG:900913';
        return `http://localhost:8081/geoserver/gwc/service/wmts?REQUEST=GetTile&SERVICE` +
            `=WMTS&VERSION=1.0.0&LAYER=${layerSource}&STYLE=&TILEMATRIX=${format}:{z}&TILEMATRIXSET=${format}&FORMAT=` +
            `application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}`;
    }

    getWfsUrlWithFilter(layerSource: VectorLayerIbfName, cqlFilter?: string): string {
        let url = `${this.wfsUrl}?` +
            `service=WFS&version=1.0.0&request=GetFeature&` +
            `typeName=${layerSource}&` +
            `outputFormat=application/json&` +
            `srsName=EPSG:4326`;
        
        if (cqlFilter) {
            url += `&cql_filter=${encodeURIComponent(cqlFilter)}`;
        }
        
        return url;
    }

    getRoadsInBoundingBox(
        minLon: number,
        minLat: number,
        maxLon: number,
        maxLat: number
    ): Observable<any> {
        const bbox = `${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`;

        const params = {
            service: 'WFS',
            version: '1.0.0',
            request: 'GetFeature',
            typeName: 'ibf-system:roads',
            outputFormat: 'application/json',
            srsName: 'EPSG:4326',
            bbox: bbox
        };

        return this.http.get(this.wfsUrl, { params });
    }

    getBordersInBoundingBox(
        minLon: number,
        minLat: number,
        maxLon: number,
        maxLat: number
    ): Observable<any> {
        const bbox = `${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`;

        const params = {
            service: 'WFS',
            version: '1.0.0',
            request: 'GetFeature',
            typeName: 'ibf-system:ne_110m_admin_0_boundary_lines_land',
            //typeName: 'ibf-system:buildings',
            outputFormat: 'application/json',
            srsName: 'EPSG:4326',
            bbox: bbox
        };

        return this.http.get(this.wfsUrl, { params });
    }
}