# main.py
import os
from datetime import datetime
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

# ====================================================
#  Cấu hình đường dẫn model (có thể override bằng env)
# ====================================================

WQD_MODEL_PATH = os.getenv("WQD_MODEL_PATH", "models/wqd_rf_3sensor_bundle.joblib")
FORECAST_MODEL_PATH = os.getenv("FORECAST_MODEL_PATH", "models/pond_forecast_30min_bundle.joblib")

# Các biến global lưu model & metadata
wqd_bundle = None
wqd_model = None
wqd_feature_cols: List[str] = []
P_OPT: float = 7.5
T_OPT: float = 27.0
CLAR_REF: float = 40.0

forecast_bundle = None
forecast_model = None
forecast_feature_cols: List[str] = []
FORECAST_SENSOR_COLS: List[str] = ["water_pH", "turbidity_ntu", "water_temp"]
FORECAST_N_LAGS: int = 6
FORECAST_HORIZON_STEPS: int = 1
FORECAST_HORIZON_MINUTES: int = 30  # 1 step = 30 phút


# =========================
#  Load models từ .joblib
# =========================

def load_models():
    global wqd_bundle, wqd_model, wqd_feature_cols, P_OPT, T_OPT, CLAR_REF
    global forecast_bundle, forecast_model, forecast_feature_cols
    global FORECAST_SENSOR_COLS, FORECAST_N_LAGS, FORECAST_HORIZON_STEPS

    # ---- Model classification ----
    if not os.path.exists(WQD_MODEL_PATH):
        raise RuntimeError(f"Không tìm thấy model phân loại: {WQD_MODEL_PATH}")

    wqd_bundle = joblib.load(WQD_MODEL_PATH)
    wqd_model = wqd_bundle["model"]
    wqd_feature_cols = wqd_bundle["feature_cols"]
    P_OPT = float(wqd_bundle.get("P_OPT", 7.5))
    T_OPT = float(wqd_bundle.get("T_OPT", 27.0))
    CLAR_REF = float(wqd_bundle.get("CLAR_REF", 40.0))

    # ---- Model forecast ----
    if not os.path.exists(FORECAST_MODEL_PATH):
        raise RuntimeError(f"Không tìm thấy model forecast: {FORECAST_MODEL_PATH}")

    forecast_bundle = joblib.load(FORECAST_MODEL_PATH)
    forecast_model = forecast_bundle["model"]
    forecast_feature_cols = forecast_bundle["feature_cols"]
    FORECAST_SENSOR_COLS = forecast_bundle.get(
        "sensor_cols",
        ["water_pH", "turbidity_ntu", "water_temp"],
    )
    FORECAST_N_LAGS = int(forecast_bundle.get("n_lags", 6))
    FORECAST_HORIZON_STEPS = int(forecast_bundle.get("horizon", 1))


# Load models khi service start
try:
    load_models()
    print("✅ Đã load xong 2 model AI.")
except Exception as e:
    print("⚠️ Lỗi khi load models:", e)


# ===========================================
#  FE cho classification (19 feature / mẫu)
#  Giống notebook build_features_from_row
# ===========================================

