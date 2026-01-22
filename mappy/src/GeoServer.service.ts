import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum RasterLayerIbfName {
    Eth11Flood = 'ibf-system:flood_extent_11-hour_ETH',
    UgaFlood = 'ibf-system:flood_extent_7-day_UGA',
    UgaRain = 'ibf-system:cropland_KEN'
    //'ibf-system:cropland_UGA'//'ibf-system:rainfall_forecast_11-month_UGA',
}

export enum VectorLayerIbfName {
    CountryBorders = 'ibf-system:ne_110m_admin_0_boundary_lines_land',
    MalawiRoads = 'ibf-system:roads',
    UgandaBuildings = 'ibf-system:gis_osm_buildings_a_free_1',
    UgandaLanduse = 'ibf-system:gis_osm_landuse_a_free_1',
    UgandaRoads = 'ibf-system:gis_osm_roads_free_1',
}

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