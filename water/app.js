'use strict';
import 'cesium/Build/Cesium/Widgets/widgets.css';

import $ from 'jquery';
import 'toolbar.module';
import 'print.module';
import 'query.module';
import 'search.module';
import 'measure.module';
import 'permalink.module';
import 'info.module';
import 'datasource-selector.module';
import 'sidebar.module';
import 'add-layers.module';
import bootstrapBundle from 'bootstrap/dist/js/bootstrap.bundle';
import moment from 'moment';
global.moment = moment;
import momentInterval from 'moment-interval/src/moment-interval'
import 'hscesium.module';
import { Tile, Image as ImageLayer , Group} from 'ol/layer';
import { TileWMS, WMTS, OSM, XYZ } from 'ol/source';
import {ImageWMS, ImageArcGISRest} from 'ol/source';
import View from 'ol/View';
import {transform, transformExtent} from 'ol/proj';

var module = angular.module('hs', [
    'hs.toolbar',
    'hs.layermanager',
    'hs.query',
    'hs.search', 'hs.print', 'hs.permalink',
    'hs.datasource_selector',
    'hs.geolocation',
    'hs.cesium',
    'hs.sidebar',
    'hs.addLayers'
]);

module.directive('hs', ['hs.map.service', 'Core', '$compile', '$timeout', function (OlMap, Core, $compile, $timeout) {
    return {
        template: Core.hslayersNgTemplate,
        link: function (scope, element) {
            $timeout(function () {
                Core.fullScreenMap(element)
            }, 0);
        }
    };
}]);

module.directive('hs.hud', function () {
    return {
        template:require('./hud.html'),
        link: function (scope, element, attrs) {

        }
    };
});

function getHostname() {
    var url = window.location.href
    var urlArr = url.split("/");
    var domain = urlArr[2];
    return urlArr[0] + "//" + domain;
};

function prepareTimeSteps(step_string) {
    var step_array = step_string.split(',');
    var steps = [];
    for (var i = 0; i < step_array.length; i++) {
        if (step_array[i].indexOf('/') == -1) {
            steps.push(new Date(step_array[i]));
            //console.log(new Date(step_array[i]).toISOString());
        } else {
            //"2016-03-16T12:00:00.000Z/2016-07-16T12:00:00.000Z/P30DT12H"
            var interval_def = step_array[i].split('/');
            var step = momentInterval.interval(interval_def[2]);
            var interval = momentInterval.interval(interval_def[0] + '/' + interval_def[1]);
            var z = 0;
            while (interval.start() <= interval.end()) {
                z++;
                if(z>4000) break;
                //console.log(interval.start().toDate().toISOString());
                steps.push(interval.start().toDate());
                var add = step.period();
                var current = moment.utc(interval.start().toDate());
                var newStart = current.add(add).format();
                interval.start(newStart);
            }
        }
    }
    return steps;
}

var layers = [
    new Tile({
        source: new OSM(),
        title: "OpenStreetMap",
        base: true,
        visible: false,
        minimumTerrainLevel: 15
    }),
    /*
                new ImageLayer({
                    title: "Road segments of Open Transport Map vizualized by their average daily traffic volumes",
                    source: new ImageWMS({
                        url: 'https://intenzitadopravy.plzen.eu/wms-t',
                        params: {
                            LAYERS: 'may',
                            VERSION: '1.3.0',
                            FORMAT: "image/png",
                            INFO_FORMAT: "text/html",
                            time: '2018-03-28T09:00:00.000Z',
                            minimumTerrainLevel: 12
                        },
                        crossOrigin: null
                    }),
                    legends: ['http://gis.lesprojekt.cz/wms/transport/open_transport_map?service=WMS&request=GetLegendGraphic&layer=roads__traffic_volumes&version=1.3.0&format=image/png&sld_version=1.1.0'],
                    maxResolution: 8550,
                    visible: false,
                    opacity: 0.7
                }),*/
];