def build_clf_feature_dict_from_raw(
    ph: float,
    turbidity_ntu: float,
    temperature_c: float,
    P_OPT_val: float,
    T_OPT_val: float,
    CLAR_REF_val: float,
) -> dict:
    """
    Biến 1 điểm (pH, turbidity_ntu, temperature_c) thành dict 19 feature,
    giống hệt hàm build_features_from_row trong notebook train classification.
    """
    pH = float(ph)
    temp = float(temperature_c)
    turb = float(turbidity_ntu)

    # 1) Độ trong giả định từ NTU (cm)
    turb_cm = max(0.0, CLAR_REF_val - turb)

    # 2) Lệch pH so với tối ưu
    ph_centered = pH - P_OPT_val
    ph_dev = abs(ph_centered)

    # 3) Lệch nhiệt độ so với tối ưu
    temp_centered = temp - T_OPT_val
    temp_dev = abs(temp_centered)

    # 4) Lệch độ trong so với CLAR_REF
    clarity_dev = abs(turb_cm - CLAR_REF_val)

    # 5) Chuẩn hóa độ lệch
    ph_dev_norm = ph_dev / 3.0
    temp_dev_norm = temp_dev / 10.0
    clarity_dev_norm = clarity_dev / max(CLAR_REF_val, 1.0)

    # 6) Các flag nhị phân
    ph_acidic_flag = 1 if pH < 6.5 else 0
    ph_alkaline_flag = 1 if pH > 8.5 else 0
    temp_cold_flag = 1 if temp < (T_OPT_val - 3) else 0
    temp_hot_flag = 1 if temp > (T_OPT_val + 3) else 0
    turb_very_turbid_flag = 1 if turb > CLAR_REF_val else 0
    turb_low_clarity_flag = 1 if turb_cm < CLAR_REF_val * 0.5 else 0

    # 7) Điểm stress tổng hợp
    stress_score = ph_dev_norm + temp_dev_norm + clarity_dev_norm
    stress_critical_flag = 1 if stress_score > 1.5 else 0

    feat = {
        "temp": temp,
        "turb_cm": turb_cm,
        "pH": pH,
        "ph_centered": ph_centered,
        "ph_dev": ph_dev,
        "temp_centered": temp_centered,
        "temp_dev": temp_dev,
        "clarity_dev": clarity_dev,
        "ph_dev_norm": ph_dev_norm,
        "temp_dev_norm": temp_dev_norm,
        "clarity_dev_norm": clarity_dev_norm,
        "ph_acidic_flag": ph_acidic_flag,
        "ph_alkaline_flag": ph_alkaline_flag,
        "temp_cold_flag": temp_cold_flag,
        "temp_hot_flag": temp_hot_flag,
        "turb_very_turbid_flag": turb_very_turbid_flag,
        "turb_low_clarity_flag": turb_low_clarity_flag,
        "stress_score": stress_score,
        "stress_critical_flag": stress_critical_flag,
    }
    return feat


def build_clf_features_dataframe(
    ph: float,
    turbidity_ntu: float,
    temperature_c: float,
) -> pd.DataFrame:
    """
    Tạo DataFrame 1 dòng với đúng thứ tự cột wqd_feature_cols
    để feed vào RandomForestClassifier.
    """
    feat = build_clf_feature_dict_from_raw(
        ph,
        turbidity_ntu,
        temperature_c,
        P_OPT,
        T_OPT,
        CLAR_REF,
    )
    X = pd.DataFrame([[feat[col] for col in wqd_feature_cols]], columns=wqd_feature_cols)
    return X


def predict_water_quality(
    ph: float,
    turbidity_ntu: float,
    temperature_c: float,
) -> dict:
    """
    Gọi model classification:
    - Input: ph, turbidity_ntu, temperature_c
    - Output: dict gồm class, label, confidence, recommend, duration...
    """
    if wqd_model is None:
        raise RuntimeError("Model phân loại chưa load")

    X = build_clf_features_dataframe(ph, turbidity_ntu, temperature_c)
    feat_debug = build_clf_feature_dict_from_raw(
        ph,
        turbidity_ntu,
        temperature_c,
        P_OPT,
        T_OPT,
        CLAR_REF,
    )

    # Dự đoán
    if hasattr(wqd_model, "predict_proba"):
        proba = wqd_model.predict_proba(X)[0]
        cls = int(np.argmax(proba))
        confidence = float(proba[cls])
    else:
        preds = wqd_model.predict(X)
        cls = int(preds[0])
        confidence = 1.0

    label_map = {2: "POOR", 1: "GOOD", 0: "EXCELLENT"}
    label = label_map.get(cls, str(cls))

    stress_score = float(feat_debug.get("stress_score", 0.0))

    # Chính sách khuyến nghị bơm:
    # - POOR -> PUMP_ON 30–300s, tăng theo stress_score
    # - GOOD/EXCELLENT -> PUMP_OFF
    if label == "POOR":
        recommend = "PUMP_ON"
        base = 30  # giây
        duration = int(base * (1.0 + min(stress_score, 3.0)))
        duration = max(30, min(duration, 300))
    else:
        recommend = "PUMP_OFF"
        duration = 0

    return {
        "success": True,
        "water_quality_label": label,
        "water_quality_class": cls,
        "confidence": confidence,
        "recommend": recommend,
        "duration": duration,
        "details": {
            "ph": ph,
            "turbidity": turbidity_ntu,
            "temperature": temperature_c,
            "stress_score": stress_score,
        },
    }


