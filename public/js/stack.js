import { COLORS, ENERGY_TYPES, ENERGY_LABELS, CHART_CONFIG } from './constants.js';

class StackChart {
    constructor(container, data) {
        // 初始化基本屬性
        this.container = container;
        this.data = data;
        this.width = 1100;
        this.height = 600;
        this.margin = CHART_CONFIG.margin;
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        // 初始化圖表
        this.initSVG();
        this.initTooltip();
        this.update(data);
    }

    initSVG() {
        // 創建主要的 SVG 元素和繪圖區域
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // 創建座標軸的容器
        this.xAxisG = this.g.append('g')
            .attr('transform', `translate(0,${this.innerHeight})`);
        this.yAxisG = this.g.append('g');
    }

    initTooltip() {
        this.tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip");
    }

    update(yearData) {
        const data = yearData.sort((a, b) => b.total - a.total);
        const t = d3.transition().duration(1500);

        // 比例尺
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.total)])
            .range([0, this.innerWidth]);

        const yScale = d3.scaleBand()
            .domain(data.map(d => d.country))
            .range([0, this.innerHeight])
            .padding(0.1);
        
        // 座標軸
        const xAxis = d3.axisBottom(xScale)
            .ticks(5)
            .tickFormat(d => d3.format(',')(d) + ' TWh');
        const yAxis = d3.axisLeft(yScale);
        
        this.xAxisG.transition(t).call(xAxis);
        
        this.yAxisG.transition(t).call(yAxis);
        
        // 準備堆疊資料
        const stack = d3.stack()
            .keys(Object.values(ENERGY_TYPES).flat())
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);
    
        const stackedData = stack(data);

        // 更新堆疊條
        const energyGroups = this.g.selectAll('.energy-group')
            .data(stackedData)
            .join('g')
            .attr('class', 'energy-group')
            .style('fill', d => {
                const energyType = d.key;
                for (const [category, types] of Object.entries(ENERGY_TYPES)) {
                    if (types.includes(energyType)) {
                        return COLORS[category][energyType];
                    }
                }
            });

        energyGroups.selectAll('rect')
            .data(d => d)
            .join('rect')
            .transition(t)
            .attr('y', d => yScale(d.data.country))
            .attr('x', d => xScale(d[0]))
            .attr('width', d => xScale(d[1]) - xScale(d[0]))
            .attr('height', yScale.bandwidth());

        this.updateLegend();
    }

    updateLegend() {
        const legendContainer = document.getElementById('legend');
        legendContainer.innerHTML = '';

        Object.entries(ENERGY_TYPES).forEach(([category, types]) => {
            types.forEach(type => {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';

                const colorBox = document.createElement('div');
                colorBox.className = 'legend-color';
                colorBox.style.backgroundColor = COLORS[category][type];

                const label = document.createElement('span');
                label.textContent = ENERGY_LABELS[type];

                legendItem.appendChild(colorBox);
                legendItem.appendChild(label);
                legendContainer.appendChild(legendItem);
            });
        });
    }
}

export default StackChart;