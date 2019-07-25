import $ from 'jquery';
import sparql_helpers from 'sparql_helpers';
import {Style, Icon, Stroke, Fill, Circle} from 'ol/style';
import { WKT, GeoJSON } from 'ol/format';
import Feature from 'ol/Feature';
import { Vector } from 'ol/source';
import {transform, transformExtent} from 'ol/proj';
import {extend} from 'ol/extent';
import VectorLayer from 'ol/layer/Vector';

var src = new Vector();
var $scope;
var $compile;
var map;
var utils;
var lyr;
var selected_entity;

function entityClicked(entity) {
    if (selected_entity) selected_entity.polygon.material.color = entity.original_color;
    selected_entity = entity;
    entity.polygon.material.color = new Cesium.Color.fromCssColorString('rgba(250, 250, 250, 0.6)');
}

function createLabel(entity) {
    var polyPositions = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions;
    var polyCenter = Cesium.BoundingSphere.fromPoints(polyPositions).center;
    polyCenter = Cesium.Ellipsoid.WGS84.scaleToGeodeticSurface(polyCenter);
    entity.position = polyCenter;
    entity.label = new Cesium.LabelGraphics({
        text: entity.properties.code.getValue() + (entity.properties.cropName ? ' ' + entity.properties.cropName.getValue() : '') + (entity.properties.use ? ' ' + entity.properties.use.getValue() : ''),
        font: '16px Helvetica',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        showBackground: true,
        style: Cesium.LabelStyle.FILL,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(10.0, 20000.0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 2.0, 15000, 0.0),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    })
}

function findCropNameIndex(cropName) {
    for (var i = 0; i < $scope.cropTypes.length; i++) {
        if ($scope.cropTypes[i].name == cropName) return i;
    }
}

src.cesiumStyler = function (dataSource) {
    var entities = dataSource.entities.values;
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        if (entity.styled) continue;
        entity.polygon.outline = false;
        entity.polygon.material = new Cesium.ColorMaterialProperty(entity.original_color);
        entity.original_color = new Cesium.Color.fromCssColorString(entity.properties.cropName ? utils.rainbow($scope.cropTypes.length, findCropNameIndex(entity.properties.cropName.getValue()), 0.8) : 'rgba(150, 40, 40, 0.6)');
        entity.polygon.material = new Cesium.ColorMaterialProperty(entity.original_color);
        createLabel(entity);
        entity.styled = true;
        entity.onmouseup = entityClicked
    }
}