# ===============================================
#  FE cho forecast (giống build_supervised của bạn)
# ===============================================

def build_forecast_features_single(
    ph: float,
    turbidity_ntu: float,
    temperature_c: float,
    history: Optional[List[dict]] = None,
    now: Optional[datetime] = None,
) -> pd.DataFrame:
    """
    Build 1 hàng feature để dự đoán 30 phút sau, dựa trên logic build_supervised:
      - N_LAGS = 6, HORIZON = 1
      - lag1 = giá trị hiện tại
      - lag2 = 30 phút trước
      - ...
      - hour, dayofweek từ thời điểm hiện tại (hoặc timestamp cuối cùng trong history)
    Nếu history không đủ 6 điểm thì pad bằng điểm cuối.
    Nếu không có history, lặp lại giá trị hiện tại cho cả 6 lag.
    """
    if now is None:
        now = datetime.now()

    n_lags = FORECAST_N_LAGS
    sensor_cols = FORECAST_SENSOR_COLS  # ["water_pH", "turbidity_ntu", "water_temp"]

    # Chuẩn bị dataframe history nếu có
    if history and len(history) > 0:
        df_h = pd.DataFrame(history)

        # Map tên cột cho chắc chắn
        if "water_pH" not in df_h.columns and "ph" in df_h.columns:
            df_h["water_pH"] = df_h["ph"]
        if "turbidity_ntu" not in df_h.columns and "turbidity" in df_h.columns:
            df_h["turbidity_ntu"] = df_h["turbidity"]
        if "water_temp" not in df_h.columns and "temperature" in df_h.columns:
            df_h["water_temp"] = df_h["temperature"]

        # Sắp xếp theo timestamp nếu có
        if "timestamp" in df_h.columns:
            df_h["timestamp"] = pd.to_datetime(df_h["timestamp"])
            df_h = df_h.sort_values("timestamp")
            try:
                last_ts = df_h["timestamp"].iloc[-1]
                now = last_ts.to_pydatetime()
            except Exception:
                pass

        df_h = df_h[sensor_cols]

        # pad nếu < n_lags
        while len(df_h) < n_lags:
            df_h = pd.concat([df_h, df_h.tail(1)], ignore_index=True)

        df_tail = df_h.tail(n_lags)
    else:
        # Không có history -> giả định trạng thái ổn định,
        # lặp lại n_lags lần
        df_tail = pd.DataFrame(
            {
                "water_pH": [ph] * n_lags,
                "turbidity_ntu": [turbidity_ntu] * n_lags,
                "water_temp": [temperature_c] * n_lags,
            }
        )

    # Tạo dict feature đúng theo logic build_supervised:
    # lag1 = giá trị hiện tại (t), lag2 = t-1, ...
    feat = {}
    for col in sensor_cols:
        for lag in range(1, n_lags + 1):
            shift_amount = lag - 1
            # Với df_tail là n_lags giá trị cuối cùng theo thời gian,
            # ta map: lag1 -> giá trị cuối, lag2 -> giá trị áp chót, ...
            value = df_tail[col].iloc[-1 - shift_amount]
            lag_col = f"{col}_lag{lag}"
            feat[lag_col] = float(value)

    feat["hour"] = now.hour
    feat["dayofweek"] = now.weekday()

    # Đảm bảo đúng thứ tự forecast_feature_cols
    X = pd.DataFrame(
        [[feat[col] for col in forecast_feature_cols]],
        columns=forecast_feature_cols,
    )
    return X


def forecast_30min(
    ph: float,
    turbidity_ntu: float,
    temperature_c: float,
    history: Optional[List[dict]] = None,
) -> dict:
    """
    Dự đoán 30 phút sau cho 3 sensor (ph, turbidity, temp)
    bằng model forecast.
    """
    if forecast_model is None:
        raise RuntimeError("Model forecast chưa load")

    X = build_forecast_features_single(
        ph=ph,
        turbidity_ntu=turbidity_ntu,
        temperature_c=temperature_c,
        history=history,
    )
    preds = forecast_model.predict(X)[0]
    ph_future = float(preds[0])
    turb_future = float(preds[1])
    temp_future = float(preds[2])

    return {
        "success": True,
        "horizon_minutes": FORECAST_HORIZON_MINUTES,
        "ph": ph_future,
        "turbidity": turb_future,
        "temperature": temp_future,
    }