var catchesTimeSteps = prepareTimeSteps('2016-01-01T12:00:00.000Z/2018-01-01T12:00:00.000Z/PT24H');
layers.push(new ImageLayer({
    title: 'Latest temperature',
    source: new ImageWMS({
        url: 'http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/copernicus_marine.map',
        params: {
            LAYERS: 'temperature',
            VERSION: '1.3.0',
            FORMAT: "image/png",
            INFO_FORMAT: "text/html"
        },
        crossOrigin: null
    }),
    legends: [`http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/copernicus_marine.map&REQUEST=GetLegendGraphic&LAYER=temperature`],
    visible: true,
    opacity: 0.7,
}));
layers.push(new ImageLayer({
    title: 'Catches',
    source: new ImageWMS({
        url: 'http://gis-new.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/svalbard.map',
        params: {
            LAYERS: 'composition',
            VERSION: '1.3.0',
            FORMAT: "image/png",
            INFO_FORMAT: "text/html",
            time: catchesTimeSteps[catchesTimeSteps.length - 1].toISOString(),
        },
        crossOrigin: null
    }),
    dimensions: {
        time: {
            name: 'time',
            values: catchesTimeSteps
        }
        /*,
                        species: {
                            name: 'species',
                            label: 'Fish species',
                            values: ['ANF', 'BIB', 'BLL', 'BRB', 'BSS', 'CAA', 'CAR', 'CLU', 'CLX', 'CNZ', 'COC', 'COD', 'COE', 'CRE', 'CRU', 'CSH', 'CTC', 'DAB', 'DGH', 'DGS', 'DGZ', 'DIA', 'DPX', 'ELE', 'FIN', 'FLE', 'GAD', 'GAG', 'GUG', 'GUR', 'GUU', 'GUX', 'HAD', 'HAL', 'HER', 'HKE', 'HOM', 'INV', 'JAX', 'JOD', 'LBE', 'LEM', 'LEZ', 'LIN', 'MAC', 'MEB', 'MEG', 'MGC', 'MNZ', 'MOL', 'MUR', 'MUS', 'MZZ', 'NEP', 'OCZ', 'OYF', 'PEE', 'PIL', 'PLE', 'POK', 'POL', 'POR', 'PPX', 'RED', 'RJB', 'RJC', 'RJE', 'RJH', 'RJI', 'RJM', 'RJN', 'RJR', 'RJU', 'SBX', 'SCE', 'SCL', 'SCR', 'SDV', 'SKA', 'SKH', 'SMD', 'SOL', 'SOS', 'SPR', 'SQC', 'SQZ', 'STU', 'SYC', 'SYT', 'TUR', 'USK', 'WEG', 'WHE', 'WHG', 'WIT', 'WRA', 'ALB', 'BET', 'BFT', 'BSH', 'SAI', 'SWO', 'TUX', 'YFT', 'AES', 'ALC', 'ANE', 'APO', 'ARG', 'ARU', 'ARY', 'BLI', 'BON', 'BOR', 'BSF', 'CAB', 'CAP', 'CAS', 'CAT', 'CMO', 'COA', 'CRA', 'CYO', 'DGX', 'ELP', 'FBR', 'FBU', 'FCC', 'FCP', 'FID', 'FLX', 'FPE', 'FPI', 'FPP', 'FRF', 'FRO', 'FTE', 'GAR', 'GFB', 'GHL', 'GRC', 'GRO', 'GUQ', 'KEF', 'LEF', 'LUM', 'MON', 'MSX', 'MUL', 'MUX', 'NOP', 'ORY', 'PEL', 'PLA', 'PLN', 'PRA', 'RNG', 'SAL', 'SAN', 'SBR', 'SCB', 'SCK', 'SFS', 'SHD', 'SIX', 'SME', 'SQI', 'SQR', 'SQU', 'SRA', 'SRX', 'SSD', 'STB', 'TRO', 'TRS', 'VMA', 'WHB', 'AAS', 'ABK', 'AFT', 'BLE', 'BLF', 'CEP', 'CLQ', 'CPR', 'CRN', 'CTL', 'ELZ', 'FAC', 'FBM', 'FRS', 'GAS', 'GDG', 'GOB', 'GPA', 'GTA', 'HOU', 'KCS', 'KCT', 'MYG', 'NKR', 'OOA', 'PER', 'POA', 'POC', 'POD', 'QSC', 'RBO', 'REB', 'REG', 'SCO', 'SCU', 'SCX', 'SKB', 'SSI', 'STF', 'STH', 'SVE', 'THS', 'TRR', 'TSD', 'ULO', 'URS', 'URX', 'USB', 'VSP', 'WHX', 'ABZ', 'ACC', 'AGN', 'ALR', 'APU', 'CFB', 'CGO', 'CYP', 'ERO', 'FCY', 'FIE', 'FKU', 'GSK', 'HKW', 'LAR', 'LAS', 'LAU', 'LUH', 'NBU', 'RAJ', 'RHG', 'SHL', 'SRE', 'SWR', 'TGQ', 'VIV', 'AKJ', 'ALF', 'ALM', 'ALV', 'AMB', 'AMX', 'ANK', 'ANN', 'API', 'ARI', 'ASD', 'ASK', 'ATB', 'ATP', 'BAR', 'BAS', 'BBS', 'BDL', 'BEN', 'BGR', 'BHD', 'BHY', 'BIL', 'BLB', 'BLT', 'BLU', 'BOC', 'BOG', 'BOY', 'BPI', 'BRF', 'BRI', 'BRO', 'BRT', 'BRX', 'BSC', 'BSE', 'BSX', 'BTH', 'BUM', 'BUX', 'BXD', 'BYS', 'BZX', 'CBC', 'CBM', 'CBR', 'CCT', 'CDX', 'CEN', 'CEO', 'CET', 'CGX', 'CIL', 'CKL', 'CLS', 'CLV', 'CMK', 'COB', 'COR', 'COU', 'COX', 'CPL', 'CRG', 'CRS', 'CRW', 'CTB', 'CTG', 'CTS', 'CTZ', 'CUT', 'CUX', 'CVJ', 'DCA', 'DCP', 'DEC', 'DEL', 'DEM', 'DEP', 'DEX', 'DIN', 'DOL', 'DON', 'DPS', 'DSX', 'DXL', 'DYL', 'EAG', 'ECE', 'ECH', 'EFJ', 'EJE', 'ELX', 'EOI', 'EPI', 'EQE', 'EQI', 'ETR', 'ETX', 'EZS', 'FAL', 'FAV', 'FIM', 'FLY', 'FOR', 'FOX', 'FRI', 'FRZ', 'FUA', 'GAM', 'GAU', 'GBF', 'GBN', 'GBR', 'GEL', 'GEP', 'GER', 'GEY', 'GGD', 'GGU', 'GGY', 'GKL', 'GLI', 'GOO', 'GPD', 'GPW', 'GPX', 'GRX', 'GSM', 'GUI', 'GUM', 'GUN', 'GUP', 'GUY', 'HDR', 'HLT', 'HLZ', 'HMM', 'HMY', 'HOL', 'HPR', 'HXT', 'IAR', 'IAX', 'IOD', 'ISC', 'ITW', 'JAA', 'JAR', 'JBA', 'JCN', 'JCR', 'JCX', 'JDP', 'JFV', 'JOS', 'JRS', 'JUX', 'KCX', 'KCZ', 'KLK', 'KTG', 'KTT', 'KYX', 'LAG', 'LAZ', 'LBS', 'LCM', 'LDB', 'LDS', 'LDV', 'LEC', 'LEE', 'LHT', 'LIL', 'LIM', 'LIO', 'LIT', 'LNZ', 'LOQ', 'LOS', 'LOX', 'LPS', 'LPZ', 'LQA', 'LTA', 'LYY', 'MAK', 'MAT', 'MAX', 'MAZ', 'MGA', 'MGR', 'MGS', 'MIA', 'MKG', 'MLR', 'MMH', 'MNE', 'MOR', 'MOX', 'MQL', 'MSF', 'MSK', 'MSM', 'MTC', 'MTS', 'MUE', 'MUF', 'MUI', 'MUM', 'MUT', 'MYL', 'NEX', 'NOW', 'NUQ', 'OCC', 'OCM', 'OCT', 'OFJ', 'OFN', 'OGT', 'OIL', 'OMM', 'OMZ', 'OUL', 'OUM', 'OUW', 'OXN', 'OYC', 'OYG', 'PAC', 'PAL', 'PAN', 'PAX', 'PCB', 'PDZ', 'PEN', 'PEZ', 'PIC', 'PLZ', 'PNQ', 'PNV', 'POI', 'POX', 'PRC', 'PRI', 'PRR', 'PSL', 'PUX', 'QPX', 'QTV', 'QUB', 'RAE', 'RAT', 'RAZ', 'RIB', 'RJA', 'RJF', 'RJG', 'RJK', 'RJO', 'RJY', 'RMM', 'RNH', 'ROL', 'RPG', 'RSE', 'RSK', 'SAU', 'SAX', 'SBA', 'SBB', 'SBG', 'SBL', 'SBN', 'SBP', 'SBS', 'SBZ', 'SCF', 'SCS', 'SCY', 'SDH', 'SDS', 'SDU', 'SHB', 'SHO', 'SHX', 'SIL', 'SKJ', 'SKX', 'SLI', 'SLM', 'SLO', 'SLX', 'SMA', 'SNA', 'SNQ', 'SNS', 'SOI', 'SOO', 'SOR', 'SOX', 'SPL', 'SPN', 'SPU', 'SPX', 'SPZ', 'SQE', 'SQM', 'SQY', 'SRG', 'SRJ', 'SRK', 'SRR', 'SSB', 'SSX', 'STI', 'STT', 'STW', 'SWA', 'SWB', 'SWG', 'SWM', 'SWX', 'SYR', 'SYX', 'TCW', 'TDQ', 'TGS', 'THR', 'TIG', 'TJX', 'TOD', 'TOE', 'TPA', 'TQF', 'TRA', 'TRC', 'TRE', 'TRG', 'TRI', 'TRK', 'TRP', 'TRQ', 'TRZ', 'TSU', 'TTR', 'TUN', 'TVY', 'TZY', 'UBS', 'UCA', 'UDP', 'URM', 'USI', 'UUC', 'VAD', 'VEV', 'VLO', 'VNA', 'VNR', 'VSC', 'WAH', 'WEX', 'WHM', 'WOR', 'WRF', 'WRM', 'WSA', 'XOD', 'YFC', 'YFM', 'YFX', 'YNU', 'YRS', 'ZEX', 'ZGP', 'FVE', 'DEA', 'LAX', 'MAV', 'MCA', 'ALK', 'ANG', 'ANT', 'APL', 'ASN', 'ATG', 'BAH', 'BIS', 'BLM', 'BSK', 'CLH', 'CLJ', 'CLP', 'COL', 'COW', 'COZ', 'DCX', 'DOR', 'FLW', 'FMS', 'FUU', 'FUV', 'FYS', 'GEQ', 'GRV', 'HCX', 'HKS', 'HYD', 'ILL', 'IMS', 'JAD', 'KDF', 'KFA', 'KGX', 'KUP', 'LAH', 'LEP', 'LOY', 'LQD', 'LQX', 'LRL', 'LZS', 'MAM', 'MLS', 'MYV', 'OAL', 'ODL', 'OLV', 'OSG', 'OST', 'OYX', 'PIQ', 'PLS', 'PNB', 'RBF', 'RHP', 'SAA', 'SCA', 'SFA', 'SHR', 'SHZ', 'SJA', 'SLS', 'SLZ', 'SNK', 'SPC', 'SQA', 'SSG', 'SSP', 'SWP', 'SWQ', 'TDS', 'TLD', 'TOM', 'TPS', 'TUS', 'TWL', 'UCU', 'ULV', 'UVU', 'WHA', 'WSH', 'YEL', 'APQ', 'BER', 'CAX', 'CDL', 'CMM', 'CRB', 'CRR', 'CYH', 'CYY', 'EEO', 'MOP', 'NEC', 'PHO', 'RCT', 'SAE', 'STC', 'TOP', 'TTO', 'URC', 'CRQ', 'ABX', 'APH', 'BES', 'BRA', 'BSD', 'CGZ', 'CLB', 'CLE', 'CRV', 'CXF', 'FAM', 'GDE', 'HKX', 'HNG', 'JAT', 'LMG', 'LMZ', 'NZA', 'RFT', 'SBF', 'SFV', 'SMP', 'SQL', 'SQS', 'SSM', 'MJW', 'RHC', 'ASU', 'FSC', 'GRA', 'HKR', 'HMZ', 'PCR', 'WHF', 'GMG', 'MXV', 'BSB', 'BUA', 'DEN', 'DUS', 'ERS', 'FCG', 'GOA', 'LOD', 'SQF', 'TOZ', 'ACH', 'CHR', 'CUS', 'ENX', 'JCM', 'KCD', 'MOD', 'TBR', 'TOA', 'ENC', 'SCP', 'SOM', 'AGD', 'AGK', 'AHN', 'AKL', 'ALE', 'ARA', 'ARS', 'ARV', 'AUU', 'AWM', 'BBH', 'BDY', 'BGX', 'BOA', 'BOP', 'BRD', 'BUR', 'BVV', 'CAL', 'CCL', 'CCP', 'CDZ', 'CEM', 'CEX', 'CKW', 'COM', 'CWZ', 'DRS', 'EDT', 'EHI', 'EIK', 'FRL', 'FRX', 'GIT', 'GPB', 'GRB', 'GSQ', 'GUZ', 'HDV', 'HKB', 'HKK', 'HKM', 'HKN', 'HKO', 'HKP', 'HNQ', 'HQM', 'HTU', 'ILI', 'JAI', 'JRW', 'KCB', 'KCP', 'KRJ', 'KYP', 'KYS', 'LKT', 'LKW', 'LMA', 'LQY', 'LVC', 'MDO', 'MDZ', 'MFZ', 'MKF', 'MKU', 'MPN', 'MSP', 'NAU', 'OBN', 'OCS', 'OUB', 'OXY', 'PAR', 'PAU', 'PEW', 'PNI', 'POP', 'POS', 'PRP', 'PSB', 'PSK', 'PSS', 'PVR', 'PXV', 'QPH', 'RCW', 'RDC', 'REA', 'RGL', 'RTX', 'RUB', 'RXY', 'SAO', 'SDR', 'SNI', 'SOC', 'SOP', 'SOT', 'SPF', 'SRQ', 'SSA', 'SSH', 'STG', 'SUT', 'TDF', 'THF', 'TMP', 'TOX', 'TRB', 'URA', 'XKX', 'YLL', 'YOI', 'YOX', 'YTC', 'YTL', 'BUT', 'EMM', 'EOG', 'HEP', 'KIM', 'LXX', 'PIN', 'SMR', 'EEL', 'TAS', 'TLV', 'ULT']
                        },
                        country: {
                            name: 'country',
                            label: 'Country',
                            values: ['BE', 'CN', 'DE', 'DK', 'EE', 'ES', 'FI', 'FO', 'FR', 'GB', 'GG', 'GL', 'IE', 'IM', 'IS', 'JE', 'JP', 'KR', 'LT', 'LV', 'LY', 'NL', 'NO', 'PL', 'PT', 'RU', 'SE', 'TW']
                        }*/
    },
    legends: [`http://gis-new.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/svalbard.map&REQUEST=GetLegendGraphic&LAYER=composition`],
    visible: false,
    opacity: 0.7,
}));

