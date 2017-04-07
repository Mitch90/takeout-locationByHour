//tool per caricare il proprio json, calcola il range nel dataset e fa vedere dati

//time formatter and parser
var formatDay = d3.timeFormat("%Y_%m_%d"),
    formatTime = d3.timeFormat("%H:%M"),
    formatHour = d3.timeFormat("%H"),
    formatMinute = d3.timeFormat("%M");

var margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 40
    },
    width = 1260 - margin.left - margin.right,
    height = 750 - margin.top - margin.bottom;

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var x = d3.scaleLinear().range([0, width]).domain(["00", "23"]),
    y = d3.scaleLinear().range([height, 0]);

var line = d3.line()
    // .curve(d3.curveCatmullRom)
    .x(function(d) {
        return x(d.key);
    })
    .y(function(d) {
        return y(d.value.count);
    });

d3.json("data/Takeout/LocationHistory/LocationHistory_Thesis.min.json", function(error, data) {
    if (error) throw error;

    _.each(data.locations, function(d) {
        d.time = +d.time;
    })

    var finalData = data.locations

    //remap data to prepare it for aggregation
    var dataPoints = finalData.map(function(d) {
        var timestamp = d.time,
            day = formatDay(timestamp),
            time = formatTime(timestamp),
            hour = formatHour(timestamp),
            minute = formatMinute(timestamp);

        return {
            date: day,
            time: time,
            hour: +hour,
            min: +minute,
            timestamp: timestamp,
            type: "line"
        };
    });

    // console.log(dataPoints);

    //ready the data for the graph
    var pointsByHour = d3.nest()
        .key(function(d) {
            return d.date;
        })
        .key(function(d) {
            return d.hour;
        })
        .rollup(function(v) {
            return {
                count: +v.length
            };
        })
        .entries(dataPoints);
        
    //set max value for y axis
    // y.domain([0, d3.max(pointsByHour[0].values, function(d) {
    //     return d.value.count;
    // })])
    y.domain([0, 210]);

    svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(24));

    svg.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y).ticks(22))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("fill", "#000")
        .text("n° of requests");

    var graph = svg.selectAll(".lines")
        .data(pointsByHour)
        .enter().append("g")
        .attr("class", "lines");

    graph.append("path")
        .attr("class", "line")
        .attr("d", function(d) {
            return line(d.values);
        });

    //adding quantile lines
    //aggregate by day and add statistics with rollup method
    var pointsByDay = d3.nest()
        .key(function(d) {
            return d.type;
        })
        .key(function(d) {
            return d.hour;
        })
        .sortKeys(d3.ascending)
        .key(function(d) {
            return d.date;
        })
        .sortKeys(d3.ascending)
        .rollup(function(v) {
            return {
                count: +v.length
            };
        })
        .sortValues(d3.ascending)
        .entries(dataPoints);

    _.each(pointsByDay[0].values, function(hour) {
        var countArray = [];

        _.each(hour.values, function(d) {
            countArray.push(d.value.count);
        });

        countArray.sort(d3.ascending);

        hour.min = d3.min(countArray);
        hour.max = d3.max(countArray);
        hour.median = d3.median(countArray);
        hour.medianQuantile = d3.quantile(countArray, 0.5);
        hour.lowQuantile = d3.quantile(countArray, 0.25);
        hour.highQuantile = d3.quantile(countArray, 0.75);

    })

    var dots = svg.append("g")
        .selectAll(".dot")
        .data(pointsByDay[0].values)
        .enter();

    dots.append("circle")
        .attr("class", "dot")
        .attr("class", "line-quantile-dot")
        .attr("r", 2.5)
        .attr("cx", function(d) {
            return x(d.key);
        })
        .attr("cy", function(d) {
            return y(d.median);
        });

    dots.append("circle")
        .attr("class", "dot")
        .attr("class", "line-quantile-dot")
        .attr("r", 2.5)
        .attr("cx", function(d) {
            return x(d.key);
        })
        .attr("cy", function(d) {
            return y(d.highQuantile);
        });

    dots.append("circle")
        .attr("class", "dot")
        .attr("class", "line-quantile-dot")
        .attr("r", 2.5)
        .attr("cx", function(d) {
            return x(d.key);
        })
        .attr("cy", function(d) {
            return y(d.lowQuantile);
        });

});
