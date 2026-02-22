import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.optimize import least_squares
import sys
import os

# ==========================================
# 0. 配置与输入参数
# ==========================================
if len(sys.argv) < 2:
    print("Usage: python worker.py <col_index>")
    sys.exit(1)

TARGET_COL = int(sys.argv[1])

R_DOMAIN = 1770.0
L_DOMAIN = 2000.0
N_GRID = 51 # 最终冲刺，极致提速

bc_path = r"D:\user\Downloads\border_openness.csv"
area_path = r"D:\user\Downloads\area_km2.csv"
file_path = r"C:\Users\user\Desktop\regional_quarterly_infection_rate.csv"
output_dir = r"C:\Users\user\.gemini\antigravity\scratch\rust_pde_solver\results"
plot_dir = r"C:\Users\user\.gemini\antigravity\scratch\rust_pde_solver\plots"

# 读取基础数据
Cdf = pd.read_csv(bc_path)
Adf = pd.read_csv(area_path)
df = pd.read_csv(file_path)

def custom_initial_condition(X, Y, domain, target_rate, capacity, r_domain):
    safety_factor = 10 
    min_spread = target_rate * r_domain**2 / (capacity * safety_factor)
    spread_factor = max(20000.0, min_spread)

    raw_shape = np.exp(-((X**2 + Y**2) / spread_factor))
    mask = domain
    current_mean = np.nanmean(np.where(mask, raw_shape, np.nan))

    if current_mean < 1e-15: current_mean = 1e-15

    amplitude = target_rate / current_mean
    result = amplitude * raw_shape
    result = np.minimum(result, capacity)

    clipped_mean = np.nanmean(np.where(mask, result, np.nan))
    if clipped_mean > 1e-15:
        result = result * (target_rate / clipped_mean)
    return result

def solve_pde_curve(D, r, gamma, t_eval, target_initial_rate, capacity,
                    R, L, N=N_GRID, bc_derivative=0.0):
    dx = 2 * L / N
    x = np.linspace(-L, L, N)
    y = np.linspace(-L, L, N)
    X, Y = np.meshgrid(x, y)
    domain = (X**2 + Y**2) <= R**2

    u = np.zeros((N, N))
    u_init = custom_initial_condition(X, Y, domain, target_initial_rate, capacity, R)
    u[domain] = u_init[domain]

    total_infections = []
    current_time = 0.0
    eval_idx = 0

    if t_eval[eval_idx] == 0:
        total_infections.append(np.nanmean(np.where(domain, u, np.nan)))
        eval_idx += 1

    while eval_idx < len(t_eval):
        dt_stable = 0.9 * (dx**2) / (4 * max(D, 1e-5))
        if current_time + dt_stable > t_eval[eval_idx]:
            dt = t_eval[eval_idx] - current_time
        else:
            dt = dt_stable

        u_up    = np.roll(u, 1, axis=0)
        u_down  = np.roll(u, -1, axis=0)
        u_left  = np.roll(u, 1, axis=1)
        u_right = np.roll(u, -1, axis=1)

        u_up    = np.where(np.roll(domain, 1, axis=0),  u_up,    u + bc_derivative * dx)
        u_down  = np.where(np.roll(domain, -1, axis=0), u_down,  u + bc_derivative * dx)
        u_left  = np.where(np.roll(domain, 1, axis=1),  u_left,  u + bc_derivative * dx)
        u_right = np.where(np.roll(domain, -1, axis=1), u_right, u + bc_derivative * dx)

        laplacian = (u_up + u_down + u_left + u_right - 4 * u) / (dx**2)
        u = u + dt * (D * laplacian + r * u * (1 - u / capacity) - gamma * u)
        u = np.maximum(u, 0)
        u[~domain] = 0
        current_time += dt

        if current_time >= t_eval[eval_idx] - 1e-8:
            mean_inf = np.nanmean(np.where(domain, u, np.nan))
            total_infections.append(mean_inf)
            eval_idx += 1

    return np.array(total_infections)

def residuals(params, t_data, target_data, target_init_rate, capacity, R, L, bc_val):
    D_guess, r_guess, gamma_guess = params
    bc_deriv = 0 * bc_val * R / (2000000 * D_guess)
    
    simulated = solve_pde_curve(D_guess, r_guess, gamma_guess, t_eval=t_data,
                                target_initial_rate=target_init_rate,
                                capacity=capacity, R=R, L=L,
                                bc_derivative=bc_deriv)
    return (simulated - target_data) * 1e4

# ==========================================
# 1. 运行单列拟合
# ==========================================
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

    print(f"Task Start: Col={col_index}, R={r_domain:.1f}")
    
    res = least_squares(
        residuals, initial_guess, bounds=bounds,
        args=(t_data, noisy_data, target_init_rate, max_capacity, r_domain, l_domain, bc_val),
        method='trf', ftol=1e-8, xtol=1e-8, max_nfev=500
    )

    fitted_D, fitted_r, fitted_gamma = res.x
    
    # 保存结果
    res_path = os.path.join(output_dir, f"result_{col_index}.csv")
    pd.DataFrame([[fitted_D, fitted_r, fitted_gamma]], columns=['D', 'r', 'gamma']).to_csv(res_path, index=False)

    # 绘图
    t_smooth = np.linspace(t_data.min(), t_data.max(), 50)
    fitted_curve = solve_pde_curve(fitted_D, fitted_r, fitted_gamma, t_smooth, 
                                   target_init_rate, max_capacity, R=r_domain, L=l_domain)
    
    plt.figure(figsize=(8, 5))
    plt.scatter(t_data, noisy_data, color='red', label='Actual Data')
    plt.plot(t_smooth, fitted_curve, 'b-', label='PDE Fitted')
    plt.title(f"Col {col_index} | R0={fitted_r/fitted_gamma:.2f}")
    plt.savefig(os.path.join(plot_dir, f"plot_{col_index}.png"))
    plt.close()

    print(f"Task Done: Col={col_index} | D={fitted_D:.1f}, r={fitted_r:.4f}, g={fitted_gamma:.4f}")

if __name__ == "__main__":
    run_task()
