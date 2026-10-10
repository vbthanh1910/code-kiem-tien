require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3001;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.error('Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong file .env');
    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL.trim(),
    process.env.SUPABASE_SECRET_KEY.trim()
);

app.use(cors());
app.use(express.json());

// Phục vụ trang web (chỉ đúng 1 file, không lộ file .env)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Nhận và lưu dữ liệu vào Supabase
app.post('/api/receive-nutrition-data', async (req, res) => {
    const p = req.body;

    if (!p || !p.userData || !p.calculatedMetrics || !p.macros) {
        return res.status(400).json({
            status: 'error',
            message: 'Dữ liệu gửi lên thiếu userData, calculatedMetrics hoặc macros.'
        });
    }

    const row = {
        client_timestamp: p.clientTimestamp || null,
        gender: p.userData.gender,
        age: p.userData.age,
        height_cm: p.userData.heightCm,
        weight_kg: p.userData.weightKg,
        activity_factor: p.userData.activityFactor,
        goal: p.userData.goal,
        habits: p.userData.habits || [],
        bmi: p.calculatedMetrics.bmi,
        bmi_category: p.calculatedMetrics.bmiCategory,
        bmr_kcal: p.calculatedMetrics.bmrKcal,
        tdee_kcal: p.calculatedMetrics.tdeeKcal,
        target_calorie_kcal: p.calculatedMetrics.targetCalorieKcal,
        water_liters: p.calculatedMetrics.waterLiters,
        protein_g: p.macros.proteinGrams,
        carbs_g: p.macros.carbsGrams,
        fat_g: p.macros.fatGrams
    };

    const { data, error } = await supabase
        .from('submissions')
        .insert(row)
        .select('id, received_at')
        .single();

    if (error) {
        console.error('[SUPABASE] Lỗi khi lưu:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lưu vào Supabase: ' + error.message
        });
    }

    console.log(`[SUPABASE] Đã lưu bản ghi #${data.id}`);
    res.status(200).json({
        status: 'success',
        message: `Đã lưu vào Supabase (bản ghi #${data.id})!`,
        receivedAt: data.received_at
    });
});

// Xem lại 100 bản ghi mới nhất (chỉ để test)
app.get('/api/nutrition-data', async (req, res) => {
    const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('id', { ascending: false })
        .limit(100);

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    res.json(data);
});

app.listen(PORT, () => {
    console.log(`Server đang chạy. Mở trình duyệt vào: http://localhost:${PORT}`);
});