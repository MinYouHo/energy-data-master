import { COLORS, ENERGY_TYPES, ENERGY_LABELS, CHART_CONFIG } from './constants.js';

class MapChart {
    constructor(container, data) {
        this.container = container;
        this.energyData = data;

        // 設置地圖尺寸
        this.width = 1000;
        this.height = 600;
        this.margin = CHART_CONFIG.margin;
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
        
        this.yearIndex = this.energyData.length - 1;  // 從最新年份開始
        this.years = this.energyData.map(d => d.year);
        
        // 初始化
        this.initSVG();
        this.initColorScale();
        this.initTooltip();
        return this.loadGeoData().then(()=> this);
    }

    initSVG() {
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        this.g = this.svg.append('g')
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
            .style("visibility", "hidden");
    }

    async loadGeoData() {
        try {
            const response = await fetch('data/countries.geojson');
            this.geoData = await response.json();
            this.drawMap(this.years[this.yearIndex]);
            this.createLegend();
        } catch (error) {
            console.error('Error loading GeoJSON:', error);
        }
    }

    drawMap(yearInput) {
        let mapData;
        
        // 判斷輸入是單一年份還是年份範圍
        if (Array.isArray(yearInput)) {
            // 計算年份範圍內的平均資料
            const [startYear, endYear] = yearInput;
            const yearsInRange = this.energyData.filter(d => 
                d.year >= startYear && d.year <= endYear
            );
            
            // 計算每個國家在這段期間的平均值
            const countryAverages = {};
            yearsInRange.forEach(yearData => {
                yearData.countries.forEach(country => {
                    if (!countryAverages[country.name]) {
                        countryAverages[country.name] = {
                            total: 0,
                            count: 0
                        };
                    }
                    countryAverages[country.name].total += country.total;
                    countryAverages[country.name].count += 1;
                });
            });
            
            // 創建平均資料結構
            mapData = {
                year: `${startYear}-${endYear} 平均`,
                countries: Object.entries(countryAverages).map(([name, data]) => ({
                    name,
                    total: Number((data.total / data.count).toFixed(2))
                }))
            };
        } else {
            // 單一年份的資料
            mapData = this.energyData.find(d => d.year === yearInput);
        }

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
                const countryData = mapData.countries.find(country => 
                    country.name === countryName
                );
                return countryData ? this.colorScale(countryData.total) : "#ccc";
            })
            .attr("class", "country")
            .on("mouseover", (event, d) => this.handleMouseOver(event, d, mapData))
            .on("mouseout", (event) => this.handleMouseOut(event));
    }

    handleMouseOver(event, d, yearData) {
        d3.select(event.currentTarget)
            .attr("stroke", "black")
            .attr("stroke-width", "0.5");

        // console.log('Country Properties:', d.properties);
        // console.log('Year Data:', yearData);

        const countryName = d.properties.ADMIN;
        const countryData = yearData.countries.find(country => 
            country.name === countryName
        );

        const tooltipContent = countryData 
            ? `<strong>${countryName}</strong><br>Per capita energy consumption: ${countryData.total} Mtoe`
            : `<strong>${countryName}</strong><br>No Data`;
        // console.log('Tooltip content:', tooltipContent);

        this.tooltip
            .style("visibility", "visible")
            .html(tooltipContent)
            .style("left", `${event.pageX + 5}px`)
            .style("top", `${event.pageY + 5}px`);
    }

    handleMouseOut(event) {
        d3.select(event.currentTarget)
            .attr("stroke", "white")
            .attr("stroke-width", "0.5");
        this.tooltip.style("visibility", "hidden");
    }

    createLegend() {
        const legendWidth = 30;
        const legendHeight = 300;
        const legendRectHeight = legendHeight / this.colorScale.range().length;

        const legendSvg = this.svg.append("g")
            .attr("transform", `translate(0, ${(this.height-legendHeight)/2})`);

        this.colorScale.range().forEach((color, i) => {
            legendSvg.append("rect")
                .attr("x", 0)
                .attr("y", legendHeight - (i+1) * legendRectHeight)
                .attr("width", legendWidth)
                .attr("height", legendRectHeight)
                .style("fill", color)
                .style("stroke", "black")
                .attr("class", "legend-rect")
                .on("mouseover", () => this.highlightCountriesByColor(color))
                .on("mouseout", () => this.unhighlightCountries());

            // Add legend labels
            if (i === 0) {
                legendSvg.append("text")
                    .attr("x", legendWidth + 5)
                    .attr("y", legendHeight)
                    .attr("font-size", "10px")
                    .attr("text-anchor", "start")
                    .text("0");
            }
            
            legendSvg.append("text")
                .attr("x", legendWidth + 5)
                .attr("y", legendHeight - (i+1)*legendRectHeight+5)
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
        if (!this.geoData) {
            console.warn('Geographic data not yet loaded');
            return;
        }
        this.yearIndex = this.years.indexOf(year);
        this.drawMap(year);
    }
}

export default MapChart;