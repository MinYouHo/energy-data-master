import { COLORS, ENERGY_TYPES, ENERGY_LABELS, CHART_CONFIG } from './constants.js';
import LineChart from './line.js';
import MapChart from './map.js';
import StackChart from './stack.js';
import DataProcessor from './data-processor.js';

class EnergyVisualization {
    constructor(container) {
        this.container = container;
        this.currentYear = 2023;
        this.isPlaying = false;
        this.dataProcessor = new DataProcessor();

        this.initialize();
    }

    async initialize() {
        try {
            // 載入並處理資料
            const { rawData, yearData, yearConsumption } = await this.dataProcessor.loadData();
            
            // 初始化視覺化組件
            await this.initializeComponents(rawData, yearData[this.currentYear], yearConsumption);
            
            // 初始化控制項
            this.initControls();

            // 進行初始更新
            this.update(this.currentYear);
        } catch (error) {
            console.error('初始化失敗:', error);
        }
    }
        
    async initializeComponents(rawData, currentYearData, yearConsumption) {
        // 依序初始化各個圖表組件
        [this.stackChart, this.lineChart, this.mapChart] = await Promise.all([
            new StackChart('#chart-area', currentYearData),
            new LineChart('#chart-line', yearConsumption),
            new MapChart('#chart-map', rawData)
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
        const yearData = this.dataProcessor.getYearData(year);
        if (!yearData) return;
        
        // 使用 requestAnimationFrame 確保平滑更新
        requestAnimationFrame(() => {
            this.stackChart?.update(yearData);
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