layers.push(new ImageLayer({
    title: 'Cod catches (2016-2017), year, amount and distance',
    source: new ImageWMS({
        url: 'http://gis-new.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/svalbard.map',
        params: {
            LAYERS: 'cod_catches_distance',
            VERSION: '1.3.0',
            FORMAT: "image/png",
            INFO_FORMAT: "text/html"
        },
        crossOrigin: null
    }),
    legends: [`http://gis-new.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/svalbard.map&REQUEST=GetLegendGraphic&LAYER=code_catches_distance&format=image/png&STYLE=default`],
    visible: false,
    opacity: 0.9,
}));

angular.forEach(['in_winter', 'in_summer', 'in_spring', 'in_autumn'], function (lyr) {
    layers.push(new ImageLayer({
        title: 'Cod catches ' + lyr + ', year, amount and distance',
        source: new ImageWMS({
            url: 'http://gis-new.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/svalbard.map',
            params: {
                LAYERS: lyr,
                VERSION: '1.3.0',
                FORMAT: "image/png",
                INFO_FORMAT: "text/html",
            },
            crossOrigin: null
        }),
        legends: [`http://gis-new.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/svalbard.map&REQUEST=GetLegendGraphic&LAYER=${lyr}&format=image/png&STYLE=default`],
        visible: false,
        opacity: 0.9,
    }));
})

