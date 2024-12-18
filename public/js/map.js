// map.js
import { COLORS, ENERGY_TYPES, ENERGY_LABELS, CHART_CONFIG } from './constants.js';

class MapChart {
    constructor(container, data) {
        this.container = container;
        this.energyData = data;
        this.selectedCountries = new Set(); // 追蹤選取的國家

        // 設置地圖尺寸
        this.width = 1100;
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
        // 創建 SVG 元素
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            // 防止右鍵選單出現
            .on('contextmenu', (event) => {
                event.preventDefault();
                this.clearSelection();
            });

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

    clearSelection() {
        // 清空選取的國家集合
        this.selectedCountries.clear();
        
        // 重置所有國家的視覺樣式
        this.svg.selectAll("path.country")
            .attr("stroke", "white")
            .attr("stroke-width", "0.5");

        // 通知外部選取已更改（空陣列）
        if (this.onCountriesSelect) {
            this.onCountriesSelect([]);
        }
        
        console.log('Cleared all country selections');
    }

    drawMap(year) {
        const yearData = this.energyData.find(d => d.year === year);

        const projection = d3.geoMercator()
            .fitExtent([[0, 0], [this.width, this.height]], this.geoData);
      
        const geoGenerator = d3.geoPath().projection(projection);

        // 清除現有的路徑
        this.svg.selectAll("path").remove();

        // 繪製新的路徑
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
            .attr("stroke-width", d => 
                this.selectedCountries.has(d.properties.ADMIN) ? "2" : "0.5"
            )
            .attr("stroke", d => 
                this.selectedCountries.has(d.properties.ADMIN) ? "black" : "white"
            )
            .on("mouseover", (event, d) => this.handleMouseOver(event, d, yearData))
            .on("mouseout", (event, d) => this.handleMouseOut(event, d))
            .on("click", (event, d) => this.handleClick(event, d))
            .on("contextmenu", (event) => {
                event.preventDefault();  // 防止在國家上右鍵時出現選單
            });
    }

    handleMouseOver(event, d, yearData) {
        // 如果國家沒有被選中，才改變邊框樣式
        if (!this.selectedCountries.has(d.properties.ADMIN)) {
            d3.select(event.currentTarget)
                .attr("stroke", "black")
                .attr("stroke-width", "2");
        }

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

    handleMouseOut(event, d) {
        // 如果國家沒有被選中，才恢復原始邊框樣式
        if (!this.selectedCountries.has(d.properties.ADMIN)) {
            d3.select(event.currentTarget)
                .attr("stroke", "white")
                .attr("stroke-width", "0.5");
        }
        this.tooltip.style("visibility", "hidden");
    }

    handleClick(event, d) {
        const countryName = d.properties.ADMIN;
        const element = d3.select(event.currentTarget);
        
        if (this.selectedCountries.has(countryName)) {
            // 如果國家已經被選中，取消選取
            this.selectedCountries.delete(countryName);
            element
                .attr("stroke", "white")
                .attr("stroke-width", "0.5");
        } else {
            // 如果國家未被選中，添加到選取集合
            this.selectedCountries.add(countryName);
            element
                .attr("stroke", "black")
                .attr("stroke-width", "2");
        }

        // 將選取的國家轉換為陣列並輸出
        const selectedArray = Array.from(this.selectedCountries);
        console.log('Selected countries:', selectedArray);

        // 如果有設置回調函數就調用它
        if (this.onCountriesSelect) {
            this.onCountriesSelect(selectedArray);
        }
    }

    createLegend() {
        const legendWidth = 30;
        const legendHeight = 300;
        const legendRectHeight = legendHeight / this.colorScale.range().length;

        const legendSvg = this.svg.append("g")
            .attr("transform", `translate(50, ${(this.height-legendHeight)/2})`);

        const self = this;
        this.colorScale.range().forEach((color, i) => {
            // 創建可點擊的圖例組
            const legendGroup = legendSvg.append("g")
                .attr("class", "legend-group")
                .style("cursor", "pointer");

            // 添加圖例矩形
            legendGroup.append("rect")
                .attr("x", 0)
                .attr("y", legendHeight - (i+1) * legendRectHeight)
                .attr("width", legendWidth)
                .attr("height", legendRectHeight)
                .style("fill", color)
                .style("stroke", "black")
                .attr("class", "legend-rect");

            // 添加文字標籤
            if (i === 0) {
                legendGroup.append("text")
                    .attr("x", legendWidth + 5)
                    .attr("y", legendHeight)
                    .attr("font-size", "10px")
                    .attr("text-anchor", "start")
                    .text("0");
            }
            
            legendGroup.append("text")
                .attr("x", legendWidth + 5)
                .attr("y", legendHeight - (i+1)*legendRectHeight+5)
                .attr("font-size", "10px")
                .attr("text-anchor", "start")
                .text(`${Math.round(this.colorScale.domain()[i])}`);

            // 為整個圖例組添加事件處理
            legendGroup
                .on("mouseover", function() {
                    self.highlightCountriesByColor(color);
                    d3.select(this)
                        .style("opacity", 0.8);
                })
                .on("mouseout", function() {
                    self.unhighlightCountries();
                    d3.select(this)
                        .style("opacity", 1);
                })
                .on("click", () => this.handleLegendClick(color));
        });
    }

    handleLegendClick(color) {
        const yearData = this.energyData.find(year => year.year === this.years[this.yearIndex]);
        
        // 獲取該顏色對應的所有國家
        this.svg.selectAll("path.country").each((d, i, nodes) => {
            const countryName = d.properties.ADMIN;
            const countryData = yearData?.countries.find(country => 
                country.name === countryName
            );
            
            if (countryData && this.colorScale(countryData.total) === color) {
                // 將符合條件的國家加入選取集合
                this.selectedCountries.add(countryName);
                // 更新視覺樣式
                d3.select(nodes[i])
                    .attr("stroke", "black")
                    .attr("stroke-width", "2");
            }
        });

        // 通知外部選取已更改
        if (this.onCountriesSelect) {
            this.onCountriesSelect(Array.from(this.selectedCountries));
        }

        console.log('Selected countries after legend click:', Array.from(this.selectedCountries));
    }

    highlightCountriesByColor(color) {
        this.svg.selectAll("path.country").each((d, i, nodes) => {
            const yearData = this.energyData.find(year => year.year === this.years[this.yearIndex]);
            const countryData = yearData?.countries.find(country => 
                country.name === d.properties.ADMIN
            );
            
            const element = d3.select(nodes[i]);
            if (countryData && this.colorScale(countryData.total) === color) {
                if (!this.selectedCountries.has(d.properties.ADMIN)) {
                    element
                        .attr("stroke", "black")
                        .attr("stroke-width", "2");
                }
                element.attr("opacity", 1);
            } else {
                element.attr("opacity", 0.2);
            }
        });
    }

    unhighlightCountries() {
        this.svg.selectAll("path.country")
            .attr("opacity", 1)
            .each((d, i, nodes) => {
                const element = d3.select(nodes[i]);
                if (!this.selectedCountries.has(d.properties.ADMIN)) {
                    element
                        .attr("stroke", "white")
                        .attr("stroke-width", "0.5");
                }
            });
    }

    updateYear(year) {
        if (!this.geoData) {
            console.warn('Geographic data not yet loaded');
            return;
        }
        this.yearIndex = this.years.indexOf(year);
        this.drawMap(year);
    }

    // 新增回調設置方法
    setCountriesSelectCallback(callback) {
        this.onCountriesSelect = callback;
    }
}

export default MapChart;