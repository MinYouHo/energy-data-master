import pandas as pd
import json
from pathlib import Path


class EnergyDataProcessor:
    """能源數據預處理器"""

    def __init__(self, input_file):
        try:
            # 讀取 CSV 檔案
            self.df = pd.read_csv(input_file)

            # 定義能源類型
            self.energy_types = {
                'fossil_fuels': {
                    'oil': 'oil_consumption',
                    'coal': 'coal_consumption',
                    'gas': 'gas_consumption'
                },
                'nuclear': {
                    'nuclear': 'nuclear_consumption'
                },
                'renewables': {
                    'hydro': 'hydro_consumption',
                    'wind': 'wind_consumption',
                    'solar': 'solar_consumption',
                    'biofuel': 'biofuel_consumption'
                }
            }

            # 定義要排除的關鍵字（只排除明確的非國家實體）
            self.exclude_keywords = [
                'World', 'OECD', 'Asia', 'Europe', 'America', 'Africa',
                'income', 'EU', 'Union', 'Region', 'Statistical', 'International',
                'CIS', 'Middle East', '(EI)', 'Bunkers', 'FSU', 'USSR',
                'aggregate'
            ]

            # 調用數據清理方法
            self._clean_energy_data()

        except Exception as e:
            raise Exception(f"初始化過程發生錯誤：{str(e)}")

    def analyze_data_completeness(self, year_range=None):
        """分析數據完整性"""
        if year_range is None:
            start_year = self.df['year'].min()
            end_year = self.df['year'].max()
        else:
            start_year, end_year = year_range

        # 創建排除條件
        exclude_condition = '|'.join(self.exclude_keywords)
        mask = ~self.df['country'].str.contains(exclude_condition, case=False, na=False)

        # 篩選時間範圍內的數據
        df_filtered = self.df[
            (self.df['year'] >= start_year) &
            (self.df['year'] <= end_year) &
            mask
            ]

        # 獲取所有國家
        countries = df_filtered['country'].unique()

        # 分析每個國家的數據完整性
        completeness_data = []
        energy_columns = [col for category in self.energy_types.values() for col in category.values()]

        for country in countries:
            country_data = df_filtered[df_filtered['country'] == country]

            # 檢查年份完整性
            years_covered = set(country_data['year'])
            expected_years = set(range(start_year, end_year + 1))
            year_completeness = len(years_covered) / len(expected_years) * 100

            # 檢查能源數據完整性
            data_completeness = {}
            for col in energy_columns:
                valid_data = country_data[col].notna()
                data_completeness[col] = (valid_data.sum() / len(country_data)) * 100

            # 計算平均數據完整性
            avg_completeness = sum(data_completeness.values()) / len(data_completeness)

            # 獲取最新年份的能源消耗
            latest_consumption = float(
                country_data[country_data['year'] == end_year]['primary_energy_consumption'].iloc[0]) \
                if end_year in years_covered else 0

            completeness_data.append({
                'country': country,
                'year_completeness': year_completeness,
                'data_completeness': avg_completeness,
                'latest_consumption': latest_consumption,
                'years_covered': sorted(list(years_covered)),
                'missing_years': sorted(list(expected_years - years_covered))
            })

        # 根據數據完整性排序
        return sorted(completeness_data,
                      key=lambda x: (x['year_completeness'], x['data_completeness'], x['latest_consumption']),
                      reverse=True)

    def process_data(self, start_year=1965, end_year=2023, min_completeness=50):
        """處理能源消耗數據"""
        try:
            # 分析數據完整性
            completeness_data = self.analyze_data_completeness((start_year, end_year))

            # 選擇數據完整性達標的國家
            selected_countries = [
                country['country']
                for country in completeness_data
                if country['year_completeness'] >= min_completeness and
                   country['data_completeness'] >= min_completeness
            ]

            # 創建排除條件
            exclude_condition = '|'.join(self.exclude_keywords)
            mask = ~self.df['country'].str.contains(exclude_condition, case=False, na=False)

            # 過濾數據
            year_mask = (self.df['year'] >= start_year) & (self.df['year'] <= end_year)
            country_mask = self.df['country'].isin(selected_countries)
            filtered_df = self.df[year_mask & country_mask & mask].copy()

            # 準備數據
            processed_data = []

            # 按年份分組處理數據
            for year, year_group in filtered_df.groupby('year'):
                year_data = {
                    'year': int(year),
                    'countries': []
                }

                # 處理每個國家的數據
                for country, country_data in year_group.groupby('country'):
                    try:
                        # 收集能源數據
                        energy_data = {}
                        total = 0

                        for category in self.energy_types.values():
                            for energy_type, column in category.items():
                                if len(country_data) > 0 and column in country_data.columns:
                                    value = float(country_data[column].iloc[0])
                                    energy_data[energy_type] = value
                                    total += value
                                else:
                                    energy_data[energy_type] = 0

                        if total > 0:
                            country_info = {
                                'name': country,
                                'total': total,
                                'energy': energy_data
                            }
                            year_data['countries'].append(country_info)

                    except Exception as e:
                        print(f"處理 {country} 的 {year} 年數據時出錯: {str(e)}")
                        continue

                # 根據總能源消耗排序國家
                if year_data['countries']:
                    year_data['countries'].sort(key=lambda x: x['total'], reverse=True)
                    processed_data.append(year_data)

            # 確保數據按年份排序
            processed_data.sort(key=lambda x: x['year'])

            return processed_data, completeness_data

        except Exception as e:
            raise Exception(f"數據處理過程發生錯誤：{str(e)}")

    def _clean_energy_data(self):
        """清理能源數據"""
        energy_columns = [
            column
            for category in self.energy_types.values()
            for column in category.values()
        ]

        for column in energy_columns:
            self.df[column] = pd.to_numeric(
                self.df[column],
                errors='coerce'
            ).fillna(0)