var caps = $.ajax({
    type: "GET",
    url: '/cgi-bin/hsproxy.cgi?url=' + encodeURIComponent('http://nrt.cmems-du.eu/thredds/wms/global-analysis-forecast-phy-001-024?service=WMS&request=GetCapabilities'),
    async: false
}).responseText;

var depths = '-0.49402499198913574,-1.5413750410079956,-2.6456689834594727,-3.8194949626922607,-5.078224182128906,-6.440614223480225,-7.92956018447876,-9.572997093200684,-11.404999732971191,-13.467140197753906,-15.810070037841797,-18.495559692382812,-21.598819732666016,-25.211410522460938,-29.444730758666992,-34.43415069580078,-40.344051361083984,-47.37369155883789,-55.76428985595703,-65.80726623535156,-77.85385131835938,-92.3260726928711,-109.72930145263672,-130.66600036621094,-155.85069274902344,-186.12559509277344,-222.47520446777344,-266.0403137207031,-318.1274108886719,-380.2130126953125,-453.9377136230469,-541.0889282226562,-643.5667724609375,-763.3331298828125,-902.3392944335938,-1062.43994140625,-1245.291015625,-1452.2509765625,-1684.2840576171875,-1941.8929443359375,-2225.077880859375,-2533.3359375,-2865.702880859375,-3220.820068359375,-3597.031982421875,-3992.48388671875,-4405.22412109375,-4833.291015625,-5274.7841796875,-5727.9169921875';

