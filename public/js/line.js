import { COLORS, ENERGY_TYPES, ENERGY_LABELS, CHART_CONFIG } from './constants.js';

class LineChart {
    constructor(container, data) {
        this.container = container;
        this.yearConsumption = data;
        this.width = 1100;
        this.height = 600;
        this.margin = CHART_CONFIG.margin;
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.initSVG();
        this.update();  // 改為呼叫 update
        this.addBrush();
    }

    initSVG() {
        // SVG 初始化代碼保持不變...
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`)
            .attr('width', this.innerWidth)
            .attr('height', this.innerHeight);

        this.xAxisG = this.g.append('g')
            .attr('transform', `translate(0,${this.innerHeight})`);
        this.yAxisG = this.g.append('g');
    }

    update(newData) {
        // 如果提供了新數據就更新數據
        if (newData) {
            this.yearConsumption = newData;
        }
        // console.log('NewData:', newData);

        // 設定轉場
        const t = d3.transition()
            .duration(750)
            .ease(d3.easeLinear);

        // 更新比例尺
        const xScale = d3.scaleLinear()
            .domain(d3.extent(this.yearConsumption, d => d.year))
            .range([0, this.innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.yearConsumption, d => {
                return Math.max(...Object.values(d.energy));
            })])
            .nice()
            .range([this.innerHeight, 0]);

        // 更新座標軸
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d => d.toString());
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => d3.format(',')(d) + ' TWh');

        // 使用轉場更新座標軸
        this.xAxisG.transition(t).call(xAxis);
        this.yAxisG.transition(t).call(yAxis);

        // 準備線條生成器
        const lineGenerator = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);

        // 準備數據
        const energyTypes = Object.values(ENERGY_TYPES).flat();
        const lineData = energyTypes.map(type => ({
            type: type,
            values: this.yearConsumption.map(d => ({
                year: d.year,
                value: d.energy[type]
            }))
        }));

        // 更新線條
        const lines = this.g.selectAll('.line')
            .data(lineData, d => d.type);  // 使用能源類型作為 key

        // 處理新增的線條
        const linesEnter = lines.enter()
            .append('path')
            .attr('class', 'line')
            .attr('fill', 'none')
            .attr('stroke-width', 2)
            .attr('opacity', 0)  // 初始透明度為 0
            .attr('d', d => lineGenerator(d.values));  // 設置初始路徑

        // 合併新增和更新的線條，應用轉場
        lines.merge(linesEnter)
            .transition(t)
            .attr('d', d => lineGenerator(d.values))
            .attr('stroke', d => {
                for (const [category, types] of Object.entries(ENERGY_TYPES)) {
                    if (types.includes(d.type)) {
                        return COLORS[category][d.type];
                    }
                }
            })
            .attr('opacity', 1);  // 最終透明度為 1

        // 處理要移除的線條
        lines.exit()
            .transition(t)
            .attr('opacity', 0)  // 淡出效果
            .remove();

        // 更新標籤
        const labels = this.g.selectAll('.line-label')
            .data(lineData, d => d.type);  // 使用相同的 key

        // 處理新增的標籤
        const labelsEnter = labels.enter()
            .append('text')
            .attr('class', 'line-label')
            .attr('opacity', 0)  // 初始透明度為 0
            .attr('dx', 5)
            .attr('dy', '0.35em');

        // 合併新增和更新的標籤，應用轉場
        labels.merge(labelsEnter)
            .transition(t)
            .attr('x', d => xScale(this.yearConsumption[this.yearConsumption.length - 1].year))
            .attr('y', d => yScale(d.values[d.values.length - 1].value))
            .attr('fill', d => {
                for (const [category, types] of Object.entries(ENERGY_TYPES)) {
                    if (types.includes(d.type)) {
                        return COLORS[category][d.type];
                    }
                }
            })
            .text(d => ENERGY_LABELS[d.type])
            .attr('opacity', 1);  // 最終透明度為 1

        // 處理要移除的標籤
        labels.exit()
            .transition(t)
            .attr('opacity', 0)  // 淡出效果
            .remove();
    }

    addBrush() {
        // 創建並保存 xScale 作為類別的屬性，這樣其他方法也能使用它
        this.xScale = d3.scaleLinear()
            .domain(d3.extent(this.yearConsumption, d => d.year))
            .range([0, this.innerWidth]);
    
        // 創建 brush 實例
        const brush = d3.brushX()
            .extent([[0, 0], [this.innerWidth, this.innerHeight]])
            .on('end', this.handleBrushEnd.bind(this));  // 使用獨立的處理函數以提高可讀性
    
        // 為畫布添加點擊事件處理
        this.g.on('click', this.handleClick.bind(this));
        
        // 應用 brush 到畫布
        this.g.call(brush);
        
        // 保存 brush 實例以供後續使用
        this.brush = brush;
    }
    
    // 處理 brush 結束事件
    handleBrushEnd(event) {
        // 如果用戶清除了選擇
        if (!event.selection) {
            if (this.onBrushEnd) {
                this.onBrushEnd(null);
            }
            return;
        }
        
        // 計算選擇範圍對應的年份
        const yearRange = event.selection.map(this.xScale.invert);
        const years = yearRange.map(Math.round);
        console.log('選取範圍：', years)
        // 確保年份範圍的正確順序
        const sortedYears = [Math.min(...years), Math.max(...years)];
        
        // 通知外部監聽器
        if (this.onBrushEnd) {
            this.onBrushEnd(sortedYears);
        }
    }
    
    // 處理點擊事件
    handleClick(event) {
        // 檢查是否為 brush 操作（避免與 brush 事件衝突）
        if (event.defaultPrevented) return;
        
        // 獲取點擊位置
        const [x] = d3.pointer(event);
        
        // 計算對應的年份
        const year = Math.round(this.xScale.invert(x));
        
        // 如果點擊位置在有效範圍內
        if (year >= d3.min(this.yearConsumption, d => d.year) && 
            year <= d3.max(this.yearConsumption, d => d.year)) {
            console.log('點選年份：', year)
            // 清除現有的 brush 選擇
            this.g.call(this.brush.clear);
            
            // 通知外部監聽器（傳遞單一年份）
            if (this.onBrushEnd) {
                this.onBrushEnd([year, year]);
            }
        }
    }
}

export default LineChart;