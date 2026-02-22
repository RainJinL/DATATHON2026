import pandas as pd
import os

results_dir = "results"
output_file = "final_output.csv"
num_regions = 240

print(f"--- 正在汇总 {num_regions} 个区域的数据 ---")

all_data = []

for i in range(1, num_regions + 1):
    file_path = os.path.join(results_dir, f"result_{i}.csv")
    if os.path.exists(file_path):
        try:
            df = pd.read_csv(file_path)
            if not df.empty:
                row = df.iloc[0].to_dict()
                row['region_index'] = i
                all_data.append(row)
        except Exception as e:
            print(f"⚠️ 读取 result_{i}.csv 出错: {e}")
    else:
        print(f"❌ 缺失文件: result_{i}.csv")

final_df = pd.DataFrame(all_data)
# 调整列顺序
cols = ['region_index', 'D', 'r', 'gamma']
final_df = final_df[cols]
final_df.to_csv(output_file, index=False)

print(f"✨ 汇总完成！最终结果已保存至: {output_file}")
print(f"📊 总计成功汇总: {len(all_data)} / {num_regions} 个区域")
