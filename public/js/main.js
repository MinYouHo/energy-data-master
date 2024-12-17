import { COLORS, ENERGY_TYPES, ENERGY_LABELS, CHART_CONFIG } from './constants.js';
import LineChart from './line.js';
import MapChart from './map.js';
import StackChart from './stack.js'

class EnergyVisualization {
    constructor(container) {
        this.container = container;
        this.currentYear = 2023;
        this.isPlaying = false;

        this.initialize();
    }

    async initialize() {
        try {
            // 載入數據
            await this.loadData();
            
            // 初始化視覺化組件
            await this.initializeComponents();
            
            // 初始化控制項
            this.initControls();

            // 進行初始更新
            this.update(this.currentYear);
        } catch (error) {
            console.error('初始化失敗:', error);
        }
    }
    
    async loadData() {
        // 載入數據
        const response = await fetch('data/energy_data.json');
        this.data = await response.json();
        
        // 處理數據以供視覺化使用
        await this.processData();
    }
    
    processData() {
        // 處理堆疊圖數據
        this.yearData = Object.fromEntries(
            this.data.map(yearData => [
                yearData.year,
                yearData.countries.map(country => ({
                    country: country.name,
                    total: country.total,
                    ...Object.values(ENERGY_TYPES).flat()
                        .reduce((acc, type) => ({
                            ...acc,
                            [type]: country.energy[type] || 0
                        }), {})
                }))
            ])
        );

        // 處理折線圖數據
        this.yearConsumption = Object.entries(this.yearData)
            .map(([year, countries]) => ({
                year: parseInt(year),
                energy: Object.values(ENERGY_TYPES).flat()
                    .reduce((totals, type) => ({
                        ...totals,
                        [type]: countries.reduce((sum, country) => 
                            sum + (country[type] || 0), 0)
                    }), {})
            }))
            .sort((a, b) => a.year - b.year);
    }
        
    async initializeComponents() {
        // 依序初始化各個圖表組件
        [this.stackChart, this.lineChart, this.mapChart] = await Promise.all([
            new StackChart('#chart-area', this.yearData[this.currentYear]),
            new LineChart('#chart-line', this.yearConsumption),
            new MapChart('#chart-map', this.data)
        ]);
    }
    
    initControls() {
            // 初始化播放按鈕
            this.playButton = document.getElementById('play-button');
            this.playButton.addEventListener('click', () => this.togglePlay());
    
            // 初始化年份滑桿
            this.slider = document.getElementById('year-slider');
            this.yearLabel = document.getElementById('year-label');
            this.slider.addEventListener('input', this.handleSliderChange.bind(this));
    }

    handleSliderChange(event) {
        this.currentYear = parseInt(event.target.value);
        this.yearLabel.textContent = this.currentYear;
        requestAnimationFrame(() => this.update(this.currentYear));
    }
    
    update(year) {
        if (!this.yearData?.[year]) return;
        
        // 使用 requestAnimationFrame 確保平滑更新
        requestAnimationFrame(() => {
            this.stackChart?.update(this.yearData[year]);
            this.mapChart?.updateYear(year);
        });
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        
        // 更新播放按鈕狀態
        requestAnimationFrame(() => {
            const playIcon = this.playButton.querySelector('.play-icon');
            const pauseIcon = this.playButton.querySelector('.pause-icon');
            
            playIcon.classList.toggle('hidden');
            pauseIcon.classList.toggle('hidden');
        });

        // 控制播放狀態
        this.isPlaying ? this.play() : this.pause();
    }

    play() {
        if (this.timer) return;
        const fps = 30;
        let lastTime = 0;
        
        const animate = (currentTime) => {
            if (!this.isPlaying) return;
            
            this.timer = requestAnimationFrame(animate);
            
            if (currentTime - lastTime < 1000 / fps) return;
            
            this.currentYear = this.currentYear >= 2023 ? 1965 : this.currentYear + 1;
            
            // 更新界面
            this.slider.value = this.currentYear;
            this.yearLabel.textContent = this.currentYear;
            this.update(this.currentYear);
            
            lastTime = currentTime;
        };
        
        this.timer = requestAnimationFrame(animate);
    }

    pause() {
        if (this.timer) {
            cancelAnimationFrame(this.timer);
            this.timer = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EnergyVisualization('#visualization-container');
});