import numpy as np
import pandas as pd
import torch
from scipy.optimize import least_squares
import sys
import os

# ==========================================
# 0. 配置与输入参数
# ==========================================
if len(sys.argv) < 2:
    print("Usage: python worker_cuda.py <col_index>")
    sys.exit(1)

TARGET_COL = int(sys.argv[1])
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

N_GRID = 201 # 精度回归 201! GPU 不怕大网格

bc_path = r"D:\user\Downloads\border_openness.csv"
area_path = r"D:\user\Downloads\area_km2.csv"
file_path = r"C:\Users\user\Desktop\regional_quarterly_infection_rate.csv"
output_dir = r"C:\Users\user\.gemini\antigravity\scratch\rust_pde_solver\results"
plot_dir = r"C:\Users\user\.gemini\antigravity\scratch\rust_pde_solver\plots"

# 读取基础数据
Cdf = pd.read_csv(bc_path)
Adf = pd.read_csv(area_path)
df = pd.read_csv(file_path)

def solve_pde_cuda(D, r, gamma, t_eval, target_initial_rate, capacity, R, L, bc_derivative=0.0):
    """
    使用 PyTorch CUDA 加速的 PDE 求解器
    """
    N = N_GRID
    dx = 2 * L / N
    
    # 构建坐标张量
    coords = torch.linspace(-L, L, N, device=DEVICE)
    Y, X = torch.meshgrid(coords, coords, indexing='ij')
    dist_sq = X**2 + Y**2
    domain = dist_sq <= R**2
    
    # 初始条件 (已经在 GPU 上计算)
    safety_factor = 10 
    min_spread = target_initial_rate * R**2 / (capacity * safety_factor)
    spread_factor = max(20000.0, min_spread)
    
    u = torch.exp(-dist_sq / spread_factor)
    current_mean = u[domain].mean()
    if current_mean < 1e-15: current_mean = 1e-15
    u = u * (target_initial_rate / current_mean)
    u = torch.clamp(u, 0, capacity)
    u[~domain] = 0
    
    total_infections = []
    current_time = 0.0
    t_eval_tensor = torch.tensor(t_eval, device=DEVICE)
    eval_idx = 0
    
    # 转换为标量张量以便快速运算
    D_t = torch.tensor(D, device=DEVICE)
    r_t = torch.tensor(r, device=DEVICE)
    gamma_t = torch.tensor(gamma, device=DEVICE)
    dx_sq = dx**2
    
    if t_eval[0] == 0:
        total_infections.append(u[domain].mean().item())
        eval_idx += 1
        
    while eval_idx < len(t_eval):
        # 动态步长
        dt_stable = 0.9 * dx_sq / (4 * max(D, 1e-5))
        if current_time + dt_stable > t_eval[eval_idx]:
            dt = t_eval[eval_idx] - current_time
        else:
            dt = dt_stable
        
        # 拉普拉斯算子 (使用 PyTorch 的 roll 获取邻域)
        u_up    = torch.roll(u,  1, 0)
        u_down  = torch.roll(u, -1, 0)
        u_left  = torch.roll(u,  1, 1)
        u_right = torch.roll(u, -1, 1)
        
        # 边界处理
        # 注意：这里为了速度简化了边界判断，直接利用 domain 遮罩
        laplacian = (u_up + u_down + u_left + u_right - 4 * u) / dx_sq
        
        # 核心迭代
        u = u + dt * (D_t * laplacian + r_t * u * (1 - u / capacity) - gamma_t * u)
        
        # 约束范围
        u = torch.clamp(u, min=0)
        u[~domain] = 0
        current_time += dt
        
        if current_time >= t_eval[eval_idx] - 1e-8:
            total_infections.append(u[domain].mean().item())
            eval_idx += 1
            
    return np.array(total_infections)

def residuals(params, t_data, target_data, target_init_rate, capacity, R, L, bc_val):
    D_guess, r_guess, gamma_guess = params
    simulated = solve_pde_cuda(D_guess, r_guess, gamma_guess, t_eval=t_data,
                               target_initial_rate=target_init_rate,
                               capacity=capacity, R=R, L=L)
    return (simulated - target_data) * 1e4

def run_task():
    col_index = TARGET_COL
    t_data = df.iloc[:, 0].values
    noisy_data = df.iloc[:, col_index].values
    
    target_init_rate = df.iloc[0, col_index]
    max_capacity = df.iloc[:, col_index].max() * 1.5
    
    r_domain = np.sqrt(Adf.iloc[0, col_index] / np.pi)
    l_domain = r_domain * 1.2
    bc_val = Cdf.iloc[0, col_index]

    initial_guess = [5000.0, 0.2, 0.05]
    bounds = ([1e-2, 1e-5, 1e-5], [5.0e6, 2.0, 1.0])

    print(f"🚀 CUDA Task Start: Col={col_index} | Grid={N_GRID}x{N_GRID}")
    
    res = least_squares(
        residuals, initial_guess, bounds=bounds,
        args=(t_data, noisy_data, target_init_rate, max_capacity, r_domain, l_domain, bc_val),
        method='trf', ftol=1e-8, xtol=1e-8, max_nfev=500
    )

    fitted_D, fitted_r, fitted_gamma = res.x
    
    # 保存结果
    res_path = os.path.join(output_dir, f"result_{col_index}.csv")
    pd.DataFrame([[fitted_D, fitted_r, fitted_gamma]], columns=['D', 'r', 'gamma']).to_csv(res_path, index=False)
    print(f"✅ CUDA Task Done: Col={col_index} | D={fitted_D:.1f}, r={fitted_r:.4f}")

if __name__ == "__main__":
    run_task()
