class MapChart {
  constructor(container, data) {
      this.container = container;
      this.energyData = data;

      // 設置地圖尺寸
      this.margin = { top: 10, right: 30, bottom: 30, left: 60 };
      this.width = 1000 - this.margin.left - this.margin.right;
      this.height = 600 - this.margin.top - this.margin.bottom;
      
      this.yearIndex = this.energyData.length - 1;  // 從最新年份開始
      this.years = this.energyData.map(d => d.year);
      
      // 初始化
      this.initSVG();
      this.initColorScale();
      this.initTooltip();
      this.loadGeoData();
  }

  initSVG() {
      this.svg = d3.select(this.container)
          .append('svg')
          .attr('width', this.width + this.margin.left + this.margin.right)
          .attr('height', this.height + this.margin.top + this.margin.bottom)
          .append('g')
          .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
  }

  initColorScale() {
      this.colorScale = d3.scaleThreshold()
          .domain([500, 5000, 10000, 20000, 40000, 50000])
          .range(d3.schemeYlOrRd[6]);
  }

  initTooltip() {
      this.tooltip = d3.select("body")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "#fff")
          .style("padding", "5px")
          .style("border", "1px solid #ccc")
          .style("border-radius", "3px")
          .style("visibility", "hidden");
  }

  async loadGeoData() {
      try {
          const response = await fetch('countries.geojson');
          this.geoData = await response.json();
          this.drawMap(this.years[this.yearIndex]);
          this.createLegend();
      } catch (error) {
          console.error('Error loading GeoJSON:', error);
      }
  }

  drawMap(year) {
      const yearData = this.energyData.find(d => d.year === year);

      const projection = d3.geoMercator()
          .fitExtent([[0, 0], [this.width, this.height]], this.geoData);
      
      const geoGenerator = d3.geoPath().projection(projection);

      this.svg.selectAll("path").remove();
      
      this.svg.selectAll("path")
          .data(this.geoData.features)
          .enter()
          .append("path")
          .attr("d", geoGenerator)
          .attr("stroke", "white")
          .attr("fill", d => {
              const countryName = d.properties.ADMIN;
              const countryData = yearData.countries.find(country => 
                  country.name === countryName
              );
              return countryData ? this.colorScale(countryData.total) : "#ccc";
          })
          .attr("class", "country")
          .on("mouseover", (event, d) => this.handleMouseOver(event, d, yearData))
          .on("mouseout", () => this.handleMouseOut());
  }

  handleMouseOver(event, d, yearData) {
      d3.select(event.currentTarget)
          .attr("stroke", "black")
          .attr("stroke-width", "0.5");

      const countryName = d.properties.ADMIN;
      const countryData = yearData.countries.find(country => 
          country.name === countryName
      );

      const tooltipContent = countryData 
          ? `<strong>${countryName}</strong><br>Per capita energy consumption: ${countryData.total} Mtoe`
          : `<strong>${countryName}</strong><br>No Data`;

      this.tooltip
          .style("visibility", "visible")
          .html(tooltipContent)
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY + 5}px`);
  }

  handleMouseOut() {
      d3.select(event.currentTarget)
          .attr("stroke", "white")
          .attr("stroke-width", "0.5");
      this.tooltip.style("visibility", "hidden");
  }

  createLegend() {
      const legendWidth = 300;
      const legendHeight = 20;
      const legendRectWidth = legendWidth / this.colorScale.range().length;

      const legendSvg = this.svg.append("g")
          .attr("transform", `translate(${this.width - legendWidth - 50}, ${this.height})`);

      this.colorScale.range().forEach((color, i) => {
          legendSvg.append("rect")
              .attr("x", i * legendRectWidth)
              .attr("y", 0)
              .attr("width", legendRectWidth)
              .attr("height", legendHeight)
              .style("fill", color)
              .style("stroke", "black")
              .attr("class", "legend-rect")
              .on("mouseover", () => this.highlightCountriesByColor(color))
              .on("mouseout", () => this.unhighlightCountries());

          // Add legend labels
          if (i === 0) {
              legendSvg.append("text")
                  .attr("x", 0)
                  .attr("y", legendHeight + 15)
                  .attr("font-size", "10px")
                  .attr("text-anchor", "start")
                  .text("0");
          }
          
          legendSvg.append("text")
              .attr("x", i * legendRectWidth + legendRectWidth - 10)
              .attr("y", legendHeight + 15)
              .attr("font-size", "10px")
              .attr("text-anchor", "start")
              .text(`${Math.round(this.colorScale.domain()[i])}`);
      });
  }

  highlightCountriesByColor(color) {
      this.svg.selectAll("path.country").each((d, i, nodes) => {
          const yearData = this.energyData.find(year => year.year === this.years[this.yearIndex]);
          const countryData = yearData?.countries.find(country => 
              country.name === d.properties.ADMIN
          );
          
          if (countryData && this.colorScale(countryData.total) === color) {
              d3.select(nodes[i])
                  .attr("stroke", "black")
                  .attr("stroke-width", "0.5")
                  .attr("opacity", 1);
          } else {
              d3.select(nodes[i]).attr("opacity", 0.2);
          }
      });
  }

  unhighlightCountries() {
      this.svg.selectAll("path.country")
          .attr("opacity", 1)
          .attr("stroke", "white");
  }

  updateYear(year) {
      this.yearIndex = this.years.indexOf(year);
      this.drawMap(year);
  }
}

export default MapChart;