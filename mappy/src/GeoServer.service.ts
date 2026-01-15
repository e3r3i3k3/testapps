import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'  // This makes it available everywhere
})
export class GeoServerService {
    private wfsUrl = 'http://localhost:8081/geoserver/ibf-system/wfs';

    constructor(private http: HttpClient) { }

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
}