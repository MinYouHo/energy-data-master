// data-processor.js
import { ENERGY_TYPES } from './constants.js';

class DataProcessor {
    constructor() {
        this.data = null;
        this.yearData = null;
        this.yearConsumption = null;
    }

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

    processData() {
        this.processStackChartData();
        this.processLineChartData();
    }

    processStackChartData() {
        // 將資料轉換為以年份為鍵的物件
        this.yearData = Object.fromEntries(
            this.data.map(yearData => {
                // 處理每一年的資料
                const processedCountries = yearData.countries.map(country => {
                    // 基本的國家資訊
                    const baseCountryData = {
                        country: country.name,
                        total: country.total
                    };

                    // 處理所有能源類型的數據
                    const energyData = Object.values(ENERGY_TYPES)
                        .flat()  // 將巢狀陣列扁平化
                        .reduce((acc, energyType) => ({
                            ...acc,
                            // 如果沒有該能源類型的數據，預設為 0
                            [energyType]: country.energy[energyType] || 0
                        }), {});

                    // 合併基本資訊和能源數據
                    return {
                        ...baseCountryData,
                        ...energyData
                    };
                });

                // 返回 [年份, 該年的國家資料陣列]
                return [yearData.year, processedCountries];
            })
        );
    }

    // 格式化堆疊圖所需的年度資料
    formatStackData(year) {
        const yearData = this.yearData[year];
        if (!yearData) return [];

        // 依照總能源消耗量排序
        return yearData.sort((a, b) => b.total - a.total)
            .map(country => {
                // 確保所有能源類型都有數值
                const energyValues = Object.values(ENERGY_TYPES)
                    .flat()
                    .reduce((acc, type) => ({
                        ...acc,
                        [type]: country[type] || 0
                    }), {});

                return {
                    country: country.country,
                    total: country.total,
                    ...energyValues
                };
            });
    }

    // 其他方法保持不變...
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

    getYearData(yearRange) {
        // 如果輸入是單一年份，直接返回該年的資料
        if (!Array.isArray(yearRange)) {
            return this.formatStackData(yearRange);
        }

        const [startYear, endYear] = yearRange;
        
        // 取得該範圍內所有年份的資料
        const yearsInRange = Object.keys(this.yearData)
            .map(Number)
            .filter(year => year >= startYear && year <= endYear);

        if (yearsInRange.length === 0) {
            console.warn('指定的年份範圍內沒有資料');
            return [];
        }

        // 取得所有國家的清單（使用最後一年的資料）
        const countries = this.yearData[yearsInRange[0]].map(country => country.country);
        
        // 計算每個國家在這段期間的平均能源使用量
        const averageData = countries.map(countryName => {
            // 收集該國在範圍內所有年份的資料
            const countryYearData = yearsInRange.map(year => 
                this.yearData[year].find(c => c.country === countryName)
            ).filter(Boolean); // 移除可能的 undefined 值

            // 如果該國在某些年份沒有資料，則跳過
            if (countryYearData.length === 0) return null;

            // 計算各能源類型的平均值
            const energyAverages = Object.values(ENERGY_TYPES)
                .flat()
                .reduce((acc, energyType) => {
                    // 計算該能源類型的平均值
                    const average = countryYearData.reduce((sum, yearData) => 
                        sum + (yearData[energyType] || 0), 0) / countryYearData.length;
                    
                    return {
                        ...acc,
                        [energyType]: Number(average.toFixed(2)) // 四捨五入到小數點後兩位
                    };
                }, {});

            // 計算總能源使用量的平均值
            const totalAverage = Number(
                (countryYearData.reduce((sum, yearData) => 
                    sum + yearData.total, 0) / countryYearData.length).toFixed(2)
            );

            // 返回該國的平均資料
            return {
                country: countryName,
                total: totalAverage,
                ...energyAverages
            };
        }).filter(Boolean); // 移除可能的 null 值

        // 根據平均總能源使用量排序
        return averageData.sort((a, b) => b.total - a.total);
    }

    getConsumptionData() {
        return this.yearConsumption;
    }

    getRawData() {
        return this.data;
    }
}

export default DataProcessor;