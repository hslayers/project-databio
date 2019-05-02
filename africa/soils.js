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
                entity.original_color = new Cesium.Color.fromCssColorString(entity.properties.soilType ? utils.rainbow($scope.soilTypes.length, $scope.soilTypes.indexOf(entity.properties.soilType.getValue()), 0.8) : 'rgba(237, 189, 113, 0.6)');
                entity.polygon.material = new Cesium.ColorMaterialProperty(entity.original_color);
                var polyPositions = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions;
                var polyCenter = Cesium.BoundingSphere.fromPoints(polyPositions).center;
                polyCenter = Cesium.Ellipsoid.WGS84.scaleToGeodeticSurface(polyCenter);
                entity.position = polyCenter;
                entity.label = new Cesium.LabelGraphics({
                    text: entity.properties.code.getValue(),
                    font: '16px Helvetica',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    showBackground: true,
                    style: Cesium.LabelStyle.FILL,
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(10.0, 10000.0),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    scaleByDistance: new Cesium.NearFarScalar(500, 1, 20000, 0.0),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                })
                entity.styled = true;
                entity.onclick = entityClicked
            }
        }

        var me = {
            get: function(map, utils, rect) {
                if (map.getView().getResolution() > lyr.getMaxResolution() || lyr.getVisible() == false) return;

                function prepareCords(c) {
                    return c.toString().replaceAll(',', ' ')
                }
                var extents = `POLYGON ((${prepareCords(rect[0])}, ${prepareCords(rect[1])}, ${prepareCords(rect[2])}, ${prepareCords(rect[3])}, ${prepareCords(rect[0])}, ${prepareCords(rect[1])}))`;
                var soilTypeFilter = $scope.soilType == 'All' ? '' : `FILTER(STRSTARTS(STR(?soilTypeName),"${$scope.soilType}") ) .`
                var q = 'https://www.foodie-cloud.org/sparql?default-graph-uri=&query=' + encodeURIComponent(`

                PREFIX geo: <http://www.opengis.net/ont/geosparql#>
                PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
                PREFIX virtrdf:	<http://www.openlinksw.com/schemas/virtrdf#> 
                PREFIX poi: <http://www.openvoc.eu/poi#> 
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX foodie-cz: <http://foodie-cloud.com/model/foodie-cz#>
                PREFIX foodie: <http://foodie-cloud.com/model/foodie#>
                PREFIX olu: <http://w3id.org/foodie/olu#>
                PREFIX common: <http://portele.de/ont/inspire/baseInspire#>
                PREFIX iso19103: <http://def.seegrid.csiro.au/isotc211/iso19103/2005/basic#>
                PREFIX soilType: <http://foodie-cloud.com/model/foodie/code/PropertyTypeValue/soilType>
                
                SELECT ?site ?soilTypeName ?code ?coordSite ?coordSoil
                FROM <http://w3id.org/foodie/open/kenya/ke_crops_size#>
                WHERE{ 
                    ?site a foodie:Site ;
                          rdfs:label ?site_label ;
                          foodie:code ?code ;
                          geo:hasGeometry ?geoSite .
                    ?geoSite geo:asWKT  ?coordSite .
                    FILTER(bif:st_may_intersect(?coordSite, ?coordSoil)) .
                    {
                      SELECT ?soilTypeName ?coordSoil
                      FROM <http://w3id.org/foodie/open/kenya/soil_maps#>
                      WHERE {
                         ?soil a foodie:Plot ;
                                 geo:hasGeometry ?geoSoil .
                         ?soil foodie:soilProperty ?soil_type.
                         ?soil_type a foodie:PropertyType .
                         ?soil_type foodie:propertyType soilType: .
                         ?soil_type foodie:propertyName ?soilTypeName .
                         ?geoSoil geo:asWKT ?coordSoil .
                         ${soilTypeFilter}
                         FILTER(bif:st_may_intersect (?coordSoil, bif:st_geomFromText("${extents}"))) .
                      } 
                   }
                }
                `) + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on';
                sparql_helpers.startLoading(src, $scope);
                $.ajax({
                        url: q
                    })
                    .done(function(response) {
                        sparql_helpers.fillFeatures(src, 'coordSoil', response, 'code', {
                            site: 'site',
                            code: 'code',
                            soilType: 'soilTypeName'
                        }, map, $scope, $scope)
                    })
            },
            createLayer: function(gettext) {
                lyr = new ol.layer.Vector({
                    title: gettext("Fields with soil type"),
                    maxResolution: 4.777314267823516 * 2 * 2 * 2 * 2 * 2,
                    source: src,
                    visible: false,
                    style: function(feature, resolution) {
                        return [
                            new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    color: 'rgba(237, 189, 113, 0.6)',
                                    width: 2
                                }),
                                fill: new ol.style.Fill({
                                    color: 'rgba(237, 189, 113, 0.8)'
                                })
                            })
                        ];
                    }
                });
                return lyr;
            },
            fillClassificators() {
                var q = 'https://www.foodie-cloud.org/sparql?default-graph-uri=&query=' + encodeURIComponent(`PREFIX geo: <http://www.opengis.net/ont/geosparql#>
                PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
                PREFIX virtrdf:	<http://www.openlinksw.com/schemas/virtrdf#> 
                PREFIX poi: <http://www.openvoc.eu/poi#> 
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX foodie: <http://foodie-cloud.com/model/foodie#>
                PREFIX olu: <http://w3id.org/foodie/olu#>
                PREFIX common: <http://portele.de/ont/inspire/baseInspire#>
                PREFIX soilType: <http://foodie-cloud.com/model/foodie/code/PropertyTypeValue/soilType>
                
                SELECT DISTINCT ?name 
                FROM <http://w3id.org/foodie/open/kenya/soil_maps#>
                WHERE {
                ?s a foodie:PropertyType .
                ?s foodie:propertyType soilType: .
                ?s foodie:propertyName ?name
                } 
                
                
                `) + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on';
                $.ajax({
                        url: q
                    })
                    .done(function(response) {
                        $scope.soilTypes = response.results.bindings.map(function(r) {
                            return r.name.value;
                        })
                        $scope.soilTypes.unshift('All');
                    })
            },
            getLayer() {
                return lyr;
            },
            init: function(_$scope, _$compile, _map, _utils) {
                $scope = _$scope;
                $compile = _$compile;
                map = _map;
                utils = _utils;
                me.fillClassificators();
            }
        }
        return me;
    }
)
