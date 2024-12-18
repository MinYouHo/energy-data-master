import { COLORS, ENERGY_TYPES, ENERGY_LABELS, CHART_CONFIG } from './constants.js';
import LineChart from './line.js';
import MapChart from './map.js';
import StackChart from './stack.js';
import DataProcessor from './data-processor.js';

class EnergyVisualization {
    constructor(container) {
        this.container = container;
        this.currentYear = 2023;
        this.selectedYearRange = null;
        this.selectedCountries = [];
        this.isPlaying = false;
        this.dataProcessor = new DataProcessor();
        this.isInitialized = false;  // 新增初始化狀態追蹤

        // 確保非同步初始化開始
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

            // 標記初始化完成
            this.isInitialized = true;

            // 在所有初始化完成後進行第一次更新
            this.updateVisualizations();
        } catch (error) {
            console.error('初始化失敗:', error);
            // 可以在這裡添加更多錯誤處理邏輯
        }
    }
        
    async initializeComponents(rawData, currentYearData, yearConsumption) {
        try {
            // 依序初始化各個圖表組件
            this.stackChart = new StackChart('#chart-area', currentYearData);
            this.lineChart = new LineChart('#chart-line', yearConsumption);
            this.mapChart = await new MapChart('#chart-map', rawData);

            // 設置折線圖的選取事件處理
            this.lineChart.onBrushEnd = this.handleTimeRangeSelect.bind(this);
            // 地圖的選取
            this.mapChart.onCountriesSelect = this.handleCountriesSelect.bind(this);
        } catch (error) {
            console.error('圖表初始化失敗:', error);
            throw error;  // 向上傳遞錯誤
        }
    }
    
    handleTimeRangeSelect(yearRange) {
        if (!this.isInitialized) return;
        
        this.selectedYearRange = yearRange;
        this.updateVisualizations();
    }

    handleCountriesSelect(Countries) {
        if (!this.isInitialized) return;
        
        this.selectedCountries = Countries;
        console.log('主程式接收到的國家：', this.selectedCountries);
        this.updateVisualizations();
    }

    updateVisualizations() {
        // 確保組件已完全初始化
        if (!this.isInitialized) return;

        // 沒選範圍就用當前年份的資料
        const yearData = this.selectedYearRange 
            ? this.dataProcessor.getYearData(this.selectedYearRange)
            : this.dataProcessor.getYearData(this.currentYear);

        const consumptionData = this.dataProcessor.setSelectedCountries(this.selectedCountries);
        // console.log('主程式收到的consumption:', consumptionData);

        // 更新堆疊圖
        if (this.stackChart) {
            this.stackChart.update(yearData);
        }

        // 更新地圖（使用範圍的結束年份或當前年份）
        if (this.mapChart) {
            const mapYear = this.selectedYearRange 
                ? this.selectedYearRange[1] 
                : this.currentYear;
            this.mapChart.updateYear(mapYear);
        }

        // 更新折線圖
        if (this.lineChart) {
            this.lineChart.update(consumptionData);
        }
    }
    
    initControls() {
        try {
            // 初始化播放按鈕
            this.playButton = document.getElementById('play-button');
            if (!this.playButton) {
                throw new Error('找不到播放按鈕元素');
            }
            this.playButton.addEventListener('click', () => this.togglePlay());

            // 初始化年份滑桿
            this.slider = document.getElementById('year-slider');
            this.yearLabel = document.getElementById('year-label');
            if (!this.slider || !this.yearLabel) {
                throw new Error('找不到滑桿或年份標籤元素');
            }
            this.slider.addEventListener('input', this.handleSliderChange.bind(this));
        } catch (error) {
            console.error('控制項初始化失敗:', error);
            throw error;
        }
    }

    handleSliderChange(event) {
        // 確保組件已完全初始化
        if (!this.isInitialized) return;

        this.currentYear = parseInt(event.target.value);
        this.yearLabel.textContent = this.currentYear;
        // 清除選取的範圍，因為使用者正在使用滑桿
        this.selectedYearRange = null;
        this.updateVisualizations();
    }

    togglePlay() {
        // 確保組件已完全初始化
        if (!this.isInitialized) return;

        this.isPlaying = !this.isPlaying;
        
        // 更新播放按鈕狀態
        const playIcon = this.playButton.querySelector('.play-icon');
        const pauseIcon = this.playButton.querySelector('.pause-icon');
        
        if (playIcon && pauseIcon) {
            playIcon.classList.toggle('hidden');
            pauseIcon.classList.toggle('hidden');
        }

        // 控制播放狀態
        this.isPlaying ? this.play() : this.pause();
    }

    play() {
        // 確保組件已完全初始化
        if (!this.isInitialized) return;

        // 播放時清除選取的範圍
        this.selectedYearRange = null;
        
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
            this.updateVisualizations();
            
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
    // 確保容器元素存在
    const container = document.querySelector('.visualization-container');
    if (!container) {
        console.error('找不到 visualization-container 元素');
        return;
    }
    
    try {
        new EnergyVisualization('.visualization-container');
    } catch (error) {
        console.error('初始化視覺化時發生錯誤:', error);
    }
});