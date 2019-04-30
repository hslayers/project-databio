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
                var name = entity.properties.code;
                var use = entity.properties.use.getValue();
                entity.polygon.outline = false;
                /*entity.polygon.outline = true;
                entity.polygon.outlineColor = Cesium.Color.YELLOW;
                entity.polygon.outlineWidth = 2.0;*/
                entity.original_color = new Cesium.Color.fromCssColorString('rgba(50, 50, 150, 0.6)');
                entity.polygon.material = new Cesium.ColorMaterialProperty(entity.original_color);
                entity.styled = true;
                entity.onmouseup = entityClicked
            }
        }

        var me = {
            get: function(map, utils, rect) {
                if (typeof $scope.last_center == 'undefined') return;
                if (map.getView().getResolution() > lyr.getMaxResolution() * (typeof me.map_mode == 'cesium' ? 0.5 : 1) || lyr.getVisible() == false) return;

                function prepareCords(c) {
                    return c.toString().replaceAll(',', ' ')
                }
                var extents = `POLYGON ((${prepareCords(rect[0])}, ${prepareCords(rect[1])}, ${prepareCords(rect[2])}, ${prepareCords(rect[3])}, ${prepareCords(rect[0])}, ${prepareCords(rect[1])}))`;
                var distance = $scope.proximity * ((1 / 110540) + 1 / (111320 * Math.cos($scope.last_center[1]))) / 2;
                var q = 'https://www.foodie-cloud.org/sparql?default-graph-uri=&query=' + encodeURIComponent(`
                PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX virtrdf:	<http://www.openlinksw.com/schemas/virtrdf#> 
PREFIX poi: <http://www.openvoc.eu/poi#> 
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foodie: <http://foodie-cloud.com/model/foodie#>
PREFIX olu: <http://w3id.org/foodie/olu#>
PREFIX foodie-water_body: <http://foodie-cloud.com/model/foodie/water-body#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>


SELECT DISTINCT ?site ?code ?landUse ?coordSiteFinal
FROM <http://w3id.org/foodie/open/kenya/ke_crops_size#>
WHERE {
   ?site geo:hasGeometry ?geoSiteFinal .
   ?geoSiteFinal geo:asWKT  ?coordSiteFinal .
   FILTER(bif:st_intersects(?coordSiteFinal, ?coordWBody, ${distance})) .
   
   GRAPH ?graph1 {
      SELECT ?site ?code (group_concat(concat(?landUseLabel) ; separator = "; ") as ?landUse)
      FROM <http://w3id.org/foodie/open/kenya/ke_crops_size#>
      WHERE{ 
         ?site a foodie:Site ;
            foodie:code ?code ;
            olu:specificLandUse ?landUseCode ;
            geo:hasGeometry ?geoSite .
         ?geoSite geo:asWKT  ?coordSite .
         FILTER(bif:st_may_intersect (?coordSite, bif:st_geomFromText("${extents}"))) .   
         ?landUseCode skos:prefLabel ?landUseLabel
       }
       GROUP BY ?site ?code
   }
   GRAPH ?graph2 {
      SELECT ?waterBody ?label ?coordWBody 
      FROM <http://w3id.org/foodie/open/africa/water_body#>
      WHERE {
   	?waterBody a foodie-water_body:WaterBody ;
               geo:hasGeometry ?geoWBody .
   	?geoWBody geo:asWKT ?coordWBody .
   	FILTER(bif:st_may_intersect (?coordWBody, bif:st_geomFromText("${extents}"))) .
   	OPTIONAL {?waterBody rdfs:label ?label}
      }
   }
}

                `) + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on';

                sparql_helpers.startLoading(src, $scope);
                $.ajax({
                        url: q
                    })
                    .done(function(response) {
                        sparql_helpers.fillFeatures(src, 'coordSiteFinal', response, 'code', {
                            parcel: 'code',
                            site: 'site',
                            use: 'landUse'
                        }, map, $scope)
                    })
            },
            createLayer: function(gettext) {
                lyr = new ol.layer.Vector({
                    title: gettext("Parcels near region"),
                    source: src,
                    visible: false,
                    maxResolution: 4.777314267823516 * 4,
                    style: function(feature, resolution) {
                        var use = feature.get('use').split('/');
                        use = use[use.length - 1];
                        return [
                            new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    color: 'rgba(50, 50, 150, 0.8)',
                                    width: 2
                                }),
                                fill: new ol.style.Fill({
                                    color: 'rgba(50, 50, 150, 0.6)'
                                })
                            }),

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
                $scope.proximity = 5;
                $compile = _$compile;
                map = _map;
                utils = _utils;
            }
        }
        return me;
    }
)
