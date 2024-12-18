// data-processor.js
import { ENERGY_TYPES } from './constants.js';

class DataProcessor {
    constructor() {
        this.data = null;
        this.yearData = null;
        this.yearConsumption = null;
        this.selectedCountries = [];
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

    processLineChartData() {
        const yearEntries = Object.entries(this.yearData);
        
        this.yearConsumption = yearEntries
            .map(([year, countries]) => {
                // 決定要處理的國家列表
                const countriesToProcess = this.selectedCountries.length > 0
                    ? countries.filter(country => 
                        this.selectedCountries.includes(country.country))
                    : countries;

                // 計算該年所有能源類型的總和
                const energyTotals = Object.values(ENERGY_TYPES)
                    .flat()
                    .reduce((totals, type) => {
                        // 對選中的國家進行能源類型的總和計算
                        const typeTotal = countriesToProcess.reduce(
                            (sum, country) => sum + (country[type] || 0), 
                            0
                        );
                        
                        return {
                            ...totals,
                            [type]: Number(typeTotal.toFixed(2)) // 保留兩位小數
                        };
                    }, {});

                // 返回該年的彙總數據
                return {
                    year: parseInt(year),
                    energy: energyTotals,
                    // 可選：添加該年的總能源消耗
                    totalConsumption: Object.values(energyTotals)
                        .reduce((sum, value) => sum + value, 0)
                };
            })
            .sort((a, b) => a.year - b.year); // 確保按年份排序
        // console.log('處理完的yearConsumption:', this.yearConsumption);

        return this.yearConsumption;
    }

    setSelectedCountries(countries) {
        this.selectedCountries = countries || [];
        console.log('資料處理收到的國家：', this.selectedCountries)
        // 當選取國家改變時，重新處理折線圖數據
        return this.processLineChartData();
    }

    getYearData(yearRange) {
        // 如果輸入是單一年份，直接返回該年的資料
        if (!Array.isArray(yearRange)) {
            return this.formatStackData(yearRange);
        }

        return this.calculateAverageData(yearRange);
    }

    // 計算指定年份範圍的平均資料
    calculateAverageData(yearRange) {
        const [startYear, endYear] = yearRange;
        
        // 取得該範圍內所有年份的資料
        const yearsInRange = Object.keys(this.yearData)
            .map(Number)
            .filter(year => year >= startYear && year <= endYear);

        if (yearsInRange.length === 0) {
            console.warn('指定的年份範圍內沒有資料');
            return [];
        }

        // 取得所有國家的清單（使用第一年的資料）
        const countries = this.yearData[yearsInRange[0]].map(country => country.country);
        
        // 計算每個國家在這段期間的平均能源使用量
        const averageData = countries.map(countryName => {
            // 收集該國在範圍內所有年份的資料
            const countryYearData = yearsInRange.map(year => 
                this.yearData[year].find(c => c.country === countryName)
            ).filter(Boolean);

            if (countryYearData.length === 0) return null;

            // 計算各能源類型的平均值
            const energyAverages = Object.values(ENERGY_TYPES)
                .flat()
                .reduce((acc, energyType) => {
                    const average = countryYearData.reduce((sum, yearData) => 
                        sum + (yearData[energyType] || 0), 0) / countryYearData.length;
                    
                    return {
                        ...acc,
                        [energyType]: Number(average.toFixed(2))
                    };
                }, {});

            const totalAverage = Number(
                (countryYearData.reduce((sum, yearData) => 
                    sum + yearData.total, 0) / countryYearData.length).toFixed(2)
            );

            return {
                country: countryName,
                total: totalAverage,
                ...energyAverages
            };
        }).filter(Boolean);

        return averageData.sort((a, b) => b.total - a.total);
    }

    // 取得地圖資料格式
    getMapData(yearRange = null) {
        // 如果沒有提供年份範圍，返回原始資料
        if (!yearRange) {
            return this.data;
        }

        const averageData = this.calculateAverageData(yearRange);
        
        // 轉換成地圖所需的資料格式
        return [{
            year: yearRange[1], // 使用範圍的結束年份作為參考年份
            countries: averageData.map(country => ({
                name: country.country,
                total: country.total,
                energy: Object.values(ENERGY_TYPES)
                    .flat()
                    .reduce((acc, type) => ({
                        ...acc,
                        [type]: country[type]
                    }), {})
            }))
        }];
    }

    getConsumptionData() {
        return this.yearConsumption;
    }

    getSelectedCountries() {
        return this.selectedCountries;
    }

    hasSelectedCountries() {
        return this.selectedCountries.length > 0;
    }

    getRawData() {
        return this.data;
    }
}

export default DataProcessor;