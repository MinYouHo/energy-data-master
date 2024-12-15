import { COLORS, ENERGY_TYPES, ENERGY_LABELS, CHART_CONFIG } from './constants.js';

class LineChart {
    constructor(container, data) {
        this.container = container;
        this.yearConsumption = data;
        this.width = 1000;
        this.height = 600;
        this.margin = CHART_CONFIG.margin;
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.initSVG();
        this.draw();
        this.addBrush();
    }

    initSVG() {
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        this.xAxisG = this.g.append('g')
            .attr('transform', `translate(0,${this.innerHeight})`);
        this.yAxisG = this.g.append('g');
    }

    draw() {
        const xScale = d3.scaleLinear()
            .domain(d3.extent(this.yearConsumption, d => d.year))
            .range([0, this.innerWidth - 100]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.yearConsumption, d => {
                return Math.max(...Object.values(d.energy));
            })])
            .nice()
            .range([this.innerHeight, 0]);

        // 繪製軸
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d => d.toString());
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => d3.format(',')(d) + ' TWh');

        this.xAxisG.transition().duration(750).call(xAxis);
        this.yAxisG.transition().duration(750).call(yAxis);

        // 繪製線條
        const lineGenerator = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);

        const energyTypes = Object.values(ENERGY_TYPES).flat();
        const lineData = energyTypes.map(type => ({
            type: type,
            values: this.yearConsumption.map(d => ({
                year: d.year,
                value: d.energy[type]
            }))
        }));

        // 繪製線條
        const lines = this.g.selectAll('.line')
            .data(lineData);

        const linesEnter = lines.enter()
            .append('path')
            .attr('class', 'line');

        lines.merge(linesEnter)
            .transition()
            .duration(750)
            .attr('d', d => lineGenerator(d.values))
            .attr('fill', 'none')
            .attr('stroke', d => {
                for (const [category, types] of Object.entries(ENERGY_TYPES)) {
                    if (types.includes(d.type)) {
                        return COLORS[category][d.type];
                    }
                }
            })
            .attr('stroke-width', 2);

        // 添加標籤
        const labels = this.g.selectAll('.line-label')
            .data(lineData);

        const labelsEnter = labels.enter()
            .append('text')
            .attr('class', 'line-label');

        labels.merge(labelsEnter)
            .transition()
            .duration(750)
            .attr('x', d => xScale(this.yearConsumption[this.yearConsumption.length - 1].year))
            .attr('y', d => yScale(d.values[d.values.length - 1].value))
            .attr('dx', 5)
            .attr('dy', '0.35em')
            .attr('fill', d => {
                for (const [category, types] of Object.entries(ENERGY_TYPES)) {
                    if (types.includes(d.type)) {
                        return COLORS[category][d.type];
                    }
                }
            })
            .text(d => ENERGY_LABELS[d.type]);
    }

    addBrush() {
        const xScale = d3.scaleLinear()
            .domain(d3.extent(this.yearConsumption, d => d.year))
            .range([0, this.innerWidth]);
        // 創建 brush
        const brush = d3.brushX()
            .extent([[0, 0], [this.innerWidth, this.innerHeight]])
            .on('end', (event) => {
                if (!event.selection) return; // 如果沒有選擇區域則返回
                
                // 將像素範圍轉換回年份
                const yearRange = event.selection.map(xScale.invert);
                const years = yearRange.map(Math.round);
                
                console.log('折線圖選取return: ', years);
                // // 如果有設置回調函數，則調用它
                // if (this.onBrushEnd) {
                //     this.onBrushEnd(years);
                // }
            });

        // 將 brush 添加到專門的群組中
        this.g.call(brush);
    }
}

export default LineChart;