angular.forEach([{
    title: "Density ocean mixed layer thickness",
    layer: 'mlotst',
    style: 'boxfill/ferret',
    palette: 'ferret'
},
{
    title: "Sea surface height",
    layer: 'zos',
    style: 'boxfill/ncview',
    palette: 'ncview'
},
{
    title: "Sea floor potential temperature",
    layer: 'bottomT',
    style: 'boxfill/occam',
    palette: 'occam'
},
{
    title: "Sea ice thickness",
    layer: 'sithick',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
},
{
    title: "Ice concentration",
    layer: 'siconc',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
},
{
    title: "Temperature",
    layer: 'thetao',
    style: 'boxfill/rainbow',
    palette: 'rainbow',
    elevation: depths
},
{
    title: "Salinity",
    layer: 'so',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
},
{
    title: "Automatically-generated sea ice velocity vector field",
    layer: 'sea_ice_velocity',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
}
], function (def) {
    if (caps.indexOf('not found') > -1) return;
    var timeInterval = $("Layer Name:contains('" + def.layer + "')", caps).parent().find('Dimension[name="time"]').html();
    if(typeof timeInterval == 'undefined') return;
    var timeSteps = prepareTimeSteps(timeInterval);
    var elevations;
    if ($("Layer Name:contains('" + def.layer + "')", caps).parent().find('Dimension[name="elevation"]').length > 0)
        elevations = $("Layer Name:contains('" + def.layer + "')", caps).parent().find('Dimension[name="elevation"]').html();
    layers.push(new ImageLayer({
        title: def.title,
        source: new ImageWMS({
            url: 'http://nrt.cmems-du.eu/thredds/wms/global-analysis-forecast-phy-001-024?',
            params: {
                LAYERS: def.layer,
                VERSION: '1.3.0',
                FORMAT: "image/png",
                INFO_FORMAT: "text/html",
                time: timeSteps[timeSteps.length - 1].toISOString(),
                STYLE: def.style
            },
            crossOrigin: null
        }),
        legends: [`http://nrt.cmems-du.eu/thredds/wms/global-analysis-forecast-phy-001-024?REQUEST=GetLegendGraphic&LAYER=${def.layer}&PALETTE=${def.palette}`],
        dimensions: {
            time: {
                name: 'time',
                values: timeSteps
            },
            elevation: def.elevation ? {
                name: 'elevation',
                label: 'depth',
                values: elevations.split(',')
            } : undefined
        },
        visible: def.visible || false,
        opacity: 0.7,
        path: '<small>Daily mean fields from Global Ocean Physics Analysis and Forecast, updated daily GLOBAL_ANALYSIS_FORECAST_PHY_001_024'
    }));
});

