let mapLeft = 0,
  mapTop = 0;
let mapMargin = { top: 10, right: 30, bottom: 30, left: 60 },
  mapWidth = 500 - mapMargin.left - mapMargin.right,
  mapHeight = 500 - mapMargin.top - mapMargin.bottom;

let svg = d3.select("svg");

let yearIndex = 58;
let years = [];
let energyData = {};
let countries = {};
let intervalId = null;

Promise.all([d3.json("countries.geojson"), d3.json("energy_data.json")])
  .then((data) => {
    countries = data[0];
    energyData = data[1];
    years = energyData.map((d) => d.year);

    drawMap(years[yearIndex]);
    createLegend();
    createTimeSlider();
  })
  .catch((error) => console.error(error));

function drawMap(year) {
  const yearData = energyData.find((d) => d.year === year);

  const projection = d3.geoMercator().fitExtent(
    [
      [0, 0],
      [mapWidth, mapHeight],
    ],
    countries
  );
  const geoGenerator = d3.geoPath().projection(projection);

  svg.selectAll("path").remove();
  svg
    .selectAll("path")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("d", geoGenerator)
    .attr("stroke", "white")
    .attr("fill", (d) => {
      const countryName = d.properties.ADMIN;
      const countryData = yearData.countries.find(
        (country) => country.name === countryName
      );
      if (countryData) {
        return colorScale(countryData.total);
      } else {
        return "#ccc";
      }
    })
    .attr("class", "country")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke", "black").attr("stroke-width", "0.5");
      const countryName = d.properties.ADMIN;
      const countryData = yearData.countries.find(
        (country) => country.name === countryName
      );
      if (countryData) {
        tooltip
          .style("visibility", "visible")
          .html(
            `<strong>${d.properties.ADMIN}</strong><br>Per capita energy consumption: ${countryData.total} Mtoe`
          )
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY + 5}px`);
      } else {
        tooltip
          .style("visibility", "visible")
          .html(`<strong>${d.properties.ADMIN}</strong><br>No Data`)
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY + 5}px`);
      }
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "white").attr("stroke-width", "0.5");
      tooltip.style("visibility", "hidden");
    });
}

const colorScale = d3
  .scaleThreshold()
  .domain([500, 5000, 10000, 20000, 40000, 50000])
  .range(d3.schemeYlOrRd[6]);

const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background", "#fff")
  .style("padding", "5px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "3px")
  .style("visibility", "hidden");

function createLegend() {
  const legendWidth = 300;
  const legendHeight = 20;
  const legendRectHeight = 20;
  const legendRectWidth = legendWidth / colorScale.range().length;

  const legendSvg = svg
    .append("g")
    .attr(
      "transform",
      `translate(${mapWidth - legendWidth - 50}, ${mapHeight})`
    );

  // Add legend for each color bin
  colorScale.range().forEach((color, i) => {
    legendSvg
      .append("rect")
      .attr("x", i * legendRectWidth)
      .attr("y", 0)
      .attr("width", legendRectWidth)
      .attr("height", legendRectHeight)
      .style("fill", color)
      .style("stroke", "black")
      .attr("class", "legend-rect")
      .on("mouseover", function () {
        d3.select(this).attr("stroke", "black").attr("stroke-width", "2");
        highlightCountriesByColor(color);
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "black").attr("stroke-width", "1");
        unhighlightCountries();
      });
    if (i == 0) {
      legendSvg
        .append("text")
        .attr("x", i)
        .attr("y", legendRectHeight + 15)
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .text(`0`);
    }
    legendSvg
      .append("text")
      .attr("x", i * legendRectWidth + legendRectWidth - 10)
      .attr("y", legendRectHeight + 15)
      .attr("font-size", "10px")
      .attr("text-anchor", "start")
      .text(`${Math.round(colorScale.domain()[i])}`);
  });
}

function highlightCountriesByColor(color) {
  svg.selectAll("path.country").each(function (d) {
    const yearData = energyData.find((year) => year.year === years[yearIndex]);
    const countryData = yearData
      ? yearData.countries.find(
          (country) => country.name === d.properties.ADMIN
        )
      : null;
    if (countryData && colorScale(countryData.total) === color) {
      d3.select(this)
        .attr("stroke", "black")
        .attr("stroke-width", "0.5")
        .attr("opacity", 1);
    } else {
      d3.select(this).attr("opacity", 0.2);
    }
  });
}

function unhighlightCountries() {
  svg.selectAll("path.country").attr("opacity", 1).attr("stroke", "white");
}

function createTimeSlider() {
  const sliderContainer = d3
    .select("body")
    .append("div")
    .attr("class", "slider-container");

  const playButton = sliderContainer
    .append("button")
    .text("Play")
    .on("click", function () {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        playButton.text("Play");
      } else {
        intervalId = setInterval(() => {
          yearIndex = (yearIndex + 1) % years.length;
          drawMap(years[yearIndex]);
          slider.property("value", years[yearIndex]);
          d3.select(".year-label").text(years[yearIndex]);
          if (yearIndex === years.length - 1) {
            clearInterval(intervalId);
            intervalId = null;
            playButton.text("Play");
          }
        }, 1000);
        playButton.text("Pause");
      }
    });

  const slider = sliderContainer
    .append("input")
    .attr("type", "range")
    .attr("min", d3.min(years))
    .attr("max", d3.max(years))
    .attr("step", 1)
    .attr("value", years[yearIndex])
    .attr("id", "yearSlider")
    .on("input", function () {
      const selectedYear = +this.value;
      yearIndex = years.indexOf(selectedYear);
      drawMap(selectedYear);
      d3.select(".year-label").text(selectedYear);
    });

  sliderContainer
    .append("span")
    .attr("class", "year-label")
    .text(years[yearIndex]);
}
