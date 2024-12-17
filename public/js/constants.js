// 能源類型顏色配置
export const COLORS = {
    fossil_fuels: {
        oil: '#8B4513',    // 深褐色
        coal: '#2F4F4F',   // 深灰色
        gas: '#696969'     // 中灰色
    },
    nuclear: {
        nuclear: '#800080' // 紫色
    },
    renewables: {
        hydro: '#4169E1',  // 皇家藍
        wind: '#87CEEB',   // 天藍色
        solar: '#FFD700',  // 金色
        biofuel: '#228B22' // 森林綠
    }
};

// 能源類型分類
export const ENERGY_TYPES = {
    fossil_fuels: ['oil', 'coal', 'gas'],
    nuclear: ['nuclear'],
    renewables: ['hydro', 'wind', 'solar', 'biofuel']
};

// 能源類型標籤
export const ENERGY_LABELS = {
    oil: 'Oil',
    coal: 'Coal',
    gas: 'Natural Gas',
    nuclear: 'Nuclear',
    hydro: 'Hydropower',
    wind: 'Wind',
    solar: 'Solar',
    biofuel: 'Biofuel'
};

// 圖表配置
export const CHART_CONFIG = {
    margin: {
        top: 30,
        right: 30,
        bottom: 40,
        left: 90
    },
    bar: {
        padding: 0.1,
        height: 25
    },
    animation: {
        duration: 750
    }
};

// 時間控制配置
export const TIME_CONFIG = {
    startYear: 1965,
    endYear: 2023,
    animationInterval: 1000  // 1秒更新一次
};