# =========================
#  Pydantic request models
# =========================

class PredictRequest(BaseModel):
    ph: float = Field(..., description="Giá trị pH hiện tại")
    turbidity: float = Field(..., description="Độ đục hiện tại (NTU)")
    temperature: float = Field(..., description="Nhiệt độ nước hiện tại (°C)")


class ForecastPoint(BaseModel):
    ph: float
    turbidity: float
    temperature: float
    timestamp: Optional[datetime] = None


class ForecastRequest(BaseModel):
    # Mode đơn giản: truyền ph/turbidity/temperature
    ph: Optional[float] = None
    turbidity: Optional[float] = None
    temperature: Optional[float] = None

    # Mode nâng cao: gửi cả history (list điểm theo thời gian)
    history: Optional[List[ForecastPoint]] = None


# =========================
#  FastAPI app & endpoints
# =========================

app = FastAPI(
    title="Aqua IoT AI Service",
    description="Service AI cho phân loại chất lượng nước & dự đoán 30 phút sau.",
    version="1.0.0",
)
# CORS cho frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],   # Cho phép GET, POST, OPTIONS,...
    allow_headers=["*"],   # Cho phép mọi header (Authorization, Content-Type,...)
)


@app.get("/health")
def health():
    """
    Health check dùng cho backend Node:
    - Kiểm tra 2 model đã load chưa
    - Trả metadata forecast (n_lags, horizon, horizon_minutes)
    """
    return {
        "success": True,
        "models": {
            "classification_loaded": wqd_model is not None,
            "forecast_loaded": forecast_model is not None,
        },
        "forecast_meta": {
            "sensor_cols": FORECAST_SENSOR_COLS,
            "n_lags": FORECAST_N_LAGS,
            "horizon_steps": FORECAST_HORIZON_STEPS,
            "horizon_minutes": FORECAST_HORIZON_MINUTES,
        },
    }


@app.post("/predict")
def predict_endpoint(req: PredictRequest):
    """
    Endpoint /predict:
    - Input: { ph, turbidity, temperature }
    - Output: đúng format mà services/ai-service.js bên Node đang mong đợi.
    """
    try:
        result = predict_water_quality(req.ph, req.turbidity, req.temperature)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/forecast")
def forecast_endpoint(req: ForecastRequest):
    """
    Endpoint /forecast:
    - Mode đơn giản: body chỉ có ph/turbidity/temperature (backend Node sẽ dùng kiểu này)
    - Mode nâng cao: có thêm history (list điểm theo thời gian)
    """
    if (
        (req.ph is None or req.turbidity is None or req.temperature is None)
        and not req.history
    ):
        raise HTTPException(
            status_code=400,
            detail="Cần truyền (ph, turbidity, temperature) hoặc history.",
        )

    # Nếu có history mà thiếu ph/turb/temp -> lấy từ điểm cuối history
    history_dicts = None
    if req.history:
        history_dicts = []
        for p in req.history:
            history_dicts.append(
                {
                    "ph": p.ph,
                    "turbidity": p.turbidity,
                    "temperature": p.temperature,
                    "timestamp": p.timestamp.isoformat() if p.timestamp else None,
                }
            )

    if req.ph is not None and req.turbidity is not None and req.temperature is not None:
        ph = req.ph
        turbidity = req.turbidity
        temperature = req.temperature
    elif history_dicts:
        last = req.history[-1]
        ph = last.ph
        turbidity = last.turbidity
        temperature = last.temperature
    else:
        raise HTTPException(
            status_code=400,
            detail="Không đủ thông tin sensor cho forecast.",
        )

    try:
        result = forecast_30min(
            ph=ph,
            turbidity_ntu=turbidity,
            temperature_c=temperature,
            history=history_dicts,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
