// data-processor.js
import { ENERGY_TYPES } from './constants.js';

class DataProcessor {
    constructor() {
        this.data = null;
        this.yearData = null;
        this.yearConsumption = null;
    }

    // 載入原始資料
    async loadData() {
        try {
            const response = await fetch('data/energy_data.json');
            this.data = await response.json();
            await this.processData();
            return {
                rawData: this.data,
                yearData: this.yearData,
                yearConsumption: this.yearConsumption
            };
        } catch (error) {
            console.error('資料載入失敗:', error);
            throw error;
        }
    }

    // 處理資料以供不同圖表使用
    processData() {
        // 處理堆疊圖所需的年度資料
        this.processStackChartData();
        
        // 處理折線圖所需的消耗量資料
        this.processLineChartData();
    }

    // 處理堆疊圖資料
    processStackChartData() {
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
    }

    // 處理折線圖資料
    processLineChartData() {
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

    // 取得特定年份的資料
    getYearData(year) {
        return this.yearData[year];
    }

    // 取得所有年度的消耗量資料
    getConsumptionData() {
        return this.yearConsumption;
    }

    // 取得原始資料
    getRawData() {
        return this.data;
    }
}

export default DataProcessor;