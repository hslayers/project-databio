define(['ol', 'sparql_helpers'],

    function(ol, sparql_helpers) {
        var src = new ol.source.Vector();
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

        src.cesiumStyler = function(dataSource) {
            var entities = dataSource.entities.values;
            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                if (entity.styled) continue;
                entity.polygon.outline = false;
                entity.original_color = new Cesium.Color.fromCssColorString('rgba(40, 150, 40, 0.6)');
                entity.polygon.material = new Cesium.ColorMaterialProperty(entity.original_color);
                entity.styled = true;
                entity.onmouseup = entityClicked
            }
        }

        var me = {
            get: function(map, utils, rect, zoomTo) {
                if (lyr.getVisible() == false) return;

                function prepareCords(c) {
                    return c.toString().replaceAll(',', ' ')
                }
                var extents = `POLYGON ((${prepareCords(rect[0])}, ${prepareCords(rect[1])}, ${prepareCords(rect[2])}, ${prepareCords(rect[3])}, ${prepareCords(rect[0])}, ${prepareCords(rect[1])}))`;
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

SELECT ?site ?code ?area_value ?area_uom_label (group_concat(concat(?landUseLabel) ; separator = "; ") as ?landUse) ?coordSite
FROM <http://w3id.org/foodie/open/kenya/ke_crops_size#>
WHERE{ 
    ?site a foodie:Site ;
          rdfs:label ?site_label ;
          foodie:code ?code ;
          olu:specificLandUse ?landUse ;
          iso19103:measure ?area ;
          geo:hasGeometry ?geoSite .
    ?geoSite geo:asWKT  ?coordSite .
    ?area iso19103:value ?area_value ;
          iso19103:uom ?area_uom .
    ?area_uom rdfs:label ?area_uom_label .
    ?landUse skos:prefLabel ?landUseLabel .
    FILTER(STRSTARTS(STR(?code),"${$scope.ctvdpd}") )            
}
GROUP BY ?site ?code ?area_value ?area_uom_label ?coordSite 


                `) + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on';

                sparql_helpers.startLoading(src, $scope);
                $.ajax({
                        url: q
                    })
                    .done(function(response) {
                        sparql_helpers.fillFeatures(src, 'coordSite', response, 'code', {
                            site: 'site',
                            area_value: 'area_value',
                            area_uom_label: 'area_uom_label',
                            landUse: 'landUse',
                            code: 'code'
                        }, map, $scope);
                        if (zoomTo) sparql_helpers.zoomToFetureExtent(src, me.cesium.viewer.camera, map);
                    })
            },
            createLayer: function(gettext) {
                lyr = new ol.layer.Vector({
                    title: gettext("Fields filtered by LCCS code"),
                    source: src,
                    visible: false,
                    style: function(feature, resolution) {
                        return [
                            new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    color: 'rgba(40, 150, 40, 0.6)',
                                    width: 2
                                }),
                                fill: new ol.style.Fill({
                                    color: 'rgba(40, 150, 40, 0.8)'
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
            init: function(_$scope, _$compile, _map, _utils) {
                $scope = _$scope;
                $compile = _$compile;
                map = _map;
                utils = _utils;
            }
        }
        return me;
    }
)