var me = {
    get: function (map, utils) {
        if (lyr.getVisible() == false) return;
        var q = 'https://www.foodie-cloud.org/sparql?default-graph-uri=&query=' + encodeURIComponent(`
                PREFIX geo: <http://www.opengis.net/ont/geosparql#>
                PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
                PREFIX virtrdf:	<http://www.openlinksw.com/schemas/virtrdf#> 
                PREFIX poi: <http://www.openvoc.eu/poi#> 
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX foodie-cz: <http://foodie-cloud.com/model/foodie-cz#>
                PREFIX foodie: <http://foodie-cloud.com/model/foodie#>
                PREFIX common: <http://portele.de/ont/inspire/baseInspire#>
                PREFIX prov: <http://www.w3.org/ns/prov#>
                PREFIX olu: <http://w3id.org/foodie/olu#>
                PREFIX af-inspire: <http://inspire.ec.europa.eu/schemas/af/3.0#>
                
                SELECT ?holding ?plot ?code ?shortId ?landUse ?coordPlot
                FROM <http://w3id.org/foodie/open/cz/pLPIS_180616_WGS#>
                WHERE{ 
                    ?holding a foodie:Holding ;
                       common:identifier ?identifier_ID_UZ ;
                       common:identifierScheme ?inspireIdCodeSpace ;
                       af-inspire:contains ?site .
                    FILTER(STRSTARTS(STR(?identifier_ID_UZ),"${$scope.iduz}") )
                    ?site foodie:containsPlot ?plot .
                    ?plot a foodie:Plot ;
                       foodie:code ?code ;
                       foodie:shortId ?shortId ;
                       olu:specificLandUse ?landUse ;
                       geo:hasGeometry ?geoPlot .
                    ?geoPlot ogcgs:asWKT  ?coordPlot .  
                     }

                `) + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on';

        sparql_helpers.startLoading(src, $scope);
        $.ajax({
            url: q
        })
            .done(function (response) {
                sparql_helpers.fillFeatures(src, 'coordPlot', response, 'code', {
                    holding: 'holding',
                    plot: 'plot',
                    shortId: 'shortId',
                    code: 'code',
                    use: 'landUse'
                }, map, $scope);
                sparql_helpers.zoomToFetureExtent(src, me.cesium.viewer.camera, map);
            })
    },
    getCropTypes: function (map, utils) {
        if (lyr.getVisible() == false) return;
        var q = 'https://www.foodie-cloud.org/sparql?default-graph-uri=&query=' + encodeURIComponent(`
                PREFIX geo: <http://www.opengis.net/ont/geosparql#>
                PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
                PREFIX virtrdf:	<http://www.openlinksw.com/schemas/virtrdf#> 
                PREFIX poi: <http://www.openvoc.eu/poi#> 
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX foodie-cz: <http://foodie-cloud.com/model/foodie-cz#>
                PREFIX foodie: <http://foodie-cloud.com/model/foodie#>
                PREFIX common: <http://portele.de/ont/inspire/baseInspire#>
                PREFIX prov: <http://www.w3.org/ns/prov#>
                PREFIX olu: <http://w3id.org/foodie/olu#>
                PREFIX af-inspire: <http://inspire.ec.europa.eu/schemas/af/3.0#>
                PREFIX iso19103: <http://def.seegrid.csiro.au/isotc211/iso19103/2005/basic#> 

                SELECT DISTINCT ?plot ?plotName ?codeLPIS ?shortId ?cropName ?cropArea ?year ?coordPlot
                FROM <http://w3id.org/foodie/core/cz/CZpilot_fields#>
                WHERE{ 
                    ?plot a foodie:Plot ;
                    foodie:crop ?cropSpecies ;
                    geo:hasGeometry ?geoPlot .
                    OPTIONAL {?plot rdfs:label ?plotName } .
                    OPTIONAL {?plot foodie:shortId ?shortId } .
                    ?geoPlot ogcgs:asWKT  ?coordPlot .
                    ?cropSpecies iso19103:measure ?cropMeasure ;
                    common:validFrom ?validFrom ;
                    foodie:cropSpecies ?cropType .
                    ?cropType rdfs:label ?cropName .
                    ?cropMeasure iso19103:value ?cropArea .
                    BIND (year(xsd:dateTime(?validFrom)) as ?year) .
                    ?plot foodie:code ?codeLPIS .
                    {
                       SELECT DISTINCT ?codeLPIS
                       FROM <http://w3id.org/foodie/open/cz/pLPIS_180616_WGS#> 
                       WHERE {
                         ?holdingLPIS a foodie:Holding ;
                          common:identifier ?identifier_ID_UZ ;
                          af-inspire:contains ?siteLPIS .
                       FILTER(STRSTARTS(STR(?identifier_ID_UZ),"${$scope.iduz}") )
                       ?siteLPIS foodie:containsPlot ?plotLPIS .
                       ?plotLPIS a foodie:Plot ;
                          foodie:code ?codeLPIS .
                      }
                    }  
                    #FILTER (?year=2017)     
                }
                

                `) + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on';

        sparql_helpers.startLoading(src, $scope);
        $.ajax({
            url: q
        })
            .done(function (response) {
                sparql_helpers.fillFeatures(src, 'coordPlot', response, 'codeLPIS', {
                    plot: 'plot',
                    'plotName': 'plotName',
                    shortId: 'shortId',
                    code: 'codeLPIS',
                    'cropName': 'cropName',
                    'cropArea': 'cropArea',
                    year: 'year'
                }, map, $scope);
                sparql_helpers.zoomToFetureExtent(src, me.cesium.viewer.camera, map);
            })
    },
    createLayer: function (gettext) {
        lyr = new VectorLayer({
            title: gettext("Fields by ID_UZ attribute from LPIS db"),
            source: src,
            visible: false,
            style: function (feature, resolution) {
                return [
                    new Style({
                        stroke: new Stroke({
                            color: 'rgba(0, 0, 0, 1)',
                            width: 2
                        })
                    })
                ];
            }
        });
        return lyr;
    },
    getLayer() {
        return lyr;
    },
    init: function (_$scope, _$compile, _map, _utils) {
        $scope = _$scope;
        $compile = _$compile;
        map = _map;
        utils = _utils;
    }
}

export default me;