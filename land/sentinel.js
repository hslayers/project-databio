import sparql_helpers from 'sparql_helpers';
import {Style, Icon, Stroke, Fill, Circle} from 'ol/style';
import { WKT, GeoJSON } from 'ol/format';
import Feature from 'ol/Feature';
import { Vector } from 'ol/source';
import {transform, transformExtent} from 'ol/proj';
import {extend} from 'ol/extent';
import {Polygon, LineString, GeometryType, Point} from 'ol/geom';
import $ from 'jquery';
import VectorLayer from 'ol/layer/Vector';

angular.module('hs.sentinel', ['hs.core', 'hs.map'])

    .directive('hs.sentinel.directive', function () {
        return {
            template: require('sentineldirective.html')
        };
    })

    .directive('hs.sentinel.toolbar', function () {
        return {
            template: require('sentineltoolbar.html')
        };
    })


    .service("hs.sentinel.service", ['Core', 'hs.utils.service', '$http',
        function (Core, utils, $http) {
            var me = {
                getCrossings: function (points, cb) {
                    var payload = [];
                    for (var i = 0; i < points.length; i++) {
                        var p = points[i];
                        payload.push({
                            idx: i,
                            lat: p.lat,
                            lon: p.lon
                        });
                    }
                    $.ajax({
                        url: 'https://agmeos.cz/satellite_position/service.php',
                        type: "POST",
                        data: JSON.stringify(payload),
                        contentType: "application/json; charset=utf-8",
                        dataType: "json"
                    }).done(function (response) {
                        for (var i = 0; i < response.length; i++) {
                            delete response[i].mkr;
                            points[i].crossings = response[i];
                        }
                        cb();
                    });
                },
                createLayer() {
                    var src = new Vector();
                    src.cesiumStyler = function (dataSource) {
                        var entities = dataSource.entities.values;
                        for (var i = 0; i < entities.length; i++) {
                            var entity = entities[i];
                            if (entity.styled) continue;
                            entity.billboard.image = './symbols/other.png';
                            entity.billboard.eyeOffset = new Cesium.Cartesian3(0.0, 0.0, -100.0);
                            entity.label = new Cesium.LabelGraphics({
                                text: entity.properties.ix.getValue().toString(),
                                font: '18px Helvetica',
                                fillColor: Cesium.Color.WHITE,
                                outlineColor: new Cesium.Color(0.1, 0.1, 0.1, 0.9),
                                showBackground: true,
                                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                                pixelOffset: new Cesium.Cartesian2(0, -26),
                                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                                eyeOffset: new Cesium.Cartesian3(0.0, 0.0, -200.0)
                            })
                            entity.styled = true;
                            //entity.onclick = entityClicked
                        }
                    }
                    var lyr = new VectorLayer({
                        title: "Sentinel crossings",
                        source: src,
                        visible: true,
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
                    me.src = src;
                    me.lyr = lyr;
                    return lyr;
                }
            };
            return me;
        }
    ])
    .controller('hs.sentinel.controller', ['$scope', 'hs.map.service', 'Core', 'config', 'hs.sentinel.service', '$timeout',
        function ($scope, OlMap, Core, config, service, styles, $timeout) {
            $scope.points = [];
            $scope.loading = false;
            $scope.$on('cesium_position_clicked', function (event, data) {
                $scope.points.push({
                    lon: data[0].toFixed(2),
                    lat: data[1].toFixed(2),
                    ix: $scope.points.length
                });
                service.src.addFeatures([new Feature({
                    geometry: new Point(transform([data[0], data[1]], 'EPSG:4326', OlMap.map.getView().getProjection().getCode())),
                    ix: $scope.points.length - 1
                })]);
                service.src.dispatchEvent('features:loaded', service.src);
                if (!$scope.$$phase) $scope.$apply();
            });

            $scope.getCrossings = function () {
                $scope.loading = true;
                service.getCrossings($scope.points, function () {
                    $scope.loading = false;
                    if (!$scope.$$phase) $scope.$apply();
                })
            };

            $scope.clear = function () {
                $scope.points = [];
                service.src.clear();
                service.src.dispatchEvent('features:loaded', service.src);
            }

            $scope.$emit('scope_loaded', "Sentinel");
        }
    ]);