caps = $.ajax({
    type: "GET",
    url: '/cgi-bin/hsproxy.cgi?url=' + encodeURIComponent('http://nrt.cmems-du.eu/thredds/wms/dataset-global-analysis-forecast-bio-001-014?service=WMS&request=GetCapabilities'),
    async: false
}).responseText;

angular.forEach([{
    title: "Mole Concentration of Dissolved iron in Sea Water",
    layer: 'Fe',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
},
{
    title: "Mole Concentration of Nitrate in Sea Water",
    layer: 'NO3',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
},
{
    title: "Mole Concentration of Dissolved Oxygen in Sea Water",
    layer: 'O2',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
},
{
    title: "Mole Concentration of Phosphate in Sea Water",
    layer: 'PO4',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
},
{
    title: "Mole Concentration of Silicate in Sea Water",
    layer: 'Si',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
},
{
    title: "Net Primary Productivity of Carbon Per Unit Volume",
    layer: 'PP',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
},
{
    title: "Mass Concentration of Chlorophyll in Sea Water",
    layer: 'CHL',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
},
{
    title: "Mole Concentration of Phytoplankton expressed as carbon in sea water",
    layer: 'PHYC',
    style: 'boxfill/rainbow',
    palette: 'rainbow'
}

], function (def) {
    if (caps.indexOf('not found') > -1) return;
    var timeInterval = $("Layer Name:contains('" + def.layer + "')", caps).parent().find('Dimension[name="time"]').html();
    if(typeof timeInterval =='undefined') return;
    var timeSteps = prepareTimeSteps(timeInterval);
    layers.push(new ImageLayer({
        title: def.title,
        source: new ImageWMS({
            url: 'http://nrt.cmems-du.eu/thredds/wms/dataset-global-analysis-forecast-bio-001-014',
            params: {
                LAYERS: def.layer,
                VERSION: '1.3.0',
                FORMAT: "image/png",
                INFO_FORMAT: "text/html",
                time: timeSteps[timeSteps.length - 1].toISOString(),
                STYLE: def.style
            },
            crossOrigin: null
        }),
        legends: [`http://nrt.cmems-du.eu/thredds/wms/dataset-global-analysis-forecast-bio-001-014?REQUEST=GetLegendGraphic&LAYER=${def.layer}&PALETTE=${def.palette}`],
        dimensions: {
            time: {
                name: 'time',
                values: timeSteps
            }
        },
        visible: def.visible || false,
        opacity: 0.7,
        path: '<small>Weekly mean fields from Global Ocean Biogeochemistry Analysis GLOBAL_ANALYSIS_FORECAST_BIO_001_014'
    }));
});

