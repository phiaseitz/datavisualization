window.addEventListener("load",run);

var GLOBAL ={
  rawData: [],
  maxRef: 0,
  netData:{},
  maxNet: 0,
  minNet: 0,
};

countryCodes = {}

function run () {
  svg = d3.select("#mapViz");
  // Load in the country codes json
  initViz(svg);  
}

function initViz(svg){
  d3.json ('./data/countryCodes.json', function (error, codes){
    if (error) console.error(error);
    countryCodes=codes;

    d3.csv("./data/overTime.csv", 
      function(d){
        if (error) console.error(error);
        return {
          year: d.Year,
          currentCountry: d.CurrentCountry,
          originalCountry: d.OriginalCountry,
          refugees: d.Refugees,
          asylumSeekers: d.AsylumSeekers,
          returnedRefugees: d.ReturnedRefugees,
          IPDs: d.IPDs,
          returnedIPDs: d.ReturnedIDPs,
          statelessPersons: d.StatelessPersons,
          others: d.Others,
          total: d.Total
        };
      },
      function(error, rows) {
        GLOBAL.rawData = rows;
        // calculate min and max for number of refugees for coloring
        rows.forEach(function(row){
          if(row.total > GLOBAL.maxRef){
            GLOBAL.maxRef = row.total;
          }
        });

        nets = getNetsForAllCountries(GLOBAL.rawData);
        GLOBAL.netData = nets.netData;
        GLOBAL.maxNet = nets.maxNet;
        GLOBAL.minNet = nets.minNet;
        console.log(GLOBAL.netData);
        console.log("Max net", GLOBAL.maxNet);
        console.log("min net", GLOBAL.minNet);

        initMap('./data/worldmap.json', svg);
      });
  });
}

function initMap(filePath, svg) {
  width = svg.style('width');
  height = svg.style('height');
  // convert to integer
  width = width.substring(0,width.length-2);
  height = height.substring(0,height.length-2);


  var color = d3.scale.linear()
    .domain([GLOBAL.minNet, 0, GLOBAL.maxNet])
    .range(['#ff9900', '#ffffff', '#0066cc']);

  var projection = d3.geo.equirectangular()
      .scale((width + 1) / 2 / Math.PI)
      .translate([width / 2, height / 2])
      .precision(.1);
  var path = d3.geo.path()
      .projection(projection);
  
  var graticule = d3.geo.graticule();
  
  svg.append("defs").append("path")
      .datum({type: "Sphere"})
      .attr("id", "sphere")
      .attr("d", path);
  svg.append("use")
      .attr("class", "stroke")
      .attr("xlink:href", "#sphere");
  svg.append("use")
      .attr("class", "fill")
      .attr("xlink:href", "#sphere");
  svg.append("path")
      .datum(graticule)
      .attr("class", "graticule")
      .attr("d", path);
  d3.json(filePath, function(error, world) {
    if (error) console.error(error);
    var countries = topojson.feature(world, world.objects.countries).features,
        neighbors = topojson.neighbors(world.objects.countries.geometries);
    
    
    svg.selectAll(".country")
        .data(countries)
      .enter().insert("path", ".graticule")
        .attr("class", "country")
        .attr("d", path);
    
    svg.insert("path", ".graticule")
        .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
        .attr("class", "boundary")
        .attr("d", path);

    svgCountries = svg.selectAll(".country");

    // get country name!
    svgCountries.each (function(d,i){
      d.idPadded = ('000'+d.id).slice(-3);
      d.name = countryCodes[d.idPadded];
    });

    svgCountries
      .on('mouseover', function(d,i){
        console.log(d.name);
        console.log("netCount", GLOBAL.netData[d.name])
      })
      .style("fill", function(d, i) {
          var net = GLOBAL.netData[d.name]
          if (net === undefined) {
            return '#e6e6e6'
          } else {
            return color(net);
          }
      })
  });
}

function getNetsForAllCountries(data){
  var netData = {};
  console.log(data[0]);
  data.forEach(function(row){
    if (row.refugees !== '' && row.refugees !== '*'){
      if (!(row.originalCountry in netData)){
        netData[row.originalCountry] = +row.refugees;
      } else {
        netData[row.originalCountry] -= +row.refugees;
      }

      if (!(row.currentCountry in netData)){
        netData[row.currentCountry] = +row.refugees;
      } else {
        netData[row.currentCountry] += +row.refugees;
      }
    }
  })
  console.log(netData);
  var maxNet = 0;
  var minNet = 0;
  Object.keys(netData).forEach(function(key){
    if (maxNet < netData[key]){
      maxNet = netData[key];
    }
    if (minNet > netData[key]){
      minNet = netData[key];
    }
  });

  return {
    netData: netData,
    maxNet: maxNet,
    minNet: minNet,
  }
}