def main():
    """主函數"""
    try:
        # 初始化處理器
        input_file = 'owid-energy-data.csv'
        print(f"開始處理數據檔案: {input_file}")

        processor = EnergyDataProcessor(input_file)

        # 處理所有國家的數據（不設置最低完整性要求）
        data, completeness_data = processor.process_data(min_completeness=0)

        print("\n=== 數據完整性分析 ===")

        # 1. 總體統計
        total_countries = len(completeness_data)
        print(f"\n總國家數量: {total_countries}")

        # 2. 完整性分布
        completeness_levels = {
            '完整 (90-100%)': 0,
            '較好 (70-90%)': 0,
            '一般 (50-70%)': 0,
            '較差 (25-50%)': 0,
            '不完整 (0-25%)': 0
        }

        for country_data in completeness_data:
            completeness = country_data['data_completeness']
            if completeness >= 90:
                completeness_levels['完整 (90-100%)'] += 1
            elif completeness >= 70:
                completeness_levels['較好 (70-90%)'] += 1
            elif completeness >= 50:
                completeness_levels['一般 (50-70%)'] += 1
            elif completeness >= 25:
                completeness_levels['較差 (25-50%)'] += 1
            else:
                completeness_levels['不完整 (0-25%)'] += 1

        print("\n國家數據完整性分布：")
        for level, count in completeness_levels.items():
            percentage = (count / total_countries) * 100
            print(f"{level}: {count} 國家 ({percentage:.1f}%)")

        # 3. 時間覆蓋分析
        year_coverage = {}
        for country_data in completeness_data:
            for year in country_data['years_covered']:
                year_coverage[year] = year_coverage.get(year, 0) + 1

        print("\n年份數據覆蓋情況：")
        print(f"起始年份: {min(year_coverage.keys())}")
        print(f"結束年份: {max(year_coverage.keys())}")
        avg_countries_per_year = sum(year_coverage.values()) / len(year_coverage)
        print(f"每年平均有數據的國家數: {avg_countries_per_year:.1f}")

        # 4. 數據質量分組
        quality_groups = {
            "高質量數據": [],  # 90%以上
            "良好數據": [],  # 70-90%
            "中等數據": [],  # 50-70%
            "低質量數據": []  # 50%以下
        }

        for country_data in completeness_data:
            completeness = country_data['data_completeness']
            country_info = {
                'name': country_data['country'],
                'completeness': completeness,
                'years': len(country_data['years_covered']),
                'consumption': country_data['latest_consumption']
            }

            if completeness >= 90:
                quality_groups["高質量數據"].append(country_info)
            elif completeness >= 70:
                quality_groups["良好數據"].append(country_info)
            elif completeness >= 50:
                quality_groups["中等數據"].append(country_info)
            else:
                quality_groups["低質量數據"].append(country_info)

        print("\n=== 國家數據質量分組 ===")
        for quality, countries in quality_groups.items():
            countries.sort(key=lambda x: x['completeness'], reverse=True)
            print(f"\n{quality} ({len(countries)} 個國家):")
            # 只顯示每組的前5個國家作為例子
            for country in countries[:5]:
                print(f"  - {country['name']}:")
                print(f"    完整度: {country['completeness']:.1f}%")
                print(f"    有數據的年份數: {country['years']}")
                print(f"    最新能源消耗: {country['consumption']:.2f} TWh")

        # 5. 保存完整數據
        print("\n=== 保存數據 ===")
        output_dir = Path('public/data')
        output_dir.mkdir(exist_ok=True, parents=True)
        output_file = output_dir / 'energy_data.json'

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"數據已保存至: {output_file}")

        # 6. 數據摘要
        actual_countries = set()
        for year_data in data:
            actual_countries.update(country['name'] for country in year_data['countries'])

        print("\n=== 最終數據摘要 ===")
        print(f"納入分析的國家總數: {len(actual_countries)}")
        print(f"時間範圍: {data[0]['year']} - {data[-1]['year']}")
        total_data_points = sum(len(year_data['countries']) for year_data in data)
        print(f"總數據點數: {total_data_points}")
        print(f"平均每年國家數: {total_data_points / len(data):.1f}")

    except Exception as e:
        print(f"處理過程發生錯誤：{str(e)}")


if __name__ == "__main__":
    main()