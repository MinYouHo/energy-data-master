import { COLORS, ENERGY_TYPES, ENERGY_LABELS, CHART_CONFIG } from './constants.js';

class EnergyVisualization {
    constructor(container) {
        console.log('Initializing visualization...');
        this.container = container;
        console.log('Container:', this.container);
        this.currentYear = 2023;
        this.isPlaying = false;
        this.data = null;
        this.timer = null;
        this.initialized = false;

        // 初始化 SVG
        this.initSVG();
        // 載入資料
        this.loadData();
        // 初始化控制項
        this.initControls();
    }

    initSVG() {
    // 設置圖表尺寸
    this.width = 1000;
    this.height = 600;
    this.margin = CHART_CONFIG.margin;
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;

    // 建立 SVG
    this.svg = d3.select('#chart-area')
        .append('svg')
        .attr('width', this.width)
        .attr('height', this.height);

    // 建立主要繪圖群組
    this.g = this.svg.append('g')
        .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // 建立座標軸群組
    this.xAxisG = this.g.append('g')
        .attr('transform', `translate(0,${this.innerHeight})`);
    this.yAxisG = this.g.append('g');
}

    async loadData() {
    try {
        console.log('開始載入資料...');
        const response = await fetch('data/energy_data.json');

        // 檢查回應狀態
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        this.data = await response.json();

        // 詳細的數據檢查
        console.log('=== 數據載入分析 ===');
        console.log('1. 時間範圍：', {
            起始年份: this.data[0].year,
            結束年份: this.data[this.data.length - 1].year,
            總年數: this.data.length
        });

        // 取得最新年份數據
        const latestYear = this.data[this.data.length - 1];
        const earliestYear = this.data[0];

        // 製作國家分析報告
        const countryAnalysis = {
            起始年份國家數: earliestYear.countries.length,
            結束年份國家數: latestYear.countries.length,
            主要國家列表: latestYear.countries
                .sort((a, b) => b.total - a.total) // 依總能源消耗排序
                .slice(0, 10)  // 取前10名
                .map(country => ({
                    國家: country.name,
                    總能源消耗: country.total,
                    能源佔比: ((country.total / latestYear.countries.reduce((sum, c) => sum + c.total, 0)) * 100).toFixed(2) + '%'
                }))
        };

        console.log('2. 國家統計分析：', countryAnalysis);

        // 能源類型分析
        if (latestYear.countries.length > 0) {
            const sampleCountry = latestYear.countries[0];
            console.log('3. 數據結構示例（最大能源消耗國家）：', {
                國家: sampleCountry.name,
                總能源: sampleCountry.total,
                能源類型分布: Object.entries(sampleCountry.energy)
                    .map(([type, value]) => ({
                        類型: type,
                        數值: value,
                        佔比: ((value / sampleCountry.total) * 100).toFixed(2) + '%'
                    }))
            });
        }

        // 數據完整性檢查
        console.log('4. 數據完整性檢查：', {
            總數據年份數: this.data.length,
            平均每年國家數: (this.data.reduce((sum, year) => sum + year.countries.length, 0) / this.data.length).toFixed(2),
            數據是否完整: this.data.every(year => year.countries.length > 0) ? '是' : '否'
        });

        this.processData();
        this.initialized = true;
        this.update(this.currentYear);

    } catch (error) {
        console.error('數據載入錯誤:', error);
        // 提供更具體的錯誤信息
        console.error('詳細錯誤資訊:', {
            錯誤類型: error.name,
            錯誤信息: error.message,
            錯誤堆疊: error.stack
        });
    }
}

    processData() {
        // 將數據組織成適合堆疊圖的格式
        this.yearData = {};
        this.data.forEach(yearData => {
            this.yearData[yearData.year] = yearData.countries.map(country => {
                const energyData = {
                    country: country.name,
                    total: country.total
                };
                // 添加各種能源數據
                Object.entries(ENERGY_TYPES).forEach(([category, types]) => {
                    types.forEach(type => {
                        energyData[type] = country.energy[type] || 0;
                    });
                });
                return energyData;
            });
        });
    }

    initControls() {
        // 初始化播放按鈕
        this.playButton = document.getElementById('play-button');
        this.playButton.addEventListener('click', () => this.togglePlay());

        // 初始化時間軸滑塊
        this.slider = document.getElementById('year-slider');
        this.yearLabel = document.getElementById('year-label');

        this.slider.addEventListener('input', (event) => {
            this.currentYear = parseInt(event.target.value);
            this.yearLabel.textContent = this.currentYear;
            if (this.initialized) {
                this.update(this.currentYear);
            }
        });
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        const playIcon = this.playButton.querySelector('.play-icon');
        const pauseIcon = this.playButton.querySelector('.pause-icon');

        if (this.isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
            this.play();
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
            this.pause();
        }
    }

    play() {
        if (!this.timer) {
            this.timer = setInterval(() => {
                if (this.currentYear >= 2023) {
                    this.currentYear = 1965;
                } else {
                    this.currentYear++;
                }
                this.slider.value = this.currentYear;
                this.yearLabel.textContent = this.currentYear;
                this.update(this.currentYear);
            }, 1000);
        }
    }

    pause() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    update(year) {
        if (!this.yearData || !this.yearData[year]) return;

        const data = this.yearData[year].sort((a, b) => b.total - a.total);

        // 更新比例尺
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.total)])
            .range([0, this.innerWidth]);

        const yScale = d3.scaleBand()
            .domain(data.map(d => d.country))
            .range([0, this.innerHeight])
            .padding(0.1);

        // 準備堆疊數據
        const stack = d3.stack()
            .keys(Object.values(ENERGY_TYPES).flat())
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        const stackedData = stack(data);

        // 更新軸
        const xAxis = d3.axisBottom(xScale)
            .ticks(5)
            .tickFormat(d => d3.format(',')(d) + ' TWh');
        const yAxis = d3.axisLeft(yScale);

        this.xAxisG.transition().duration(750).call(xAxis);
        this.yAxisG.transition().duration(750).call(yAxis);

        // 更新堆疊條
        const energyGroups = this.g.selectAll('.energy-group')
            .data(stackedData)
            .join('g')
            .attr('class', 'energy-group')
            .style('fill', (d, i) => {
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
            .transition()
            .duration(750)
            .attr('y', d => yScale(d.data.country))
            .attr('x', d => xScale(d[0]))
            .attr('width', d => xScale(d[1]) - xScale(d[0]))
            .attr('height', yScale.bandwidth());

        // 更新圖例
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

// 當文檔載入完成後初始化視覺化
document.addEventListener('DOMContentLoaded', () => {
    new EnergyVisualization('#chart-area');
});