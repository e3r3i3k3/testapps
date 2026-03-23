
import { AfterViewInit, Component } from '@angular/core';
import { View } from 'ol';
import Mapp from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import VectorTileLayer from 'ol/layer/VectorTile';
import { TileWMS, XYZ } from 'ol/source';
import RasterSource from 'ol/source/Raster.js';
import StadiaMaps from 'ol/source/StadiaMaps.js';
import Static from 'ol/source/ImageStatic';
import { attributions, GeoServerService, geoserverUrl, mapSources, RasterLayerIbfName, VectorLayerIbfName } from '../../GeoServer.service';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat, transformExtent } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Fill, Stroke, Style } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import Feature from 'ol/Feature';
import { Point, Polygon } from 'ol/geom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function Lerpp(a: number[], b: number[], t: number): number[] {
    const output = [];
    for (let i = 0; i < a.length; i++) {
        let aVal = a[i];
        let bVal = (b[i] - a[i]) * t;
        output.push(aVal + bVal);
    }
    return output;
}

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
                maxZoom: 19,
                crossOrigin: 'anonymous'
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
    boundingUriFilter = 'http://localhost:9000/collections/public.extents_data/items?filter=country%3D%27MW%27';

    // GO end points
    // "rc_locs": f"https://goadmin.ifrc.org/api/v2/public-local-units/?limit={results_limit}",
    // "hospital_locs": f"https://goadmin.ifrc.org/api/v2/health-local-units/?limit={results_limit}",
    // Sample data for hospitals
    //  /Users/ehill/repos/IBF-seed-data/country-data/go-data/hospital_locs.json

    hospitalLocsUri = 'https://goadmin.ifrc.org/api/v2/health-local-units/?country=93&limit=10000'; // country=93 is Kenya (KEN)

    borderUri = `http://localhost:9000/collections/public.admin_boundaries/items?filter=country=%27UGA%27%20AND%20admin_level=%27adm3%27&limit=10000&transform=simplify,${this.factor}`;
    //also works: items?transform=ST_Simplify,0.1';

    private pointsLayer: VectorLayer | null = null;
    private bordersLayer: VectorLayer | null = null;
    private greenDotsLayer: VectorLayer | null = null;
    private extentRectsLayer: VectorLayer | null = null;
    private hospitalsLayer: VectorLayer | null = null;
    showBorders = false;
    showGreenDots = false;
    showHospitals = false;
    
    // Flood Raster Processing properties
    private png2Layer?: ImageLayer<RasterSource>;
    showPng2 = false;
    private rasterSource?: RasterSource;
    thresholdValue = 0.1;

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

    toggleGreenDots(): void {
        this.showGreenDots = !this.showGreenDots;
        if (this.showGreenDots) {
            if (this.greenDotsLayer) {
                this.map.removeLayer(this.greenDotsLayer);
            }
            if (this.extentRectsLayer) {
                this.map.removeLayer(this.extentRectsLayer);
            }
            this.greenDotsLayer = new VectorLayer({
                source: new VectorSource({
                    url: this.boundingUriFilter,
                    format: new GeoJSON(),
                }),
                style: new Style({
                    image: new CircleStyle({
                        radius: 2,
                        fill: new Fill({
                            color: '#00AA00',
                        }),
                        stroke: new Stroke({
                            color: '#008000',
                            width: 2,
                        }),
                    }),
                }),
                zIndex: 100,
            });
            this.map.addLayer(this.greenDotsLayer);

            // Fetch data and render extent rectangles
            fetch(this.boundingUriFilter)
                .then(res => res.json())
                .then(data => {
                    console.log('Extent data fetched:', data.features?.length, 'features');
                    const rectFeatures: Feature[] = [];
                    for (const feature of data.features) {
                        const extents = feature.properties?.extents;
                        if (extents && Array.isArray(extents) && extents.length === 8) {
                            const coords = [
                                fromLonLat([extents[0], extents[1]]),
                                fromLonLat([extents[2], extents[3]]),
                                fromLonLat([extents[4], extents[5]]),
                                fromLonLat([extents[6], extents[7]]),
                                fromLonLat([extents[0], extents[1]]), // close the ring
                            ];
                            const polygon = new Polygon([coords]);
                            rectFeatures.push(new Feature(polygon));
                        }
                    }
                    console.log('Created', rectFeatures.length, 'rectangle features');
                    const rectSource = new VectorSource({ features: rectFeatures });
                    this.extentRectsLayer = new VectorLayer({
                        source: rectSource,
                        style: new Style({
                            fill: new Fill({
                                color: 'rgba(0, 170, 0, 0.15)',
                            }),
                            stroke: new Stroke({
                                color: '#008000',
                                width: 2,
                            }),
                        }),
                        zIndex: 99,
                    });
                    this.map.addLayer(this.extentRectsLayer);
                });
        } else {
            if (this.greenDotsLayer) {
                this.map.removeLayer(this.greenDotsLayer);
                this.greenDotsLayer = null;
            }
            if (this.extentRectsLayer) {
                this.map.removeLayer(this.extentRectsLayer);
                this.extentRectsLayer = null;
            }
        }
    }

    toggleHospitals(): void {
        this.showHospitals = !this.showHospitals;
        if (this.showHospitals) {
            if (this.hospitalsLayer) {
                this.map.removeLayer(this.hospitalsLayer);
            }
            fetch(this.hospitalLocsUri)
                .then(res => res.json())
                .then(data => {
                    const features: Feature[] = [];
                    for (const item of data.results ?? []) {
                        const loc = item.location;
                        if (loc?.lat != null && loc?.lng != null) {
                            const point = new Feature({
                                geometry: new Point(fromLonLat([loc.lng, loc.lat])),
                            });
                            features.push(point);
                        }
                    }
                    console.log('Hospital features for KEN:', features.length);
                    const source = new VectorSource({ features });
                    this.hospitalsLayer = new VectorLayer({
                        source,
                        style: new Style({
                            image: new CircleStyle({
                                radius: 6,
                                fill: new Fill({ color: '#8B00FF' }),
                                stroke: new Stroke({ color: '#4B0082', width: 2 }),
                            }),
                        }),
                        zIndex: 101,
                    });
                    this.map.addLayer(this.hospitalsLayer);
                });
        } else {
            if (this.hospitalsLayer) {
                this.map.removeLayer(this.hospitalsLayer);
                this.hospitalsLayer = null;
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

    togglePng2(): void {
        this.showPng2 = !this.showPng2;
        if (this.showPng2) {
            this.png2Layer = this.addStaticImageLayer2();
        } else {
            if (this.png2Layer) {
                this.map.removeLayer(this.png2Layer);
                this.png2Layer = undefined;
            }
        }
    }

    private addStaticImageLayer2(): ImageLayer<RasterSource> {
        // Image bounds in EPSG:4326 (WGS84)
        const bounds = [21.998751327743022, -18.077933333316892, 33.70958469341794, -8.202933333325873];
        
        // Create the base static image source
        const staticSource = new Static({
            url: 'image/flood_map_ZMB_RP20_f16.png',
            imageExtent: bounds,
            projection: 'EPSG:4326',
            interpolate: false, // Disable interpolation for crisp pixels
            crossOrigin: 'anonymous' // Important for html2canvas export
        });

        // Create a raster source with a color gradient shader
        this.rasterSource = new RasterSource({
            sources: [staticSource],
            operation: (pixels, data) => {
                // pixels is an array of pixel arrays from each source
                const pixel = pixels[0];
                
                // Check if pixel is an array, return magenta if not
                if (!Array.isArray(pixel)) {
                    return [255, 0, 255, 255]; // Magenta
                }
                
                let value = pixel[0]/(255);
                value = value * 10 * data.threshold;
                
                // increase value and cap it
                value = Math.min(value , 1);
                value = Math.max(value, 0);


                if (value < 0.00001) {
                    return [0,0,0,0]; // Transparent for very low values
                }
                let output = [0,0,0, 255];

                // let nn = rgb(255, 242, 0);
                const color0 = [255, 255, 50, 150];
                const color1 = [255, 0,0, 255];
                const color2 = [50, 0, 255, 255];
                
                if (value <= 0.5) {
                    // Interpolate between color0 and color1
                    const t = value * 2; // Normalize to 0-1 for first half
                    output = Lerpp(color0, color1, t);
                } else {
                    // Interpolate between color1 and color2
                    const t = (value - .5) * 2; // Normalize to 0-1 for second half
                    output = Lerpp(color1, color2, t);
                }
                
                // Return RGBA
                return output;
            },
            lib: {
                threshold: this.thresholdValue,
                Lerpp : Lerpp
            }
        });
        
        // Disable interpolation on the raster source's internal context
        this.rasterSource.on('beforeoperations', (event: any) => {
            event.data.threshold = this.thresholdValue;
        });

        const imageLayer = new ImageLayer({
            source: this.rasterSource,
            opacity: 0.7
        });
        
        this.map.addLayer(imageLayer);
        return imageLayer;
    }

    exportPdf(): void {
        const mapElement = this.map.getViewport();
        const greenBox = document.getElementById('green-box');
        
        if (!mapElement || !greenBox) {
            console.error('Elements not found');
            return;
        }

        // Use A4 landscape dimensions (mm)
        const pdfWidth = 297;
        const pdfHeight = 210;
        const pdf = new jsPDF('landscape', 'mm', 'a4');

        // Wait for map render complete before exporting
        this.map.once('rendercomplete', () => {
             // Capture map with overlay
            // We need to pass the parent container of the viewport to capture the overlay as well
            // However, OpenLayers canvas often needs special handling. 
            // In our HTML: <div style="position: relative;">...</div> which is the parent of #ol-map
            const mapTarget = document.getElementById('ol-map');

            if (!mapTarget || !mapTarget.parentElement) return;

            const exportContainer = mapTarget.parentElement;

             html2canvas(exportContainer, { 
                 useCORS: true,
                 allowTaint: false,
                 // Sometimes helper options improve map capture
                 ignoreElements: (element) => {
                     return element.classList.contains('ol-control'); // Exclude controls if desired
                 }
             }).then(mapCanvas => {
                const mapImgData = mapCanvas.toDataURL('image/png');
                const mapProps = pdf.getImageProperties(mapImgData);
                const mapHeight = (mapProps.height * pdfWidth) / mapProps.width;
                
                pdf.addImage(mapImgData, 'PNG', 0, 0, pdfWidth, mapHeight);

                // If we have space on the first page
                let currentY = mapHeight + 10;
                
                html2canvas(greenBox, { 
                    useCORS: true,
                    allowTaint: false 
                }).then(greenBoxCanvas => {
                    const gbImgData = greenBoxCanvas.toDataURL('image/png');
                    const gbProps = pdf.getImageProperties(gbImgData);
                    const gbHeight = (gbProps.height * pdfWidth) / gbProps.width;

                    if (currentY + gbHeight > pdfHeight) {
                        pdf.addPage();
                        currentY = 10;
                    }

                    pdf.addImage(gbImgData, 'PNG', 0, currentY, pdfWidth, gbHeight);
                    pdf.save('map-export.pdf');
                });
            });
        });

        // Trigger a render to ensure 'rendercomplete' fires
        this.map.renderSync();
    }




}