module.value('config', {
    cesiumBase: '../node_modules/cesium/Build/Cesium/',
    cesiumAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzZDk3ZmM0Mi01ZGFjLTRmYjQtYmFkNC02NTUwOTFhZjNlZjMiLCJpZCI6MTE2MSwiaWF0IjoxNTI3MTYxOTc5fQ.tOVBzBJjR3mwO3osvDVB_RwxyLX7W-emymTOkfz6yGA',
    cesiumTimeline: true,
    cesiumAnimation: true,
    default_layers: layers,
    project_name: 'erra/map',
    hostname: {
        "default": {
            "title": "Default",
            "type": "default",
            "editable": false,
            "url": getHostname()
        }
    },
    'catalogue_url': "/php/metadata/csw",
    'compositions_catalogue_url': "/php/metadata/csw",
    status_manager_url: '/wwwlibs/statusmanager2/index.php',
    default_view: new View({
        center: [2627959.3498800094, 14587004.698994633],
        zoom: 5,
        units: "m"
    })
});

module.controller('Main', ['$scope', '$compile', '$element', 'Core', 'hs.map.service', 'config', '$rootScope', 'hs.utils.service', '$sce',
    function ($scope, $compile, $element, Core, hs_map, config, $rootScope, utils, $sce) {
        var map;
        $scope.Core = Core;

        Core.singleDatasources = true;
        Core.panelEnabled('compositions', true);
        Core.panelEnabled('status_creator', false);
        $scope.Core.setDefaultPanel('layermanager');
        $scope.depths = depths.split(',');

        function createHud() {
            var el = angular.element('<div hs.hud></div>');
            $(".page-content").append(el);
            $compile(el)($scope);
        }

        $rootScope.$on('map.loaded', function () {
            map = hs_map.map;
        });

        $rootScope.$on('map.sync_center', function (e, center, bounds) {

        })

        $rootScope.$on('cesiummap.loaded', function (e, viewer, HsCesium) {
            viewer.targetFrameRate = 30;
            viewer.timeline.zoomTo(Cesium.JulianDate.fromDate(new Date('2016-01-01')), Cesium.JulianDate.fromDate(new Date()));
            setTimeout(createHud, 3000);
            $scope.$watch('current_depth', function () {
                for (var i = 0; i < viewer.imageryLayers.length; i++) {
                    var layer = viewer.imageryLayers.get(i);
                    if (angular.isUndefined(layer.prm_cache) || angular.isUndefined(layer.prm_cache.dimensions) || angular.isUndefined(layer.prm_cache.dimensions.elevation)) continue;
                    HsCesium.HsCsLayers.changeLayerParam(layer, 'elevation', $scope.current_depth);
                    HsCesium.HsCsLayers.removeLayersWithOldParams();
                }
            });
        });

        $rootScope.$on('cesium.time_layers_changed', function (e, time_layers) {
            $scope.time_layers = time_layers;
            if (!$scope.$$phase) $scope.$apply();
            document.querySelector('.hud .layerlist').style.display = 'block';
            if ($scope.timeFader) {
                clearTimeout($scope.timeFader);
            }
            $scope.timeFader = setTimeout(function () {
                document.querySelector('.hud .layerlist').style.display = 'none';
            }, 5000)
        })

        $scope.$on('infopanel.updated', function (event) { });
    }
]);

